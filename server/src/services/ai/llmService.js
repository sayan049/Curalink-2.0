import axios from "axios";
import ollamaConfig from "../../config/ollama.js";

class LLMService {
  constructor() {
    this.baseURL = ollamaConfig.getBaseURL();
    this.model = ollamaConfig.getModel();
    this.timeout = ollamaConfig.getTimeout();
    this.client = ollamaConfig.getClient();
  }


  // CORE: Generate text completion

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

  // CORE: Chat completion (multi-turn)

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


  // BUILD SYSTEM PROMPT - Strict, disease-focused

  buildSystemPrompt(context, userProfile = {}, isResearcherQuery = false) {
    const disease = context?.disease || "the medical condition";
    const location = context?.location || userProfile?.location || null;
    const isLifestyleQuery = context?.isLifestyleQuery || false;
    const originalQuery = context?.originalQuery || "";

    // ── Previous response entities for referent resolution 
    const prevEntities =
      Array.isArray(context?.responseEntities) &&
      context.responseEntities.length > 0
        ? context.responseEntities
        : [];

    // ── Global fallback trial flags 
    const noLocalTrials = context?.noLocalTrials || false;
    const fallbackCount = context?.fallbackTrialCount || 0;

    // ── Build base prompt 
    let prompt = `You are Curalink, a medical AI research assistant.

ABSOLUTE RULES - NEVER VIOLATE:
1. ONLY discuss "${disease}" - no other diseases
2. Key findings MUST come from the papers listed in the user message
3. NEVER mention drugs/treatments for other diseases:
   - If disease is NOT diabetes: never mention metformin, HbA1c, GLP-1, SGLT2, insulin
   - If disease is NOT lung cancer: never mention pembrolizumab, osimertinib, EGFR, NSCLC
   - If disease is NOT Alzheimer's: never mention lecanemab, donanemab, amyloid (unless asked)
4. Each key finding MUST cite [1], [2], etc. from the provided papers
5. clinicalTrialsSummary MUST be a single plain STRING — never an array
6. Return ONLY valid JSON — no markdown, no text before or after the JSON
7. sourceSnippets must use real direct quotes from the provided abstracts;
8. NEVER fabricate or hallucinate findings not present in the papers`;

    if (isLifestyleQuery) {
      prompt += `

LIFESTYLE/DIET QUERY DETECTED: "${originalQuery}"
The user is asking about: diet, food, lifestyle, or general wellness in the context of ${disease}.

IMPORTANT INSTRUCTIONS FOR THIS QUERY:
- If the provided papers do NOT contain direct evidence about "${originalQuery}", say so honestly
- Do NOT fabricate connections between papers and the user's question
- Answer based ONLY on what the papers actually say
- If no papers address this directly, say: "The current research database does not contain direct studies on [topic] for ${disease} patients. Please consult your oncologist."
- keyFindings should only include findings from papers that actually address diet/lifestyle/the specific query
- Do NOT cite papers about chemotherapy/immunotherapy as evidence about food safety`;
    }

    // ── Low result count honesty
if (context?.lowResultCount) {
  prompt += `

⚠️  LOW RESULT WARNING: Only ${context.actualPaperCount} paper(s) were found.
- Only cite findings from the ${context.actualPaperCount} paper(s) provided above
- Do NOT fill gaps using your training data knowledge
- Do NOT fabricate citations like [2] or [3] if they do not exist in the list
- If the papers don't fully answer the question, say:
  "Limited research was found on this specific topic. The available evidence suggests..."
- Never invent statistics, drug names, or outcomes not present in the provided abstracts`;
}

    // ── Location context 
    if (location) {
      if (noLocalTrials && fallbackCount > 0) {
        // ✅ No local trials found — global fallback is being shown
        prompt += `

USER LOCATION: ${location}
⚠️  IMPORTANT TRIAL NOTICE: No clinical trials were found in or near ${location} for ${disease}.
The ${fallbackCount} trials listed below are GLOBAL trials from other countries.
In your clinicalTrialsSummary field you MUST explicitly state:
"No clinical trials were found near ${location} for ${disease}. 
The following global trials may still be relevant for reference: [brief summary of trials shown]"
Do NOT pretend these are local trials.`;
      } else if (noLocalTrials && fallbackCount === 0) {
        // ✅ No trials found anywhere
        prompt += `

USER LOCATION: ${location}
⚠️  IMPORTANT TRIAL NOTICE: No clinical trials were found for ${disease} — 
neither near ${location} nor globally.
In your clinicalTrialsSummary field you MUST state:
"No clinical trials are currently available for ${disease}. 
Consider checking ClinicalTrials.gov directly for the latest listings."`;
      } else {
        // ✅ Local trials found — normal case
        prompt += `

USER LOCATION: ${location}
Prioritise clinical trials in or near ${location} in your clinicalTrialsSummary.
Mention specific cities/regions when available.`;
      }
    }

    // ── Researcher query flag
    if (isResearcherQuery) {
      prompt += `

RESEARCHER QUERY MODE:
- Identify lead authors from the papers provided
- Format keyFindings as author contributions:
  ["Dr. LastName (Institution): specific contribution to ${disease} research [1]"]
- Focus on who discovered/developed/pioneered what, not generic disease facts`;
    }

    // ── Previous response entities for referent resolution
    if (prevEntities.length > 0) {
      prompt += `

PREVIOUS RESPONSE MENTIONED: ${prevEntities.join(", ")}
(If the user asks about "it", "which one", "the first", "that drug" etc., 
these are the likely referents from the previous answer)`;
    }

    // ── Recent conversation topics 
    if (
      Array.isArray(context?.previousQueries) &&
      context.previousQueries.length > 0
    ) {
      const recent = context.previousQueries.slice(-2);
      prompt += `

RECENT TOPICS: ${recent.join(" → ")}`;
    }

    // ── JSON response template ────────────────────────────────────────────────
    prompt += `

DISEASE IN FOCUS: "${disease}"

RESPONSE FORMAT (return this JSON structure ONLY, nothing else):
{
  "conditionOverview": "2-3 sentences about ${disease} relevant to the query. Be specific and factual.",
  "keyFindings": [
    "Specific finding with data about ${disease} [1]",
    "Another specific finding [2]",
    "Third specific finding [3]"
  ],
  "researchInsights": "2-3 sentences analysing ${disease} research trends and gaps from the provided papers.",
  "clinicalTrialsSummary": "Single plain string — never an array. ${
    noLocalTrials && fallbackCount > 0
      ? `Start with: No clinical trials were found near ${location}. Then summarise the global trials shown.`
      : noLocalTrials && fallbackCount === 0
        ? `State that no clinical trials are currently available for ${disease}.`
        : location
          ? `Summarise trials near ${location} if available, mention status and phase.`
          : "Summarise the most relevant clinical trials listed."
  }",
  "recommendations": [
    "Evidence-based recommendation for ${disease} from the research"
  ],
  "safetyConsiderations": [
    "Specific safety note relevant to ${disease} treatment or management"
  ],
  "sourceSnippets": [
    {
      "title": "exact paper title from the list",
      "authors": "Author1, Author2",
      "year": 2024,
      "platform": "PUBMED",
      "url": "https://pubmed.ncbi.nlm.nih.gov/...",
      "snippet": "direct quote from abstract max 120 chars"
    }
  ]
}`;

    return prompt;
  }


