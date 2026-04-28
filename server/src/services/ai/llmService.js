import axios from "axios";
import ollamaConfig from "../../config/ollama.js";

class LLMService {
  constructor() {
    this.baseURL = ollamaConfig.getBaseURL();
    this.model = ollamaConfig.getModel();
    this.timeout = ollamaConfig.getTimeout();
    this.client = ollamaConfig.getClient();
  }

  // ════════════════════════════════════════════════════════════════════════
  // CORE: Generate text completion
  // ════════════════════════════════════════════════════════════════════════
  async generate(prompt, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.1,
        top_p: options.top_p ?? 0.9,
        max_tokens: options.max_tokens ?? 512,
      });
      return {
        text: response.choices[0]?.message?.content || "",
        tokensUsed: response.usage?.completion_tokens || 0,
        model: this.model,
      };
    } catch (error) {
      console.error("❌ LLM generate error:", error.message);
      throw new Error("LLM generate failed");
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // CORE: Chat completion (multi-turn)
  // ════════════════════════════════════════════════════════════════════════
  async chat(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: String(msg.content || ""),
        })),
        temperature: options.temperature ?? 0.1,
        top_p: options.top_p ?? 0.9,
        max_tokens: options.max_tokens ?? 1000,
      });
      return {
        text: response.choices[0]?.message?.content || "",
        tokensUsed: response.usage?.completion_tokens || 0,
        model: this.model,
      };
    } catch (error) {
      console.error("❌ LLM chat error:", error.message);
      throw new Error("LLM chat failed");
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // BUILD SYSTEM PROMPT
  // ════════════════════════════════════════════════════════════════════════
  buildSystemPrompt(context, userProfile = {}, isResearcherQuery = false) {
    const disease = context?.disease || "the medical condition";
    const location = context?.location || userProfile?.location || null;
    const isLifestyleQuery = context?.isLifestyleQuery || false;
    const originalQuery = context?.originalQuery || "";
    const searchMode = context?.searchMode || "keyword";
    const clinicalFocus = context?._clinicalFocus || "";
    const mustHaveSignals = context?._mustHaveSignals || [];

    const prevEntities =
      Array.isArray(context?.responseEntities) &&
      context.responseEntities.length > 0
        ? context.responseEntities
        : [];

    const noLocalTrials = context?.noLocalTrials || false;
    const fallbackCount = context?.fallbackTrialCount || 0;

    const trialInstruction =
      noLocalTrials && fallbackCount > 0
        ? `Start with: No clinical trials were found near ${location}. Then summarise global trials shown.`
        : noLocalTrials && fallbackCount === 0
          ? `State that no clinical trials are currently available. Check ClinicalTrials.gov.`
          : location
            ? `Summarise trials near ${location}. Mention phase, intervention, status, contact.`
            : "Summarise the most relevant clinical trials with phase, status, intervention.";

    let prompt = `You are Curalink, a medical AI research assistant.

CORE RULES:
1. Write about the condition in the PAPERS provided
   If papers are about diabetes → discuss diabetes findings
   If papers are about lung cancer → discuss lung cancer findings
   Do NOT refuse to discuss a paper because it differs from "${disease}"
2. Key findings MUST come ONLY from the papers listed below
3. Each key finding MUST cite a DIFFERENT paper [1], [2], [3]...
4. Do NOT cite the same [N] twice in keyFindings
5. clinicalTrialsSummary must be a plain STRING — never an array
6. Return ONLY valid JSON — no markdown, no text before/after
7. NEVER fabricate findings not present in the papers

CITATION RULES:
- Generate 6-8 key findings, one per paper
- Each [N] appears EXACTLY ONCE in keyFindings
- Include specific numbers: ORR %, OS months, HR, p-value
- Format: "[Drug/treatment] showed [outcome with number] in [patients] [N]"
- GOOD: "Pembrolizumab achieved ORR 45.2% and median OS 16.7 months in PD-L1 ≥50% NSCLC [3]"
- BAD: "Pembrolizumab shows promising results [3]" — TOO VAGUE
- Use the "Key outcome" field per paper as the core of each finding

EVIDENCE QUALITY:
- Phase 3 RCT / large meta-analysis: state directly — "The Phase 3 trial demonstrated..."
- Phase 2 / cohort: qualify — "A Phase 2 study (n=248) showed..."
- Pilot / retrospective: label — "A small retrospective study (n=42) suggested..."

SAFETY RULES — READ CAREFULLY:
Each paper now has a "Safety signal" field pre-extracted from the abstract.
You MUST use this field.

Step 1 — Check "Safety signal" field per paper:
- "Grade 3+ AE: 38%" → report: "The [study] [N] reported grade 3+ AEs in 38% of patients"
- "Discontinuation: 12%" → report it with [N]
- "Safety conclusion: well-tolerated" → report it with [N]
- "Comparative safety: no increased risk of..." → report it with [N]
- "No specific safety data extracted" → then check title and abstract

Step 2 — Check TITLES for safety signals:
- Title contains "without increased risk" → report no increased risk [N]
- Title contains "Efficacy and Safety" → abstract has adverse event data, find it
- Title contains "well-tolerated" or "manageable" → report with [N]

Step 3 — Scan abstracts for remaining safety signals:
- Grade 3/4 AE rates
- Immune-related adverse events (irAE)
- Discontinuation rates
- Specific toxicities with percentages

Step 4 — Format:
- "The [study type] [N] reported [specific finding with number]"
- NEVER report a number unless it is specifically a safety RATE/OUTCOME
- If a percentage appears near "trials" or "studies" (not patients), skip it

Step 5 — Minimum:
- If 8 papers provided → at least 2-3 safety findings required
- "Efficacy AND Safety" papers ALWAYS have safety data — find it`;

    // ── SMART mode ────────────────────────────────────────────────────────
    if (searchMode === "semantic" && clinicalFocus) {
      prompt += `

SMART MODE — CLINICAL FOCUS: "${clinicalFocus}"
${mustHaveSignals.length > 0 ? `Emphasize: ${mustHaveSignals.join(", ")}` : ""}
Prioritize papers directly addressing: "${clinicalFocus}"`;
    }

    // ── Lifestyle query ───────────────────────────────────────────────────
    if (isLifestyleQuery) {
      prompt += `

LIFESTYLE QUERY: "${originalQuery}"
- Answer based ONLY on what the papers say
- If no papers address this: state "The research database does not contain direct studies on [topic]. Consult your doctor."
- Do NOT cite chemotherapy papers as evidence about food/supplements`;
    }

    // ── Low result count ──────────────────────────────────────────────────
    if (context?.lowResultCount) {
      prompt += `

LOW RESULT WARNING: Only ${context.actualPaperCount} paper(s) found.
- Only cite the ${context.actualPaperCount} paper(s) provided
- Do NOT fill gaps with training knowledge
- If insufficient: "Limited research found. Available evidence suggests..."`;
    }

    // ── Location ──────────────────────────────────────────────────────────
    if (location) {
      if (noLocalTrials && fallbackCount > 0) {
        prompt += `

LOCATION: ${location} — No local trials found.
${fallbackCount} global trials shown. In clinicalTrialsSummary:
"No trials near ${location}. Global trials shown for reference: [summary]"`;
      } else if (noLocalTrials && fallbackCount === 0) {
        prompt += `

LOCATION: ${location} — No trials found globally.
State: "No clinical trials currently available. Check ClinicalTrials.gov."`;
      } else {
        prompt += `

LOCATION: ${location} — Prioritize nearby trials in clinicalTrialsSummary.`;
      }
    }

    // ── Researcher mode ───────────────────────────────────────────────────
if (isResearcherQuery) {
  prompt += `

RESEARCHER QUERY MODE:
- Format keyFindings as researcher contributions — NOT generic disease findings
- Format: "Author Name (Year): [what they discovered] — [specific number/finding] [N]"
- GOOD: "Yan Keqiang (2026): demonstrated plasma tau 181 sensitivity 89% for AD diagnosis [1]"
- BAD: "Dr. Yan Keqiang (Institution): plasma tau showed differences [1]"
- Do NOT write "(Institution)" — write the actual finding
- safetyConsiderations: state "Safety data is available in full text of each referenced publication [N]"
- recommendations: summarize which research directions show most promise, not treatment guidelines`;
}

    // ── Previous context ──────────────────────────────────────────────────
    if (prevEntities.length > 0) {
      prompt += `

PREVIOUS RESPONSE MENTIONED: ${prevEntities.join(", ")}`;
    }

    if (
      Array.isArray(context?.previousQueries) &&
      context.previousQueries.length > 0
    ) {
      prompt += `\nRECENT TOPICS: ${context.previousQueries.slice(-2).join(" → ")}`;
    }

    // ── Response format ───────────────────────────────────────────────────
    prompt += `

DISEASE IN FOCUS: "${disease}"

Return ONLY this JSON:
{
  "conditionOverview": "2-3 sentences about the condition in the papers, relevant to the query.",
  "keyFindings": ["finding [1]", "finding [2]", "finding [3]", "finding [4]", "finding [5]", "finding [6]", "finding [7] if available", "finding [8] if available"],
  "researchInsights": "2-3 sentences on research quality, trends, gaps.",
  "clinicalTrialsSummary": "${trialInstruction}",
  "recommendations": ["Based on [evidence type] [N] showing [outcome]: consider [action]"],
  "safetyConsiderations": ["Use Safety signal field. The [study] [N] reported [finding]", "Second [N]", "Third [N]"],
  "sourceSnippets": [{"title": "exact title", "authors": "A, B", "year": 2024, "platform": "PUBMED", "url": "url", "snippet": "80 char quote"}]
}`;

    return prompt;
  }

  // ════════════════════════════════════════════════════════════════════════
  // BUILD USER PROMPT
  // ════════════════════════════════════════════════════════════════════════
 buildUserPrompt(
  query,
  publications = [],
  clinicalTrials = [],
  isResearcherQuery = false,
) {
  const queryLower = query.toLowerCase();

  // ── Clinical context detection ──────────────────────────────────────────
  const isProgressionQuery =
    queryLower.includes("progressed") ||
    queryLower.includes("stopped working") ||
    queryLower.includes("next line") ||
    queryLower.includes("second line") ||
    queryLower.includes("third line") ||
    queryLower.includes("after immunotherapy") ||
    queryLower.includes("after chemotherapy") ||
    queryLower.includes("post-immunotherapy") ||
    queryLower.includes("salvage") ||
    queryLower.includes("refractory") ||
    queryLower.includes("resistant") ||
    (queryLower.includes("after") &&
      (queryLower.includes("failed") || queryLower.includes("failure")));

  const isComparisonQuery =
    queryLower.includes(" vs ") ||
    queryLower.includes(" versus ") ||
    queryLower.includes("compare") ||
    queryLower.includes("which is better") ||
    queryLower.includes("which has better") ||
    queryLower.includes("head-to-head") ||
    queryLower.includes("difference between") ||
    queryLower.includes("better than") ||
    queryLower.includes("superior");

  const isCNSQuery =
    queryLower.includes("brain") ||
    queryLower.includes("cns") ||
    queryLower.includes("intracranial") ||
    queryLower.includes("blood-brain") ||
    queryLower.includes("metastases") ||
    queryLower.includes("leptomeningeal") ||
    queryLower.includes("cranial");

  const isSafetyQuery =
    queryLower.includes("side effect") ||
    queryLower.includes("adverse") ||
    queryLower.includes("toxicity") ||
    (queryLower.includes("safe") && !queryLower.includes("safety and"));

  const isDiagnosisQuery =
    queryLower.includes("diagnos") ||
    queryLower.includes("symptom") ||
    queryLower.includes("screening") ||
    queryLower.includes("biomarker") ||
    queryLower.includes("detect");

  const isPrognosisQuery =
    queryLower.includes("prognosis") ||
    queryLower.includes("survival rate") ||
    queryLower.includes("life expectancy") ||
    queryLower.includes("mortality") ||
    queryLower.includes("5-year survival") ||
    queryLower.includes("outlook");

  const isMechanismQuery =
    queryLower.includes("mechanism") ||
    queryLower.includes("how does") ||
    queryLower.includes("pathway") ||
    queryLower.includes("why does") ||
    queryLower.includes("how it works");

  const isClinicalTrialQuery =
    queryLower.includes("clinical trial") ||
    queryLower.includes("trial for") ||
    queryLower.includes("trials for") ||
    queryLower.includes("trials in") ||
    queryLower.includes("enrolling") ||
    queryLower.includes("recruiting");

  // ── Drug/mutation extraction ────────────────────────────────────────────
  const DRUG_PATTERNS = [
    // ALK inhibitors
    "alectinib", "lorlatinib", "brigatinib", "crizotinib", "ceritinib",
    "ensartinib", "neladalkib",
    // EGFR inhibitors
    "osimertinib", "erlotinib", "gefitinib", "afatinib", "lazertinib",
    "zorifertinib", "amivantamab",
    // Immunotherapy
    "pembrolizumab", "nivolumab", "atezolizumab", "durvalumab",
    "ipilimumab", "cemiplimab", "tislelizumab",
    // Chemotherapy
    "chemotherapy", "carboplatin", "pemetrexed", "paclitaxel",
    "docetaxel", "vinorelbine", "gemcitabine",
    // Other targeted
    "bevacizumab", "ramucirumab", "capmatinib", "tepotinib",
    "selpercatinib", "pralsetinib", "adagrasib", "sotorasib",
    "trastuzumab", "sacituzumab",
    // Diabetes drugs
    "metformin", "semaglutide", "tirzepatide", "empagliflozin",
    "dapagliflozin", "liraglutide", "sitagliptin", "canagliflozin",
    "insulin", "orforglipron",
    // Cardiology
    "atorvastatin", "rosuvastatin", "aspirin", "warfarin",
    "apixaban", "rivaroxaban", "sacubitril", "lisinopril",
  ];

  const MUTATION_PATTERNS = [
    "egfr", "alk", "ros1", "ret", "met", "kras", "braf",
    "her2", "ntrk", "pd-l1", "tmb", "t790m", "exon 20",
    "g12c", "l858r", "ex19del",
  ];

  const mentionedDrugs     = DRUG_PATTERNS.filter((d) => queryLower.includes(d));
  const mentionedMutations = MUTATION_PATTERNS.filter((m) => queryLower.includes(m));

  // ── Detect failed treatment for progression queries ─────────────────────
  const getFailedTreatment = () => {
    if (mentionedDrugs.length > 0) return mentionedDrugs[0];
    if (queryLower.includes("immunotherapy") || queryLower.includes("ici")) return "immunotherapy";
    if (queryLower.includes("egfr") || queryLower.includes("tki")) return "EGFR-TKI";
    if (queryLower.includes("alk") || queryLower.includes("alectinib")) return "ALK inhibitor";
    if (queryLower.includes("chemotherapy")) return "chemotherapy";
    return "the previous treatment";
  };

  // ── Clinical answer framing ─────────────────────────────────────────────
  // This tells the LLM EXACTLY what type of answer the user needs
  // Works for ALL query types — not hardcoded to specific drugs/diseases
  let clinicalAnswerNeeded = "";

  if (isProgressionQuery) {
    const failedDrug = getFailedTreatment();
    clinicalAnswerNeeded =
      `OPTIONS after ${failedDrug} failure.\n` +
      `Focus on: next-generation drugs, resistance-specific options, clinical trial eligibility.\n` +
      `Key data: PFS, OS, ORR specifically after prior ${failedDrug} failure.\n` +
      `Do NOT report first-line efficacy data — focus on the progression/post-failure setting.`;
  } else if (isComparisonQuery) {
    const drugs = mentionedDrugs.slice(0, 2).join(" vs ");
    clinicalAnswerNeeded =
      `HEAD-TO-HEAD comparison of: ${drugs || "the mentioned treatments"}.\n` +
      `Focus on: relative PFS, OS, ORR, and safety differences.\n` +
      `Clearly state which treatment performed better and in which patient population.\n` +
      `Key data: hazard ratios, p-values, subgroup analyses.`;
  } else if (isCNSQuery) {
    clinicalAnswerNeeded =
      `CNS-specific clinical data.\n` +
      `Focus on: intracranial ORR, CNS PFS, blood-brain barrier penetration rates.\n` +
      `Name specific drugs known to cross BBB: osimertinib, lorlatinib, alectinib.\n` +
      `Key data: intracranial response rates (%), CNS control rates, CNS PFS in months.`;
  } else if (isSafetyQuery) {
    clinicalAnswerNeeded =
      `Safety and tolerability data.\n` +
      `Focus on: grade 3/4 adverse event rates, specific toxicities, discontinuation rates.\n` +
      `Key data: % patients with serious AEs, immune-related AEs (irAEs), organ toxicities.\n` +
      `Compare safety profiles if multiple drugs are mentioned.`;
  } else if (isDiagnosisQuery) {
    clinicalAnswerNeeded =
      `Diagnostic or biomarker data.\n` +
      `Focus on: sensitivity, specificity, diagnostic accuracy of tests/biomarkers.\n` +
      `Key data: AUC, sensitivity %, specificity %, PPV, NPV.`;
  } else if (isPrognosisQuery) {
    clinicalAnswerNeeded =
      `Prognostic data.\n` +
      `Focus on: overall survival rates, median OS, disease-free survival.\n` +
      `Key data: 1-year, 3-year, 5-year survival rates, hazard ratios by stage.`;
  } else if (isMechanismQuery) {
    clinicalAnswerNeeded =
      `Mechanistic understanding.\n` +
      `Focus on: biological pathways, mechanism of action, resistance mechanisms.\n` +
      `Explain HOW the treatment works at a molecular level.`;
  } else if (isClinicalTrialQuery) {
    clinicalAnswerNeeded =
      `Clinical trial data.\n` +
      `Focus on: trial phase, enrollment status, intervention type, location, eligibility.\n` +
      `Key data: phase, primary endpoint, patient population, trial locations.`;
  } else {
    // General treatment outcome — covers "latest treatment", "best treatment",
    // "treatment options", bare disease queries, etc.
    clinicalAnswerNeeded =
      `Treatment outcome data.\n` +
      `Focus on: efficacy (ORR, PFS, OS), study design quality, patient population.\n` +
      `Key data: response rates, survival data, hazard ratios.\n` +
      `Prioritize Phase 3 RCTs and large meta-analyses over smaller studies.`;
  }

  // ── Build prompt ────────────────────────────────────────────────────────
  let prompt = `QUERY: "${query}"\n\n`;
  prompt += `CLINICAL CONTEXT: ${clinicalAnswerNeeded}\n`;

  if (mentionedDrugs.length > 0) {
    prompt += `Drugs in query: ${mentionedDrugs.join(", ")}\n`;
  }
  if (mentionedMutations.length > 0) {
    prompt += `Biomarkers in query: ${mentionedMutations.join(", ")}\n`;
  }
  prompt += `\n`;

if (isResearcherQuery) {
  prompt +=
    `TASK: Identify lead researchers and their contributions.\n` +
    `Format keyFindings as: ["Lead Author Name: specific research contribution — key finding [N]"]\n` +
    `Example: "Yan Keqiang (2026): showed plasma phosphorylated tau 181 has diagnostic value for AD — sensitivity 89%, specificity 92% [1]"\n` +
    `Do NOT write "(Institution)" as a placeholder — use the actual finding instead.\n` +
    `Focus on WHAT they discovered/demonstrated/showed, not WHO they are.\n\n`;
}

  const totalPapers = Math.min(publications.length, 8);
  prompt +=
    `You have ${totalPapers} papers. Cite ALL [1]–[${totalPapers}]. Each [N] ONCE only.\n\n`;

  prompt += `=== PAPERS ===\n`;

  publications.slice(0, 8).forEach((pub, idx) => {
    const authors = Array.isArray(pub.authors)
      ? pub.authors.slice(0, 2).join(", ")
      : "Unknown";

    // ✅ FIX: 400 chars for abstract
    // Safety data and fuller clinical context appear at chars 300-400
    // This fixes:
    //   1. Safety "no specific data" for most papers
    //   2. Vague p-values without clinical context (e.g. "p=0.01" without endpoint)
    // Token budget:
    //   System prompt: ~400 tokens
    //   8 papers × 400 chars ≈ ~800 tokens
    //   User prompt overhead: ~300 tokens
    //   Total input: ~1500 tokens
    //   max_tokens output: 2500
    //   Total: ~4000 << 8192 Groq limit ✅
    const abstract = pub.abstract
      ? pub.abstract.substring(0, 400)
      : "No abstract";

    // ✅ Outcome hint: searched in full abstract (not truncated)
    // Numbers can appear anywhere in abstract
    const outcomeHint = this._extractOutcomeHint(pub.abstract || "");

    // ✅ Safety hint: searched in first 500 chars
    // Grade 3 AE rates typically appear after efficacy data (chars 300-500)
    // _extractSafetyHint handles negative contexts to prevent hallucination
    const safetyHint = this._extractSafetyHint(
      pub.abstract ? pub.abstract.substring(0, 500) : "",
      pub.title || "",
    );

    // ✅ Evidence tier: helps LLM qualify findings correctly
    // "Phase 3 RCT" → direct statement
    // "Pilot study" → "suggested"
    const evidenceTier = this._classifyEvidenceTier(
      pub.title || "",
      pub.abstract || "",
    );

    prompt +=
      `[${idx + 1}] ${pub.title || "Untitled"} (${pub.year || "N/A"})\n` +
      `Authors: ${authors} | Source: ${(pub.source || "").toUpperCase()}\n` +
      `Evidence: ${evidenceTier}\n` +
      `Key outcome: ${outcomeHint}\n` +
      `Safety signal: ${safetyHint}\n` +
      `Abstract: ${abstract}\n` +
      `URL: ${pub.url || ""}\n\n`;
  });

  if (clinicalTrials.length > 0) {
    prompt += `=== TRIALS (top 3) ===\n`;
    clinicalTrials.slice(0, 3).forEach((trial, idx) => {
      const locs  = Array.isArray(trial.locations)
        ? trial.locations.slice(0, 2).join("; ")
        : "N/A";
      const conds = Array.isArray(trial.conditions)
        ? trial.conditions.slice(0, 2).join(", ")
        : "N/A";
      const interventions = Array.isArray(trial.interventions)
        ? trial.interventions.slice(0, 2).join(", ")
        : "N/A";

      prompt +=
        `[T${idx + 1}] ${trial.title || "Untitled"}\n` +
        `Status: ${trial.status || "Unknown"} | Phase: ${trial.phase || "N/A"}\n` +
        `Conditions: ${conds}\n` +
        `Interventions: ${interventions}\n` +
        `Locations: ${locs}\n` +
        `Contact: ${trial.contact?.email || "See URL"}\n` +
        `URL: ${trial.url || ""}\n\n`;
    });
  }

  prompt +=
    `INSTRUCTIONS:\n` +
    `- Answer using ONLY the papers above\n` +
    `- One finding per paper, each [N] ONCE\n` +
    `- Lead each finding with the most clinically relevant data point\n` +
    `- Use Key outcome field as the core number — include the actual value\n` +
    `- Use Safety signal field in safetyConsiderations — report the actual finding\n` +
    `- If Safety signal says "No specific safety data extracted" → check abstract yourself\n` +
    `- Phase 3 RCT = direct statement; Pilot = "suggested"; Meta-analysis = "pooled data showed"\n` +
    `- clinicalTrialsSummary: include phase, location, intervention, recruiting status, contact\n` +
    `- recommendations: cite specific papers with their actual outcome data\n` +
    `- Do NOT write "X shows promising results" — always include the specific number\n` +
    `- Return JSON ONLY`;

  return prompt;
}
  // ════════════════════════════════════════════════════════════════════════
  // ✅ NEW: Extract safety hint from abstract
  // Pre-extracts safety data so LLM doesn't miss it
  // Called per paper in buildUserPrompt()
  // ════════════════════════════════════════════════════════════════════════
  _extractSafetyHint(abstract, title = "") {
    if (!abstract || abstract.length < 20) {
      return "No specific safety data extracted";
    }

    const titleLower = title.toLowerCase();
    const abstractLower = abstract.toLowerCase();

    // ✅ FIX: Pre-check for NEGATIVE safety context
    // "without increased pneumonia risk" → the numbers nearby are NOT rates
    // Report the conclusion, not the number
    const isNegativeSafetyContext =
      abstractLower.includes("without increased") ||
      abstractLower.includes("no increased risk") ||
      abstractLower.includes("no significant increase") ||
      abstractLower.includes("did not increase") ||
      abstractLower.includes("not associated with increased");

    if (isNegativeSafetyContext) {
      const negMatch =
        abstract.match(
          /without\s+increased\s+(?:risk\s+of\s+)?(\w+(?:\s+\w+)?(?:\s+\w+)?)/i,
        ) ||
        abstract.match(
          /no\s+(?:significant\s+)?increased?\s+(?:risk\s+of\s+)?(\w+(?:\s+\w+)?)/i,
        ) ||
        abstract.match(
          /did\s+not\s+increase.*?(?:risk\s+of\s+)?(\w+(?:\s+\w+)?)/i,
        );
      if (negMatch) {
        return `Comparative safety: no increased risk of ${negMatch[1].trim()}`;
      }
      return "Comparative safety: no increased risk of adverse events vs comparator";
    }

    // ✅ Title-level negative safety signals
    if (
      titleLower.includes("without increased risk") ||
      titleLower.includes("no increased risk") ||
      titleLower.includes("without increased pneumonia")
    ) {
      const specificRisk = titleLower.includes("pneumonia")
        ? "pneumonia"
        : titleLower.includes("bleeding")
          ? "bleeding"
          : titleLower.includes("toxicity")
            ? "toxicity"
            : "adverse events";
      return `Comparative safety: no increased risk of ${specificRisk}`;
    }

    const patterns = [
      // Grade 3/4 AEs — most important
      {
        regex:
          /grade\s*3\s*(?:or\s*(?:higher|above|more)|\/4|[+-])\s*(?:adverse\s*events?)?\s*(?:occurred|reported|in|were)\s*(\d+\.?\d*\s*%)/i,
        label: "Grade 3+ AE",
      },
      {
        regex:
          /(\d+\.?\d*\s*%)\s*(?:of\s*patients?\s*)?(?:experienced|had|reported)\s*(?:any\s*)?grade\s*(?:3|≥3)/i,
        label: "Grade 3+ AE",
      },
      // Treatment-related AEs
      {
        regex:
          /treatment.related adverse events?\s*(?:occurred|reported|in)\s+(\d+\.?\d*\s*%)/i,
        label: "Treatment-related AE",
      },
      {
        regex:
          /(\d+\.?\d*\s*%)\s*(?:of patients?\s*)?(?:had|experienced)\s*treatment.related/i,
        label: "Treatment-related AE",
      },
      // Serious AEs
      {
        regex:
          /serious adverse events?\s*(?:occurred|in|reported|rate).*?(\d+\.?\d*\s*%)/i,
        label: "Serious AE",
      },
      // irAEs
      {
        regex:
          /immune.related adverse events?\s*(?:occurred|in|rate).*?(\d+\.?\d*\s*%)/i,
        label: "irAE rate",
      },
      {
        regex:
          /(\d+\.?\d*\s*%)\s*(?:of patients?\s*)?(?:had|experienced)\s*immune.related/i,
        label: "irAE rate",
      },
      // Discontinuation
      {
        regex: /discontinu(?:ed|ation)\s*(?:rate|due to).*?(\d+\.?\d*\s*%)/i,
        label: "Discontinuation rate",
      },
      {
        regex: /(\d+\.?\d*\s*%)\s*(?:of patients?\s*)?discontinued/i,
        label: "Discontinuation rate",
      },
      // Specific toxicities — require rate context (not just proximity)
      {
        regex:
          /pneumoni[at]\s+(?:occurred|rate|incidence)\s+(?:in|of|was)?\s*(\d+\.?\d*\s*%)/i,
        label: "Pneumonia rate",
      },
      {
        regex:
          /(\d+\.?\d*\s*%)\s+(?:incidence\s+of\s+|rate\s+of\s+)?pneumoni[at]/i,
        label: "Pneumonia rate",
      },
      {
        regex:
          /neutropenia\s+(?:occurred|rate|incidence)\s+(?:in|of|was)?\s*(\d+\.?\d*\s*%)/i,
        label: "Neutropenia rate",
      },
      {
        regex: /(\d+\.?\d*\s*%)\s+(?:incidence\s+of\s+)?neutropenia/i,
        label: "Neutropenia rate",
      },
      {
        regex: /hepatotoxicity.*?(\d+\.?\d*\s*%)/i,
        label: "Hepatotoxicity rate",
      },
      // Safety conclusions (no numbers)
      {
        regex:
          /(well.tolerated|manageable safety profile|no new safety signals|acceptable safety profile|favorable safety)/i,
        label: "Safety conclusion",
      },
      // AE rate with patient context (requires "of patients" or similar)
      {
        regex:
          /(\d+\.?\d*\s*%)\s+of\s+patients?\s+(?:had|reported|experienced)\s+(?:any\s+)?(?:grade\s*\d+\s*)?adverse/i,
        label: "AE rate",
      },
      {
        regex:
          /adverse events?\s+(?:occurred|reported)\s+in\s+(\d+\.?\d*\s*%)\s+of\s+patients?/i,
        label: "AE rate",
      },
    ];

    for (const { regex, label } of patterns) {
      const match = abstract.match(regex);
      if (match) {
        const value = match[1] || match[0];
        return `${label}: ${value.trim()}`;
      }
    }

    // Title-level safety signals when abstract yields nothing
    if (
      titleLower.includes("well-tolerated") ||
      titleLower.includes("manageable")
    ) {
      return "Safety conclusion: well-tolerated safety profile";
    }

    return "No specific safety data extracted from abstract";
  }

  // ════════════════════════════════════════════════════════════════════════
  // ✅ NEW: Classify evidence tier for LLM guidance
  // ════════════════════════════════════════════════════════════════════════
  _classifyEvidenceTier(title, abstract) {
    const combined = `${title} ${abstract}`.toLowerCase();

    if (
      combined.includes("phase 3") ||
      combined.includes("phase iii") ||
      combined.includes("randomized controlled trial") ||
      combined.includes("randomised controlled trial")
    )
      return "Phase 3 RCT — high evidence";

    if (
      combined.includes("meta-analysis") ||
      combined.includes("systematic review") ||
      combined.includes("pooled analysis") ||
      combined.includes("network meta-analysis")
    )
      return "Meta-analysis / Systematic Review — high evidence";

    if (
      combined.includes("phase 2") ||
      combined.includes("phase ii") ||
      combined.includes("prospective cohort") ||
      combined.includes("multicenter prospective")
    )
      return "Phase 2 / Prospective cohort — moderate evidence";

    if (
      combined.includes("real-world") ||
      combined.includes("real world") ||
      combined.includes("cohort study") ||
      combined.includes("population-based")
    )
      return "Real-world cohort — moderate evidence";

    if (
      combined.includes("retrospective") ||
      combined.includes("single-arm") ||
      combined.includes("observational study")
    )
      return "Retrospective / Single-arm — lower evidence";

    if (
      combined.includes("pilot study") ||
      combined.includes("feasibility") ||
      combined.includes("case series")
    )
      return "Pilot / Feasibility — preliminary only";

    return "Study type unclear — qualify findings carefully";
  }

  // ════════════════════════════════════════════════════════════════════════
  // Extract key outcome hint from abstract
  // ════════════════════════════════════════════════════════════════════════
  _extractOutcomeHint(abstract) {
    if (!abstract || abstract.length < 20) return "See abstract below";

    const patterns = [
      { regex: /\borr\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i, label: "ORR" },
      {
        regex: /response rate\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i,
        label: "Response rate",
      },
      {
        regex: /objective response rate\s*(?:of|was|:)?\s*(\d+\.?\d*\s*%)/i,
        label: "ORR",
      },
      {
        regex: /median os\s*(?:of|was|:)?\s*(\d+\.?\d*\s*months)/i,
        label: "Median OS",
      },
      { regex: /overall survival.*?(\d+\.?\d*\s*months)/i, label: "OS" },
      {
        regex: /median pfs\s*(?:of|was|:)?\s*(\d+\.?\d*\s*months)/i,
        label: "Median PFS",
      },
      {
        regex: /progression.free survival.*?(\d+\.?\d*\s*months)/i,
        label: "PFS",
      },
      { regex: /hazard ratio\s*(?:of|was|:)?\s*(\d+\.?\d*)/i, label: "HR" },
      { regex: /\bhr\s*[=:]\s*(0?\.\d+)/i, label: "HR" },
      { regex: /p\s*[<=>]\s*(0\.\d+)/i, label: "p-value" },
      {
        regex:
          /(\d+\.?\d*\s*%)\s*(?:of patients|response|survival|pcr|pathologic)/i,
        label: "Rate",
      },
      {
        regex: /(\d+\.?\d*)\s*months.*?(?:survival|pfs|os)/i,
        label: "Survival",
      },
      {
        regex: /pathologic complete response.*?(\d+\.?\d*\s*%)/i,
        label: "pCR",
      },
      // Diabetes-specific
      {
        regex: /hba1c.*?(?:reduced?|decreased?|lowered?).*?(\d+\.?\d*\s*%)/i,
        label: "HbA1c reduction",
      },
      { regex: /hba1c.*?(\d+\.?\d*\s*%)/i, label: "HbA1c" },
      { regex: /blood pressure.*?(\d+\.?\d*\s*mmhg)/i, label: "BP reduction" },
      {
        regex: /(\d+\.?\d*\s*%)\s*(?:reduction|decrease|lower|improvement)/i,
        label: "Reduction",
      },
      {
        regex: /weight.*?(?:loss|reduction).*?(\d+\.?\d*\s*kg)/i,
        label: "Weight loss",
      },
      // Cardiology
      { regex: /mace.*?(\d+\.?\d*\s*%)/i, label: "MACE rate" },
      { regex: /cardiovascular.*?(\d+\.?\d*\s*%)/i, label: "CV outcome" },
      // CNS-specific
      {
        regex: /intracranial (?:response|orr|control).*?(\d+\.?\d*\s*%)/i,
        label: "Intracranial ORR",
      },
      {
        regex: /cns (?:response|control|orr).*?(\d+\.?\d*\s*%)/i,
        label: "CNS ORR",
      },
      {
        regex: /intracranial pfs.*?(\d+\.?\d*\s*months)/i,
        label: "Intracranial PFS",
      },
    ];

    for (const { regex, label } of patterns) {
      const match = abstract.match(regex);
      if (match) return `${label}: ${match[1]}`;
    }

    const sentences = abstract.split(".");
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 120) return trimmed;
    }

    return "See abstract below";
  }

  // ════════════════════════════════════════════════════════════════════════
  // BUILD CHAT MESSAGES
  // ════════════════════════════════════════════════════════════════════════
  buildChatMessages(systemPrompt, conversationHistory = [], userPrompt) {
    const messages = [{ role: "system", content: systemPrompt }];

    const safeHistory = conversationHistory.slice(-4);
    safeHistory.forEach((msg) => {
      if (!msg?.content || !msg?.role) return;
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content).substring(0, 300),
      });
    });

    messages.push({ role: "user", content: userPrompt });
    return messages;
  }

  // ════════════════════════════════════════════════════════════════════════
  // MAIN: Generate medical response
  // ════════════════════════════════════════════════════════════════════════
  async generateMedicalResponse(
    query,
    context = {},
    publications = [],
    clinicalTrials = [],
    conversationHistory = [],
    userProfile = {},
  ) {
    if (!query || typeof query !== "string") {
      return this.generateFallbackResponse(
        "",
        publications,
        clinicalTrials,
        context,
      );
    }

    const isResearcherQuery =
      query.toLowerCase().includes("researcher") ||
      query.toLowerCase().includes("expert") ||
      query.toLowerCase().includes("scientist");

    const systemPrompt = this.buildSystemPrompt(
      context,
      userProfile,
      isResearcherQuery,
    );
    const userPrompt = this.buildUserPrompt(
      query,
      publications,
      clinicalTrials,
      isResearcherQuery,
    );
    const chatMessages = this.buildChatMessages(
      systemPrompt,
      conversationHistory,
      userPrompt,
    );

    const searchMode = context?.searchMode || "keyword";

    console.log("\n🤖 LLM Request:");
    console.log(`   Query:        "${query}"`);
    console.log(`   Disease:      "${context.disease || "Not set"}"`);
    console.log(`   Mode:         ${searchMode.toUpperCase()}`);
    console.log(`   Publications: ${publications.length}`);
    console.log(`   Trials:       ${clinicalTrials.length}`);
    console.log(`   History:      ${conversationHistory.length} msgs`);
    if (context._clinicalFocus) {
      console.log(`   Clinical focus: "${context._clinicalFocus}"`);
    }

    try {
      const response = await this.chat(chatMessages, {
        temperature: 0.1,
        max_tokens: 2500,
      });

      const structuredResponse = this.parseStructuredResponse(
        response.text,
        query,
        publications,
        clinicalTrials,
      );

      console.log("✅ LLM response generated");

      return {
        structuredResponse,
        rawText: response.text,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      console.error("❌ LLM error, using fallback:", error.message);
      return this.generateFallbackResponse(
        query,
        publications,
        clinicalTrials,
        context,
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // PARSE: Extract structured response from LLM output
  // ════════════════════════════════════════════════════════════════════════
  parseStructuredResponse(text, query, publications = [], clinicalTrials = []) {
    if (!text || typeof text !== "string") {
      return this.buildFallbackStructuredResponse(
        "",
        query,
        publications,
        clinicalTrials,
      );
    }

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.buildFallbackStructuredResponse(
          text,
          query,
          publications,
          clinicalTrials,
        );
      }

      let jsonStr = jsonMatch[0];
      jsonStr = this._repairTruncatedJson(jsonStr);

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        console.warn("⚠️  JSON parse failed — attempting field extraction");
        parsed = this._extractFieldsFromText(text, publications);
      }

      if (!parsed) {
        return this.buildFallbackStructuredResponse(
          text,
          query,
          publications,
          clinicalTrials,
        );
      }

      // ── Normalize clinicalTrialsSummary ───────────────────────────────
      if (Array.isArray(parsed.clinicalTrialsSummary)) {
        parsed.clinicalTrialsSummary = parsed.clinicalTrialsSummary.join(". ");
      }
      if (typeof parsed.clinicalTrialsSummary === "string") {
        parsed.clinicalTrialsSummary = parsed.clinicalTrialsSummary
          .replace(/^(STRING:|ARRAY:|NOTE:)\s*/i, "")
          .trim();
      }

      // ── Validate sourceSnippets ───────────────────────────────────────
      const hasGoodSnippets =
        Array.isArray(parsed.sourceSnippets) &&
        parsed.sourceSnippets.length > 0 &&
        parsed.sourceSnippets[0]?.title;

      if (!hasGoodSnippets) {
        parsed.sourceSnippets = this.buildSourceSnippets(publications);
      }

      // ── Enforce no duplicate citations in keyFindings ─────────────────
      if (Array.isArray(parsed.keyFindings)) {
        const citedPapers = new Set();
        parsed.keyFindings = parsed.keyFindings.filter((finding) => {
          if (typeof finding !== "string") return true;
          const citationMatches = finding.match(/\[(\d+)\]/g);
          if (!citationMatches || citationMatches.length === 0) return true;
          const primaryCitation = citationMatches[citationMatches.length - 1];
          if (citedPapers.has(primaryCitation)) {
            console.log(`   🔄 Duplicate citation removed: ${primaryCitation}`);
            return false;
          }
          citedPapers.add(primaryCitation);
          return true;
        });
        console.log(
          `   📝 keyFindings: ${parsed.keyFindings.length} unique citations`,
        );
      }

      // ── Fix fallback conditionOverview ────────────────────────────────
      const isFallbackOverview =
        !parsed.conditionOverview ||
        parsed.conditionOverview.startsWith("Research findings related to:") ||
        parsed.conditionOverview.includes("publications analyzed");

      if (isFallbackOverview && publications.length > 0) {
        parsed.conditionOverview = this._buildConditionOverview(
          query,
          publications,
        );
        console.log("   ✅ conditionOverview rebuilt");
      }

      // ── Fix generic recommendations ───────────────────────────────────
      const recsArr = this.ensureStringArray(parsed.recommendations);
      const hasGenericRecs =
        recsArr.length === 0 ||
        recsArr.every(
          (r) =>
            r.startsWith("Review findings from") ||
            r.startsWith("Consult with a healthcare") ||
            r.length < 30,
        );

      if (hasGenericRecs && publications.length > 0) {
        parsed.recommendations = this._buildRecommendations(publications);
        console.log("   ✅ recommendations rebuilt");
      }

      // ── Fix generic trial summary ─────────────────────────────────────
      const trialSummary = this.ensureString(parsed.clinicalTrialsSummary);
      const isGenericTrialSummary =
        !trialSummary ||
        trialSummary.length < 30 ||
        trialSummary.startsWith("Found ") ||
        trialSummary.startsWith("Summarise") ||
        trialSummary.startsWith("Summarize");

      if (isGenericTrialSummary && clinicalTrials.length > 0) {
        parsed.clinicalTrialsSummary = this._buildTrialSummary(clinicalTrials);
        console.log("   ✅ clinicalTrialsSummary rebuilt");
      }

      // ── Fix safety section ────────────────────────────────────────────
      // If LLM returned placeholder text or nothing useful
      // fall back to pre-extracted safety hints
      const safetyArr = this.ensureStringArray(parsed.safetyConsiderations);
      const isSafetyPlaceholder =
        safetyArr.length === 0 ||
        safetyArr.every(
          (s) =>
            s.includes("Safety signal field") ||
            s.includes("Format:") ||
            s.includes("Only write No specific"),
        );

      const effectiveSafety = isSafetyPlaceholder
        ? this._buildSafetyFromHints(publications)
        : safetyArr;

      return {
        conditionOverview: this.ensureString(parsed.conditionOverview),
        keyFindings: this.ensureStringArray(parsed.keyFindings),
        researchInsights: this.ensureString(parsed.researchInsights),
        clinicalTrialsSummary: this.ensureString(parsed.clinicalTrialsSummary),
        recommendations: this.ensureStringArray(parsed.recommendations),
        safetyConsiderations: effectiveSafety,
        sourceSnippets: Array.isArray(parsed.sourceSnippets)
          ? parsed.sourceSnippets
          : [],
      };
    } catch (parseError) {
      console.warn("⚠️  JSON parse failed completely — using fallback");
      return this.buildFallbackStructuredResponse(
        text,
        query,
        publications,
        clinicalTrials,
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // HELPER: Build safety section from pre-extracted hints
  // Called when LLM returns placeholder or empty safety section
  // ════════════════════════════════════════════════════════════════════════
  _buildSafetyFromHints(publications = []) {
    const safetyFindings = [];

    publications.slice(0, 8).forEach((pub, idx) => {
      const hint = this._extractSafetyHint(pub.abstract || "", pub.title || "");
      const titleLower = (pub.title || "").toLowerCase();
      const paperNum = `[${idx + 1}]`;

      if (hint && !hint.includes("No specific safety data extracted")) {
        const tier = this._classifyEvidenceTier(
          pub.title || "",
          pub.abstract || "",
        );
        safetyFindings.push(
          `The ${tier.split(" —")[0]} ${paperNum} reported ${hint} — "${(pub.title || "").substring(0, 60)}"`,
        );
        return;
      }

      // Title-level safety signals
      if (
        titleLower.includes("without increased risk") ||
        titleLower.includes("no increased risk")
      ) {
        const specificRisk = titleLower.includes("pneumonia")
          ? "pneumonia"
          : titleLower.includes("bleeding")
            ? "bleeding"
            : titleLower.includes("toxicity")
              ? "toxicity"
              : "adverse events";
        safetyFindings.push(
          `${paperNum} reported no increased risk of ${specificRisk} — "${(pub.title || "").substring(0, 60)}"`,
        );
        return;
      }

      if (
        titleLower.includes("well-tolerated") ||
        titleLower.includes("manageable")
      ) {
        safetyFindings.push(
          `${paperNum} described a well-tolerated safety profile — "${(pub.title || "").substring(0, 60)}"`,
        );
        return;
      }

      if (
        titleLower.includes("safety and efficacy") ||
        titleLower.includes("efficacy and safety")
      ) {
        // Broader search in abstract for any adverse event rate
        const broadSafetyMatch =
          (pub.abstract || "").match(
            /(\d+\.?\d*\s*%)\s+of\s+patients?\s+(?:had|experienced|reported)\s+(?:grade|adverse|serious)/i,
          ) ||
          (pub.abstract || "").match(/grade\s*(?:3|≥3).*?(\d+\.?\d*\s*%)/i) ||
          (pub.abstract || "").match(/adverse events?.*?(\d+\.?\d*\s*%)/i);

        if (broadSafetyMatch) {
          safetyFindings.push(
            `${paperNum} reported adverse events in ${broadSafetyMatch[1]} — "${(pub.title || "").substring(0, 55)}"`,
          );
        } else {
          safetyFindings.push(
            `${paperNum} studied safety profile — consult full text of "${(pub.title || "").substring(0, 55)}" for adverse event rates`,
          );
        }
      }
    });

    if (safetyFindings.length === 0) {
      return ["No specific safety data was reported in the provided studies"];
    }

    return safetyFindings.slice(0, 4);
  }

  // ════════════════════════════════════════════════════════════════════════
  // HELPER: Build condition overview from papers
  // ════════════════════════════════════════════════════════════════════════
  _buildConditionOverview(query, publications) {
    const topPub = publications[0];
    const tier = this._classifyEvidenceTier(
      topPub?.title || "",
      topPub?.abstract || "",
    );
    const tierShort = tier.split(" —")[0];
    const outcome = this._extractOutcomeHint(topPub?.abstract || "");
    const hasData = outcome !== "See abstract below";

    let overview = `Current research on "${query}" includes ${publications.length} `;
    overview += `publications ranging from ${tierShort}s to systematic reviews. `;

    if (hasData && topPub) {
      overview += `The highest-ranked study — "${(topPub.title || "").substring(0, 65)}..." — reported ${outcome}. `;
    }

    overview += `These findings represent the current evidence base for clinical decision-making.`;
    return overview;
  }

  // ════════════════════════════════════════════════════════════════════════
  // HELPER: Build evidence-based recommendations
  // ════════════════════════════════════════════════════════════════════════
  _buildRecommendations(publications) {
    return publications.slice(0, 2).map((pub) => {
      const outcome = this._extractOutcomeHint(pub.abstract || "");
      const tier = this._classifyEvidenceTier(
        pub.title || "",
        pub.abstract || "",
      );
      const tierShort = tier.split(" —")[0];
      const hasData = outcome !== "See abstract below";

      if (hasData) {
        return (
          `Based on ${tierShort} evidence: ` +
          `"${(pub.title || "").substring(0, 55)}..." reported ${outcome}. ` +
          `Discuss applicability with your treating physician.`
        );
      }
      return (
        `${tierShort} evidence from ` +
        `"${(pub.title || "").substring(0, 55)}..." — ` +
        `consult your specialist for relevance to your specific case.`
      );
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // HELPER: Build clinical trial summary
  // ════════════════════════════════════════════════════════════════════════
  _buildTrialSummary(clinicalTrials = []) {
    if (clinicalTrials.length === 0) {
      return "No relevant clinical trials were found for this query.";
    }

    const recruiting = clinicalTrials.filter((t) => t.status === "RECRUITING");
    const completed = clinicalTrials.filter((t) => t.status === "COMPLETED");
    const active = clinicalTrials.filter(
      (t) => t.status === "ACTIVE_NOT_RECRUITING",
    );

    let summary = `${clinicalTrials.length} relevant clinical trial${clinicalTrials.length > 1 ? "s" : ""} identified. `;

    if (recruiting.length > 0) {
      summary += `${recruiting.length} actively recruiting: `;
      summary +=
        recruiting
          .slice(0, 3)
          .map((t) => {
            const location = Array.isArray(t.locations)
              ? t.locations[0]
              : "N/A";
            const phase = t.phase || "N/A";
            const intervention =
              Array.isArray(t.interventions) && t.interventions.length > 0
                ? t.interventions[0]
                : "investigational treatment";
            const contact = t.contact?.email
              ? ` (contact: ${t.contact.email})`
              : "";
            return `"${(t.title || "").substring(0, 55)}..." testing ${intervention} (${phase}, ${location})${contact}`;
          })
          .join("; ") + ". ";
    }

    if (active.length > 0) {
      summary += `${active.length} active but not recruiting. `;
    }

    if (completed.length > 0) {
      summary += `${completed.length} completed trial${completed.length > 1 ? "s" : ""} available for reference. `;
    }

    summary += `Check ClinicalTrials.gov for latest eligibility and enrollment status.`;
    return summary;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Repair truncated JSON from token limit cutoff
  // ════════════════════════════════════════════════════════════════════════
  _repairTruncatedJson(jsonStr) {
    try {
      JSON.parse(jsonStr);
      return jsonStr;
    } catch {
      let repaired = jsonStr.trim();
      repaired = repaired.replace(/,?\s*"[^"]*$/, "");
      repaired = repaired.replace(/,\s*$/, "");

      const opens = (repaired.match(/\{/g) || []).length;
      const closes = (repaired.match(/\}/g) || []).length;
      const openArr = (repaired.match(/\[/g) || []).length;
      const closeArr = (repaired.match(/\]/g) || []).length;

      for (let i = 0; i < openArr - closeArr; i++) repaired += "]";
      for (let i = 0; i < opens - closes; i++) repaired += "}";

      return repaired;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Extract individual fields from badly broken JSON
  // ════════════════════════════════════════════════════════════════════════
  _extractFieldsFromText(text, publications = []) {
    try {
      const findingsMatch = text.match(/"keyFindings"\s*:\s*\[([\s\S]*?)\]/);
      const overviewMatch = text.match(/"conditionOverview"\s*:\s*"([^"]+)"/);
      const insightsMatch = text.match(/"researchInsights"\s*:\s*"([^"]+)"/);
      const trialsMatch = text.match(/"clinicalTrialsSummary"\s*:\s*"([^"]+)"/);
      const recsMatch = text.match(/"recommendations"\s*:\s*\[([\s\S]*?)\]/);
      const safetyMatch = text.match(
        /"safetyConsiderations"\s*:\s*\[([\s\S]*?)\]/,
      );

      if (!findingsMatch && !overviewMatch) return null;

      const parseArray = (matchStr) => {
        if (!matchStr) return [];
        try {
          return JSON.parse(`[${matchStr}]`);
        } catch {
          const matches = matchStr.match(/"([^"]+)"/g) || [];
          return matches.map((m) => m.replace(/^"|"$/g, ""));
        }
      };

      return {
        conditionOverview: overviewMatch ? overviewMatch[1] : "",
        keyFindings: parseArray(findingsMatch?.[1]).filter(
          (f) => typeof f === "string",
        ),
        researchInsights: insightsMatch ? insightsMatch[1] : "",
        clinicalTrialsSummary: trialsMatch ? trialsMatch[1] : "",
        recommendations: parseArray(recsMatch?.[1]).filter(
          (r) => typeof r === "string",
        ),
        safetyConsiderations: parseArray(safetyMatch?.[1]).filter(
          (s) => typeof s === "string",
        ),
        sourceSnippets: this.buildSourceSnippets(publications),
      };
    } catch {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // TYPE SAFETY HELPERS
  // ════════════════════════════════════════════════════════════════════════
  ensureString(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value))
      return value.map((v) => this.ensureString(v)).join(". ");
    if (typeof value === "object") {
      const parts = Object.values(value).filter((v) => typeof v === "string");
      return parts.join(" - ");
    }
    return String(value);
  }

  ensureStringArray(value) {
    if (!value) return [];
    if (!Array.isArray(value))
      return [this.ensureString(value)].filter(Boolean);

    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null) {
          const candidates = [
            item.title,
            item.description,
            item.point,
            item.text,
            item.recommendation,
            item.consideration,
            item.finding,
            item.content,
          ].filter((v) => typeof v === "string");
          if (candidates.length > 0) return candidates.join(": ");
          return Object.values(item)
            .filter((v) => typeof v === "string")
            .join(" - ");
        }
        return String(item);
      })
      .filter((item) => item && item.trim().length > 0);
  }

  buildSourceSnippets(publications = []) {
    return publications.slice(0, 5).map((pub) => ({
      title: pub.title || "Untitled",
      authors: Array.isArray(pub.authors)
        ? pub.authors.slice(0, 2).join(", ")
        : "Unknown",
      year: pub.year || null,
      platform: (pub.source || "unknown").toUpperCase(),
      url: pub.url || "",
      snippet: pub.abstract
        ? pub.abstract.substring(0, 80)
        : "No abstract available",
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  // FALLBACK: When LLM fails or returns bad data
  // ════════════════════════════════════════════════════════════════════════
  buildFallbackStructuredResponse(
    rawText,
    query,
    publications = [],
    clinicalTrials = [],
  ) {
    const findings = publications.slice(0, 3).map((pub, idx) => {
      const outcomeHint = this._extractOutcomeHint(pub.abstract || "");
      const tier = this._classifyEvidenceTier(
        pub.title || "",
        pub.abstract || "",
      );
      const tierShort = tier.split(" —")[0];
      const hasData = outcomeHint !== "See abstract below";

      if (hasData) {
        return `${tierShort}: "${(pub.title || "").substring(0, 70)}..." reported ${outcomeHint} [${idx + 1}]`;
      }
      return `${tierShort} — "${(pub.title || "").substring(0, 70)}..." [${idx + 1}]`;
    });

    return {
      conditionOverview: this._buildConditionOverview(query, publications),
      keyFindings:
        findings.length > 0
          ? findings
          : ["Please refine your query for more specific findings."],
      researchInsights:
        rawText ||
        publications
          .slice(0, 3)
          .map(
            (pub, i) =>
              `[${i + 1}] ${pub.title}: ${(pub.abstract || "").substring(0, 200)}...`,
          )
          .join("\n\n"),
      clinicalTrialsSummary: this._buildTrialSummary(clinicalTrials),
      recommendations:
        this._buildRecommendations(publications).length > 0
          ? this._buildRecommendations(publications)
          : [
              "Consult with a qualified healthcare professional for personalized advice.",
            ],
      safetyConsiderations: this._buildSafetyFromHints(publications),
      sourceSnippets: this.buildSourceSnippets(publications),
    };
  }

  generateFallbackResponse(
    query,
    publications = [],
    clinicalTrials = [],
    context = {},
  ) {
    console.log("⚠️  Using fallback response");

    const structured = this.buildFallbackStructuredResponse(
      "",
      query,
      publications,
      clinicalTrials,
    );

    const rawText =
      publications.length > 0
        ? `Based on ${publications.length} publications${context.disease ? ` for ${context.disease}` : ""}:\n\n` +
          publications
            .slice(0, 3)
            .map(
              (p, i) =>
                `${i + 1}. ${p.title} (${p.year}): ${(p.abstract || "").substring(0, 180)}...`,
            )
            .join("\n\n") +
          "\n\nConsult a healthcare professional for personalized advice."
        : "Unable to generate response. Please try again.";

    return { structuredResponse: structured, rawText, tokensUsed: 0 };
  }

  // ════════════════════════════════════════════════════════════════════════
  // ENTITY EXTRACTION
  // ════════════════════════════════════════════════════════════════════════
  async extractEntities(text) {
    if (!text || typeof text !== "string") {
      return {
        diseases: [],
        symptoms: [],
        treatments: [],
        medications: [],
        procedures: [],
      };
    }

    const prompt = `Extract medical entities from this text. Return ONLY JSON.

Text: "${text.substring(0, 300)}"

Return:
{"diseases":[],"symptoms":[],"treatments":[],"medications":[],"procedures":[]}

Only include entities explicitly mentioned. Empty arrays if none.`;

    try {
      const response = await this.generate(prompt, {
        temperature: 0.1,
        max_tokens: 300,
      });
      const match = (response.text || "").match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          diseases: Array.isArray(parsed.diseases) ? parsed.diseases : [],
          symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
          treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
          medications: Array.isArray(parsed.medications)
            ? parsed.medications
            : [],
          procedures: Array.isArray(parsed.procedures) ? parsed.procedures : [],
        };
      }
    } catch (error) {
      console.error("Entity extraction error:", error.message);
    }

    return {
      diseases: [],
      symptoms: [],
      treatments: [],
      medications: [],
      procedures: [],
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // DISEASE NORMALIZATION
  // ════════════════════════════════════════════════════════════════════════
  async normalizeDisease(disease) {
    if (!disease || typeof disease !== "string") return disease;

    const prompt = `Normalize to standard medical term. Return ONLY the term, nothing else.

Input: "${disease}"
Standard term:`;

    try {
      const response = await this.generate(prompt, {
        temperature: 0.1,
        max_tokens: 30,
      });
      return (response.text || disease)
        .trim()
        .replace(/['"]/g, "")
        .split("\n")[0];
    } catch (error) {
      console.error("Disease normalization error:", error.message);
      return disease;
    }
  }
}

export default new LLMService();
