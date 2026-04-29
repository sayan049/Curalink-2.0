// ============================================================
// queryExpansion.js — Deep Clinical Query Understanding
// ============================================================
// ONE MODE ONLY: Every query goes through LLM-powered semantic
// understanding first. Rule-based expansion is the fallback only.
//
// Flow:
//   1. LLM reads the query and disease context
//   2. LLM identifies the clinical intent
//   3. LLM generates what a USEFUL paper would contain
//   4. Those signals are passed to rankingService
//   5. rankingService uses them to score papers at abstract level
// ============================================================

import ollamaConfig from "../../config/ollama.js";

class QueryExpansionService {
  constructor() {
    this.currentYear = new Date().getFullYear();

    this.knownDrugs = new Set([
      "pembrolizumab",
      "nivolumab",
      "osimertinib",
      "atezolizumab",
      "durvalumab",
      "bevacizumab",
      "trastuzumab",
      "pertuzumab",
      "ibrutinib",
      "venetoclax",
      "rituximab",
      "cetuximab",
      "erlotinib",
      "alectinib",
      "brigatinib",
      "crizotinib",
      "olaparib",
      "rucaparib",
      "niraparib",
      "palbociclib",
      "ribociclib",
      "abemaciclib",
      "sacituzumab",
      "enfortumab",
      "lorlatinib",
      "capmatinib",
      "tepotinib",
      "selpercatinib",
      "pralsetinib",
      "domvanalimab",
      "zimberelimab",
      "datopotamab",
      "amivantamab",
      "patritumab",
      "anlotinib",
      "inclisiran",
      "evolocumab",
      "alirocumab",
      "sacubitril",
      "vericiguat",
      "mavacamten",
      "aficamten",
      "finerenone",
      "metformin",
      "semaglutide",
      "empagliflozin",
      "dapagliflozin",
      "tirzepatide",
      "liraglutide",
      "sitagliptin",
      "canagliflozin",
      "insulin",
      "orforglipron",
      "lecanemab",
      "donanemab",
      "aducanumab",
      "levodopa",
      "carbidopa",
      "rasagiline",
      "donepezil",
      "memantine",
      "rivastigmine",
      "atorvastatin",
      "rosuvastatin",
      "aspirin",
      "warfarin",
      "apixaban",
      "rivaroxaban",
      "dabigatran",
      "clopidogrel",
      "metoprolol",
      "lisinopril",
      "adalimumab",
      "etanercept",
      "infliximab",
      "tocilizumab",
      "baricitinib",
      "tofacitinib",
      "upadacitinib",
      "dupilumab",
      "mepolizumab",
      "benralizumab",
      "omalizumab",
      "remdesivir",
      "nirmatrelvir",
      "molnupiravir",
      "dolutegravir",
    ]);

    this.supplementTerms = new Set([
      "vitamin",
      "supplement",
      "mineral",
      "omega",
      "zinc",
      "magnesium",
      "calcium",
      "selenium",
      "iron",
      "folate",
      "folic acid",
      "probiotic",
      "herbal",
      "fish oil",
      "coenzyme",
      "coq10",
      "turmeric",
      "curcumin",
      "ashwagandha",
      "melatonin",
      "collagen",
    ]);

    this.procedureTerms = [
      "deep brain stimulation",
      "dbs",
      "transcranial magnetic stimulation",
      "tms",
      "vagus nerve stimulation",
      "stereotactic radiosurgery",
      "srs",
      "whole brain radiation",
      "wbrt",
      "gamma knife",
      "cyberknife",
      "proton therapy",
      "car-t therapy",
      "car t cell",
      "stem cell transplant",
      "bone marrow transplant",
      "angioplasty",
      "coronary bypass",
      "cabg",
      "dialysis",
      "hemodialysis",
      "photodynamic therapy",
      "transcatheter aortic valve",
      "tavi",
      "tavr",
      "catheter ablation",
    ];

    this.foodSubstringTerms = [
      "spicy",
      "capsaicin",
      "alcohol",
      "coffee",
      "fruit",
      "vegetable",
      "dairy",
      "nutrition",
      "fasting",
      "intermittent",
      "smoking",
      "vaping",
      "obesity",
      "bmi",
      "can i eat",
      "can i drink",
      "can i have",
      "should i eat",
      "should i avoid",
      "safe to eat",
      "safe to drink",
      "avoid eating",
      "avoid drinking",
      "can i smoke",
      "safe to use",
      "should i take",
      "is it safe",
      "is it okay",
      "is it good",
      "is it bad",
      "can i use",
    ];

    this.foodWordBoundaryTerms = [
      "food",
      "diet",
      "eat",
      "eating",
      "drink",
      "drinking",
      "sugar",
      "meat",
      "fish",
      "dairy",
      "fat",
      "sleep",
      "smoke",
      "weight",
      "tea",
    ];

    this.diseaseEnrichment = {
      "lung cancer": [
        "NSCLC",
        "overall survival",
        "immunotherapy",
        "EGFR",
        "PD-L1",
        "phase 3",
      ],
      diabetes: [
        "glycemic control",
        "HbA1c",
        "cardiovascular outcomes",
        "SGLT2",
        "GLP-1",
      ],
      "type 2 diabetes": [
        "glycemic control",
        "HbA1c",
        "SGLT2",
        "GLP-1",
        "randomized",
      ],
      "heart disease": [
        "myocardial infarction",
        "cardiovascular outcomes",
        "MACE",
        "randomized",
      ],
      "alzheimer's disease": [
        "amyloid",
        "cognitive decline",
        "phase 3",
        "biomarker",
      ],
      "parkinson's disease": [
        "motor symptoms",
        "levodopa",
        "dopamine",
        "randomized",
      ],
    };

    // ── What a USEFUL paper contains per intent ──────────────────────────
    // Used by: generateClinicalSignals() → rankingService abstract scoring
    this.intentPaperProfiles = {
      treatment_solutions: {
        mustContain: [
          "efficacy",
          "overall survival",
          "response rate",
          "randomized",
          "phase",
          "hazard ratio",
          "outcome",
          "progression-free",
        ],
        strongSignals: [
          "phase 3",
          "randomized controlled trial",
          "meta-analysis",
          "first-line",
          "second-line",
          "versus",
          "compared with",
          "median os",
          "pfs",
        ],
        weakSignals: ["treatment", "therapy", "clinical trial"],
        avoidInTitle: [
          "study protocol",
          "machine learning prediction",
          "drug delivery",
          "nanoparticle",
          "cost-effectiveness",
          "in vitro",
          "cell line",
          "corrigendum",
          "erratum",
        ],
        userNeed:
          "Pivotal clinical trial or meta-analysis reporting actual survival data (OS, PFS, ORR, HR) for a treatment in patients with this disease",
      },
      safety_efficacy: {
        mustContain: [
          "safety",
          "efficacy",
          "association",
          "outcome",
          "risk",
          "patients",
          "clinical",
        ],
        strongSignals: [
          "well-tolerated",
          "adverse events",
          "safe",
          "benefit",
          "supplementation",
          "dietary",
          "serum",
          "association",
          "risk",
        ],
        weakSignals: ["study", "analysis", "cohort"],
        avoidInTitle: [
          "in vitro",
          "cell line",
          "mouse model",
          "nanoparticle",
          "corrigendum",
          "erratum",
        ],
        userNeed:
          "Clinical study reporting safety profile, adverse event rates, or associations between supplement/lifestyle and disease outcomes in real patients",
      },
      comparison: {
        mustContain: [
          "versus",
          "compared",
          "randomized",
          "outcome",
          "superiority",
          "hazard",
        ],
        strongSignals: [
          "head-to-head",
          "non-inferior",
          "superior",
          "phase 3",
          "randomized controlled trial",
          "hazard ratio",
          "p-value",
        ],
        weakSignals: ["comparison", "efficacy", "trial"],
        avoidInTitle: [
          "machine learning",
          "prediction model",
          "study protocol",
          "in vitro",
          "nanoparticle",
        ],
        userNeed:
          "Randomized trial or meta-analysis directly comparing two treatments with statistical outcomes (HR, p-value, OS, PFS)",
      },
      side_effects: {
        mustContain: [
          "adverse",
          "toxicity",
          "safety",
          "tolerability",
          "patients",
        ],
        strongSignals: [
          "grade 3",
          "grade 4",
          "immune-related",
          "treatment-related",
          "discontinuation",
          "serious adverse",
          "irAE",
        ],
        weakSignals: ["complication", "risk", "harm"],
        avoidInTitle: [
          "in vitro",
          "cell line",
          "machine learning",
          "prediction model",
          "nanoparticle",
        ],
        userNeed:
          "Clinical study reporting specific adverse event rates, toxicity grades, and safety profiles in treated patients",
      },
      prognosis: {
        mustContain: [
          "survival",
          "mortality",
          "prognosis",
          "outcome",
          "hazard ratio",
          "stage",
        ],
        strongSignals: [
          "overall survival",
          "5-year survival",
          "disease-free",
          "hazard ratio",
          "median survival",
          "recurrence",
        ],
        weakSignals: ["recurrence", "relapse", "progression"],
        avoidInTitle: [
          "machine learning",
          "prediction model",
          "in vitro",
          "nanoparticle",
          "cell line",
        ],
        userNeed:
          "Study reporting survival statistics, prognostic factors, and long-term outcomes with actual survival numbers",
      },
      symptoms_diagnosis: {
        mustContain: [
          "diagnosis",
          "sensitivity",
          "specificity",
          "diagnostic",
          "detection",
          "accuracy",
        ],
        strongSignals: [
          "biomarker",
          "screening",
          "AUC",
          "positive predictive",
          "negative predictive",
          "sensitivity",
          "specificity",
        ],
        weakSignals: ["symptom", "sign", "staging"],
        avoidInTitle: [
          "machine learning model",
          "deep learning",
          "nanoparticle",
          "treatment outcome",
        ],
        userNeed:
          "Study reporting diagnostic accuracy metrics (sensitivity, specificity, AUC) for a test or biomarker in this disease",
      },
      mechanism: {
        mustContain: [
          "mechanism",
          "pathway",
          "molecular",
          "signaling",
          "expression",
          "protein",
        ],
        strongSignals: [
          "demonstrated",
          "revealed",
          "identified",
          "showed that",
          "pathway activation",
          "resistance mechanism",
        ],
        weakSignals: ["biology", "receptor", "mutation"],
        avoidInTitle: [
          "cost-effectiveness",
          "study protocol",
          "clinical trial results only",
        ],
        userNeed:
          "Study explaining the biological mechanism, molecular pathway, or resistance mechanism relevant to this disease or drug",
      },
      prevention: {
        mustContain: [
          "prevention",
          "risk reduction",
          "incidence",
          "protective",
          "prophylaxis",
        ],
        strongSignals: [
          "reduced risk",
          "prevented",
          "lower incidence",
          "risk factor",
          "randomized",
          "protective",
        ],
        weakSignals: ["lifestyle", "intervention", "screening"],
        avoidInTitle: [
          "in vitro",
          "cell line",
          "machine learning",
          "prediction model",
          "nanoparticle",
        ],
        userNeed:
          "Study reporting risk reduction, preventive interventions, or protective lifestyle factors in real patients",
      },
      recent_research: {
        mustContain: [
          "patients",
          "outcomes",
          "results",
          "trial",
          "cohort",
          "analysis",
        ],
        strongSignals: [
          "randomized",
          "phase",
          "meta-analysis",
          "systematic review",
          "clinical trial",
          "2024",
          "2025",
        ],
        weakSignals: ["novel", "emerging", "identified"],
        avoidInTitle: [
          "study protocol",
          "corrigendum",
          "erratum",
          "in vitro only",
        ],
        userNeed:
          "Recent (2023-2025) paper with actual clinical results and patient outcomes, not protocols or future studies",
      },
      clinical_trials: {
        mustContain: [
          "trial",
          "randomized",
          "phase",
          "participants",
          "intervention",
          "efficacy",
        ],
        strongSignals: [
          "phase 3",
          "phase 2",
          "randomized controlled",
          "recruiting",
          "enrolling",
          "primary endpoint",
        ],
        weakSignals: ["clinical", "study", "outcome"],
        avoidInTitle: [
          "corrigendum",
          "erratum",
          "study protocol without results",
        ],
        userNeed:
          "Ongoing or recently completed clinical trial with clear intervention, phase, and patient population",
      },
      researchers: {
        mustContain: [
          "review",
          "findings",
          "demonstrated",
          "identified",
          "showed",
        ],
        strongSignals: [
          "systematic review",
          "meta-analysis",
          "landmark",
          "multicenter",
          "key findings",
        ],
        weakSignals: ["analysis", "research", "study"],
        avoidInTitle: ["corrigendum", "erratum"],
        userNeed:
          "Landmark study, systematic review, or meta-analysis from a key research group in this field",
      },
      general: {
        mustContain: ["patients", "clinical", "outcomes", "study"],
        strongSignals: [
          "randomized",
          "meta-analysis",
          "cohort",
          "trial",
          "systematic review",
        ],
        weakSignals: ["analysis", "evidence", "results"],
        avoidInTitle: ["corrigendum", "erratum", "study protocol"],
        userNeed:
          "Clinical study with patient outcomes relevant to this condition",
      },
    };

    // ── Valid intent types ───────────────────────────────────────────────
    this.VALID_INTENTS = [
      "treatment_solutions",
      "recent_research",
      "prognosis",
      "mechanism",
      "symptoms_diagnosis",
      "prevention",
      "comparison",
      "side_effects",
      "clinical_trials",
      "safety_efficacy",
      "researchers",
      "general",
    ];
  }

