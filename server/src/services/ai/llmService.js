// llmService.js — CuraLink Medical AI
// ═══════════════════════════════════════════════════════════════════════════
// ANTI-HALLUCINATION ARCHITECTURE
// Layer 1 — Token Budget Control
// Layer 2 — Prompt Hygiene
// Layer 3 — Query Specialisation
// Layer 4 — Pre-extraction (outcome / safety / applicability)
// Layer 5 — Post-verification (grounding)
// Layer 6 — Deterministic fallback
// ═══════════════════════════════════════════════════════════════════════════

import ollamaConfig from "../../config/ollama.js";

class LLMService {
  constructor() {
    this.baseURL = ollamaConfig.getBaseURL();
    this.model   = ollamaConfig.getModel();
    this.timeout = ollamaConfig.getTimeout();
    this.client  = ollamaConfig.getClient();
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 1 — TOKEN BUDGET
  // ════════════════════════════════════════════════════════════════════════
  _getModelBudget() {
    const model = String(this.model || "").toLowerCase();

    if (model.includes("8b") || model.includes("7b") || model.includes("instant")) {
      return {
        maxInputTokens  : 4800,
        maxOutputTokens : 900,
        maxPapers       : 6,
        maxTrials       : 2,
        abstractChars   : 260,
        maxHistoryMsgs  : 2,
        includeUrls     : false,
      };
    }

    if (model.includes("13b") || model.includes("34b") || model.includes("mixtral")) {
      return {
        maxInputTokens  : 7000,
        maxOutputTokens : 1400,
        maxPapers       : 8,
        maxTrials       : 3,
        abstractChars   : 400,
        maxHistoryMsgs  : 4,
        includeUrls     : true,
      };
    }

    return {
      maxInputTokens  : 10000,
      maxOutputTokens : 2000,
      maxPapers       : 8,
      maxTrials       : 3,
      abstractChars   : 600,
      maxHistoryMsgs  : 4,
      includeUrls     : true,
    };
  }

  _estimateTokens(text = "") {
    return Math.ceil(String(text).length / 4);
  }

  // ════════════════════════════════════════════════════════════════════════
  // CORE: generate + chat
  // ════════════════════════════════════════════════════════════════════════
  async generate(prompt, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model      : this.model,
        messages   : [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.1,
        top_p      : options.top_p      ?? 0.9,
        max_tokens : options.max_tokens ?? 512,
      });
      return {
        text      : response.choices[0]?.message?.content || "",
        tokensUsed: response.usage?.completion_tokens      || 0,
        model     : this.model,
      };
    } catch (error) {
      console.error("❌ LLM generate error:", error.message);
      throw new Error("LLM generate failed");
    }
  }

  async chat(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model      : this.model,
        messages   : messages.map((msg) => ({
          role   : msg.role,
          content: String(msg.content || ""),
        })),
        temperature: options.temperature ?? 0.0,
        top_p      : options.top_p      ?? 0.9,
        max_tokens : options.max_tokens ?? 900,
      });
      return {
        text      : response.choices[0]?.message?.content || "",
        tokensUsed: response.usage?.completion_tokens      || 0,
        model     : this.model,
      };
    } catch (error) {
      console.error("❌ LLM chat error:", error.message);
      throw new Error("LLM chat failed");
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 2 — BUILD SYSTEM PROMPT
  // ════════════════════════════════════════════════════════════════════════
  buildSystemPrompt(context, userProfile = {}, isResearcherQuery = false) {
    const disease         = context?.disease    || "the medical condition";
    const location        = context?.location   || userProfile?.location || null;
    const isLifestyleQuery= context?.isLifestyleQuery || false;
    const originalQuery   = context?.originalQuery    || "";
    const clinicalFocus   = context?._clinicalFocus   || "";
    const mustHaveSignals = context?._mustHaveSignals  || [];
    const prevEntities    = Array.isArray(context?.responseEntities) && context.responseEntities.length > 0
                              ? context.responseEntities : [];
    const noLocalTrials   = context?.noLocalTrials     || false;
    const fallbackCount   = context?.fallbackTrialCount || 0;

    const trialInstruction =
      noLocalTrials && fallbackCount > 0
        ? `Start with: No clinical trials were found near ${location}. Then summarise global trials shown.`
        : noLocalTrials && fallbackCount === 0
          ? `State that no clinical trials are currently available. Check ClinicalTrials.gov.`
          : location
            ? `Summarise trials near ${location}. Mention phase, intervention, status, contact.`
            : "Summarise the most relevant clinical trials with phase, status, intervention.";

    let prompt = `You are Curalink, a medical AI research assistant.
You ONLY reason over the papers provided. You do NOT use training memory.

══════════════════════════════════════════════════════
ABSOLUTE RULES
══════════════════════════════════════════════════════
1. Every fact in keyFindings MUST exist in the cited paper's Abstract field.
2. Every number (%, months, HR, p-value) MUST appear in that paper's Abstract.
   Cannot find it → do NOT include it → write "data not reported in abstract".
3. [N] maps to EXACTLY that paper number. [1]=Paper 1, [2]=Paper 2, etc.
4. Each [N] appears EXACTLY ONCE in keyFindings — no repeats.
5. Do NOT use training knowledge to fill gaps.
6. Return ONLY valid JSON — no markdown, no text before or after.
7. clinicalTrialsSummary MUST be a plain STRING — never an array.
8. If a paper applies only to a subgroup (e.g. ALK-positive, EGFR exon 20, SCLC, metastatic, first-line), say so explicitly in keyFindings. Do NOT generalize subgroup findings to all patients.
9. In researchInsights, distinguish: broad disease evidence vs subtype/stage/biomarker-specific evidence vs evidence gaps.

══════════════════════════════════════════════════════
keyFindings FORMAT
══════════════════════════════════════════════════════
Pattern: "[Study type] [N] found that [intervention] showed [metric: value from Abstract] in [population from Applies-to field]."

For numbers: copy EXACTLY from "Key outcome" field.
If Key outcome says "See abstract below" → find ONE number in the Abstract text.
If Abstract has NO numbers → write "findings were qualitative; see source for details".

Evidence qualifier (MANDATORY):
- "Phase 3 RCT"           → "The Phase 3 trial [N] demonstrated..."
- "Meta-analysis"         → "A pooled meta-analysis [N] showed..."
- "Phase 2 / Prospective" → "A prospective study [N] found..."
- "Real-world cohort"     → "A real-world analysis [N] reported..."
- "Retrospective"         → "A retrospective study [N] suggested..."
- "Pilot / Feasibility"   → "A preliminary study [N] indicated..."
- "Study type unclear"    → "A study [N] reported..."

══════════════════════════════════════════════════════
SAFETY SECTION — STRICT RULES
══════════════════════════════════════════════════════
Each paper has a pre-extracted "Safety signal" field. Use it:
"Grade 3+ AE: 38%" → "The [type] [N] reported Grade 3+ AEs in 38% of patients."
"Safety conclusion: well-tolerated" → "The [type] [N] concluded the intervention was well-tolerated."
"No specific safety data extracted from abstract":
  - Observational → "Paper [N] is observational; clinical AE rates are not applicable."
  - Clinical trial → "Paper [N] did not report AE rates in the abstract."
NEVER invent an AE rate. NEVER copy a rate from one paper to another.`;

    if (clinicalFocus) {
      prompt += `\nCLINICAL FOCUS: "${clinicalFocus}"
${mustHaveSignals.length > 0 ? `Emphasize: ${mustHaveSignals.join(", ")}` : ""}
Prioritize papers directly addressing: "${clinicalFocus}"`;
    }

    if (isLifestyleQuery) {
      prompt += `

SUPPLEMENT / LIFESTYLE QUERY: "${originalQuery}"
- Distinguish ASSOCIATION (observational) from CAUSATION (RCT).
- Do NOT cite chemotherapy/immunotherapy papers as supplement evidence.
- If observational only: state "Observational evidence only — no RCT data available."
- If controversial: state "meta-analyses show conflicting results."
- Never recommend a specific dose. Recommend oncologist consultation.`;
    }

    if (context?.lowResultCount) {
      prompt += `

LOW RESULT WARNING: Only ${context.actualPaperCount} paper(s) found.
- Only cite the ${context.actualPaperCount} paper(s) provided.
- Do NOT fill gaps with training knowledge.
- State: "Limited research found. Available evidence suggests..."`;
    }

    if (location) {
      if (noLocalTrials && fallbackCount > 0) {
        prompt += `

LOCATION: ${location} — No local trials found.
In clinicalTrialsSummary: "No trials near ${location} identified. Global trials shown for reference: [summary]"`;
      } else if (noLocalTrials && fallbackCount === 0) {
        prompt += `

LOCATION: ${location} — No trials found globally.
Write: "No clinical trials currently available. Check ClinicalTrials.gov."`;
      } else {
        prompt += `

LOCATION: ${location} — Prioritize nearby trials in clinicalTrialsSummary.`;
      }
    }

    if (isResearcherQuery) {
      prompt += `

RESEARCHER QUERY MODE:
Pattern: "[Author Last Name] ([Year]): investigated [topic] — [specific metric from Abstract] [N]"
Write the ACTUAL finding. Never write "(Institution)" or "(see paper)".
safetyConsiderations: "Safety data in full text of each referenced publication [N]"
recommendations: summarize most promising research directions.`;
    }

    if (prevEntities.length > 0) {
      prompt += `\n\nPREVIOUS RESPONSE MENTIONED: ${prevEntities.join(", ")}`;
    }
    if (Array.isArray(context?.previousQueries) && context.previousQueries.length > 0) {
      prompt += `\nRECENT TOPICS: ${context.previousQueries.slice(-2).join(" → ")}`;
    }

    prompt += `

DISEASE IN FOCUS: "${disease}"

Return ONLY this JSON:
{
  "conditionOverview": "2-3 sentences summarizing what papers [1]-[3] found about ${disease}. Start with the most important finding from Abstract [1]. Do NOT describe the disease from training memory.",
  "keyFindings": ["[Study type] [N] found [outcome with value from Abstract] in [specific population from Applies-to field].", "...up to 8, each [N] once"],
  "researchInsights": "2-3 sentences: what applies broadly vs only to subgroups (name them), what evidence gaps remain.",
  "clinicalTrialsSummary": "${trialInstruction}",
  "recommendations": ["Based on [evidence type] [N] in [subgroup/population]: [action]."],
  "safetyConsiderations": ["The [study type] [N] reported [finding from Safety signal field]."],
  "sourceSnippets": [{"title": "exact title", "authors": "A, B", "year": 2024, "platform": "PUBMED", "url": "https://...", "snippet": "first 80 chars of abstract"}]
}`;

    return prompt;
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 3 — BUILD USER PROMPT
  // ════════════════════════════════════════════════════════════════════════
  buildUserPrompt(
    query,
    publications = [],
    clinicalTrials = [],
    isResearcherQuery = false,
    promptOptions = {},
  ) {
    const queryLower    = query.toLowerCase();
    const abstractChars = promptOptions.abstractChars ?? 400;
    const includeUrls   = promptOptions.includeUrls   ?? true;
    const maxPapers     = promptOptions.maxPapers     ?? 8;
    const maxTrials     = promptOptions.maxTrials     ?? 3;

    const isSupplementQuery =
      queryLower.includes("vitamin")       ||
      queryLower.includes("supplement")    ||
      queryLower.includes("mineral")       ||
      queryLower.includes("herb")          ||
      queryLower.includes("diet")          ||
      queryLower.includes("nutrition")     ||
      queryLower.includes("can i take")    ||
      queryLower.includes("should i take") ||
      queryLower.includes("is it safe to take") ||
      queryLower.includes("food")          ||
      queryLower.includes("extract")       ||
      queryLower.includes("oil")           ||
      queryLower.includes("tea");

    const isProgressionQuery =
      queryLower.includes("progressed")         ||
      queryLower.includes("stopped working")    ||
      queryLower.includes("next line")          ||
      queryLower.includes("second line")        ||
      queryLower.includes("third line")         ||
      queryLower.includes("after immunotherapy")||
      queryLower.includes("after chemotherapy") ||
      queryLower.includes("post-immunotherapy") ||
      queryLower.includes("salvage")            ||
      queryLower.includes("refractory")         ||
      queryLower.includes("resistant")          ||
      (queryLower.includes("after") &&
        (queryLower.includes("failed") || queryLower.includes("failure")));

    const isComparisonQuery =
      queryLower.includes(" vs ")            ||
      queryLower.includes(" versus ")        ||
      queryLower.includes("compare")         ||
      queryLower.includes("which is better") ||
      queryLower.includes("head-to-head")    ||
      queryLower.includes("difference between") ||
      queryLower.includes("better than")     ||
      queryLower.includes("superior");

    const isCNSQuery =
      queryLower.includes("brain")         ||
      queryLower.includes("cns")           ||
      queryLower.includes("intracranial")  ||
      queryLower.includes("blood-brain")   ||
      queryLower.includes("leptomeningeal")||
      queryLower.includes("cranial");

    const isSafetyQuery =
      queryLower.includes("side effect")  ||
      queryLower.includes("adverse")      ||
      queryLower.includes("toxicity")     ||
      (queryLower.includes("safe") && !queryLower.includes("safety and"));

    const isDiagnosisQuery =
      queryLower.includes("diagnos")   ||
      queryLower.includes("symptom")   ||
      queryLower.includes("screening") ||
      queryLower.includes("biomarker") ||
      queryLower.includes("detect");

    const isPrognosisQuery =
      queryLower.includes("prognosis")      ||
      queryLower.includes("survival rate")  ||
      queryLower.includes("life expectancy")||
      queryLower.includes("mortality")      ||
      queryLower.includes("5-year survival")||
      queryLower.includes("outlook");

    const isMechanismQuery =
      queryLower.includes("mechanism") ||
      queryLower.includes("how does")  ||
      queryLower.includes("pathway")   ||
      queryLower.includes("why does")  ||
      queryLower.includes("how it works");

    const isClinicalTrialQuery =
      queryLower.includes("clinical trial") ||
      queryLower.includes("trial for")      ||
      queryLower.includes("trials in")      ||
      queryLower.includes("enrolling")      ||
      queryLower.includes("recruiting");

    const DRUG_PATTERNS = [
      "alectinib","lorlatinib","brigatinib","crizotinib","ceritinib","ensartinib",
      "osimertinib","erlotinib","gefitinib","afatinib","lazertinib","zorifertinib","amivantamab",
      "pembrolizumab","nivolumab","atezolizumab","durvalumab","ipilimumab","cemiplimab","tislelizumab",
      "chemotherapy","carboplatin","pemetrexed","paclitaxel","docetaxel","vinorelbine","gemcitabine",
      "bevacizumab","ramucirumab","capmatinib","tepotinib","selpercatinib","pralsetinib","adagrasib","sotorasib",
      "trastuzumab","sacituzumab","metformin","semaglutide","tirzepatide","empagliflozin","dapagliflozin",
      "liraglutide","sitagliptin","canagliflozin","insulin","orforglipron",
      "atorvastatin","rosuvastatin","aspirin","warfarin","apixaban","rivaroxaban","sacubitril","lisinopril",
    ];

    const MUTATION_PATTERNS = [
      "egfr","alk","ros1","ret","met","kras","braf","her2","ntrk",
      "pd-l1","tmb","t790m","exon 20","g12c","l858r","ex19del",
    ];

    const mentionedDrugs     = DRUG_PATTERNS.filter((d) => queryLower.includes(d));
    const mentionedMutations = MUTATION_PATTERNS.filter((m) => queryLower.includes(m));

    const getFailedTreatment = () => {
      if (mentionedDrugs.length > 0) return mentionedDrugs[0];
      if (queryLower.includes("immunotherapy") || queryLower.includes("ici")) return "immunotherapy";
      if (queryLower.includes("egfr") || queryLower.includes("tki")) return "EGFR-TKI";
      if (queryLower.includes("alk"))          return "ALK inhibitor";
      if (queryLower.includes("chemotherapy")) return "chemotherapy";
      return "the previous treatment";
    };

    let clinicalAnswerNeeded = "";

    if (isSupplementQuery) {
      clinicalAnswerNeeded =
        `SUPPLEMENT / LIFESTYLE SAFETY.\n` +
        `Focus on:\n` +
        `  1. ASSOCIATION (observational) vs CAUSATION (RCT) — state which.\n` +
        `  2. Serum level thresholds or intake amounts if reported.\n` +
        `  3. Interactions with standard therapies if mentioned.\n` +
        `  4. Whether evidence is consistent or controversial.\n` +
        `Key data: OR, HR, p-values, confidence intervals from Abstract.\n` +
        `Do NOT report chemotherapy efficacy as supplement evidence.\n` +
        `If no RCT data: state "No randomised trial evidence; findings are observational."`;
    } else if (isProgressionQuery) {
      const failedDrug = getFailedTreatment();
      clinicalAnswerNeeded =
        `OPTIONS after ${failedDrug} failure.\n` +
        `Key data: PFS, OS, ORR in post-${failedDrug} setting — from Abstract only.\n` +
        `Do NOT report first-line data.`;
    } else if (isComparisonQuery) {
      const drugs = mentionedDrugs.slice(0, 2).join(" vs ");
      clinicalAnswerNeeded =
        `HEAD-TO-HEAD comparison: ${drugs || "the mentioned treatments"}.\n` +
        `Key data: hazard ratios, p-values, subgroup analyses from Abstract.`;
    } else if (isCNSQuery) {
      clinicalAnswerNeeded =
        `CNS-specific efficacy.\n` +
        `Key data: intracranial ORR (%), CNS PFS (months) — from Abstract only.`;
    } else if (isSafetyQuery) {
      clinicalAnswerNeeded =
        `Safety and tolerability.\n` +
        `Key data: Grade 3/4 AE rates, discontinuation rates from Abstract.`;
    } else if (isDiagnosisQuery) {
      clinicalAnswerNeeded =
        `Diagnostic / biomarker performance.\n` +
        `Key data: sensitivity, specificity, AUC from Abstract.`;
    } else if (isPrognosisQuery) {
      clinicalAnswerNeeded =
        `Prognostic outcomes.\n` +
        `Key data: median OS, hazard ratios, survival rates from Abstract.`;
    } else if (isMechanismQuery) {
      clinicalAnswerNeeded =
        `Mechanism of action / biological pathway per the papers provided.`;
    } else if (isClinicalTrialQuery) {
      clinicalAnswerNeeded =
        `Clinical trial landscape.\n` +
        `Focus on: phase, status, intervention, location, eligibility.`;
    } else {
      clinicalAnswerNeeded =
        `Treatment outcome data.\n` +
        `Key data: ORR, PFS, OS, hazard ratios from Abstract.\n` +
        `Prioritize Phase 3 RCTs and meta-analyses.`;
    }

    let prompt = `QUERY: "${query}"\n`;
    prompt += `CLINICAL CONTEXT NEEDED: ${clinicalAnswerNeeded}\n`;
    if (mentionedDrugs.length > 0)     prompt += `Drugs in query: ${mentionedDrugs.join(", ")}\n`;
    if (mentionedMutations.length > 0) prompt += `Biomarkers in query: ${mentionedMutations.join(", ")}\n`;
    prompt += `\n`;

    if (isResearcherQuery) {
      prompt +=
        `TASK: Identify lead researchers and contributions.\n` +
        `Format: "[Author] ([Year]): studied [topic] — [specific finding with value] [N]"\n\n`;
    }

    const pubsToUse   = publications.slice(0, maxPapers);
    const totalPapers = pubsToUse.length;
    prompt += `You have ${totalPapers} papers. Cite ALL [1]–[${totalPapers}]. Each [N] exactly once.\n\n`;
    prompt += `=== PAPERS — USE ONLY THESE FOR ALL FACTS ===\n`;

    pubsToUse.forEach((pub, idx) => {
      const authors       = Array.isArray(pub.authors) ? pub.authors.slice(0, 2).join(", ") : "Unknown";
      const abstract      = pub.abstract ? pub.abstract.substring(0, abstractChars) : "No abstract available";
      const outcomeHint   = this._extractOutcomeHint(pub.abstract || "");
      const safetyHint    = this._extractSafetyHint(pub.abstract ? pub.abstract.substring(0, Math.min(600, abstractChars + 200)) : "", pub.title || "");
      const evidenceTier  = this._classifyEvidenceTier(pub.title || "", pub.abstract || "");
      const applicability = this._extractApplicability(pub);

      prompt +=
        `[${idx + 1}] ${pub.title || "Untitled"} (${pub.year || "N/A"})\n` +
        `Authors: ${authors} | Source: ${(pub.source || "").toUpperCase()}\n` +
        `Evidence: ${evidenceTier}\n` +
        `Applies to: ${applicability}\n` +
        `Key outcome: ${outcomeHint}\n` +
        `Safety signal: ${safetyHint}\n` +
        `Abstract: ${abstract}\n` +
        (includeUrls && pub.url ? `URL: ${pub.url}\n` : "") +
        `⚠ [${idx + 1}]: use ONLY numbers from Abstract above.\n\n`;
    });

    const trialsToUse = clinicalTrials.slice(0, maxTrials);
    if (trialsToUse.length > 0) {
      prompt += `=== TRIALS (top ${trialsToUse.length}) ===\n`;
      trialsToUse.forEach((trial, idx) => {
        const locs          = Array.isArray(trial.locations)     ? trial.locations.slice(0, 2).join("; ")     : "N/A";
        const conds         = Array.isArray(trial.conditions)    ? trial.conditions.slice(0, 2).join(", ")    : "N/A";
        const interventions = Array.isArray(trial.interventions) ? trial.interventions.slice(0, 2).join(", ") : "N/A";
        prompt +=
          `[T${idx + 1}] ${trial.title || "Untitled"}\n` +
          `Status: ${trial.status || "Unknown"} | Phase: ${trial.phase || "N/A"}\n` +
          `Conditions: ${conds}\n` +
          `Interventions: ${interventions}\n` +
          `Locations: ${locs}\n` +
          `Contact: ${trial.contact?.email || "See URL"}\n` +
          (includeUrls && trial.url ? `URL: ${trial.url}\n` : "") +
          `\n`;
      });
    }

    prompt +=
      `══════════════════════════════════════════\n` +
      `GROUNDING RULES\n` +
      `══════════════════════════════════════════\n` +
      `• keyFindings: every number must exist in cited paper's Abstract.\n` +
      `• Include "Applies to" population in each keyFinding where subgroup-specific.\n` +
      `• safetyConsiderations: use Safety signal field; for observational studies state explicitly.\n` +
      `• researchInsights: name which findings are subgroup-specific, which are broad.\n` +
      `• clinicalTrialsSummary: use ONLY trial data above.\n` +
      `• Return JSON ONLY.`;

    return prompt;
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 4a — Extract safety signal
  // ════════════════════════════════════════════════════════════════════════
  _extractSafetyHint(abstract, title = "") {
    if (!abstract || abstract.length < 20) return "No specific safety data extracted from abstract";

    const titleL    = title.toLowerCase();
    const abstractL = abstract.toLowerCase();

    if (titleL.includes("without increased pneumonia risk")) return "Comparative safety: no increased risk of pneumonia";
    if (titleL.includes("without increased risk")) return "Comparative safety: no increased risk of adverse events";
    if (titleL.includes("no increased risk"))       return "Comparative safety: no increased risk of adverse events";

    const negMatch = abstract.match(
      /\b(?:no|without)\s+(?:significant\s+)?increased\s+risk\s+of\s+(pneumonia|pneumonitis|bleeding|hepatotoxicity|neutropenia|toxicity|adverse events?|immune-related adverse events?)\b/i,
    );
    if (negMatch) return `Comparative safety: no increased risk of ${negMatch[1].toLowerCase()}`;

    if (abstractL.includes("without increased") || abstractL.includes("no increased risk") ||
        abstractL.includes("no significant increase") || abstractL.includes("did not increase") ||
        abstractL.includes("not associated with increased")) {
      const m = abstract.match(/without\s+increased\s+(?:risk\s+of\s+)?(\w+(?:\s+\w+){0,2})/i) ||
                abstract.match(/no\s+(?:significant\s+)?increased?\s+(?:risk\s+of\s+)?(\w+(?:\s+\w+){0,2})/i);
      return m
        ? `Comparative safety: no increased risk of ${m[1].trim()}`
        : "Comparative safety: no increased risk of adverse events vs comparator";
    }

    const patterns = [
      { regex: /grade\s*[3≥]\s*(?:or\s*(?:higher|above|4)|\/4)?\s*(?:adverse\s*events?)?\s*(?:occurred|reported|in|were)\s*(\d+\.?\d*\s*%)/i, label: "Grade 3+ AE" },
      { regex: /(\d+\.?\d*\s*%)\s*(?:of\s*patients?\s*)?(?:experienced|had|reported)\s*(?:any\s*)?grade\s*(?:3|≥3|4)/i,                      label: "Grade 3+ AE" },
      { regex: /treatment[\s-]related adverse events?\s*(?:occurred|reported|in)\s+(\d+\.?\d*\s*%)/i,                                         label: "Treatment-related AE" },
      { regex: /(\d+\.?\d*\s*%)\s*(?:of patients?\s*)?(?:had|experienced)\s*treatment[\s-]related/i,                                         label: "Treatment-related AE" },
      { regex: /serious adverse events?\s*(?:occurred|in|reported|rate).*?(\d+\.?\d*\s*%)/i,                                                  label: "Serious AE" },
      { regex: /immune[\s-]related adverse events?\s*(?:occurred|in|rate).*?(\d+\.?\d*\s*%)/i,                                                label: "irAE rate" },
      { regex: /(\d+\.?\d*\s*%)\s*(?:of patients?\s*)?(?:had|experienced)\s*immune[\s-]related/i,                                            label: "irAE rate" },
      { regex: /discontinu(?:ed|ation)\s*due\s+to\s+(?:adverse|toxicity|treatment-related)[^.]*?(\d+\.?\d*\s*%)/i,                           label: "Discontinuation rate" },
      { regex: /discontinu(?:ed|ation)\s*rate\s*(?:was|of|:|\s*=)\s*(\d+\.?\d*\s*%)/i,                                                      label: "Discontinuation rate" },
      { regex: /(\d+\.?\d*\s*%)\s*(?:of patients?\s*)?discontinued\s*(?:due\s+to|because\s+of)\s*(?:adverse|toxicity)/i,                    label: "Discontinuation rate" },
      { regex: /pneumoni[at]\s+(?:occurred|rate|incidence)\s+(?:in|of|was)?\s*(\d+\.?\d*\s*%)/i,                                             label: "Pneumonia rate" },
      { regex: /neutropenia\s+(?:occurred|rate|incidence)\s+(?:in|of|was)?\s*(\d+\.?\d*\s*%)/i,                                              label: "Neutropenia rate" },
      { regex: /hepatotoxicity.*?(\d+\.?\d*\s*%)/i,                                                                                          label: "Hepatotoxicity rate" },
      { regex: /(well[\s-]tolerated|manageable safety profile|no new safety signals|acceptable safety|favorable safety)/i,                    label: "Safety conclusion" },
      { regex: /(\d+\.?\d*\s*%)\s+of\s+patients?\s+(?:had|reported|experienced)\s+(?:any\s+)?(?:grade\s*\d+\s*)?adverse/i,                  label: "AE rate" },
      { regex: /adverse events?\s+(?:occurred|reported)\s+in\s+(\d+\.?\d*\s*%)\s+of\s+patients?/i,                                          label: "AE rate" },
    ];

    for (const { regex, label } of patterns) {
      const match = abstract.match(regex);
      if (match) {
        const value  = (match[1] || match[0]).trim();
        if (label === "Discontinuation rate" || label === "Grade 3+ AE" || label === "Treatment-related AE") {
          const numVal = parseFloat(value);
          if (!isNaN(numVal) && numVal > 85) continue;
        }
        return `${label}: ${value}`;
      }
    }

    if (titleL.includes("well-tolerated") || titleL.includes("manageable")) {
      return "Safety conclusion: well-tolerated safety profile";
    }

    return "No specific safety data extracted from abstract";
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 4b — Classify evidence tier
  // Meta-analysis checked BEFORE Phase 3 to prevent misclassification
  // ════════════════════════════════════════════════════════════════════════
  _classifyEvidenceTier(title, abstract) {
    const combined = `${title} ${abstract}`.toLowerCase();

    if (combined.includes("meta-analysis") || combined.includes("network meta-analysis") ||
        combined.includes("systematic review") || combined.includes("pooled analysis"))
      return "Meta-analysis / Systematic Review — high evidence";

    if (combined.includes("phase 3") || combined.includes("phase iii") ||
        combined.includes("randomized controlled trial") || combined.includes("randomised controlled trial"))
      return "Phase 3 RCT — high evidence";

    if (combined.includes("phase 2") || combined.includes("phase ii") ||
        combined.includes("prospective cohort") || combined.includes("multicenter prospective"))
      return "Phase 2 / Prospective cohort — moderate evidence";

    if (combined.includes("mendelian randomisation") || combined.includes("mendelian randomization") ||
        combined.includes("case-cohort") || combined.includes("case cohort"))
      return "Mendelian randomisation / Case-cohort — moderate evidence";

    if (combined.includes("real-world") || combined.includes("real world") ||
        combined.includes("cohort study") || combined.includes("population-based"))
      return "Real-world cohort — moderate evidence";

    if (combined.includes("retrospective") || combined.includes("single-arm") ||
        combined.includes("observational study"))
      return "Retrospective / Observational — lower evidence";

    if (combined.includes("pilot study") || combined.includes("feasibility") ||
        combined.includes("case series"))
      return "Pilot / Feasibility — preliminary only";

    return "Study type unclear — qualify findings carefully";
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 4c — Extract key outcome
  // ════════════════════════════════════════════════════════════════════════
  _extractOutcomeHint(abstract) {
    if (!abstract || abstract.length < 20) return "See abstract below";

    const clean = String(abstract).replace(/\s+/g, " ").trim();

    const patterns = [
      { regex: /\borr\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i,                            label: "ORR" },
      { regex: /objective response rate\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i,          label: "ORR" },
      { regex: /response rate\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i,                    label: "Response rate" },
      { regex: /median os\s*(?:of|was|:)?\s*(\d+\.?\d*\s*months?)/i,                  label: "Median OS" },
      { regex: /overall survival.*?(\d+\.?\d*\s*months?)/i,                            label: "OS" },
      { regex: /median pfs\s*(?:of|was|:)?\s*(\d+\.?\d*\s*months?)/i,                 label: "Median PFS" },
      { regex: /progression[\s-]free survival.*?(\d+\.?\d*\s*months?)/i,               label: "PFS" },
      { regex: /hazard ratio\s*(?:of|was|:)?\s*(\d+\.?\d*)/i,                         label: "HR" },
      { regex: /\bhr\s*[=:]\s*(0?\.\d+)/i,                                            label: "HR" },
      { regex: /odds ratio\s*(?:of|was|:)?\s*(\d+\.?\d*)/i,                          label: "OR" },
      { regex: /relative risk\s*(?:of|was|:)?\s*(\d+\.?\d*)/i,                       label: "RR" },
      { regex: /p\s*[<=>]\s*(0\.\d+)/i,                                               label: "p-value" },
      { regex: /pathologic complete response.*?(\d+\.?\d*\s*%)/i,                      label: "pCR" },
      { regex: /intracranial (?:response|orr|control).*?(\d+\.?\d*\s*%)/i,            label: "Intracranial ORR" },
      { regex: /cns (?:response|control|orr).*?(\d+\.?\d*\s*%)/i,                     label: "CNS ORR" },
      { regex: /intracranial pfs.*?(\d+\.?\d*\s*months?)/i,                           label: "Intracranial PFS" },
      { regex: /sensitivity\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i,                     label: "Sensitivity" },
      { regex: /specificity\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i,                     label: "Specificity" },
      { regex: /hba1c.*?(?:reduced?|decreased?|lowered?).*?(\d+\.?\d*\s*%)/i,         label: "HbA1c reduction" },
      { regex: /hba1c.*?(\d+\.?\d*\s*%)/i,                                            label: "HbA1c" },
      { regex: /weight.*?(?:loss|reduction).*?(\d+\.?\d*\s*kg)/i,                     label: "Weight loss" },
      { regex: /mace.*?(\d+\.?\d*\s*%)/i,                                             label: "MACE rate" },
      { regex: /(\d+\.?\d*\s*%)\s*(?:reduction|decrease|lower|improvement)/i,         label: "Reduction" },
    ];

    for (const { regex, label } of patterns) {
      const match = clean.match(regex);
      if (match) return `${label}: ${match[1]}`;
    }

    const IGNORE = /pubmed|embase|cochrane|clinicaltrials|web of science|database|searched|prospero|registration|registered|methods|background|study aims|we aim|will be|will recruit|investigators?\s+independently|investigators?\s+screened|data\s+extraction|quality\s+assessment|risk\s+of\s+bias|two\s+(?:authors?|reviewers?|investigators?)\s+independently|independently\s+(?:screened|reviewed|extracted|assessed)/i;

    const sentences = clean.split(/(?<=[.!?])\s+/).map((s) => s.trim());
    const resultSentence = sentences.find(
      (s) =>
        s.length > 30 &&
        s.length < 180 &&
        !IGNORE.test(s) &&
        /\d/.test(s) &&
        /(response|survival|hazard|risk|reduction|improved|benefit|associated|efficacy|p\s*[<=>]|significant)/i.test(s),
    );
    if (resultSentence) return resultSentence;

    const firstSentence = sentences.find(
      (s) => s.length > 30 && s.length < 180 && !IGNORE.test(s)
    );
    return firstSentence || "See abstract below";
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 4d — Extract applicability
  // Works for ALL diseases and ALL query types
  // Title-first detection prevents abstract contamination
  // Handles negation ("regardless of PD-L1", "unselected", "all comers")
  // Prioritizes most specific tags (biomarker > stage > line > histology)
  // ════════════════════════════════════════════════════════════════════════
  _extractApplicability(pub) {
    const title    = (pub.title    || "").toLowerCase();
    const abstract = (pub.abstract || "").toLowerCase();
    const firstSentence = abstract.split(/[.!?]\s+/)[0] || "";
    const titleAndFirst = `${title} ${firstSentence}`;

    const tags = [];

    // ── Study design — preclinical / in vitro detection ──────────────────
    const isMechanistic = /\bin vitro\b|\bcell line\b|\bmouse model\b|\bmurine\b|\banimal model\b|\bxenograft\b/i.test(titleAndFirst);
    if (isMechanistic) return "preclinical / in vitro study (results may not directly apply to patients)";

    // ── Oncology: Histology / subtype ─────────────────────────────────────
    // Check NSCLC first — prevents "small-cell" matching inside "non-small cell"
    const hasNSCLC = /non-small\s*cell|nsclc/i.test(title);
    const hasSCLC  = /\bsmall[-\s]cell\b|\bsclc\b/i.test(title) && !hasNSCLC;

    if (hasNSCLC) tags.push("NSCLC");
    if (hasSCLC)  tags.push("SCLC");

    // Fallback to first sentence if title has neither
    if (!hasNSCLC && !hasSCLC) {
      if (/non-small\s*cell|nsclc/i.test(firstSentence))                    tags.push("NSCLC");
      else if (/\bsmall[-\s]cell\b|\bsclc\b/i.test(firstSentence))          tags.push("SCLC");
    }

    if (/squamous\s+(?:cell\s+)?(?:carcinoma|nsclc|non-small)/i.test(title)) tags.push("squamous subtype");
    if (/\badenocarcinoma\b/i.test(title))                                    tags.push("adenocarcinoma");

    // ── Oncology: Biomarkers with negation detection ──────────────────────
    const negated = (marker) =>
      new RegExp(
        `regardless of ${marker}|unselected for ${marker}|irrespective of ${marker}|independent of ${marker}|all.?comers|biomarker.?unselected|${marker}.?unselected`,
        "i"
      ).test(titleAndFirst);

    if (/\balk[-\s]positive\b|\balk\s+(?:inhibitor|rearrangement|fusion|mutant|amplification)\b/i.test(title))
      tags.push("ALK-positive");

    if (/egfr\s+exon\s+20|exon\s+20\s+insert/i.test(title))
      tags.push("EGFR exon 20 insertion");
    else if (/\begfr[-\s](?:mutant|mutation|positive|activating|sensitizing)\b|\begfr\s+tki\b/i.test(title) && !negated("egfr"))
      tags.push("EGFR-mutant");

    if (/\bpd-l1\b/i.test(title) && !negated("pd-l1") &&
        !/regardless of pd-l1|unselected|all\s*comers/i.test(titleAndFirst))
      tags.push("PD-L1-selected");

    if (/kras\s+g12c/i.test(title))                                          tags.push("KRAS G12C-mutant");
    else if (/\bkras[-\s]mutant\b/i.test(title))                             tags.push("KRAS-mutant");

    if (/\bros1[-\s]positive\b|\bros1\s+fusion\b/i.test(title))              tags.push("ROS1-positive");
    if (/\bret[-\s]positive\b|\bret\s+fusion\b/i.test(title))                tags.push("RET-positive");
    if (/\bher2[-\s](?:positive|mutant|overexpress)\b/i.test(title))         tags.push("HER2-positive");
    if (/\bntrk\b/i.test(title))                                              tags.push("NTRK-positive");
    if (/met\s+exon\s+14|met\s+amplif/i.test(title))                         tags.push("MET-altered");
    if (/braf\s+v600/i.test(title))                                           tags.push("BRAF V600E");
    if (/\btmb[-\s]high\b/i.test(title))                                      tags.push("TMB-high");
    if (/brca\s*[12]\s+mutant|\bbrca[-\s]mutant\b/i.test(title))             tags.push("BRCA-mutant");

    // ── Oncology: Stage / setting ─────────────────────────────────────────
    if (/\blimited[-\s]stage\b/i.test(title))                                tags.push("limited-stage");
    if (/\bextensive[-\s]stage\b/i.test(title))                              tags.push("extensive-stage");
    if (/\bresectable\b/i.test(title))                                        tags.push("resectable");
    if (/\bunresectable\b/i.test(title))                                      tags.push("unresectable");
    if (/brain\s+metastas/i.test(title))                                      tags.push("brain metastases");
    if (/leptomeningeal/i.test(title))                                        tags.push("leptomeningeal disease");
    if (/\bearly[-\s]stage\b/i.test(title))                                  tags.push("early-stage");
    if (/\badvanced\b|\bmetastatic\b/i.test(title))                          tags.push("advanced/metastatic");
    if (/\boligometastatic\b|\boligo[-\s]metastatic\b/i.test(title))         tags.push("oligometastatic");
    if (/\bneoadjuvant\b/i.test(title))                                       tags.push("neoadjuvant setting");
    if (/\badjuvant\b/i.test(title) && !/\bneoadjuvant\b/i.test(title))      tags.push("adjuvant setting");
    if (/\bperioperative\b/i.test(title))                                     tags.push("perioperative setting");
    if (/\bsurgical\b|\bpost-surgical\b|\bpost-resection\b/i.test(title))    tags.push("post-surgical");

    // ── Oncology: Treatment line ──────────────────────────────────────────
    if (/\bfirst[-\s]line\b/i.test(title))                                   tags.push("first-line");
    if (/\bsecond[-\s]line\b/i.test(title))                                  tags.push("second-line");
    if (/\bthird[-\s]line\b|\blater[-\s]line\b/i.test(title))               tags.push("later-line");
    if (/post[-\s]tki|after\s+tki|tki[-\s](?:resistant|refractory|failure)/i.test(title)) tags.push("post-TKI");
    if (/after\s+(?:anti-)?pd-1|post[-\s]immunotherapy|immunotherapy[-\s](?:refractory|failure)/i.test(title)) tags.push("post-immunotherapy");
    if (/\bsalvage\b|\brefractory\b/i.test(title))                           tags.push("refractory/salvage setting");

    // ── Special populations ───────────────────────────────────────────────
    if (/\belderly\b|\bolder\s+patients\b|\bage\s*[≥>]\s*\d{2}\b/i.test(title)) tags.push("elderly patients");
    if (/\bpediatric\b|\bchildren\b|\bchild\b/i.test(title))                 tags.push("pediatric patients");

    // ── Cardiovascular ────────────────────────────────────────────────────
    if (/\bheart\s+failure\b|\bhfref\b|\bhfpef\b|\bhfmref\b/i.test(title))       tags.push("heart failure");
    if (/\batrial\s+fibrillation\b|\bafib\b/i.test(title))                        tags.push("atrial fibrillation");
    if (/\bcoronary\s+artery\s+disease\b|\bcad\b|\bischemic\s+heart\b/i.test(title)) tags.push("coronary artery disease");
    if (/\bmyocardial\s+infarction\b|\bheart\s+attack\b/i.test(title))            tags.push("myocardial infarction");
    if (/\bhypertension\b|\bhigh\s+blood\s+pressure\b/i.test(title))              tags.push("hypertension");
    if (/\bstroke\b|\bischemic\s+stroke\b|\bcerebrovascular\b/i.test(title))      tags.push("stroke");
    if (/\bcardiovascular\b.*\brisk\b/i.test(title))                               tags.push("high cardiovascular risk");

    // ── Diabetes / metabolic ──────────────────────────────────────────────
    if (/\btype\s+2\s+diabetes\b|\bt2dm\b|\bt2d\b/i.test(title))                  tags.push("type 2 diabetes");
    if (/\btype\s+1\s+diabetes\b|\bt1dm\b|\bt1d\b/i.test(title))                  tags.push("type 1 diabetes");
    if (/\bgestational\s+diabetes\b/i.test(title))                                 tags.push("gestational diabetes");
    if (/\bobesity\b|\bbmi\s*[≥>]\s*30\b/i.test(title))                           tags.push("obesity");
    if (/\bmetabolic\s+syndrome\b/i.test(title))                                   tags.push("metabolic syndrome");

    // ── Neurological ──────────────────────────────────────────────────────
    if (/\bparkinson'?s?\s+disease\b/i.test(title))                                tags.push("Parkinson's disease");
    if (/\balzheimer'?s?\s+disease\b/i.test(title))                                tags.push("Alzheimer's disease");
    if (/\bmultiple\s+sclerosis\b|\brelapsing\s+remitting\b/i.test(title))         tags.push("multiple sclerosis");
    if (/\bepilep/i.test(title))                                                    tags.push("epilepsy");
    if (/\bdementia\b/i.test(title) && !/alzheimer/i.test(title))                  tags.push("dementia");
    if (/\bdeep\s+brain\s+stimulation\b|\bdbs\b/i.test(title))                     tags.push("DBS candidates");

    // ── Respiratory ───────────────────────────────────────────────────────
    if (/\bchronic\s+obstructive\s+pulmonary\b|\bcopd\b/i.test(title))             tags.push("COPD");
    if (/\basthma\b/i.test(title))                                                  tags.push("asthma");
    if (/\bidiopathic\s+pulmonary\s+fibrosis\b|\bipf\b/i.test(title))              tags.push("IPF");

    // ── Renal ─────────────────────────────────────────────────────────────
    if (/\bchronic\s+kidney\s+disease\b|\bckd\b/i.test(title))                     tags.push("chronic kidney disease");
    if (/\bdialysis\b|\bhemodialysis\b/i.test(title))                               tags.push("dialysis patients");
    if (/\bkidney\s+transplant\b|\brenal\s+transplant\b/i.test(title))              tags.push("kidney transplant patients");

    // ── Rheumatology ──────────────────────────────────────────────────────
    if (/\brheumatoid\s+arthritis\b/i.test(title))                                  tags.push("rheumatoid arthritis");
    if (/\bsystemic\s+lupus\b|\bsle\b/i.test(title))                                tags.push("SLE/lupus");
    if (/\bpsoriasis\b/i.test(title))                                                tags.push("psoriasis");
    if (/\bcrohn'?s\b|\binflammatory\s+bowel\b|\bibd\b/i.test(title))              tags.push("inflammatory bowel disease");

    // ── Mental health ─────────────────────────────────────────────────────
    if (/\bmajor\s+depressive\b|\bdepression\b/i.test(title))                       tags.push("depression");
    if (/\bschizophrenia\b/i.test(title))                                            tags.push("schizophrenia");
    if (/\bbipolar\b/i.test(title))                                                  tags.push("bipolar disorder");
    if (/\banxiety\s+disorder\b/i.test(title))                                       tags.push("anxiety disorder");

    // ── Infectious ────────────────────────────────────────────────────────
    if (/\bcovid-?19\b|\bsars-cov-2\b/i.test(title))                               tags.push("COVID-19");
    if (/\bhiv\b|\baids\b/i.test(title))                                             tags.push("HIV/AIDS");
    if (/\btuberculosis\b|\btb\s+patients\b/i.test(title))                          tags.push("tuberculosis");
    if (/\bhepatitis\s+[bc]\b|\bhbv\b|\bhcv\b/i.test(title))                       tags.push("viral hepatitis");

    // ── Other cancers ─────────────────────────────────────────────────────
    if (!/nsclc|sclc|non-small\s*cell|small[-\s]cell|lung/i.test(title)) {
      if (/\bbreast\s+cancer\b/i.test(title))                                        tags.push("breast cancer");
      if (/\bcolorectal\s+cancer\b|\bcolon\s+cancer\b/i.test(title))                tags.push("colorectal cancer");
      if (/\bprostate\s+cancer\b/i.test(title))                                      tags.push("prostate cancer");
      if (/\bpancreatic\s+cancer\b/i.test(title))                                    tags.push("pancreatic cancer");
      if (/\bgastric\s+cancer\b|\bstomach\s+cancer\b/i.test(title))                  tags.push("gastric cancer");
      if (/\bovarian\s+cancer\b/i.test(title))                                        tags.push("ovarian cancer");
      if (/\bhepatocellular\b|\bliver\s+cancer\b/i.test(title))                      tags.push("hepatocellular carcinoma");
      if (/\bmelanoma\b/i.test(title))                                                tags.push("melanoma");
      if (/\bleukemia\b/i.test(title))                                                tags.push("leukemia");
      if (/\blymphoma\b/i.test(title))                                                tags.push("lymphoma");
      if (/\bglioblastoma\b|\bglioma\b|\bbrain\s+tumor\b/i.test(title))              tags.push("brain tumor");
      if (/\bbladder\s+cancer\b/i.test(title))                                        tags.push("bladder cancer");
      if (/\bthyroid\s+cancer\b/i.test(title))                                        tags.push("thyroid cancer");
      if (/\bcervical\s+cancer\b/i.test(title))                                       tags.push("cervical cancer");
    }

    // ── Supplements / nutrition ───────────────────────────────────────────
    if (/\bvitamin\s+d\b/i.test(title))                                              tags.push("vitamin D supplementation");
    if (/\bvitamin\s+[abcek]\b/i.test(title))                                        tags.push("vitamin supplementation");
    if (/\bomega[-\s]3\b|\bfish\s+oil\b/i.test(title))                               tags.push("omega-3 supplementation");
    if (/\bzinc\b/i.test(title))                                                      tags.push("zinc supplementation");
    if (/\bmagnesium\b/i.test(title))                                                 tags.push("magnesium supplementation");
    if (/\bcurcumin\b|\bturmeric\b/i.test(title))                                    tags.push("curcumin/turmeric");
    if (/\bprobiotics?\b/i.test(title))                                               tags.push("probiotic supplementation");
    if (/\bcalcium\b/i.test(title))                                                   tags.push("calcium supplementation");

    // ── Return ────────────────────────────────────────────────────────────
    if (tags.length === 0) return "broad disease population";

    const uniqueTags = [...new Set(tags)];

    // Priority: most specific first
    const PRIORITY_ORDER = [
      "EGFR exon 20 insertion","EGFR-mutant","ALK-positive","KRAS G12C-mutant",
      "KRAS-mutant","ROS1-positive","RET-positive","HER2-positive","NTRK-positive",
      "MET-altered","BRAF V600E","TMB-high","BRCA-mutant","PD-L1-selected",
      "SCLC","NSCLC","squamous subtype","adenocarcinoma",
      "limited-stage","extensive-stage","resectable","unresectable","early-stage",
      "advanced/metastatic","oligometastatic","brain metastases","leptomeningeal disease",
      "first-line","second-line","later-line","adjuvant setting","neoadjuvant setting",
      "perioperative setting","post-surgical","post-TKI","post-immunotherapy",
      "refractory/salvage setting","elderly patients","pediatric patients",
      "type 2 diabetes","type 1 diabetes","gestational diabetes","obesity","metabolic syndrome",
      "heart failure","atrial fibrillation","coronary artery disease","myocardial infarction",
      "hypertension","stroke","high cardiovascular risk",
      "Parkinson's disease","Alzheimer's disease","multiple sclerosis","epilepsy","dementia","DBS candidates",
      "COPD","asthma","IPF",
      "chronic kidney disease","dialysis patients","kidney transplant patients",
      "rheumatoid arthritis","SLE/lupus","psoriasis","inflammatory bowel disease",
      "depression","schizophrenia","bipolar disorder","anxiety disorder",
      "COVID-19","HIV/AIDS","tuberculosis","viral hepatitis",
      "breast cancer","colorectal cancer","prostate cancer","pancreatic cancer",
      "gastric cancer","ovarian cancer","hepatocellular carcinoma","melanoma",
      "leukemia","lymphoma","brain tumor","bladder cancer","thyroid cancer","cervical cancer",
      "vitamin D supplementation","vitamin supplementation","omega-3 supplementation",
      "zinc supplementation","magnesium supplementation","calcium supplementation",
      "curcumin/turmeric","probiotic supplementation",
    ];

    uniqueTags.sort((a, b) => {
      const ia = PRIORITY_ORDER.indexOf(a);
      const ib = PRIORITY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return uniqueTags.slice(0, 4).join(", ");
  }

  // ════════════════════════════════════════════════════════════════════════
  // Intent inference from query string
  // Used when context._intent is not available (fallback paths)
  // ════════════════════════════════════════════════════════════════════════
  _inferIntentFromQuery(query = "") {
    const q = (query || "").toLowerCase();

    if (/side effect|adverse effect|toxicity|tolerability/i.test(q))                  return "side_effects";
    if (/vitamin|supplement|mineral|herb|can i take|should i take|is it safe to|diet|food|eat|drink/i.test(q)) return "safety_efficacy";
    if (/ vs | versus |compare|which is better|head-to-head|difference between/i.test(q)) return "comparison";
    if (/prognosis|survival rate|life expectancy|mortality|5.year survival|outlook/i.test(q)) return "prognosis";
    if (/symptom|diagnos|screening|biomarker|detect/i.test(q))                        return "symptoms_diagnosis";
    if (/mechanism|how does|pathway|why does|how it works/i.test(q))                   return "mechanism";
    if (/prevent|reduce risk|lower risk|prophylaxis|preventive/i.test(q))              return "prevention";
    if (/clinical trial|trial for|trials in|enrolling|recruiting/i.test(q))            return "clinical_trials";
    if (/researcher|expert|scientist|pioneer|who studies/i.test(q))                    return "researchers";
    if (/recent|latest research|new findings|current research|emerging/i.test(q))      return "recent_research";
    if (/treatment|therapy|medication|drug for|how to treat|immunotherapy|chemotherapy/i.test(q)) return "treatment_solutions";

    return "general";
  }

  // ════════════════════════════════════════════════════════════════════════
  // Research insights builder — deterministic synthesis
  // ════════════════════════════════════════════════════════════════════════
  _buildResearchInsights(publications = [], query = "") {
    if (!publications.length) return "No publications available.";

    const evidenceTypes = [...new Set(
      publications.map((p) =>
        this._classifyEvidenceTier(p.title || "", p.abstract || "").split(" —")[0]
      )
    )];

    const applicabilities = publications.map((p) => this._extractApplicability(p));
    const narrowPapers = applicabilities.filter((a) =>
      !/broad disease population|preclinical/i.test(a) && a !== "broad disease population"
    ).length;

    const allText = publications.map((p) => `${p.title} ${p.abstract}`).join(" ").toLowerCase();
    const topThemes = [];
    if (/immune checkpoint|pd-1|pd-l1|immunotherapy/i.test(allText))       topThemes.push("immune checkpoint inhibitor strategies");
    if (/egfr|alk|ros1|ret|kras|targeted therapy/i.test(allText))          topThemes.push("biomarker-directed targeted therapies");
    if (/radiation|radiotherapy|sabr|ablation/i.test(allText))              topThemes.push("combined local therapy approaches");
    if (/supplement|vitamin|dietary|lifestyle/i.test(allText))              topThemes.push("lifestyle and supplementation evidence");
    if (/hba1c|glycemic|sglt2|glp-1/i.test(allText))                       topThemes.push("glycemic control strategies");
    if (/dopamine|levodopa|motor symptoms/i.test(allText))                  topThemes.push("motor symptom management");
    if (/amyloid|tau|cognitive|dementia/i.test(allText))                    topThemes.push("cognitive and neurodegeneration therapies");
    if (/cardiovascular|mace|blood pressure|statin/i.test(allText))        topThemes.push("cardiovascular risk reduction");
    if (/diagnosis|sensitivity|specificity|biomarker/i.test(allText))      topThemes.push("diagnostic and biomarker evidence");
    if (/mechanism|pathway|signaling|molecular/i.test(allText))             topThemes.push("mechanistic and molecular insights");

    let insight = `Evidence strength includes ${evidenceTypes.join(", ")}. `;
    if (topThemes.length > 0) {
      insight += `Key themes identified: ${topThemes.slice(0, 3).join(", ")}. `;
    }
    if (narrowPapers > 0) {
      insight += `${narrowPapers} of ${publications.length} studies apply to specific subgroups (such as biomarker-defined populations, disease subtypes, or specific treatment lines) — these findings should not be generalized to all patients with this disease. `;
    } else {
      insight += `Most included studies apply broadly to the disease population studied. `;
    }
    insight += `Optimal treatment or management decisions depend on individual patient factors including biomarker status, disease stage, comorbidities, and prior treatment history.`;

    return insight.trim();
  }

  // ════════════════════════════════════════════════════════════════════════
  // Recommendations builder
  // Works for ALL query types using intentType
  // Prioritizes Phase 3 > Meta > Phase 2 > Cohort
  // Evidence type diversity across 3 recommendations
  // ════════════════════════════════════════════════════════════════════════
  _buildRecommendations(publications, query = "", intentType = "general") {
    if (!publications.length) {
      return ["Consult a qualified healthcare professional for personalized medical advice."];
    }

    // ── Score each paper by evidence strength ─────────────────────────────
    const classified = publications.map((pub) => {
      const tier  = this._classifyEvidenceTier(pub.title || "", pub.abstract || "");
      const lower = tier.toLowerCase();

      let strength = 0;
      if      (lower.includes("phase 3 rct"))                                          strength = 5;
      else if (lower.includes("meta-analysis") || lower.includes("systematic"))        strength = 4;
      else if (lower.includes("phase 2"))                                               strength = 3;
      else if (lower.includes("prospective") || lower.includes("real-world"))          strength = 2;
      else if (lower.includes("retrospective") || lower.includes("observational"))     strength = 1;

      return {
        pub,
        tier,
        tierShort    : tier.split(" —")[0],
        strength,
        outcome      : this._extractOutcomeHint(pub.abstract || ""),
        applicability: this._extractApplicability(pub),
      };
    });

    // ── Sort by strength descending ───────────────────────────────────────
    const sorted = [...classified].sort((a, b) => b.strength - a.strength);

    // ── Select 3 with evidence-type diversity ─────────────────────────────
    const selected = [];
    const usedStrengths = new Set();

    for (const item of sorted) {
      if (selected.length >= 3) break;
      if (!usedStrengths.has(item.strength) || usedStrengths.size >= 3) {
        selected.push(item);
        usedStrengths.add(item.strength);
      }
    }

    // Backfill if fewer than 3 selected
    if (selected.length < 3) {
      for (const item of sorted) {
        if (selected.length >= 3) break;
        if (!selected.find((s) => s.pub === item.pub)) {
          selected.push(item);
        }
      }
    }

    // ── Build recommendation strings based on intent ───────────────────────
    return selected.map(({ pub, tierShort, outcome, applicability }) => {
      const title      = (pub.title || "").substring(0, 65);
      const hasData    = outcome !== "See abstract below";
      const isSubgroup = applicability && applicability !== "broad disease population";
      const scopeStr   = isSubgroup ? ` in ${applicability}` : "";

      switch (intentType) {

        case "safety_efficacy":
        case "side_effects":
          return hasData
            ? `${tierShort} evidence${scopeStr}: "${title}..." reported ${outcome}. Discuss this safety/efficacy profile with your physician before any changes.`
            : `${tierShort} evidence from "${title}..."${scopeStr}. Consult your physician for the full safety profile.`;

        case "comparison":
          return hasData
            ? `${tierShort} evidence${scopeStr}: "${title}..." reported ${outcome}. Discuss which option suits your specific profile with your specialist.`
            : `${tierShort} comparative evidence from "${title}..."${scopeStr}. Discuss individual suitability with your specialist.`;

        case "prognosis":
          return hasData
            ? `${tierShort} evidence${scopeStr}: "${title}..." reported ${outcome}. Individual prognosis varies — discuss your prognostic factors with your physician.`
            : `${tierShort} prognostic evidence from "${title}..."${scopeStr}. Discuss your specific prognosis with your physician.`;

        case "symptoms_diagnosis":
          return hasData
            ? `${tierShort} evidence${scopeStr}: "${title}..." reported ${outcome}. Discuss whether this diagnostic approach applies to your clinical situation.`
            : `${tierShort} diagnostic evidence from "${title}..."${scopeStr}. Discuss testing strategy with your physician.`;

        case "prevention":
          return hasData
            ? `${tierShort} evidence${scopeStr}: "${title}..." reported ${outcome}. Discuss preventive strategies and your individual risk with your physician.`
            : `${tierShort} prevention evidence from "${title}..."${scopeStr}. Discuss which preventive strategies apply to your situation.`;

        case "mechanism":
          return hasData
            ? `${tierShort} evidence${scopeStr}: "${title}..." demonstrated ${outcome}. This mechanistic finding may have future clinical implications — discuss with your specialist.`
            : `${tierShort} mechanistic evidence from "${title}..."${scopeStr}. Discuss the clinical relevance of these findings with your specialist.`;

        case "clinical_trials":
          return isSubgroup
            ? `For ${applicability}: "${title}..." (${tierShort}) may be relevant. Check eligibility criteria on ClinicalTrials.gov or with your physician.`
            : `"${title}..." (${tierShort}) may be relevant. Check eligibility on ClinicalTrials.gov or discuss with your physician.`;

        case "researchers":
          return hasData
            ? `${tierShort} work${scopeStr}: "${title}..." reported ${outcome}. This represents a key research contribution to this field.`
            : `${tierShort} work from "${title}..."${scopeStr}. This represents an important contribution to current understanding.`;

        case "recent_research":
          return hasData
            ? `Recent ${tierShort} evidence${scopeStr}: "${title}..." reported ${outcome}. Discuss whether these recent findings are relevant to your care.`
            : `Recent ${tierShort} evidence from "${title}..."${scopeStr}. Discuss the latest developments with your specialist.`;

        case "treatment_solutions":
        default:
          if (hasData) {
            return isSubgroup
              ? `Based on ${tierShort} evidence${scopeStr}: "${title}..." reported ${outcome}. Discuss whether this subgroup applies to your case with your oncologist.`
              : `Based on ${tierShort} evidence from "${title}...", reported ${outcome}. Discuss treatment selection with your oncologist.`;
          }
          return isSubgroup
            ? `Evidence from "${title}..." (${tierShort}) applies mainly to ${applicability}. Discuss with your specialist whether this matches your situation.`
            : `${tierShort} evidence from "${title}..." — consult your specialist for relevance to your condition.`;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 5 — Post-verification: grounding
  // ════════════════════════════════════════════════════════════════════════
  _verifyGrounding(keyFindings = [], publications = []) {
    return keyFindings.map((finding) => {
      if (typeof finding !== "string") return finding;

      const citeMatch = finding.match(/\[(\d+)\]/);
      if (!citeMatch) return finding;

      const paperIdx = parseInt(citeMatch[1], 10) - 1;
      if (paperIdx < 0 || paperIdx >= publications.length) {
        console.warn(`⚠️  Citation [${paperIdx + 1}] out of range (${publications.length} papers)`);
        return finding.replace(/\[(\d+)\]/, "[citation-error]");
      }

      const abstract = (publications[paperIdx]?.abstract || "").toLowerCase();
      if (!abstract) return finding;

      const numbersInFinding = finding.match(/\b\d+(\.\d+)?(%| months?| mg| kg| mmhg)?\b/gi) || [];

      const hallucinations = numbersInFinding.filter((num) => {
        const numCore = num.replace(/[%a-z\s]/gi, "").trim();
        if (!numCore || numCore.length < 2) return false;
        if (/^(19|20)\d{2}$/.test(numCore)) return false;
        return !abstract.includes(numCore);
      });

      if (hallucinations.length > 0) {
        console.warn(`⚠️  Grounding failure [${paperIdx + 1}]:`, hallucinations);
        let cleaned = finding;
        hallucinations.forEach((h) => { cleaned = cleaned.replace(h, "[unverified]"); });
        return cleaned;
      }

      return finding;
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Build chat messages
  // ════════════════════════════════════════════════════════════════════════
  buildChatMessages(systemPrompt, conversationHistory = [], userPrompt) {
    const messages = [{ role: "system", content: systemPrompt }];

    conversationHistory.slice(-4).forEach((msg) => {
      if (!msg?.content || !msg?.role) return;
      messages.push({
        role   : msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content).substring(0, 300),
      });
    });

    messages.push({ role: "user", content: userPrompt });
    return messages;
  }

  // ════════════════════════════════════════════════════════════════════════
  // MAIN: generateMedicalResponse
  // ════════════════════════════════════════════════════════════════════════
  async generateMedicalResponse(
    query,
    context        = {},
    publications   = [],
    clinicalTrials = [],
    conversationHistory = [],
    userProfile    = {},
  ) {
    if (!query || typeof query !== "string") {
      return this.generateFallbackResponse("", publications, clinicalTrials, context);
    }

    const isResearcherQuery =
      query.toLowerCase().includes("researcher") ||
      query.toLowerCase().includes("expert")     ||
      query.toLowerCase().includes("scientist");

    const budget = this._getModelBudget();

    let workingPubs    = publications.slice(0, budget.maxPapers);
    let workingTrials  = clinicalTrials.slice(0, budget.maxTrials);
    let workingHistory = conversationHistory.slice(-budget.maxHistoryMsgs);
    let abstractChars  = budget.abstractChars;

    const systemPrompt = this.buildSystemPrompt(context, userProfile, isResearcherQuery);

    let userPrompt = this.buildUserPrompt(
      query, workingPubs, workingTrials, isResearcherQuery,
      { abstractChars, includeUrls: budget.includeUrls, maxPapers: budget.maxPapers, maxTrials: budget.maxTrials },
    );

    let estimatedInput =
      this._estimateTokens(systemPrompt) +
      this._estimateTokens(userPrompt) +
      this._estimateTokens(workingHistory.map((m) => m.content || "").join(" "));

    let shrinkPasses = 0;
    while (estimatedInput + budget.maxOutputTokens > budget.maxInputTokens && shrinkPasses < 4) {
      shrinkPasses++;

      if (workingPubs.length > 3) {
        workingPubs = workingPubs.slice(0, -1);
        console.log(`   ⚠️  Token budget: reduced papers to ${workingPubs.length}`);
      } else if (abstractChars > 150) {
        abstractChars = Math.max(150, abstractChars - 60);
        console.log(`   ⚠️  Token budget: reduced abstract to ${abstractChars} chars`);
      } else {
        break;
      }

      userPrompt = this.buildUserPrompt(
        query, workingPubs, workingTrials, isResearcherQuery,
        { abstractChars, includeUrls: false, maxPapers: workingPubs.length, maxTrials: budget.maxTrials },
      );

      estimatedInput =
        this._estimateTokens(systemPrompt) +
        this._estimateTokens(userPrompt) +
        this._estimateTokens(workingHistory.map((m) => m.content || "").join(" "));
    }

    const safeMaxTokens = Math.max(
      400,
      Math.min(budget.maxOutputTokens, budget.maxInputTokens - estimatedInput - 100),
    );

    const chatMessages = this.buildChatMessages(systemPrompt, workingHistory, userPrompt);

    console.log("\n🤖 LLM Request:");
    console.log(`   Query:        "${query}"`);
    console.log(`   Disease:      "${context.disease || "Not set"}"`);
    console.log(`   Publications: ${workingPubs.length} (of ${publications.length})`);
    console.log(`   Trials:       ${workingTrials.length}`);
    console.log(`   Est. input:   ~${estimatedInput} tokens`);
    console.log(`   Max output:   ${safeMaxTokens} tokens`);
    if (context._clinicalFocus) console.log(`   Focus:        "${context._clinicalFocus}"`);

    try {
      const response = await this.chat(chatMessages, {
        temperature: 0.0,
        top_p      : 0.9,
        max_tokens : safeMaxTokens,
      });

      const structuredResponse = this.parseStructuredResponse(
        response.text, query, workingPubs, workingTrials, context,
      );

      console.log("✅ LLM response generated");
      return {
        structuredResponse,
        rawText   : response.text,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      console.error("LLM error (using fallback):", error.message);
      return this.generateFallbackResponse(query, workingPubs, workingTrials, context);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Parse structured response
  // ════════════════════════════════════════════════════════════════════════
  parseStructuredResponse(text, query, publications = [], clinicalTrials = [], context = {}) {
    if (!text || typeof text !== "string") {
      return this.buildFallbackStructuredResponse("", query, publications, clinicalTrials, context);
    }

    // Intent from context (most reliable) or inferred from query
    const intentType = context?._intent?.type || this._inferIntentFromQuery(query);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.buildFallbackStructuredResponse(text, query, publications, clinicalTrials, context);
      }

      let jsonStr = this._repairTruncatedJson(jsonMatch[0]);

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        console.warn("⚠️  JSON parse failed — attempting field extraction");
        parsed = this._extractFieldsFromText(text, publications);
      }

      if (!parsed) {
        return this.buildFallbackStructuredResponse(text, query, publications, clinicalTrials, context);
      }

      if (Array.isArray(parsed.clinicalTrialsSummary)) {
        parsed.clinicalTrialsSummary = parsed.clinicalTrialsSummary.join(". ");
      }
      if (typeof parsed.clinicalTrialsSummary === "string") {
        parsed.clinicalTrialsSummary = parsed.clinicalTrialsSummary
          .replace(/^(STRING:|ARRAY:|NOTE:)\s*/i, "").trim();
      }

      if (!Array.isArray(parsed.sourceSnippets) || !parsed.sourceSnippets[0]?.title) {
        parsed.sourceSnippets = this.buildSourceSnippets(publications);
      }

      if (Array.isArray(parsed.keyFindings)) {
        parsed.keyFindings = this._verifyGrounding(parsed.keyFindings, publications);
      }

      if (Array.isArray(parsed.keyFindings)) {
        const cited = new Set();
        parsed.keyFindings = parsed.keyFindings.filter((finding) => {
          if (typeof finding !== "string") return true;
          const matches = finding.match(/\[(\d+)\]/g);
          if (!matches) return true;
          const primary = matches[matches.length - 1];
          if (cited.has(primary)) {
            console.log(`   🔄 Duplicate citation removed: ${primary}`);
            return false;
          }
          cited.add(primary);
          return true;
        });
        console.log(`   📝 keyFindings: ${parsed.keyFindings.length} (after dedup + grounding)`);

        // Empty after grounding → deterministic builder
        if (parsed.keyFindings.length === 0 && publications.length > 0) {
          console.log("   ⚠️  Empty keyFindings — using deterministic builder");
          parsed.keyFindings = publications.slice(0, 6).map((pub, idx) => {
            const outcome       = this._extractOutcomeHint(pub.abstract || "");
            const tier          = this._classifyEvidenceTier(pub.title || "", pub.abstract || "");
            const tierShort     = tier.split(" —")[0];
            const applicability = this._extractApplicability(pub);
            const hasData       = outcome !== "See abstract below";
            const scope         = applicability !== "broad disease population" ? ` (${applicability})` : "";
            return hasData
              ? `${tierShort} [${idx + 1}] reported ${outcome}${scope} — "${(pub.title || "").substring(0, 65)}..."`
              : `${tierShort} [${idx + 1}]: "${(pub.title || "").substring(0, 70)}..." — see source for outcome data.`;
          });
        }
      }

      // Fix weak conditionOverview
      if (!parsed.conditionOverview ||
          parsed.conditionOverview.startsWith("Research findings related to:") ||
          parsed.conditionOverview.includes("publications analyzed") ||
          parsed.conditionOverview.includes("originates in the lungs") ||
          (parsed.conditionOverview.includes("leading cause") && parsed.conditionOverview.length < 150)) {
        parsed.conditionOverview = this._buildConditionOverview(query, publications);
      }

      // Fix weak researchInsights
      const researchInsights = this.ensureString(parsed.researchInsights);
      if (!researchInsights ||
          researchInsights.length < 60 ||
          /^\d+ papers retrieved/.test(researchInsights) ||
          researchInsights.includes("Evidence types:")) {
        parsed.researchInsights = this._buildResearchInsights(publications, query);
      }

      // Fix generic recommendations — pass intentType
      const recsArr = this.ensureStringArray(parsed.recommendations);
      if (recsArr.length === 0 ||
          recsArr.every((r) =>
            r.startsWith("Review findings") ||
            r.startsWith("Consult with a healthcare") ||
            r.length < 30
          )) {
        parsed.recommendations = this._buildRecommendations(publications, query, intentType);
      }

      // Fix generic trial summary
      const trialSummary = this.ensureString(parsed.clinicalTrialsSummary);
      if (!trialSummary || trialSummary.length < 30 ||
          trialSummary.startsWith("Found ") ||
          trialSummary.startsWith("Summarise") ||
          trialSummary.startsWith("Summarize")) {
        if (clinicalTrials.length > 0) {
          parsed.clinicalTrialsSummary = this._buildTrialSummary(clinicalTrials);
        }
      }

      // Fix bad safety section
      const safetyArr = this.ensureStringArray(parsed.safetyConsiderations);
      const isSafetyBad = safetyArr.length === 0 ||
        safetyArr.every((s) =>
          s.includes("Safety signal field") ||
          s.includes("Format:") ||
          s.includes("Only write No specific")
        );
      const effectiveSafety = isSafetyBad
        ? this._buildSafetyFromHints(publications)
        : safetyArr;

      return {
        conditionOverview    : this.ensureString(parsed.conditionOverview),
        keyFindings          : this.ensureStringArray(parsed.keyFindings),
        researchInsights     : this.ensureString(parsed.researchInsights),
        clinicalTrialsSummary: this.ensureString(parsed.clinicalTrialsSummary),
        recommendations      : this.ensureStringArray(parsed.recommendations),
        safetyConsiderations : effectiveSafety,
        sourceSnippets       : Array.isArray(parsed.sourceSnippets) ? parsed.sourceSnippets : [],
      };
    } catch (err) {
      console.warn("⚠️  JSON parse failed completely:", err.message);
      return this.buildFallbackStructuredResponse(text, query, publications, clinicalTrials, context);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 6 — Deterministic safety fallback
  // ════════════════════════════════════════════════════════════════════════
  _buildSafetyFromHints(publications = []) {
    const safetyFindings = [];

    publications.slice(0, 8).forEach((pub, idx) => {
      const hint      = this._extractSafetyHint(pub.abstract || "", pub.title || "");
      const titleL    = (pub.title || "").toLowerCase();
      const paperNum  = `[${idx + 1}]`;
      const tier      = this._classifyEvidenceTier(pub.title || "", pub.abstract || "");
      const tierShort = tier.split(" —")[0];

      if (hint && !hint.includes("No specific safety data extracted")) {
        safetyFindings.push(`The ${tierShort} ${paperNum} reported ${hint}.`);
        return;
      }

      if (titleL.includes("without increased risk") || titleL.includes("no increased risk")) {
        const risk = titleL.includes("pneumonia") ? "pneumonia"
                   : titleL.includes("bleeding")  ? "bleeding"
                   : titleL.includes("toxicity")  ? "toxicity"
                   : "adverse events";
        safetyFindings.push(`${paperNum} reported no increased risk of ${risk}.`);
        return;
      }

      if (titleL.includes("well-tolerated") || titleL.includes("manageable")) {
        safetyFindings.push(`${paperNum} described a well-tolerated safety profile.`);
        return;
      }

      if (tier.includes("Observational") || tier.includes("Meta-analysis") ||
          tier.includes("Retrospective") || tier.includes("Case-cohort") || tier.includes("Mendelian")) {
        safetyFindings.push(
          `${paperNum} is an ${tierShort.toLowerCase()} study — clinical adverse event rates (Grade 3/4 AEs) are not applicable to this study design. Safety monitoring should follow standard protocols.`,
        );
        return;
      }

      if (titleL.includes("safety and efficacy") || titleL.includes("efficacy and safety")) {
        const broadMatch =
          (pub.abstract || "").match(/(\d+\.?\d*\s*%)\s+of\s+patients?\s+(?:had|experienced|reported)\s+(?:grade|adverse|serious)/i) ||
          (pub.abstract || "").match(/grade\s*(?:3|≥3).*?(\d+\.?\d*\s*%)/i) ||
          (pub.abstract || "").match(/adverse events?.*?(\d+\.?\d*\s*%)/i);

        safetyFindings.push(
          broadMatch
            ? `${paperNum} reported adverse events in ${broadMatch[1]}.`
            : `${paperNum} studied safety — consult full text for adverse event rates.`,
        );
      }
    });

    return safetyFindings.length > 0
      ? safetyFindings.slice(0, 4)
      : [
          "The included studies are observational or epidemiological in design. Clinical adverse event rates (Grade 3/4 AEs) are not applicable to these study types. Discuss any supplement or intervention use with your oncologist before starting.",
        ];
  }

  // ════════════════════════════════════════════════════════════════════════
  // Deterministic builders
  // ════════════════════════════════════════════════════════════════════════
  _buildConditionOverview(query, publications) {
    if (!publications.length) return `No publications found for "${query}".`;

    const topPub        = publications[0];
    const tier          = this._classifyEvidenceTier(topPub?.title || "", topPub?.abstract || "");
    const tierShort     = tier.split(" —")[0];
    const outcome       = this._extractOutcomeHint(topPub?.abstract || "");
    const applicability = this._extractApplicability(topPub);
    const hasData       = outcome !== "See abstract below";

    let overview = `Current research on "${query}" includes ${publications.length} publications including ${tierShort}s and systematic reviews. `;
    if (hasData && topPub) {
      overview += `The top-ranked study — "${(topPub.title || "").substring(0, 65)}..." — reported ${outcome}`;
      if (applicability && applicability !== "broad disease population") {
        overview += ` in a ${applicability} population`;
      }
      overview += `. `;
    }
    overview += `These findings represent the available evidence base as of ${topPub?.year || "recent years"}.`;
    return overview;
  }

  _buildTrialSummary(clinicalTrials = []) {
    if (clinicalTrials.length === 0) return "No relevant clinical trials were found for this query.";

    const recruiting = clinicalTrials.filter((t) => t.status === "RECRUITING");
    const completed  = clinicalTrials.filter((t) => t.status === "COMPLETED");
    const active     = clinicalTrials.filter((t) => t.status === "ACTIVE_NOT_RECRUITING");

    let summary = `${clinicalTrials.length} relevant clinical trial${clinicalTrials.length > 1 ? "s" : ""} identified. `;

    if (recruiting.length > 0) {
      summary += `${recruiting.length} actively recruiting: `;
      summary += recruiting.slice(0, 3).map((t) => {
        const location     = Array.isArray(t.locations) && t.locations.length > 0 ? t.locations[0] : "N/A";
        const phase        = t.phase || "N/A";
        const intervention = Array.isArray(t.interventions) && t.interventions.length > 0 ? t.interventions[0] : "investigational treatment";
        const contact      = t.contact?.email ? ` (contact: ${t.contact.email})` : "";
        return `"${(t.title || "").substring(0, 55)}..." testing ${intervention} (${phase}, ${location})${contact}`;
      }).join("; ") + ". ";
    }

    if (active.length    > 0) summary += `${active.length} active but not recruiting. `;
    if (completed.length > 0) summary += `${completed.length} completed trial${completed.length > 1 ? "s" : ""} available for reference. `;

    summary += `Check ClinicalTrials.gov for latest eligibility and enrollment status.`;
    return summary;
  }

  _repairTruncatedJson(jsonStr) {
    try { JSON.parse(jsonStr); return jsonStr; } catch {}

    let r = jsonStr.trim();
    r = r.replace(/,?\s*"[^"]*$/, "");
    r = r.replace(/,\s*$/, "");

    const opens    = (r.match(/\{/g) || []).length;
    const closes   = (r.match(/\}/g) || []).length;
    const openArr  = (r.match(/\[/g) || []).length;
    const closeArr = (r.match(/\]/g) || []).length;

    for (let i = 0; i < openArr - closeArr; i++) r += "]";
    for (let i = 0; i < opens  - closes;   i++) r += "}";

    return r;
  }

  _extractFieldsFromText(text, publications = []) {
    try {
      const findingsMatch = text.match(/"keyFindings"\s*:\s*\[([\s\S]*?)\]/);
      const overviewMatch = text.match(/"conditionOverview"\s*:\s*"([^"]+)"/);
      const insightsMatch = text.match(/"researchInsights"\s*:\s*"([^"]+)"/);
      const trialsMatch   = text.match(/"clinicalTrialsSummary"\s*:\s*"([^"]+)"/);
      const recsMatch     = text.match(/"recommendations"\s*:\s*\[([\s\S]*?)\]/);
      const safetyMatch   = text.match(/"safetyConsiderations"\s*:\s*\[([\s\S]*?)\]/);

      if (!findingsMatch && !overviewMatch) return null;

      const parseArray = (matchStr) => {
        if (!matchStr) return [];
        try { return JSON.parse(`[${matchStr}]`); }
        catch { return (matchStr.match(/"([^"]+)"/g) || []).map((m) => m.replace(/^"|"$/g, "")); }
      };

      return {
        conditionOverview    : overviewMatch ? overviewMatch[1] : "",
        keyFindings          : parseArray(findingsMatch?.[1]).filter((f) => typeof f === "string"),
        researchInsights     : insightsMatch ? insightsMatch[1] : "",
        clinicalTrialsSummary: trialsMatch   ? trialsMatch[1]   : "",
        recommendations      : parseArray(recsMatch?.[1]).filter((r) => typeof r === "string"),
        safetyConsiderations : parseArray(safetyMatch?.[1]).filter((s) => typeof s === "string"),
        sourceSnippets       : this.buildSourceSnippets(publications),
      };
    } catch {
      return null;
    }
  }

  ensureString(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map((v) => this.ensureString(v)).join(". ");
    if (typeof value === "object") return Object.values(value).filter((v) => typeof v === "string").join(" - ");
    return String(value);
  }

  ensureStringArray(value) {
    if (!value) return [];
    if (!Array.isArray(value)) return [this.ensureString(value)].filter(Boolean);
    return value.map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null) {
        const candidates = [
          item.title, item.description, item.point, item.text,
          item.recommendation, item.consideration, item.finding, item.content,
        ].filter((v) => typeof v === "string");
        return candidates.length > 0
          ? candidates.join(": ")
          : Object.values(item).filter((v) => typeof v === "string").join(" - ");
      }
      return String(item);
    }).filter((item) => item && item.trim().length > 0);
  }

  buildSourceSnippets(publications = []) {
    return publications.slice(0, 5).map((pub) => ({
      title   : pub.title  || "Untitled",
      authors : Array.isArray(pub.authors) ? pub.authors.slice(0, 2).join(", ") : "Unknown",
      year    : pub.year   || null,
      platform: (pub.source || "unknown").toUpperCase(),
      url     : pub.url    || "",
      snippet : pub.abstract ? pub.abstract.substring(0, 80) : "No abstract available",
    }));
  }

  buildFallbackStructuredResponse(rawText, query, publications = [], clinicalTrials = [], context = {}) {
    const intentType = context?._intent?.type || this._inferIntentFromQuery(query);

    const findings = publications.slice(0, 8).map((pub, idx) => {
      const outcome       = this._extractOutcomeHint(pub.abstract || "");
      const tier          = this._classifyEvidenceTier(pub.title || "", pub.abstract || "");
      const tierShort     = tier.split(" —")[0];
      const applicability = this._extractApplicability(pub);
      const hasData       = outcome !== "See abstract below";
      const scope         = applicability !== "broad disease population" ? ` (${applicability})` : "";

      return hasData
        ? `${tierShort} [${idx + 1}] reported ${outcome}${scope} — "${(pub.title || "").substring(0, 65)}..."`
        : `${tierShort} [${idx + 1}]: "${(pub.title || "").substring(0, 70)}..." — see source for outcome data.`;
    });

    return {
      conditionOverview    : this._buildConditionOverview(query, publications),
      keyFindings          : findings.length > 0 ? findings : ["No specific findings extracted. Please refine your query."],
      researchInsights     : this._buildResearchInsights(publications, query),
      clinicalTrialsSummary: this._buildTrialSummary(clinicalTrials),
      recommendations      : this._buildRecommendations(publications, query, intentType),
      safetyConsiderations : this._buildSafetyFromHints(publications),
      sourceSnippets       : this.buildSourceSnippets(publications),
    };
  }

  generateFallbackResponse(query, publications = [], clinicalTrials = [], context = {}) {
    console.log("⚠️  Using deterministic fallback response");
    const structured = this.buildFallbackStructuredResponse("", query, publications, clinicalTrials, context);

    // Ensure rawText is never empty — Mongoose requires non-empty content
    const rawText = publications.length > 0
      ? `Based on ${publications.length} publication${publications.length > 1 ? "s" : ""}${context.disease ? ` for ${context.disease}` : ""}:\n\n` +
        publications.slice(0, 3).map((p, i) =>
          `${i + 1}. ${p.title} (${p.year}): ${(p.abstract || "").substring(0, 180)}...`
        ).join("\n\n") +
        "\n\nConsult a healthcare professional for personalised advice."
      : `Medical research assistant. No publications found for "${query}". Please try rephrasing or consulting a healthcare professional.`;

    return { structuredResponse: structured, rawText, tokensUsed: 0 };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Entity extraction
  // ════════════════════════════════════════════════════════════════════════
  async extractEntities(text) {
    if (!text || typeof text !== "string") {
      return { diseases: [], symptoms: [], treatments: [], medications: [], procedures: [] };
    }

    const prompt = `Extract medical entities from this text. Return ONLY JSON.
Text: "${text.substring(0, 300)}"
Return exactly: {"diseases":[],"symptoms":[],"treatments":[],"medications":[],"procedures":[]}
Only include entities explicitly mentioned. Empty arrays if none.`;

    try {
      const response = await this.generate(prompt, { temperature: 0.1, max_tokens: 300 });
      const match    = (response.text || "").match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          diseases   : Array.isArray(parsed.diseases)    ? parsed.diseases    : [],
          symptoms   : Array.isArray(parsed.symptoms)    ? parsed.symptoms    : [],
          treatments : Array.isArray(parsed.treatments)  ? parsed.treatments  : [],
          medications: Array.isArray(parsed.medications) ? parsed.medications : [],
          procedures : Array.isArray(parsed.procedures)  ? parsed.procedures  : [],
        };
      }
    } catch (error) {
      console.error("Entity extraction error:", error.message);
    }

    return { diseases: [], symptoms: [], treatments: [], medications: [], procedures: [] };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Disease normalisation
  // ════════════════════════════════════════════════════════════════════════
  async normalizeDisease(disease) {
    if (!disease || typeof disease !== "string") return disease;

    const prompt = `Normalize to standard medical term. Return ONLY the term, nothing else.
Input: "${disease}"
Standard term:`;

    try {
      const response = await this.generate(prompt, { temperature: 0.1, max_tokens: 30 });
      return (response.text || disease).trim().replace(/['"]/g, "").split("\n")[0];
    } catch (error) {
      console.error("Disease normalisation error:", error.message);
      return disease;
    }
  }
}

export default new LLMService();