  // BUILD USER PROMPT - Rich but concise
  
  buildUserPrompt(
    query,
    publications = [],
    clinicalTrials = [],
    isResearcherQuery = false,
  ) {
    let prompt = `QUERY: "${query}"\n`;

    if (isResearcherQuery) {
      prompt += `TASK: Identify lead authors and their contributions.\n`;
      prompt += `FORMAT keyFindings as author contributions:\n`;
      prompt += `["Dr. LastName (Institution): specific contribution to the field [1]"]\n`;
      prompt += `NOT as generic disease findings.\n\n`;
    }

    prompt += `\n=== PAPERS (${publications.length}) ===\n`;

    publications.slice(0, 8).forEach((pub, idx) => {
      const authors = Array.isArray(pub.authors)
        ? pub.authors.slice(0, 3).join(", ")
        : "Unknown";
      const abstract = pub.abstract
        ? pub.abstract.substring(0, 220)
        : "No abstract";

      prompt += `[${idx + 1}] ${pub.title || "Untitled"} (${pub.year || "N/A"})
Authors: ${authors}
Source: ${(pub.source || "").toUpperCase()}
Abstract: ${abstract}
URL: ${pub.url || ""}

`;
    });

    if (clinicalTrials.length > 0) {
      prompt += `=== TRIALS (${clinicalTrials.length}) ===\n`;
      clinicalTrials.slice(0, 6).forEach((trial, idx) => {
        const locs = Array.isArray(trial.locations)
          ? trial.locations.slice(0, 2).join("; ")
          : "N/A";
        const conds = Array.isArray(trial.conditions)
          ? trial.conditions.slice(0, 2).join(", ")
          : "N/A";

        prompt += `[T${idx + 1}] ${trial.title || "Untitled"}
Status: ${trial.status || "Unknown"} | Phase: ${trial.phase || "N/A"}
Conditions: ${conds}
Locations: ${locs}
Contact: ${trial.contact?.email || "See URL"}
URL: ${trial.url || ""}

`;
      });
    }

    prompt += `INSTRUCTIONS:
- Answer the query using ONLY the papers above
- Key findings must cite [number] from the paper list
- clinicalTrialsSummary must be a STRING (not array)
- Return JSON ONLY`;

    return prompt;
  }

  
  // BUILD CHAT MESSAGES - Zero history pollution