  // ════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════

  _isFoodOrLifestyleQuery(q) {
    if (this.foodSubstringTerms.some((t) => q.includes(t))) return true;
    return this.foodWordBoundaryTerms.some((t) => {
      try {
        return new RegExp(`\\b${t}\\b`).test(q);
      } catch {
        return false;
      }
    });
  }

  _getDiseaseEnrichment(disease) {
    if (!disease) return [];
    const dl = disease.toLowerCase();
    for (const [key, terms] of Object.entries(this.diseaseEnrichment)) {
      if (dl === key || dl.includes(key) || key.includes(dl.split(" ")[0])) {
        return terms.slice(0, 3);
      }
    }
    return [];
  }

  _extractQueryDisease(originalQuery, storedDisease) {
    const forMatch = originalQuery.match(
      /(?:clinical\s+)?trials?\s+(?:for|in|of|on)\s+(.+?)(?:\s+in\s+|\s+near\s+|$)/i,
    );
    if (forMatch?.[1]?.trim().length > 2) return forMatch[1].trim();

    const beforeMatch = originalQuery.match(
      /^(.+?)\s+(?:clinical\s+)?trials?$/i,
    );
    if (beforeMatch?.[1]?.trim().length > 2) {
      const candidate = beforeMatch[1].trim().toLowerCase();
      if (!["latest", "recent", "new", "best", "top"].includes(candidate)) {
        return beforeMatch[1].trim();
      }
    }
    return storedDisease || null;
  }

  _getDrugFromQuery(queryLower) {
    return [...this.knownDrugs].find((d) => queryLower.includes(d)) || null;
  }

  _getSupplementFromQuery(originalQuery) {
    const match = originalQuery.match(
      /vitamin\s+[A-Za-z0-9]+|omega[-\s]?\d+|zinc|magnesium|calcium|selenium|iron|folate|folic\s+acid|probiotic|fish\s+oil|coq10|turmeric|curcumin|ashwagandha|melatonin/i,
    );
    return match ? match[0] : null;
  }

  // ════════════════════════════════════════════════════════════════════════
  // RULE-BASED INTENT DETECTION
  // Used as fallback when LLM expansion fails
  // Priority order is critical — more specific checks first
  // ════════════════════════════════════════════════════════════════════════
  _detectIntentRuleBased(query) {
    if (!query || typeof query !== "string") {
      return { type: "general", description: "Find relevant research" };
    }
    const q = query.toLowerCase();

    if (
      /top researcher|best researcher|leading researcher|who studies|pioneer|expert in|scientist|who works on|key researcher/.test(
        q,
      )
    )
      return {
        type: "researchers",
        description: "Find key researchers and their contributions",
      };

    if (
      /clinical trial|trial for|study recruiting|enroll|ongoing trial|recruiting trial|join a trial|participate in|trial near|trials for|trials in/.test(
        q,
      ) ||
      /phase [23]|phase ii|phase iii/.test(q)
    )
      return {
        type: "clinical_trials",
        description: "Find ongoing or completed clinical trials",
      };

    // Mechanism — BEFORE drug check
    if (
      /mechanism|how does|how it works|why does|pathophysiology|pathway|molecular basis|biology of|cause of|what causes|pathogenesis|signaling/.test(
        q,
      )
    )
      return {
        type: "mechanism",
        description: "Find papers explaining biological mechanisms",
      };

    // Side effects — BEFORE drug check
    if (
      /side effect|adverse effect|adverse event|toxicity|tolerability|safe to take|drug interaction|contraindic/.test(
        q,
      ) ||
      (q.includes("safe") &&
        !q.includes("safety and") &&
        !q.includes("efficacy and safety"))
    )
      return {
        type: "side_effects",
        description: "Find safety and adverse effect data",
      };

    // Comparison — BEFORE drug check
    if (
      / vs | versus |compare|which is better|head-to-head|difference between|better than|superiority|non-inferior/.test(
        q,
      )
    )
      return { type: "comparison", description: "Find comparative studies" };

    // Supplement / lifestyle
    if (this._isFoodOrLifestyleQuery(q))
      return {
        type: "safety_efficacy",
        description: "Find safety and lifestyle guidance",
      };

    const suppFound = [...this.supplementTerms].find((t) => q.includes(t));
    if (suppFound)
      return {
        type: "safety_efficacy",
        description: `Find safety and efficacy for ${suppFound}`,
      };

    // Drug-specific
    const drugFound = this._getDrugFromQuery(q);
    if (drugFound)
      return {
        type: "treatment_solutions",
        description: `Efficacy and outcomes of ${drugFound}`,
      };

    // Procedure
    const procedureFound = this.procedureTerms.find((p) => q.includes(p));
    if (procedureFound)
      return {
        type: "treatment_solutions",
        description: `Evidence on ${procedureFound}`,
      };

    // Post-progression
    if (
      /progressed on|after progression|stops working|stopped working|next line after|second line after|after immunotherapy|after chemotherapy|post-immunotherapy|salvage|rechallenge|refractory|resistant to/.test(
        q,
      ) ||
      (q.includes("after") && /failed|failure/.test(q))
    )
      return {
        type: "treatment_solutions",
        description: "Find second-line and salvage options",
      };

    // Treatment
    if (
      /latest treatment|new treatment|best treatment|treatment option|how to treat|therapy for|medication for|drug for|cure for|treatment of|treatment approach|first.?line|second.?line|immunotherapy|chemotherapy|targeted therapy|regimen|brain metast|metastatic|treatment plan|how to manage/.test(
        q,
      ) ||
      (q.includes("manage") && !this._isFoodOrLifestyleQuery(q))
    )
      return {
        type: "treatment_solutions",
        description: "Find treatment outcomes and efficacy data",
      };

    // Recent research
    if (
      /recent studies|recent research|latest research|new findings|current research|what is new|emerging research|recent advances|new developments|research on|studies on|evidence on|overview of/.test(
        q,
      )
    )
      return {
        type: "recent_research",
        description: "Find the most recent research findings",
      };

    // Prognosis
    if (
      /prognosis|survival rate|life expectancy|mortality|5.year survival|how long|disease.free|outlook/.test(
        q,
      )
    )
      return {
        type: "prognosis",
        description: "Find prognosis and survival data",
      };

    // Diagnosis
    if (
      /symptom|sign of|how to know|diagnosis|detect|screening|biomarker|test for|diagnose|early sign|warning sign|diagnostic test/.test(
        q,
      )
    )
      return {
        type: "symptoms_diagnosis",
        description: "Find diagnosis and biomarker papers",
      };

    // Prevention
    if (
      /prevent|avoid|reduce risk|lower risk|prophylaxis|protection from|risk reduction|preventive/.test(
        q,
      )
    )
      return {
        type: "prevention",
        description: "Find prevention strategy papers",
      };

    // Cost
    if (
      /cost|affordable|available in|insurance|covered|generic|price|reimbursement|access to/.test(
        q,
      )
    )
      return {
        type: "access_cost",
        description: "Find access and cost research",
      };

    // Bare disease
    const BARE_DISEASE = [
      "parkinson",
      "alzheimer",
      "diabetes",
      "cancer",
      "epilepsy",
      "depression",
      "anxiety",
      "stroke",
      "asthma",
      "copd",
      "hypertension",
      "arthritis",
      "lupus",
      "psoriasis",
      "obesity",
      "schizophrenia",
      "autism",
      "migraine",
      "osteoporosis",
      "heart disease",
      "heart failure",
      "kidney disease",
      "liver disease",
      "multiple sclerosis",
      "crohn",
    ];
    if (
      BARE_DISEASE.some((d) => q.includes(d)) &&
      !/treatment|therapy|trial|research|symptom|diagnos|prevent|prognos|cause|mechanism|side|cost|researcher|study/.test(
        q,
      ) &&
      q.split(/\s+/).filter((w) => w.length > 2).length <= 4
    )
      return {
        type: "recent_research",
        description: "Show latest research on this condition",
      };

    return {
      type: "general",
      description: "Find relevant research on this topic",
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBMED QUERY BUILDER — always rule-based (reliable syntax)
  // ════════════════════════════════════════════════════════════════════════
  _buildPubMedQuery(disease, intent, originalQuery) {
    const currentYear = this.currentYear;
    const minYear = currentYear - 3;
    const queryLower = originalQuery.toLowerCase();

    const effectiveDisease =
      intent.type === "clinical_trials"
        ? this._extractQueryDisease(originalQuery, disease) || disease
        : disease;

    const diseaseTag = effectiveDisease
      ? `("${effectiveDisease}"[Title/Abstract] OR "${effectiveDisease}"[MeSH Terms])`
      : "";

    const drugFound = this._getDrugFromQuery(queryLower);
    const supplement = this._getSupplementFromQuery(originalQuery);
    const isPostProgress =
      /stops working|stopped working|after immunotherapy|after chemotherapy|progressed on|after progression|salvage|rechallenge|refractory/.test(
        queryLower,
      );
    const isCNS =
      /blood-brain barrier|bbb|cns penetrat|intracranial|brain metastas|leptomeningeal/.test(
        queryLower,
      );

    // Post-progression
    if (
      isPostProgress &&
      effectiveDisease &&
      intent.type === "treatment_solutions"
    ) {
      const failedTx =
        queryLower.includes("immunotherapy") ||
        queryLower.includes("pd-1") ||
        queryLower.includes("ici")
          ? `("after immunotherapy"[Title/Abstract] OR "PD-1 failure"[Title/Abstract] OR "second-line"[Title/Abstract] OR "salvage"[Title/Abstract])`
          : queryLower.includes("alectinib") || queryLower.includes("alk")
            ? `("after alectinib"[Title/Abstract] OR "ALK resistance"[Title/Abstract] OR "lorlatinib"[Title/Abstract])`
            : queryLower.includes("egfr") || queryLower.includes("tki")
              ? `("EGFR resistance"[Title/Abstract] OR "TKI failure"[Title/Abstract] OR "osimertinib resistance"[Title/Abstract])`
              : `("second-line"[Title/Abstract] OR "salvage therapy"[Title/Abstract])`;
      return `${diseaseTag} AND ${failedTx} AND ("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND (${minYear}:${currentYear}[PDAT])`;
    }

    // CNS
    if (isCNS && effectiveDisease) {
      return `${diseaseTag} AND ("brain metastases"[Title/Abstract] OR "intracranial"[Title/Abstract] OR "CNS efficacy"[Title/Abstract] OR "blood-brain barrier"[Title/Abstract]) AND ("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND (${currentYear - 6}:${currentYear}[PDAT])`;
    }

    const map = {
      treatment_solutions:
        drugFound && effectiveDisease
          ? `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (${minYear}:${currentYear}[PDAT])`
          : effectiveDisease
            ? `${diseaseTag} AND (treatment[Title] OR therapy[Title] OR efficacy[Title] OR outcome[Title] OR survival[Title] OR response[Title]) AND ("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type] OR "systematic review"[Publication Type]) AND (${minYear}:${currentYear}[PDAT])`
            : `${originalQuery} treatment efficacy outcome randomized`,

      clinical_trials: (() => {
        const td = this._extractQueryDisease(originalQuery, disease);
        const tag = td
          ? `("${td}"[Title/Abstract] OR "${td}"[MeSH Terms])`
          : diseaseTag;
        return tag
          ? `${tag} AND (treatment[Title] OR therapy[Title] OR efficacy[Title]) AND "clinical trial"[Publication Type] AND (${minYear}:${currentYear}[PDAT])`
          : `${originalQuery} treatment clinical trial randomized`;
      })(),

      recent_research: effectiveDisease
        ? `${diseaseTag} AND ("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type] OR "systematic review"[Publication Type]) AND (${minYear}:${currentYear}[PDAT])`
        : `${originalQuery} clinical trial randomized`,

      researchers: effectiveDisease
        ? `${diseaseTag} AND review[Title] AND (${minYear}:${currentYear}[PDAT])`
        : `${originalQuery} review`,

      safety_efficacy:
        supplement && effectiveDisease
          ? `"${supplement}"[Title/Abstract] AND ${diseaseTag} AND (safety OR efficacy OR supplementation OR association OR outcome)`
          : effectiveDisease
            ? `${diseaseTag} AND (safety[Title] OR efficacy[Title] OR adverse[Title] OR dietary[Title])`
            : `${originalQuery} safety efficacy`,

      mechanism:
        drugFound && effectiveDisease
          ? `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (mechanism[Title] OR pathway[Title])`
          : effectiveDisease
            ? `${diseaseTag} AND (mechanism[Title] OR pathway[Title] OR pathogenesis[Title])`
            : `${originalQuery} mechanism pathway`,

      symptoms_diagnosis: effectiveDisease
        ? `${diseaseTag} AND (diagnosis[Title] OR symptom[Title] OR biomarker[Title] OR screening[Title])`
        : `${originalQuery} diagnosis symptom`,

      prevention: effectiveDisease
        ? `${diseaseTag} AND (prevention[Title] OR prophylaxis[Title] OR "risk reduction"[Title]) AND ("randomized controlled trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND (${minYear}:${currentYear}[PDAT])`
        : `${originalQuery} prevention`,

      prognosis: effectiveDisease
        ? `${diseaseTag} AND (prognosis[Title] OR survival[Title] OR mortality[Title]) AND (${minYear}:${currentYear}[PDAT])`
        : `${originalQuery} prognosis survival`,

      comparison:
        drugFound && effectiveDisease
          ? `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (versus[Title] OR compared[Title]) AND ("randomized controlled trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND (${minYear}:${currentYear}[PDAT])`
          : effectiveDisease
            ? `${diseaseTag} AND (versus[Title] OR compared[Title]) AND ("randomized controlled trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND (${minYear}:${currentYear}[PDAT])`
            : `${originalQuery} comparison randomized`,

      side_effects: drugFound
        ? effectiveDisease
          ? `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (adverse[Title] OR "side effect"[Title] OR toxicity[Title])`
          : `"${drugFound}"[Title/Abstract] AND (adverse[Title] OR toxicity[Title])`
        : effectiveDisease
          ? `${diseaseTag} AND (adverse[Title] OR toxicity[Title] OR safety[Title])`
          : `${originalQuery} adverse safety`,

      access_cost: effectiveDisease
        ? `${diseaseTag} AND (cost[Title] OR access[Title])`
        : `${originalQuery} cost access`,
      general: effectiveDisease
        ? `${diseaseTag} AND (${minYear}:${currentYear}[PDAT])`
        : originalQuery,
    };

    return map[intent.type] || map.general;
  }

  // ════════════════════════════════════════════════════════════════════════
  // OPENALEX QUERY BUILDER — natural language semantic description
  // Describes what a USEFUL paper would contain, not keywords
  // ════════════════════════════════════════════════════════════════════════
  _buildOpenAlexQuery(disease, intent, originalQuery) {
    const currentYear = this.currentYear;
    const queryLower = originalQuery.toLowerCase();
    const drugFound = this._getDrugFromQuery(queryLower);
    const supplement = this._getSupplementFromQuery(originalQuery);
    const enrichment = this._getDiseaseEnrichment(disease).join(" ");
    const effectiveDis =
      intent.type === "clinical_trials"
        ? this._extractQueryDisease(originalQuery, disease) || disease
        : disease;

    const isPostProgress =
      /stops working|stopped working|after immunotherapy|after chemotherapy|progressed on|salvage|refractory|resistant/.test(
        queryLower,
      );
    const isCNS =
      /blood-brain barrier|bbb|intracranial|brain metastas|leptomeningeal/.test(
        queryLower,
      );

    const map = {
      treatment_solutions: (() => {
        if (isPostProgress && effectiveDis) {
          const failedTx = queryLower.includes("immunotherapy")
            ? "immunotherapy checkpoint inhibitor"
            : queryLower.includes("alectinib")
              ? "alectinib ALK inhibitor"
              : queryLower.includes("egfr") || queryLower.includes("tki")
                ? "EGFR TKI osimertinib"
                : "prior treatment";
          return `${effectiveDis} second-line treatment after ${failedTx} failure overall survival progression-free survival response rate randomized trial ${currentYear}`;
        }
        if (isCNS && effectiveDis)
          return `${effectiveDis} brain metastases intracranial response CNS penetration blood-brain barrier overall survival progression-free survival ${currentYear}`;
        if (drugFound && effectiveDis)
          return `${drugFound} ${effectiveDis} efficacy overall survival progression-free survival response rate randomized controlled trial phase ${currentYear}`;
        return effectiveDis
          ? `${effectiveDis} treatment efficacy overall survival progression-free survival response rate randomized controlled trial phase ${enrichment} ${currentYear}`
          : `${originalQuery} efficacy outcomes randomized trial overall survival response rate`;
      })(),

      clinical_trials: (() => {
        const td = this._extractQueryDisease(originalQuery, disease);
        return td
          ? `${td} randomized controlled trial phase efficacy safety outcomes ${currentYear}`
          : `${effectiveDis || originalQuery} randomized controlled trial phase outcomes efficacy ${currentYear}`;
      })(),

      recent_research: effectiveDis
        ? `${effectiveDis} randomized controlled trial clinical outcomes treatment efficacy ${enrichment} ${currentYear}`
        : `${originalQuery} clinical trial outcomes ${currentYear}`,

      researchers: effectiveDis
        ? `${effectiveDis} research breakthrough key findings systematic review meta-analysis ${currentYear}`
        : `${originalQuery} research review findings`,

      safety_efficacy:
        supplement && effectiveDis
          ? `${supplement} ${effectiveDis} patients safety efficacy supplementation outcomes adverse effects serum levels`
          : effectiveDis
            ? `${effectiveDis} safety efficacy adverse effects well-tolerated outcomes`
            : `${originalQuery} safety efficacy`,

      mechanism:
        drugFound && effectiveDis
          ? `${drugFound} ${effectiveDis} mechanism action pathway molecular biology resistance`
          : effectiveDis
            ? `${effectiveDis} molecular mechanism pathogenesis pathway signaling biology`
            : `${originalQuery} mechanism pathway biology`,

      symptoms_diagnosis: effectiveDis
        ? `${effectiveDis} diagnosis symptoms biomarkers screening detection sensitivity specificity`
        : `${originalQuery} diagnosis symptoms detection`,

      prevention: effectiveDis
        ? `${effectiveDis} prevention risk reduction prophylaxis randomized trial lifestyle intervention`
        : `${originalQuery} prevention risk reduction`,

      prognosis: effectiveDis
        ? `${effectiveDis} prognosis overall survival mortality hazard ratio disease-free survival randomized cohort`
        : `${originalQuery} prognosis survival`,

      comparison: (() => {
        if (drugFound && effectiveDis)
          return `${drugFound} ${effectiveDis} comparison versus randomized controlled trial overall survival hazard ratio ${currentYear}`;
        const vsMatch = originalQuery.match(
          /(\w[\w\s]+?)\s+(?:vs\.?|versus)\s+([\w\s]+?)(?:\s+for|\s+in|$)/i,
        );
        if (vsMatch)
          return `${effectiveDis || ""} ${vsMatch[1].trim()} versus ${vsMatch[2].trim()} randomized controlled trial outcomes ${currentYear}`;
        return effectiveDis
          ? `${effectiveDis} comparison versus randomized controlled trial outcomes ${currentYear}`
          : `${originalQuery} comparison randomized trial`;
      })(),

      side_effects: drugFound
        ? effectiveDis
          ? `${drugFound} ${effectiveDis} adverse effects safety toxicity grade 3 immune-related tolerability`
          : `${drugFound} adverse effects safety toxicity`
        : effectiveDis
          ? `${effectiveDis} adverse effects safety toxicity grade immune-related treatment-related`
          : `${originalQuery} adverse effects safety`,

      access_cost: effectiveDis
        ? `${effectiveDis} treatment cost access healthcare affordability`
        : `${originalQuery} cost access`,
      general: effectiveDis
        ? `${effectiveDis} clinical outcomes treatment research ${currentYear}`
        : originalQuery,
    };

    return map[intent.type] || map.general;
  }

  // ════════════════════════════════════════════════════════════════════════
  // GENERATE CLINICAL SIGNALS
  // These are passed to rankingService to score papers at abstract level
  // This is what makes the system behave "smart" for every query
  // ════════════════════════════════════════════════════════════════════════
  _generateClinicalSignals(intent, originalQuery, disease, llmSignals = null) {
    const queryLower = originalQuery.toLowerCase();
    const drugFound = this._getDrugFromQuery(queryLower);
    const supplement = this._getSupplementFromQuery(originalQuery);
    const profile =
      this.intentPaperProfiles[intent.type] || this.intentPaperProfiles.general;

    // Start with intent profile signals
    const mustHave = [...profile.mustContain];
    const strongSignals = [...profile.strongSignals];
    const avoidInTitle = [...profile.avoidInTitle];

    // Add query-specific signals
    if (drugFound) {
      mustHave.push(drugFound);
      strongSignals.push(drugFound);
    }
    if (supplement) {
      mustHave.push(supplement.toLowerCase());
    }
    if (disease) {
      mustHave.push(disease.toLowerCase());
    }

    // Context-specific enrichment
    if (/refractory|resistant|second.?line|after.*fail/.test(queryLower)) {
      mustHave.push("second-line", "refractory", "resistance");
      strongSignals.push(
        "after progression",
        "post-progression",
        "resistance mechanism",
      );
    }
    if (/brain|intracranial|cns|leptomeningeal/.test(queryLower)) {
      mustHave.push("intracranial", "brain metastases");
      strongSignals.push("intracranial ORR", "CNS PFS", "blood-brain barrier");
    }
    if (/vitamin|supplement/.test(queryLower)) {
      strongSignals.push(
        "serum levels",
        "supplementation",
        "deficiency",
        "association",
      );
    }

    // Merge with LLM-generated signals if available
    if (llmSignals) {
      if (Array.isArray(llmSignals.mustHaveSignals)) {
        llmSignals.mustHaveSignals.forEach((s) => {
          if (typeof s === "string" && s.trim()) mustHave.push(s.toLowerCase());
        });
      }
      if (Array.isArray(llmSignals.strongSignals)) {
        llmSignals.strongSignals.forEach((s) => {
          if (typeof s === "string" && s.trim())
            strongSignals.push(s.toLowerCase());
        });
      }
      if (Array.isArray(llmSignals.avoidTerms)) {
        llmSignals.avoidTerms.forEach((s) => {
          if (typeof s === "string" && s.trim())
            avoidInTitle.push(s.toLowerCase());
        });
      }
    }

    return {
      mustHave: [...new Set(mustHave)].slice(0, 8),
      strongSignals: [...new Set(strongSignals)].slice(0, 8),
      weakSignals: profile.weakSignals.slice(0, 3),
      avoidInTitle: [...new Set(avoidInTitle)].slice(0, 10),
      userNeed: profile.userNeed,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // BUILD CLINICAL FOCUS — compressed description for LLM system prompt
  // ════════════════════════════════════════════════════════════════════════
  _buildClinicalFocus(intent, originalQuery, disease, llmFocus = null) {
    // LLM-generated focus is always preferred
    if (llmFocus && typeof llmFocus === "string" && llmFocus.length > 5) {
      return llmFocus;
    }

    const q = originalQuery.toLowerCase();
    const drugFound = this._getDrugFromQuery(q);
    const supplement = this._getSupplementFromQuery(originalQuery);
    const yr = this.currentYear;

    const templates = {
      treatment_solutions: drugFound
        ? `${drugFound} efficacy outcomes in ${disease || "patients"} (${yr - 2}–${yr})`
        : `${disease || "condition"} treatment options with survival and response data (${yr - 2}–${yr})`,
      safety_efficacy: supplement
        ? `${supplement} safety and association with outcomes in ${disease || "patients"}`
        : `safety and clinical guidance for ${originalQuery.replace(/can i|should i|is it safe to/gi, "").trim()} in ${disease || "patients"}`,
      comparison: `comparative efficacy: ${originalQuery.replace(/compare|which is better|vs/gi, "versus").trim()}`,
      side_effects: drugFound
        ? `adverse effects and tolerability of ${drugFound} in ${disease || "patients"}`
        : `toxicity profile and safety in ${disease || "patients"}`,
      prognosis: `survival outcomes and prognostic factors in ${disease || "patients"}`,
      symptoms_diagnosis: `diagnostic accuracy and biomarkers for ${disease || "condition"}`,
      mechanism: drugFound
        ? `mechanism of action of ${drugFound} in ${disease || "biology"}`
        : `molecular pathways in ${disease || "condition"}`,
      prevention: `risk reduction strategies and prevention in ${disease || "patients"}`,
      recent_research: `latest clinical findings in ${disease || "condition"} (${yr - 1}–${yr})`,
      clinical_trials: `ongoing and completed trials for ${disease || "condition"}`,
      researchers: `key research contributions in ${disease || "condition"}`,
      general: disease ? `${disease} clinical research` : originalQuery,
    };

    return templates[intent.type] || originalQuery;
  }

  // ════════════════════════════════════════════════════════════════════════
  // LLM-POWERED QUERY UNDERSTANDING
  // Runs for EVERY query — this is the "SMART" behavior
  // Falls back to rule-based if LLM fails (network error, timeout, etc.)
  // ════════════════════════════════════════════════════════════════════════
  async _runLLMExpansion(originalQuery, disease, context) {
    // Dynamic import to avoid circular dependency
    const { default: llmService } = await import("../ai/llmService.js");

    const systemPrompt = `You are a medical research librarian. Your job is to understand a patient's or clinician's query and generate the BEST possible signals to find relevant papers in PubMed and OpenAlex.

You MUST identify:
1. What clinical question is being asked
2. What a USEFUL paper would actually contain to answer this question
3. What terms would appear in the abstract of a relevant paper
4. What terms in a paper title would indicate the paper is NOT useful

IMPORTANT RULES:
- If the query asks about a supplement (vitamin, herb, mineral) → focus on safety, association, serum levels in patients — NOT drug trials
- If the query asks about a specific drug → focus on that drug's efficacy data (OS, PFS, ORR, HR)
- If the query asks "latest treatments" → focus on Phase 3 RCTs and meta-analyses with survival data
- If the disease in the query differs from the stored disease → use the QUERY disease
- mustHaveSignals must be phrases that appear in the ABSTRACT of a useful paper
- avoidTerms must be title-level phrases that identify clearly irrelevant papers

Return ONLY valid JSON — no markdown, no extra text.`;

    const userPrompt = `Query: "${originalQuery}"
Disease context: "${disease || "not specified"}"
Year: ${this.currentYear}

Return this JSON:
{
  "intent": "${this.VALID_INTENTS.join("|")}",
  "intentDescription": "one sentence: what clinical answer does the user need",
  "clinicalFocus": "compressed clinical problem, max 10 words",
  "openalexQuery": "15-20 word natural language description of what useful papers contain",
  "mustHaveSignals": ["phrase from abstract proving paper is relevant", "...up to 5"],
  "strongSignals": ["phrase indicating high-quality match", "...up to 5"],
  "avoidTerms": ["title phrase for irrelevant papers", "...up to 5"],
  "isSupplementQuery": true/false,
  "isLifestyleQuery": true/false,
  "effectiveDisease": "disease the user is actually asking about (may differ from stored disease)"
}`;

    const response = await llmService.generate(
      `${systemPrompt}\n\n${userPrompt}`,
      { temperature: 0.0, max_tokens: 500 },
    );

    const jsonMatch = (response.text || "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM expansion response");

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate intent
    if (!this.VALID_INTENTS.includes(parsed.intent)) {
      parsed.intent = "treatment_solutions";
    }

    return parsed;
  }

  // ════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT — ONE MODE, ALWAYS SMART
  // ════════════════════════════════════════════════════════════════════════
  async expandQuery(originalQuery, disease, context = {}) {
    this.currentYear = new Date().getFullYear();

    console.log(`\n🧠 Query Understanding: "${originalQuery}"`);

    let llmOutput = null;
    let intent = null;
    let usedLLM = false;

    // ── Step 1: Try LLM-powered understanding ────────────────────────────
    try {
      llmOutput = await this._runLLMExpansion(originalQuery, disease, context);
      intent = {
        type: llmOutput.intent,
        description:
          llmOutput.intentDescription || "Find relevant medical research",
      };
      usedLLM = true;
      console.log(`   ✅ LLM understood: intent="${intent.type}"`);
      console.log(`   📋 Clinical focus: "${llmOutput.clinicalFocus}"`);
      console.log(
        `   🎯 Must-have: ${(llmOutput.mustHaveSignals || []).slice(0, 3).join(", ")}`,
      );
    } catch (llmError) {
      // ── Step 2: Fallback to rule-based detection ─────────────────────
      console.warn(
        `   ⚠️  LLM expansion failed (${llmError.message}) — using rule-based detection`,
      );
      intent = this._detectIntentRuleBased(originalQuery);
      usedLLM = false;
      console.log(`   📋 Rule-based intent: "${intent.type}"`);
    }

    // ── Step 3: Use effective disease (LLM may override) ─────────────────
    const effectiveDisease =
      usedLLM &&
      llmOutput?.effectiveDisease &&
      llmOutput.effectiveDisease !== "not specified"
        ? llmOutput.effectiveDisease
        : disease;

    if (effectiveDisease !== disease) {
      console.log(
        `   🔄 Disease override: "${disease}" → "${effectiveDisease}"`,
      );
    }

    // ── Step 4: Build search queries ──────────────────────────────────────
    // OpenAlex: use LLM-generated description if available, else rule-based
    const openalexQuery =
      usedLLM && llmOutput?.openalexQuery && llmOutput.openalexQuery.length > 10
        ? llmOutput.openalexQuery
        : this._buildOpenAlexQuery(effectiveDisease, intent, originalQuery);

    // PubMed: always rule-based (structured syntax cannot be LLM-generated reliably)
    const pubmedQuery = this._buildPubMedQuery(
      effectiveDisease,
      intent,
      originalQuery,
    );

    // ── Step 5: Generate clinical signals (merge LLM + rules) ─────────────
    const clinicalSignals = this._generateClinicalSignals(
      intent,
      originalQuery,
      effectiveDisease,
      llmOutput,
    );

    // ── Step 6: Build clinical focus string ───────────────────────────────
    const clinicalFocus = this._buildClinicalFocus(
      intent,
      originalQuery,
      effectiveDisease,
      llmOutput?.clinicalFocus,
    );

    // ── Step 7: Detect context flags ──────────────────────────────────────
    const isSupplementQuery = usedLLM
      ? llmOutput?.isSupplementQuery === true
      : [...this.supplementTerms].some((t) =>
          originalQuery.toLowerCase().includes(t),
        ) || this._getSupplementFromQuery(originalQuery) !== null;

    const isLifestyleQuery = usedLLM
      ? llmOutput?.isLifestyleQuery === true
      : this._isFoodOrLifestyleQuery(originalQuery.toLowerCase());

    // ── Step 8: Populate context for downstream services ──────────────────
    context._intent = intent;
    context._pubmedQuery = pubmedQuery;
    context._openalexQuery = openalexQuery;
    context._semanticQuery = openalexQuery; // same query used for both
    context._clinicalFocus = clinicalFocus;
    context._clinicalSignals = clinicalSignals;
    context._mustHaveSignals = clinicalSignals.strongSignals;
    context._avoidTerms = clinicalSignals.avoidInTitle;
    context._expansionTerms = clinicalSignals.mustHave;
    context._effectiveDisease = effectiveDisease;
    context._usedLLMExpansion = usedLLM;
    context.isLifestyleQuery = isLifestyleQuery;
    context.isSupplementQuery = isSupplementQuery;

    console.log(`   📝 PubMed:   "${pubmedQuery.substring(0, 90)}..."`);
    console.log(`   📝 OpenAlex: "${openalexQuery}"`);
    console.log(
      `   🔬 Signals:  [${clinicalSignals.mustHave.slice(0, 3).join(", ")}]`,
    );
    console.log(
      `   🚫 Avoid:    [${clinicalSignals.avoidInTitle.slice(0, 3).join(", ")}]`,
    );

    return openalexQuery;
  }

  // ── Compatibility methods ────────────────────────────────────────────────
  extractIntent(query) {
    return this._detectIntentRuleBased(query);
  }

  generateSearchVariations(query, disease) {
    return [query, disease ? `${disease} ${query}` : query].filter(Boolean);
  }

  // Keep public method name for any external callers
  detectQueryIntent(query) {
    return this._detectIntentRuleBased(query);
  }

  generateClinicalSignals(intent, originalQuery, disease) {
    return this._generateClinicalSignals(intent, originalQuery, disease, null);
  }
}

export default new QueryExpansionService();