  buildChatMessages(systemPrompt, conversationHistory = [], userPrompt) {
    const messages = [{ role: "system", content: systemPrompt }];

    // ✅ Use last 4 turns (was 2) — needed for referent resolution
    const safeHistory = conversationHistory.slice(-4);

    safeHistory.forEach((msg) => {
      if (!msg?.content || !msg?.role) return;
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        // ✅ 300 chars (was 120) — drug names were being cut off
        content: String(msg.content).substring(0, 300),
      });
    });

    messages.push({ role: "user", content: userPrompt });
    return messages;
  }

  
  // MAIN: Generate medical response

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

    // ✅ isSupplementQuery check moved to controller — use zero history if passed empty
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

    console.log("\n🤖 LLM Request:");
    console.log(`   Query:        "${query}"`);
    console.log(`   Disease:      "${context.disease || "Not set"}"`);
    console.log(`   Publications: ${publications.length}`);
    console.log(`   Trials:       ${clinicalTrials.length}`);
    console.log(`   History:      ${conversationHistory.length} msgs`);

    try {
      const response = await this.chat(chatMessages, {
        temperature: 0.1,
        max_tokens: 1800, // ✅ was 1000 — prevents JSON truncation on long responses
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

  
  // PARSE: Extract structured response from LLM output
  
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
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.buildFallbackStructuredResponse(
          text,
          query,
          publications,
          clinicalTrials,
        );
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Fix clinicalTrialsSummary type
      if (Array.isArray(parsed.clinicalTrialsSummary)) {
        parsed.clinicalTrialsSummary = parsed.clinicalTrialsSummary.join(". ");
      }
      if (typeof parsed.clinicalTrialsSummary === "string") {
        parsed.clinicalTrialsSummary = parsed.clinicalTrialsSummary
          .replace(/^(STRING:|ARRAY:|NOTE:)\s*/i, "")
          .trim();
      }

      // Auto-build sourceSnippets if LLM didn't provide good ones
      const hasGoodSnippets =
        Array.isArray(parsed.sourceSnippets) &&
        parsed.sourceSnippets.length > 0 &&
        parsed.sourceSnippets[0]?.title;

      if (!hasGoodSnippets) {
        parsed.sourceSnippets = this.buildSourceSnippets(publications);
      }

      return {
        conditionOverview: this.ensureString(parsed.conditionOverview),
        keyFindings: this.ensureStringArray(parsed.keyFindings),
        researchInsights: this.ensureString(parsed.researchInsights),
        clinicalTrialsSummary: this.ensureString(parsed.clinicalTrialsSummary),
        recommendations: this.ensureStringArray(parsed.recommendations),
        safetyConsiderations: this.ensureStringArray(
          parsed.safetyConsiderations,
        ),
        sourceSnippets: Array.isArray(parsed.sourceSnippets)
          ? parsed.sourceSnippets
          : [],
      };
    } catch (parseError) {
      console.warn("⚠️ JSON parse failed, using fallback");
      return this.buildFallbackStructuredResponse(
        text,
        query,
        publications,
        clinicalTrials,
      );
    }
  }

  
  // HELPERS: Type safety

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
          // Handle objects returned by LLM instead of strings
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
        ? pub.abstract.substring(0, 130)
        : "No abstract available",
    }));
  }

  
  // FALLBACK: When LLM fails or returns bad data
 
  buildFallbackStructuredResponse(
    rawText,
    query,
    publications = [],
    clinicalTrials = [],
  ) {
    const findings = publications.slice(0, 3).map((pub, idx) => {
      const first = (pub.abstract || "").split(".")[0];
      return `${first.substring(0, 140)}... [${idx + 1}]`;
    });

    const recs = publications
      .slice(0, 2)
      .map(
        (pub) =>
          `Review findings from "${(pub.title || "").substring(0, 50)}..." with your healthcare provider`,
      );

    const safety =
      publications.length > 0
        ? [
            `Review safety information in paper [1] before making any medical decisions`,
          ]
        : [
            "Always consult qualified healthcare professionals before making medical decisions",
          ];

    const trialsText =
      clinicalTrials.length > 0
        ? `Found ${clinicalTrials.length} relevant clinical trial${clinicalTrials.length > 1 ? "s" : ""}. ` +
          clinicalTrials
            .slice(0, 2)
            .map((t) => `${t.title} (${t.status})`)
            .join(". ") +
          "."
        : "No relevant clinical trials found for this query.";

    return {
      conditionOverview: query
        ? `Research findings related to: ${query}. ${publications.length} publications analyzed.`
        : "Medical research summary based on available publications.",
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
      clinicalTrialsSummary: trialsText,
      recommendations:
        recs.length > 0
          ? recs
          : ["Consult with a healthcare professional for personalized advice."],
      safetyConsiderations: safety,
      sourceSnippets: this.buildSourceSnippets(publications),
    };
  }

  generateFallbackResponse(
    query,
    publications = [],
    clinicalTrials = [],
    context = {},
  ) {
    console.log("⚠️ Using fallback response");

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

 
  // ENTITY EXTRACTION
  
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

 
  // DISEASE NORMALIZATION
 
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
