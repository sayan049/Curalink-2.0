// ============================================================
// rankingService.js — Semantic + Usefulness-Aware Ranking
// ============================================================
// Fixes applied:
//   FIX 1: Evidence diversity enforced INSIDE selection loop
//   FIX 2: [object Object] title hard-blocked
//   FIX 3: Semantic score near-zero fallback for lifestyle/supplement
//   FIX 4: diversifyResults logs bucket distribution
//   FIX 5: Primary population check for supplement/safety queries
//           - Prevents asthma/CVD papers from appearing
//           - Detects named index/tool disease name patterns
//           - Detects different primary disease populations
//           - NEW FIX 5C: Multi-cancer/multi-disease review detection
//             Blocks papers like "Vitamin Supplements for CVD and Cancer"
//             from appearing for disease-specific supplement queries
//   FIX 6: safety_efficacy max age increased 8→12 years
// ============================================================

import embeddingService from "../ai/embeddingService.js";

class RankingService {
  constructor() {
    this.currentYear = new Date().getFullYear();

    this.highImpactJournals = new Set([
      "nature medicine",
      "new england journal of medicine",
      "nejm",
      "lancet",
      "jama",
      "british medical journal",
      "bmj",
      "cell",
      "science",
      "nature",
      "annals of internal medicine",
      "plos medicine",
      "journal of clinical oncology",
      "circulation",
      "diabetes care",
      "brain",
      "cancer cell",
      "clinical cancer research",
      "jama oncology",
      "lancet oncology",
      "nature cancer",
      "cancer discovery",
      "journal of thoracic oncology",
      "annals of oncology",
    ]);

    this.evidenceHierarchy = [
      {
        tier: 1,
        label: "Phase 3 RCT",
        score: 50,
        patterns: [
          "phase 3",
          "phase iii",
          "phase 3 trial",
          "phase iii trial",
          "randomized controlled trial",
          "randomised controlled trial",
        ],
        titleDisqualifiers: [
          "meta-analysis",
          "systematic review",
          "network meta",
          "pooled analysis",
        ],
      },
      {
        tier: 2,
        label: "Meta-analysis / Systematic Review",
        score: 45,
        patterns: [
          "meta-analysis",
          "network meta-analysis",
          "systematic review",
          "pooled analysis",
        ],
        titleDisqualifiers: [],
      },
      {
        tier: 3,
        label: "Phase 2 RCT",
        score: 35,
        patterns: [
          "phase 2",
          "phase ii",
          "randomized phase 2",
          "randomised phase 2",
        ],
        titleDisqualifiers: [
          "meta-analysis",
          "systematic review",
          "network meta",
        ],
      },
      {
        tier: 4,
        label: "Prospective Cohort",
        score: 28,
        patterns: [
          "prospective cohort",
          "multicenter retrospective",
          "real-world evidence",
          "real-world study",
          "population-based study",
        ],
        titleDisqualifiers: [],
      },
      {
        tier: 5,
        label: "Retrospective / Single-arm",
        score: 15,
        patterns: [
          "retrospective study",
          "retrospective analysis",
          "single-arm",
          "observational study",
          "historical cohort",
        ],
        titleDisqualifiers: [],
      },
      {
        tier: 6,
        label: "Pilot / Exploratory",
        score: 8,
        patterns: [
          "pilot study",
          "feasibility study",
          "exploratory study",
          "case series",
          "case report",
        ],
        titleDisqualifiers: [],
      },
    ];

    this.realResultSignals = [
      "we found",
      "we observed",
      "we demonstrated",
      "results showed",
      "results show",
      "results demonstrated",
      "results indicate",
      "our findings",
      "our results",
      "the study showed",
      "the trial showed",
      "demonstrated that",
      "showed that",
      "revealed that",
      "significantly improved",
      "significantly reduced",
      "significantly increased",
      "was associated with",
      "were associated with",
      "patients achieved",
      "patients who received",
      "median overall survival",
      "median progression-free",
      "overall survival was",
      "progression-free survival was",
      "response rate was",
      "response rate of",
      "hazard ratio",
      "confidence interval",
      "p value",
      "p =",
      "p<",
      "p <",
      "95% ci",
      "compared with",
      "compared to",
      "superior to",
      "non-inferior to",
      "showed significant",
      "found significant",
    ];

    this.noResultSignals = [
      "this study aims",
      "this trial aims",
      "we aim to",
      "we will investigate",
      "will be enrolled",
      "is ongoing",
      "study protocol",
      "correction to",
      "erratum",
      "corrigendum",
      "we apologize",
      "this corrects",
      "publisher's correction",
      "author correction",
      "retraction",
      "will be recruited",
      "is currently recruiting",
      "study is ongoing",
      "we propose to",
      "we plan to",
      "this article has been retracted",
    ];

    this.clinicalNumberPatterns = [
      /\d+\.?\d*\s*%/,
      /\d+\.?\d*\s*months/i,
      /hr\s*[=:]\s*0?\.\d+/i,
      /hazard ratio.*\d/i,
      /p\s*[<=>]\s*0?\.\d+/i,
      /median.*\d+\.?\d*\s*months/i,
      /os.*\d+\.?\d*\s*months/i,
      /pfs.*\d+\.?\d*\s*months/i,
      /orr.*\d+\.?\d*\s*%/i,
      /response rate.*\d+\.?\d*\s*%/i,
      /survival.*\d+\.?\d*\s*%/i,
      /\(\d+\.?\d*.*\d+\.?\d*\)/,
    ];

    this.diseaseSynonyms = {
      "lung cancer": [
        "pulmonary carcinoma",
        "pulmonary cancer",
        "thoracic cancer",
        "nsclc",
        "sclc",
        "bronchogenic",
        "bronchial carcinoma",
      ],
      cancer: [
        "tumor",
        "malignancy",
        "carcinoma",
        "oncology",
        "neoplasm",
        "metastasis",
        "malignant",
        "adenocarcinoma",
      ],
      "alzheimer's disease": [
        "alzheimer",
        "dementia",
        "cognitive decline",
        "cognitive impairment",
        "amyloid",
        "neurodegeneration",
      ],
      "parkinson's disease": [
        "parkinson",
        "parkinsonian",
        "dopaminergic",
        "lewy body",
      ],
      diabetes: [
        "diabetic",
        "glycemic",
        "hyperglycemia",
        "insulin resistance",
        "hba1c",
        "t2dm",
        "t1dm",
      ],
      "type 2 diabetes": [
        "diabetic",
        "glycemic",
        "t2dm",
        "insulin resistance",
        "hyperglycemia",
        "hba1c",
      ],
      "heart disease": [
        "cardiac",
        "cardiovascular",
        "coronary",
        "myocardial",
        "atherosclerosis",
        "angina",
        "ischemic",
      ],
      "heart failure": [
        "cardiac failure",
        "cardiomyopathy",
        "ventricular dysfunction",
        "hfref",
        "hfpef",
      ],
      hypertension: [
        "high blood pressure",
        "blood pressure",
        "antihypertensive",
        "systolic",
        "hypertensive",
      ],
      stroke: [
        "cerebrovascular",
        "cerebral infarction",
        "brain attack",
        "ischemic stroke",
        "hemorrhagic stroke",
      ],
      copd: [
        "emphysema",
        "chronic bronchitis",
        "obstructive pulmonary",
        "airflow obstruction",
      ],
      "breast cancer": [
        "mammary carcinoma",
        "breast carcinoma",
        "her2",
        "triple negative",
        "brca",
      ],
      "kidney disease": [
        "renal disease",
        "nephropathy",
        "chronic kidney",
        "renal failure",
        "glomerulonephritis",
      ],
      "liver disease": [
        "hepatic disease",
        "cirrhosis",
        "hepatitis",
        "liver failure",
        "steatohepatitis",
      ],
      "multiple sclerosis": [
        "demyelinating",
        "ms patients",
        "relapsing remitting",
        "myelin",
      ],
      "rheumatoid arthritis": [
        "rheumatoid",
        "inflammatory arthritis",
        "synovitis",
        "anti-tnf",
      ],
      depression: [
        "depressive disorder",
        "major depression",
        "antidepressant",
        "ssri",
        "mood disorder",
      ],
      anxiety: [
        "anxiety disorder",
        "generalized anxiety",
        "panic disorder",
        "anxiolytic",
      ],
      "covid-19": ["sars-cov-2", "coronavirus", "covid", "pandemic"],
      obesity: [
        "overweight",
        "adiposity",
        "bmi",
        "bariatric",
        "weight loss",
        "metabolic syndrome",
      ],
    };

    this.diseaseExclusions = {
      "lung cancer": [
        "breast cancer",
        "colon cancer",
        "prostate cancer",
        "gastric cancer",
        "ovarian cancer",
        "pancreatic cancer",
        "cervical cancer",
        "bladder cancer",
        "pulmonary fibrosis",
        "pulmonary hypertension",
        "idiopathic pulmonary",
        "interstitial lung disease",
      ],
      "heart disease": ["cirrhotic", "liver cirrhosis", "hepatic", "cirrhosis"],
      "heart failure": ["cirrhotic", "hepatic", "liver cirrhosis"],
      "alzheimer's disease": [
        "parkinson",
        "lewy body dementia",
        "frontotemporal",
      ],
      "parkinson's disease": ["alzheimer", "lewy body dementia"],
      diabetes: ["cirrhosis", "liver cirrhosis"],
    };

    this.globalExclusions = [
      "corrigendum",
      "erratum",
      "correction to",
      "publisher's correction",
      "author correction",
      "retraction",
      "retracted",
      "this corrects",
      "study protocol",
      "protocol for a",
      "protocol of the",
      "trial protocol",
    ];

    this.nonClinicalPapers = [
      "machine learning model",
      "deep learning model",
      "neural network classifier",
      "artificial intelligence prediction",
      "prediction model for",
      "predictive model",
      "nanoparticle",
      "nanomedicine",
      "drug delivery system",
      "liposome",
      "chitosan",
      "in vitro study",
      "cell line study",
      "mouse model only",
      "murine model",
      "cost-effectiveness analysis",
      "economic analysis",
      "budget impact",
    ];

    this.intentAbstractRequirements = {
      treatment_solutions: {
        atLeastOne: [
          "efficacy",
          "response rate",
          "overall survival",
          "progression-free",
          "randomized",
          "hazard ratio",
          "outcome",
          "treatment",
          "therapy",
          "phase",
        ],
        resultConfirmed: [
          "overall survival",
          "progression-free survival",
          "response rate",
          "hazard ratio",
          "phase 3",
          "randomized controlled",
          "meta-analysis",
          "systematic review",
        ],
        contextOnly: [
          "machine learning",
          "prediction model",
          "deep learning",
          "neural network",
          "study protocol",
          "cost-effectiveness",
          "nanoparticle",
          "in vitro",
          "cell line",
        ],
      },
      safety_efficacy: {
        atLeastOne: [
          "safety",
          "adverse",
          "efficacy",
          "association",
          "risk",
          "patients",
          "clinical",
          "outcome",
          "supplementation",
          "dietary",
          "serum",
          "vitamin",
          "supplement",
          "levels",
        ],
        resultConfirmed: [
          "well-tolerated",
          "adverse events",
          "safety",
          "efficacy",
          "benefit",
          "risk",
          "patients",
          "association",
          "levels",
          "supplementation",
        ],
        contextOnly: [
          "in vitro",
          "cell line",
          "mouse model",
          "tumor xenograft",
          "ic50",
          "western blot",
        ],
      },
      comparison: {
        atLeastOne: [
          "versus",
          "compared",
          "comparison",
          "randomized",
          "superiority",
          "non-inferior",
          "hazard",
          "outcome",
        ],
        resultConfirmed: [
          "versus",
          "compared with",
          "superior to",
          "non-inferior to",
          "hazard ratio",
          "randomized controlled",
        ],
        contextOnly: [
          "machine learning",
          "prediction model",
          "study protocol",
          "in vitro",
          "nanoparticle",
        ],
      },
      side_effects: {
        atLeastOne: [
          "adverse",
          "toxicity",
          "safety",
          "tolerability",
          "complication",
          "grade",
          "immune-related",
          "treatment-related",
        ],
        resultConfirmed: [
          "adverse events",
          "toxicity",
          "grade 3",
          "grade 4",
          "immune-related",
          "treatment-related",
          "discontinuation",
        ],
        contextOnly: [
          "in vitro",
          "cell line",
          "machine learning",
          "prediction model",
          "nanoparticle",
        ],
      },
      prognosis: {
        atLeastOne: [
          "survival",
          "mortality",
          "prognosis",
          "outcome",
          "hazard",
          "stage",
          "recurrence",
          "relapse",
        ],
        resultConfirmed: [
          "overall survival",
          "disease-free",
          "hazard ratio",
          "median survival",
          "5-year",
          "prognosis",
        ],
        contextOnly: [
          "machine learning",
          "prediction model",
          "in vitro",
          "nanoparticle",
          "cell line",
        ],
      },
      symptoms_diagnosis: {
        atLeastOne: [
          "diagnosis",
          "sensitivity",
          "specificity",
          "detection",
          "biomarker",
          "screening",
          "accuracy",
          "staging",
        ],
        resultConfirmed: [
          "sensitivity",
          "specificity",
          "auc",
          "diagnostic accuracy",
          "biomarker",
          "screening",
        ],
        contextOnly: [
          "machine learning",
          "in vitro",
          "nanoparticle",
          "treatment outcome",
          "survival",
        ],
      },
      mechanism: {
        atLeastOne: [
          "mechanism",
          "pathway",
          "molecular",
          "signaling",
          "expression",
          "protein",
          "gene",
          "biology",
        ],
        resultConfirmed: [
          "demonstrated",
          "revealed",
          "identified",
          "showed that",
          "pathway",
          "mechanism",
        ],
        contextOnly: [
          "cost-effectiveness",
          "study protocol",
          "clinical trial results",
          "survival outcome",
        ],
      },
      prevention: {
        atLeastOne: [
          "prevention",
          "risk reduction",
          "incidence",
          "protective",
          "prophylaxis",
          "lifestyle",
        ],
        resultConfirmed: [
          "reduced risk",
          "prevented",
          "lower incidence",
          "protective",
          "risk factor",
          "randomized",
        ],
        contextOnly: [
          "in vitro",
          "cell line",
          "machine learning",
          "prediction model",
          "nanoparticle",
        ],
      },
      recent_research: {
        atLeastOne: [
          "patients",
          "outcomes",
          "results",
          "trial",
          "cohort",
          "analysis",
          "randomized",
        ],
        resultConfirmed: [
          "randomized",
          "phase",
          "meta-analysis",
          "systematic review",
          "cohort study",
        ],
        contextOnly: ["study protocol", "corrigendum", "erratum"],
      },
      clinical_trials: {
        atLeastOne: [
          "trial",
          "randomized",
          "phase",
          "participants",
          "intervention",
          "efficacy",
          "safety",
        ],
        resultConfirmed: [
          "phase 3",
          "phase 2",
          "randomized controlled",
          "recruiting",
          "enrolling",
        ],
        contextOnly: [],
      },
      researchers: {
        atLeastOne: [
          "review",
          "findings",
          "demonstrated",
          "identified",
          "showed",
          "systematic",
          "meta",
        ],
        resultConfirmed: [
          "systematic review",
          "meta-analysis",
          "landmark",
          "multicenter",
        ],
        contextOnly: [],
      },
      general: {
        atLeastOne: [
          "patients",
          "clinical",
          "outcomes",
          "study",
          "trial",
          "analysis",
        ],
        resultConfirmed: [
          "randomized",
          "meta-analysis",
          "cohort",
          "trial",
          "systematic",
        ],
        contextOnly: ["corrigendum", "erratum", "study protocol"],
      },
    };

    this.trialTypeSignals = {
      treatment: [
        "treatment of",
        "therapy for",
        "first-line",
        "second-line",
        "chemotherapy",
        "immunotherapy",
        "targeted therapy",
        "versus",
        "compared with",
        "efficacy of",
        "safety and efficacy",
        "randomized controlled trial of",
        "phase 3",
        "phase iii",
        "adjuvant",
        "neoadjuvant",
        "maintenance therapy",
      ],
      diagnostic: [
        "diagnosis",
        "diagnostic",
        "screening",
        "detection",
        "imaging",
        "biopsy",
        "biomarker",
        "concordance",
        "sensitivity",
        "specificity",
        "liquid biopsy",
        "ctdna",
        "mutation detection",
      ],
      supportive: [
        "cachexia",
        "pain management",
        "quality of life",
        "palliative",
        "nausea",
        "fatigue",
        "rehabilitation",
        "bronchoscopy",
        "sedation",
        "anesthesia",
        "lignocaine",
        "lidocaine",
        "topical anesthetic",
        "procedural pain",
        "cough suppression",
      ],
      prevention: [
        "prevention",
        "prophylaxis",
        "chemoprevention",
        "risk reduction",
        "screening program",
      ],
    };

    this.trialHardExclusions = [
      "cough suppression",
      "pain relief during bronchoscopy",
      "lignocaine in",
      "lidocaine in",
      "sedation during",
      "dental procedure",
      "bowel preparation",
      "induction of labour",
      "dexmedetomidine and ketofol",
      "radial hemostasis",
      "challenges faced by therapist",
      "survey of physiotherapist",
      "perception of healthcare",
      "awareness among",
      "knowledge and attitude",
      "telerehabilitation",
      "mycobacterium w combination",
      "knowledge among",
      "attitude among",
      "practices among",
    ];

    this.trialStatusScores = {
      RECRUITING: 40,
      ENROLLING_BY_INVITATION: 30,
      COMPLETED: 20,
      ACTIVE_NOT_RECRUITING: 15,
      UNKNOWN: 5,
    };
    this.trialPhaseScores = {
      PHASE4: 20,
      PHASE3: 18,
      PHASE2PHASE3: 16,
      PHASE2: 14,
      PHASE1PHASE2: 12,
      PHASE1: 10,
      "N/A": 5,
    };

    this.cityToCountry = {
      kolkata: "india",
      calcutta: "india",
      mumbai: "india",
      bombay: "india",
      delhi: "india",
      "new delhi": "india",
      bangalore: "india",
      bengaluru: "india",
      chennai: "india",
      madras: "india",
      hyderabad: "india",
      pune: "india",
      ahmedabad: "india",
      jaipur: "india",
      lucknow: "india",
      surat: "india",
      chandigarh: "india",
      toronto: "canada",
      vancouver: "canada",
      london: "united kingdom",
      manchester: "united kingdom",
      sydney: "australia",
      melbourne: "australia",
      "new york": "united states",
      chicago: "united states",
      boston: "united states",
      berlin: "germany",
      paris: "france",
      tokyo: "japan",
      beijing: "china",
      shanghai: "china",
      seoul: "south korea",
      singapore: "singapore",
    };

    this.countryAliases = {
      india: ["india", "indian"],
      "united states": ["united states", "usa", "us", "america"],
      "united kingdom": ["united kingdom", "uk", "england", "britain"],
      australia: ["australia", "australian"],
      canada: ["canada", "canadian"],
      germany: ["germany", "german"],
      france: ["france", "french"],
      japan: ["japan", "japanese"],
      china: ["china", "chinese"],
      brazil: ["brazil", "brazilian"],
      "south korea": ["south korea", "korea", "korean"],
    };

    // FIX 6: safety_efficacy increased from 8 to 12 years
    this.intentMaxAge = {
      treatment_solutions: 5,
      recent_research: 3,
      comparison: 5,
      access_cost: 5,
      side_effects: 7,
      prognosis: 7,
      safety_efficacy: 12, // ← FIX 6: was 8, now 12
      prevention: 10, // ← slightly relaxed
      symptoms_diagnosis: 8,
      clinical_trials: 10,
      researchers: 10,
      general: 8,
      mechanism: null,
    };

    this.trialMaxAge = {
      treatment_solutions: 12,
      recent_research: 8,
      comparison: 10,
      side_effects: 15,
      prognosis: 15,
      symptoms_diagnosis: 12,
      mechanism: 20,
      researchers: 20,
      clinical_trials: 20,
      general: 15,
    };

    this.SAFETY_REQUIRED_INTENTS = new Set([
      "side_effects",
      "safety_efficacy",
      "comparison",
    ]);
    this.RESULT_CRITICAL_INTENTS = new Set([
      "treatment_solutions",
      "comparison",
      "prognosis",
      "side_effects",
      "recent_research",
    ]);
    this.KEYWORD_DOMINANT_INTENTS = new Set([
      "safety_efficacy",
      "prevention",
      "mechanism",
      "symptoms_diagnosis",
    ]);
    this.SUPPLEMENT_FOCUS_INTENTS = new Set([
      "safety_efficacy",
      "side_effects",
      "prevention",
    ]);

    this.KNOWN_INDEX_NAMES = [
      "lung cancer inflammation index",
      "advanced lung cancer inflammation index",
      "glasgow prognostic score",
      "cancer inflammation index",
    ];

    this.ALTERNATIVE_PRIMARY_DISEASES = [
      "asthma",
      "copd",
      "diabetes",
      "heart failure",
      "hypertension",
      "obesity",
      "rheumatoid arthritis",
      "psoriasis",
      "inflammatory bowel",
      "parkinson",
      "alzheimer",
      "epilepsy",
      "multiple sclerosis",
      "chronic kidney",
      "renal failure",
      "liver cirrhosis",
      "hepatitis",
      "depression",
      "schizophrenia",
      "bipolar",
      "anxiety disorder",
      "breast cancer",
      "prostate cancer",
      "colon cancer",
      "colorectal",
      "pancreatic cancer",
      "gastric cancer",
      "ovarian cancer",
      "melanoma",
    ];

    // FIX 5C: Multi-cancer / multi-disease review patterns
    // Papers matching these are NOT disease-specific — they cover all cancers
    // or cancer + CVD together. They should not appear for lung-cancer-specific
    // supplement queries like "can I take vitamin D for lung cancer".
    // Examples blocked:
    //   "Vitamin and Mineral Supplements for the Primary Prevention of CVD and Cancer"
    //   "Cancer and cardiovascular disease risk reduction"
    //   "Pan-cancer analysis of supplement use"
    this.MULTI_CANCER_REVIEW_PATTERNS = [
      /cardiovascular\s+disease\s+and\s+cancer/i,
      /cancer\s+and\s+cardiovascular\s+disease/i,
      /primary\s+prevention\s+of\s+cardiovascular\s+disease\s+and\s+cancer/i,
      /primary\s+prevention\s+of\s+cancer\s+and\s+cardiovascular/i,
      /multiple\s+cancer\s+types/i,
      /various\s+cancer\s+types/i,
      /several\s+cancer\s+types/i,
      /different\s+cancer\s+types/i,
      /site-specific\s+cancers/i,
      /all-cause\s+cancer/i,
      /pan-cancer/i,
      /multiple\s+malignancies/i,
      /cancer\s+incidence\s+and\s+(?:cardiovascular|cvd)/i,
    ];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CORE: PUBLICATION RANKING
  // ══════════════════════════════════════════════════════════════════════════
  rankPublications(publications, query, disease, context = {}, intent = null) {
    if (!Array.isArray(publications) || publications.length === 0) return [];

    this.currentYear = new Date().getFullYear();

    const intentType = intent?.type || context._intent?.type || "general";
    const clinicalSignals = context._clinicalSignals || null;
    const effectiveDisease = context._effectiveDisease || disease;
    const diseaseLower = effectiveDisease ? effectiveDisease.toLowerCase() : "";
    const diseaseTokens = effectiveDisease
      ? this._tokenize(effectiveDisease)
      : [];
    const queryTokens = this._tokenize(query);
    const avoidTerms = Array.isArray(context._avoidTerms)
      ? context._avoidTerms
      : [];

    console.log(
      `\n🎯 Ranking ${publications.length} publications — intent: "${intentType}"`,
    );
    if (avoidTerms.length > 0)
      console.log(`   🚫 Avoid terms: [${avoidTerms.slice(0, 4).join(", ")}]`);
    if (clinicalSignals?.userNeed)
      console.log(`   📋 User need: "${clinicalSignals.userNeed}"`);

    const intentProfile = clinicalSignals
      ? {
          mustHave: clinicalSignals.mustHave || [],
          strongSignals: clinicalSignals.strongSignals || [],
          weakSignals: clinicalSignals.weakSignals || [],
          userNeed: clinicalSignals.userNeed || "",
        }
      : null;

    const semanticQuery = [
      query,
      context._clinicalFocus || "",
      intentProfile?.userNeed || "",
    ]
      .filter(Boolean)
      .join(" ");

    const semanticallyScored = embeddingService.batchScore(
      semanticQuery,
      publications,
      intentProfile,
    );

    const avgSemantic =
      semanticallyScored.reduce((sum, p) => sum + (p._semanticScore || 0), 0) /
      Math.max(semanticallyScored.length, 1);

    const isLowSemanticMode =
      avgSemantic < 0.05 && this.KEYWORD_DOMINANT_INTENTS.has(intentType);

    if (isLowSemanticMode) {
      console.log(
        `   ⚠️  Low semantic mode (avg: ${avgSemantic.toFixed(3)}) — boosting keyword signals`,
      );
    }
    console.log(
      `   🧠 Semantic scoring complete — avg: ${avgSemantic.toFixed(3)}`,
    );

    const scored = semanticallyScored.map((pub) =>
      this._scorePublication(
        pub,
        queryTokens,
        effectiveDisease,
        diseaseLower,
        diseaseTokens,
        intentType,
        clinicalSignals,
        avoidTerms,
        isLowSemanticMode,
      ),
    );

    const relevant = scored.filter((p) => p._score > 0);

    if (relevant.length === 0) {
      console.log("   ⚠️  No relevant publications after scoring");
      return [];
    }

    const maxScore = Math.max(...relevant.map((p) => p._score), 1);
    const maxAge = this.intentMaxAge[intentType] ?? null;

    const ranked = relevant
      .sort((a, b) => b._score - a._score)
      .filter((pub) => {
        if (pub._score / maxScore < 0.05) return false;
        if (maxAge !== null) {
          const age = this.currentYear - (pub.year || this.currentYear);
          if (age > maxAge) {
            console.log(
              `   📅 Age filtered (${age}yr > ${maxAge}yr): "${pub.title?.substring(0, 50)}"`,
            );
            return false;
          }
        }
        return true;
      })
      .map((pub) => ({
        ...pub,
        relevanceScore: parseFloat(((pub._score / maxScore) * 100).toFixed(2)),
        _score: undefined,
      }));

    console.log(
      `   📊 ${publications.length} → ${relevant.length} relevant → ${ranked.length} after age filter`,
    );
    return ranked;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FIX 5 UPGRADED: Primary population match check
  // Includes FIX 5C: Multi-cancer review detection
  // ══════════════════════════════════════════════════════════════════════════
  _isPrimaryPopulationMatch(pub, disease, diseaseLower) {
    if (!disease) return true;

    const title = (pub.title || "").toLowerCase();
    const abstract = (pub.abstract || "").toLowerCase();
    const firstSentence = abstract.split(/[.!?]\s+/)[0] || "";
    const synonyms = this.diseaseSynonyms[diseaseLower] || [];
    const titleAndFirst = `${title} ${firstSentence}`;

    // ── FIX 5C: Multi-cancer / multi-disease review detection ─────────────
    // Papers that study ALL cancers or cancer + CVD together should not
    // appear for disease-specific supplement queries.
    //
    // Example: "Vitamin and Mineral Supplements for the Primary Prevention
    //           of Cardiovascular Disease and Cancer" (USPSTF review)
    //   → Title matches multi-cancer pattern + our disease is NOT in title
    //   → Rejected for lung cancer vitamin D query
    //
    // This works for ALL diseases — not hardcoded to lung cancer.
    // Any paper matching these broad multi-cancer patterns that doesn't
    // specifically name the queried disease in its title will be rejected.
    const isMultiCancerReview = this.MULTI_CANCER_REVIEW_PATTERNS.some(
      (pattern) => {
        try {
          return pattern.test(titleAndFirst);
        } catch {
          return false;
        }
      },
    );

    if (isMultiCancerReview && !title.includes(diseaseLower)) {
      // It's a general multi-cancer/CVD review and our disease isn't in the title
      // Check synonyms too before rejecting
      const diseaseInTitleViaSynonym = synonyms.some(
        (s) => s.length > 4 && title.includes(s),
      );
      if (!diseaseInTitleViaSynonym) {
        console.log(
          `   🚫 Multi-cancer review (not disease-specific): "${title.substring(0, 55)}"`,
        );
        return false;
      }
    }

    // ── FIX 5A: Known index name pattern ──────────────────────────────────
    // e.g. "Lung Cancer Inflammation Index" is used in asthma studies
    const hasIndexName = this.KNOWN_INDEX_NAMES.some((indexName) =>
      title.includes(indexName),
    );

    if (hasIndexName) {
      const hasOtherPrimaryDisease = this.ALTERNATIVE_PRIMARY_DISEASES.some(
        (alt) => {
          if (alt === diseaseLower) return false;
          try {
            return new RegExp(`\\b${alt}\\b`, "i").test(titleAndFirst);
          } catch {
            return titleAndFirst.includes(alt);
          }
        },
      );

      if (hasOtherPrimaryDisease) return false;
    }

    // ── FIX 5B: Different primary disease clearly stated ───────────────────
    // e.g. "mortality in patients with asthma" — reject for lung cancer query
    for (const alt of this.ALTERNATIVE_PRIMARY_DISEASES) {
      if (alt === diseaseLower) continue;

      const populationPatterns = [
        new RegExp(`patients\\s+with\\s+${alt}`, "i"),
        new RegExp(`in\\s+${alt}\\s+patients`, "i"),
        new RegExp(`${alt}\\s+patients`, "i"),
        new RegExp(`${alt}\\s+subjects`, "i"),
        new RegExp(`${alt}\\s+cohort`, "i"),
      ];

      const isOtherPrimary = populationPatterns.some((pattern) => {
        try {
          return pattern.test(titleAndFirst);
        } catch {
          return false;
        }
      });

      if (isOtherPrimary) {
        const ourDiseaseIsAlsoPrimary =
          (title.includes(diseaseLower) && !hasIndexName) ||
          synonyms.some((s) => s.length > 5 && title.includes(s));
        if (!ourDiseaseIsAlsoPrimary) return false;
      }
    }

    // ── Positive Check 1: Disease in title ────────────────────────────────
    if (title.includes(diseaseLower)) return true;
    if (synonyms.some((s) => s.length > 4 && title.includes(s))) return true;

    // ── Positive Check 2: Disease in first sentence ───────────────────────
    if (firstSentence.includes(diseaseLower)) return true;
    if (synonyms.some((s) => s.length > 4 && firstSentence.includes(s)))
      return true;

    // ── Positive Check 3: Disease mentioned 2+ times in abstract ──────────
    const diseaseTokens = this._tokenize(disease);
    const hasSufficientMentions = diseaseTokens.some((token) => {
      if (token.length <= 3) return false;
      try {
        const matches = abstract.match(new RegExp(`\\b${token}\\b`, "g")) || [];
        return matches.length >= 2;
      } catch {
        return (abstract.split(token) || []).length - 1 >= 2;
      }
    });

    return hasSufficientMentions;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCORE PUBLICATION — identical to your current file
  // ══════════════════════════════════════════════════════════════════════════
  _scorePublication(
    pub,
    queryTokens,
    disease,
    diseaseLower,
    diseaseTokens,
    intentType,
    clinicalSignals,
    avoidTerms = [],
    isLowSemanticMode = false,
  ) {
    // ── FIX 2: Hard block bad titles ─────────────────────────────────────
    if (!pub?.title || typeof pub.title !== "string" || !pub.title.trim()) {
      return { ...pub, _score: 0 };
    }
    if (
      pub.title === "object Object" ||
      pub.title === "[object Object]" ||
      pub.title.includes("[object Object]")
    ) {
      return { ...pub, _score: 0 };
    }

    const title = pub.title;
    const titleL = title.toLowerCase();
    const abstractL = (pub.abstract || "").toLowerCase();
    const combined = `${titleL} ${abstractL}`;

    if (this.globalExclusions.some((g) => titleL.includes(g)))
      return { ...pub, _score: 0 };

    if (
      avoidTerms.length > 0 &&
      avoidTerms.some((t) => titleL.includes(t.toLowerCase()))
    ) {
      const matched = avoidTerms.find((t) => titleL.includes(t.toLowerCase()));
      console.log(`   🚫 Avoid term "${matched}": "${title.substring(0, 55)}"`);
      return { ...pub, _score: 0 };
    }

    if (abstractL.length < 80) return { ...pub, _score: 0 };

    const MEDICAL_SIGNALS = [
      "patient",
      "treatment",
      "therapy",
      "clinical",
      "cancer",
      "disease",
      "trial",
      "outcome",
      "efficacy",
      "safety",
      "diagnosis",
      "survival",
      "response",
      "analysis",
      "cohort",
      "randomized",
      "drug",
      "adverse",
      "vitamin",
      "supplement",
      "association",
      "risk",
      "serum",
      "levels",
      "deficiency",
    ];
    if (!MEDICAL_SIGNALS.some((s) => abstractL.includes(s)))
      return { ...pub, _score: 0 };

    if (disease && diseaseTokens.length > 0) {
      const synonyms = this.diseaseSynonyms[diseaseLower] || [];
      const exclusions = this.diseaseExclusions[diseaseLower] || [];

      const inTitle =
        titleL.includes(diseaseLower) ||
        diseaseTokens
          .filter((t) => t.length > 3)
          .some((t) => titleL.includes(t)) ||
        synonyms.some((s) => titleL.includes(s));

      const inAbstract =
        abstractL.includes(diseaseLower) ||
        diseaseTokens
          .filter((t) => t.length > 3)
          .some((t) => abstractL.includes(t)) ||
        synonyms.some((s) => abstractL.includes(s));

      if (!inTitle && !inAbstract) return { ...pub, _score: 0 };

      if (
        exclusions.length > 0 &&
        exclusions.some(
          (e) => titleL.includes(e) && !titleL.includes(diseaseLower),
        )
      ) {
        return { ...pub, _score: 0 };
      }
    }

    // ── LAYER 1d-2: Primary population check (FIX 5) ──────────────────────
    if (
      this.SUPPLEMENT_FOCUS_INTENTS.has(intentType) &&
      disease &&
      diseaseTokens.length > 0
    ) {
      if (!this._isPrimaryPopulationMatch(pub, disease, diseaseLower)) {
        console.log(
          `   🚫 Non-primary population [${intentType}]: "${title.substring(0, 55)}"`,
        );
        return { ...pub, _score: 0 };
      }
    }

    const RESULT_CRITICAL = [
      "treatment_solutions",
      "recent_research",
      "prognosis",
      "comparison",
      "side_effects",
    ];
    if (RESULT_CRITICAL.includes(intentType)) {
      const hasNoResult = this.noResultSignals.some((s) =>
        combined.includes(s),
      );
      if (hasNoResult) {
        const isReview =
          /systematic review|meta-analysis|pooled analysis|we reviewed|we analyzed/.test(
            abstractL,
          );
        if (!isReview) return { ...pub, _score: 0 };
      }
    }

    const CLINICAL_INTENTS = [
      "treatment_solutions",
      "comparison",
      "side_effects",
      "prognosis",
      "recent_research",
      "prevention",
      "symptoms_diagnosis",
    ];
    if (CLINICAL_INTENTS.includes(intentType)) {
      if (this.nonClinicalPapers.some((p) => titleL.includes(p)))
        return { ...pub, _score: 0 };
    }

    let score = 0;

    const semanticWeight = isLowSemanticMode ? 0.8 : 2.5;
    const usefulnessWeight = isLowSemanticMode ? 3.5 : 2.0;
    const solutionWeight = isLowSemanticMode ? 2.5 : 1.8;

    const semanticScore = (pub._semanticScore || 0) * 100;
    const usefulnessScore = pub._usefulnessScore || 0;
    const solutionScore = pub._solutionScore || 0;
    const safetyScore = pub._safetyScore || 0;

    score += semanticScore * semanticWeight;
    score += usefulnessScore * usefulnessWeight;
    score += solutionScore * solutionWeight;

    if (this.SAFETY_REQUIRED_INTENTS.has(intentType)) {
      score += safetyScore * 1.5;
    } else {
      score += safetyScore * 0.4;
    }

    const intentReqs =
      this.intentAbstractRequirements[intentType] ||
      this.intentAbstractRequirements.general;

    const atLeastOneMatch = intentReqs.atLeastOne.filter((s) =>
      abstractL.includes(s),
    ).length;
    if (atLeastOneMatch === 0) {
      const titleMatch = intentReqs.atLeastOne.filter((s) =>
        titleL.includes(s),
      ).length;
      if (titleMatch === 0) return { ...pub, _score: 0 };
    }
    score += Math.min(20, atLeastOneMatch * 4);

    const resultMatches = intentReqs.resultConfirmed.filter((s) =>
      abstractL.includes(s),
    ).length;
    score += Math.min(25, resultMatches * 5);

    const contextMatches = intentReqs.contextOnly.filter((s) =>
      abstractL.includes(s),
    ).length;
    if (contextMatches > 0) score = Math.floor(score * 0.3);

    if (this.clinicalNumberPatterns.some((p) => p.test(abstractL))) score += 15;

    const realResultCount = this.realResultSignals.filter((s) =>
      abstractL.includes(s),
    ).length;
    score += Math.min(12, realResultCount * 2);

    let evidenceScore = 0;
    for (const tier of this.evidenceHierarchy) {
      const isTitleDisqualified = (tier.titleDisqualifiers || []).some((d) =>
        titleL.includes(d),
      );
      if (isTitleDisqualified) continue;
      const titleMatches = tier.patterns.filter((p) =>
        titleL.includes(p),
      ).length;
      const abstractMatches = tier.patterns.filter((p) =>
        abstractL.includes(p),
      ).length;
      if (titleMatches >= 1 || abstractMatches >= 2) {
        evidenceScore = tier.score;
        console.log(
          `   🏆 [${tier.label}] +${tier.score}: "${title.substring(0, 55)}"`,
        );
        break;
      }
    }
    score += evidenceScore * 1.0;

    let specificityScore = 0;
    if (diseaseLower && titleL.includes(diseaseLower)) specificityScore += 30;
    else if (
      disease &&
      diseaseTokens.filter((t) => t.length > 3 && titleL.includes(t)).length >=
        2
    )
      specificityScore += 20;
    else if (
      disease &&
      (this.diseaseSynonyms[diseaseLower] || []).some((s) => titleL.includes(s))
    )
      specificityScore += 15;

    if (diseaseLower && abstractL.includes(diseaseLower))
      specificityScore += 10;

    if (queryTokens.length > 0) {
      const titleQueryMatches = queryTokens.filter(
        (t) => t.length > 3 && titleL.includes(t),
      ).length;
      specificityScore += Math.min(20, titleQueryMatches * 5);

      for (let i = 0; i < queryTokens.length - 1; i++) {
        const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
        if (bigram.length > 6 && titleL.includes(bigram)) {
          specificityScore += 12;
          console.log(
            `   🎯 Query bigram in title: "${title.substring(0, 55)}"`,
          );
          break;
        }
      }
    }

    const ENDPOINT_SIGNALS = [
      "overall survival",
      "progression-free survival",
      "response rate",
      "hazard ratio",
      "disease-free",
      "objective response",
      "complete response",
    ];
    const titleEndpoints = ENDPOINT_SIGNALS.filter((e) =>
      titleL.includes(e),
    ).length;
    specificityScore += Math.min(15, titleEndpoints * 8);
    if (titleEndpoints > 0) {
      console.log(
        `   📊 Endpoints in title (${titleEndpoints}): "${title.substring(0, 55)}"`,
      );
    }

    if (
      / vs | versus |compared (to|with)|non-inferior|superiority/.test(titleL)
    )
      specificityScore += 10;
    score += specificityScore * 0.8;

    let recencyScore = 0;
    const age = this.currentYear - (pub.year || this.currentYear);
    if (age === 0) recencyScore = 20;
    else if (age === 1) recencyScore = 17;
    else if (age === 2) recencyScore = 14;
    else if (age <= 3) recencyScore = 10;
    else if (age <= 5) recencyScore = 6;
    else if (age <= 7) recencyScore = 2;
    score += recencyScore * 0.6;

    let credibilityScore = 0;
    if (pub.source === "pubmed") credibilityScore += 8;
    else if (pub.source === "openalex") credibilityScore += 5;

    const journalL = (pub.journalName || "").toLowerCase();
    if (this.highImpactJournals.has(journalL)) credibilityScore += 8;
    else if ([...this.highImpactJournals].some((j) => journalL.includes(j)))
      credibilityScore += 4;

    const citations = pub.citationCount || 0;
    if (citations >= 1000) credibilityScore += 12;
    else if (citations >= 500) credibilityScore += 9;
    else if (citations >= 100) credibilityScore += 6;
    else if (citations >= 50) credibilityScore += 4;
    else if (citations >= 10) credibilityScore += 2;

    if ((pub.authors?.length || 0) >= 5) credibilityScore += 2;
    score += credibilityScore * 0.4;

    const totalScore = Math.max(0, Math.floor(score));

    if (totalScore > 50) {
      console.log(
        `   ✅ Score ${totalScore} [sem:${(pub._semanticScore || 0).toFixed(2)} use:${Math.round(pub._usefulnessScore || 0)} sol:${Math.round(pub._solutionScore || 0)}]: "${title.substring(0, 60)}"`,
      );
    }

    return { ...pub, _score: totalScore };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FIX 1: Usefulness-aware publication selection
  // Evidence diversity enforced INSIDE the selection loop
  // ══════════════════════════════════════════════════════════════════════════
  diversifyResults(rankedItems, topK = 8, intentType = "general") {
    if (!Array.isArray(rankedItems) || rankedItems.length === 0) return [];

    const needsSafety = this.SAFETY_REQUIRED_INTENTS.has(intentType);

    const MAX_PER_BUCKET = 3;
    const bucketCounts = {};
    const usedTitles = new Set();
    const selected = [];

    const canAdd = (paper) => {
      if (!paper?.title) return false;
      if (usedTitles.has(paper.title)) return false;
      if (this._isDuplicateTitle(paper, selected)) return false;
      const bucket = this._getEvidenceBucket(paper);
      return (bucketCounts[bucket] || 0) < MAX_PER_BUCKET;
    };

    const addPaper = (paper) => {
      selected.push(paper);
      usedTitles.add(paper.title);
      const bucket = this._getEvidenceBucket(paper);
      bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
    };

    const strongPapers = rankedItems.filter(
      (p) => (p._solutionScore || 0) >= 30 || (p._usefulnessScore || 0) >= 40,
    );
    const safetyPapers = rankedItems.filter((p) => (p._safetyScore || 0) >= 20);
    const decentPapers = rankedItems.filter(
      (p) => (p._solutionScore || 0) >= 10 || (p._usefulnessScore || 0) >= 20,
    );

    console.log(
      `\n   🎯 Usefulness pools — Strong: ${strongPapers.length}, Safety: ${safetyPapers.length}, Decent: ${decentPapers.length}`,
    );

    // Priority 1: Strong papers, bucket-limited
    const strongTarget = Math.ceil(topK * 0.7);
    for (const paper of strongPapers) {
      if (selected.length >= strongTarget) break;
      if (canAdd(paper)) addPaper(paper);
    }

    // Priority 2: Safety papers for safety intents
    if (needsSafety) {
      const safetyTarget = Math.min(2, topK - selected.length);
      let safetyAdded = 0;
      for (const paper of safetyPapers) {
        if (safetyAdded >= safetyTarget) break;
        if (canAdd(paper)) {
          addPaper(paper);
          safetyAdded++;
        }
      }
      if (safetyAdded > 0)
        console.log(`   🛡️  Safety papers added: ${safetyAdded}`);
    }

    // Priority 3: Decent papers, bucket-limited
    for (const paper of decentPapers) {
      if (selected.length >= topK) break;
      if (canAdd(paper)) addPaper(paper);
    }

    // Priority 4: Backfill, still bucket-limited
    if (selected.length < topK) {
      for (const paper of rankedItems) {
        if (selected.length >= topK) break;
        if (canAdd(paper)) addPaper(paper);
      }
    }

    // Priority 5: Final backfill, relax bucket limit
    if (selected.length < topK) {
      for (const paper of rankedItems) {
        if (selected.length >= topK) break;
        if (
          !usedTitles.has(paper.title) &&
          !this._isDuplicateTitle(paper, selected)
        ) {
          addPaper(paper);
        }
      }
    }

    console.log(`   📦 Final selection: ${selected.length} publications`);
    console.log(`      Evidence buckets: ${JSON.stringify(bucketCounts)}`);
    console.log(
      `      With strong solution: ${selected.filter((p) => (p._solutionScore || 0) >= 30).length}`,
    );
    console.log(
      `      With safety data:     ${selected.filter((p) => (p._safetyScore || 0) >= 20).length}`,
    );
    console.log(
      `      Avg semantic score:   ${(selected.reduce((s, p) => s + (p._semanticScore || 0), 0) / Math.max(selected.length, 1)).toFixed(3)}`,
    );

    return selected.map((p) => {
      const {
        _semanticScore,
        _usefulnessScore,
        _solutionScore,
        _safetyScore,
        ...rest
      } = p;
      return rest;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Trial diversification — identical to your current file
  // ══════════════════════════════════════════════════════════════════════════
  diversifyTrials(rankedItems, topK = 8) {
    if (!Array.isArray(rankedItems) || rankedItems.length === 0) return [];

    const selected = [];
    const rejected = new Set();

    for (const item of rankedItems) {
      if (selected.length >= topK) break;
      let tooSimilar = false;
      for (const sel of selected) {
        if (
          this.calculateTitleSimilarity(
            (item.title || "").toLowerCase(),
            (sel.title || "").toLowerCase(),
          ) > 0.8
        ) {
          tooSimilar = true;
          rejected.add(item.nctId);
          break;
        }
      }
      if (!tooSimilar) selected.push(item);
    }

    if (selected.length < topK) {
      const selectedIds = new Set(selected.map((s) => s.nctId));
      const backfill = rankedItems.filter(
        (item) => !selectedIds.has(item.nctId) && !rejected.has(item.nctId),
      );
      selected.push(...backfill.slice(0, topK - selected.length));
    }

    return selected;
  }

  _getEvidenceBucket(paper) {
    const titleL = (paper.title || "").toLowerCase();
    const abstractL = (paper.abstract || "").toLowerCase();
    const combined = `${titleL} ${abstractL}`;

    if (
      /meta-analysis|systematic review|pooled analysis|network meta/.test(
        combined,
      )
    )
      return "meta";
    if (/phase 3|phase iii|randomized controlled trial/.test(combined))
      return "rct3";
    if (/phase 2|phase ii/.test(combined)) return "rct2";
    if (
      /prospective cohort|real-world|population-based|multicenter prospective/.test(
        combined,
      )
    )
      return "cohort";
    if (
      /retrospective|single-arm|observational study|historical cohort/.test(
        combined,
      )
    )
      return "retro";
    return "other";
  }

  _isDuplicateTitle(item, selected, threshold = 0.85) {
    const itemTitle = (item.title || "").toLowerCase();
    for (const sel of selected) {
      if (
        this.calculateTitleSimilarity(
          itemTitle,
          (sel.title || "").toLowerCase(),
        ) > threshold
      ) {
        return true;
      }
    }
    return false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLINICAL TRIAL RANKING — identical to your current file
  // ══════════════════════════════════════════════════════════════════════════
  rankClinicalTrials(trials, query, disease, context = {}, intent = null) {
    if (!Array.isArray(trials) || trials.length === 0) return [];

    this.currentYear = new Date().getFullYear();

    const queryTokens = this._tokenize(query);
    const effectiveDis = context._effectiveDisease || disease;
    const diseaseLower = effectiveDis ? effectiveDis.toLowerCase() : "";
    const diseaseTokens = effectiveDis ? this._tokenize(effectiveDis) : [];
    const location = context.location || null;
    const intentType = intent?.type || context._intent?.type || "general";
    const trialMaxAge = this.trialMaxAge[intentType] ?? 20;

    const tagged = location
      ? trials.map((t) => this._tagTrialLocation(t, location))
      : trials.map((t) => ({ ...t, isLocal: false, _matchPriority: 0 }));

    const relevant = tagged.filter((trial) => {
      const condL = (trial.conditions || [])
        .map((c) => c.toLowerCase())
        .join(" ");
      const titleL = (trial.title || "").toLowerCase();

      if (this.trialHardExclusions.some((p) => titleL.includes(p))) {
        console.log(`🚫 Hard excluded: "${titleL.substring(0, 60)}"`);
        return false;
      }

      if (!effectiveDis || diseaseTokens.length === 0) return true;

      const synonyms = this.diseaseSynonyms[diseaseLower] || [];
      const exclusions = this.diseaseExclusions[diseaseLower] || [];

      const mentions =
        condL.includes(diseaseLower) ||
        titleL.includes(diseaseLower) ||
        diseaseTokens.some(
          (t) => t.length > 3 && (condL.includes(t) || titleL.includes(t)),
        ) ||
        synonyms.some((s) => condL.includes(s) || titleL.includes(s));

      if (!mentions) {
        console.log(
          `🚫 Pre-filtered (no disease): "${titleL.substring(0, 60)}"`,
        );
        return false;
      }

      if (
        exclusions.some(
          (e) => condL.includes(e) && !condL.includes(diseaseLower),
        )
      ) {
        console.log(
          `🚫 Pre-filtered (excluded disease): "${titleL.substring(0, 60)}"`,
        );
        return false;
      }

      return true;
    });

    console.log(
      `   🔍 Pre-filter: ${tagged.length} → ${relevant.length} disease-relevant`,
    );

    const scored = relevant.map((trial) =>
      this._scoreTrial(
        trial,
        queryTokens,
        diseaseLower,
        diseaseTokens,
        location,
        intentType,
      ),
    );

    const maxScore = Math.max(...scored.map((t) => t._score), 1);

    const ranked = scored
      .sort((a, b) => b._score - a._score)
      .filter((trial) => {
        if (trial._score / maxScore < 0.02) return false;
        if (trial.status === "COMPLETED" && trial.startDate) {
          const startYear = this._extractYear(trial.startDate);
          if (startYear && this.currentYear - startYear > trialMaxAge) {
            console.log(
              `   📅 Trial age filtered: "${(trial.title || "").substring(0, 50)}"`,
            );
            return false;
          }
        }
        return true;
      })
      .map((trial) => ({
        ...trial,
        relevanceScore: parseFloat(
          ((trial._score / maxScore) * 100).toFixed(2),
        ),
        _score: undefined,
        _matchPriority: undefined,
      }));

    const localCount = ranked.filter((t) => t.isLocal).length;
    console.log(
      `   📊 Trials: ${trials.length} → ${relevant.length} relevant → ${ranked.length} ranked (${localCount} local)`,
    );

    return ranked;
  }

  _scoreTrial(
    trial,
    queryTokens,
    diseaseLower,
    diseaseTokens,
    location,
    intentType,
  ) {
    let score = 0;
    const titleL = (trial.title || "").toLowerCase();
    const condL = (trial.conditions || [])
      .map((c) => c.toLowerCase())
      .join(" ");
    const combined = `${titleL} ${condL}`;

    if (location) {
      const priority = trial._matchPriority || 0;
      if (priority === 3) {
        score += 500;
        console.log(`📍 EXACT CITY (+500): "${titleL.substring(0, 50)}"`);
      } else if (priority === 2) {
        score += 300;
        console.log(`📍 COUNTRY (+300): "${titleL.substring(0, 50)}"`);
      } else if (priority === 1) {
        score += 150;
      } else {
        score -= 300;
        console.log(`🌍 NON-LOCAL (-300): "${titleL.substring(0, 50)}"`);
      }
    }

    const trialType = this._classifyTrialType(titleL, condL);
    const preferredTypes = this._getPreferredTrialTypes(intentType);
    const penalizedTypes = this._getPenalizedTrialTypes(intentType);

    if (preferredTypes.includes(trialType)) {
      score += 30;
      console.log(
        `   🏆 Perfect trial type [${trialType}]: "${titleL.substring(0, 50)}"`,
      );
    } else if (penalizedTypes.includes(trialType)) {
      score = Math.floor(score * 0.2);
      console.log(
        `   ⚠️  Wrong trial type [${trialType}] ×0.2: "${titleL.substring(0, 50)}"`,
      );
    }

    if (diseaseLower) {
      const synonyms = this.diseaseSynonyms[diseaseLower] || [];
      const exactInCond =
        condL.includes(diseaseLower) || synonyms.some((s) => condL.includes(s));
      score += exactInCond
        ? 40
        : Math.min(
            20,
            diseaseTokens.filter((t) => t.length > 3 && condL.includes(t))
              .length * 8,
          );
      const exactInTitle =
        titleL.includes(diseaseLower) ||
        synonyms.some((s) => titleL.includes(s));
      score += exactInTitle
        ? 18
        : Math.min(
            10,
            diseaseTokens.filter((t) => t.length > 3 && titleL.includes(t))
              .length * 4,
          );
    }

    let statusScore = this.trialStatusScores[trial.status] || 5;
    if (
      trial.status === "COMPLETED" &&
      ["recent_research", "treatment_solutions"].includes(intentType)
    ) {
      statusScore += 20;
    }
    score += statusScore;

    score +=
      this.trialPhaseScores[
        (trial.phase || "N/A").toUpperCase().replace(/\s+/g, "")
      ] || 5;

    if (queryTokens.length > 0) {
      score += Math.min(
        15,
        queryTokens.filter((t) => t.length > 3 && combined.includes(t)).length *
          4,
      );
    }

    const en = trial.enrollmentCount || 0;
    if (en >= 1000) score += 10;
    else if (en >= 100) score += 6;
    else if (en > 0) score += 2;

    if (trial.contact?.email && trial.contact?.phone) score += 8;
    else if (trial.contact?.email || trial.contact?.phone) score += 4;

    if (trial.startDate) {
      const startYear = this._extractYear(trial.startDate);
      if (startYear) {
        const age = this.currentYear - startYear;
        if (age <= 1) score += 10;
        else if (age <= 2) score += 7;
        else if (age <= 3) score += 5;
        else if (age <= 5) score += 2;
      }
    }

    return { ...trial, _score: Math.max(0, score) };
  }

  _classifyTrialType(titleL, condL) {
    const combined = `${titleL} ${condL}`;
    let bestType = "treatment",
      bestScore = 0;
    for (const [type, signals] of Object.entries(this.trialTypeSignals)) {
      const titleHits = signals.filter((s) => titleL.includes(s)).length;
      const totalHits = signals.filter((s) => combined.includes(s)).length;
      const score = titleHits * 2 + totalHits;
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }
    return bestType;
  }

  _getPreferredTrialTypes(intentType) {
    const map = {
      treatment_solutions: ["treatment"],
      comparison: ["treatment"],
      side_effects: ["treatment", "supportive"],
      prevention: ["prevention", "treatment"],
      symptoms_diagnosis: ["diagnostic"],
      clinical_trials: ["treatment", "diagnostic"],
      prognosis: ["treatment"],
      safety_efficacy: ["treatment", "supportive"],
      general: ["treatment"],
    };
    return map[intentType] || ["treatment"];
  }

  _getPenalizedTrialTypes(intentType) {
    const map = {
      treatment_solutions: ["diagnostic", "supportive", "prevention"],
      comparison: ["diagnostic", "supportive"],
      prognosis: ["supportive"],
      symptoms_diagnosis: ["supportive"],
      prevention: ["supportive"],
    };
    return map[intentType] || [];
  }

  _tagTrialLocation(trial, userLocation) {
    if (!userLocation || !trial.locations?.length) {
      return { ...trial, isLocal: false, _matchPriority: 0 };
    }

    const userL = userLocation.toLowerCase().trim();
    const parts = userL
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 1);
    let userCity = null,
      userCountry = null;

    for (const part of parts) {
      if (this.cityToCountry[part]) {
        userCity = part;
        userCountry = this.cityToCountry[part];
      } else {
        for (const [country, aliases] of Object.entries(this.countryAliases)) {
          if (
            aliases.some(
              (a) => a === part || part.includes(a) || a.includes(part),
            )
          ) {
            userCountry = country;
            break;
          }
        }
      }
      if (userCountry) break;
    }

    let bestPriority = 0,
      bestLevel = null;

    for (const loc of trial.locations) {
      const locL = loc.toLowerCase();
      if (userCity && bestPriority < 3) {
        try {
          if (new RegExp(`\\b${userCity}\\b`).test(locL)) {
            bestPriority = 3;
            bestLevel = userCity;
            break;
          }
        } catch {
          if (locL.includes(userCity)) {
            bestPriority = 3;
            bestLevel = userCity;
            break;
          }
        }
      }
      if (userCountry && bestPriority < 2) {
        const aliases = this.countryAliases[userCountry] || [userCountry];
        if (aliases.some((a) => locL.includes(a))) {
          bestPriority = 2;
          bestLevel = userCountry;
        }
      }
    }

    if (bestPriority > 0) {
      console.log(
        `📍 Tagged [${bestLevel}] (priority ${bestPriority}): "${(trial.title || "").substring(0, 50)}"`,
      );
    }

    return {
      ...trial,
      isLocal: bestPriority > 0,
      matchLevel: bestLevel,
      _matchPriority: bestPriority,
    };
  }

  reorderTrialLocations(trials, userLocation) {
    if (!userLocation || !Array.isArray(trials)) return trials;

    const userL = userLocation.toLowerCase().trim();
    const parts = userL.split(",").map((p) => p.trim());
    let userCountry = null;

    for (const part of parts) {
      if (this.cityToCountry[part]) {
        userCountry = this.cityToCountry[part];
        break;
      }
      for (const [country, aliases] of Object.entries(this.countryAliases)) {
        if (aliases.some((a) => a === part || part.includes(a))) {
          userCountry = country;
          break;
        }
      }
      if (userCountry) break;
    }

    if (!userCountry) return trials;
    const aliases = this.countryAliases[userCountry] || [userCountry];

    return trials.map((trial) => {
      if (!trial.locations || trial.locations.length <= 1) return trial;
      const idx = trial.locations.findIndex((loc) => {
        const locL = loc.toLowerCase();
        return (
          aliases.some((a) => locL.includes(a)) ||
          parts.some((p) => p.length > 3 && locL.includes(p))
        );
      });
      if (idx > 0) {
        const reordered = [...trial.locations];
        const [local] = reordered.splice(idx, 1);
        reordered.unshift(local);
        return { ...trial, locations: reordered };
      }
      return trial;
    });
  }

  calculateTitleSimilarity(t1, t2) {
    if (!t1 || !t2) return 0;
    const s1 = new Set(t1.split(/\s+/).filter((t) => t.length > 2));
    const s2 = new Set(t2.split(/\s+/).filter((t) => t.length > 2));
    if (!s1.size || !s2.size) return 0;
    const inter = [...s1].filter((t) => s2.has(t)).length;
    const union = new Set([...s1, ...s2]).size;
    return inter / union;
  }

  _tokenize(text) {
    if (!text || typeof text !== "string") return [];
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "that",
      "this",
      "are",
      "from",
      "has",
      "have",
      "been",
      "was",
      "were",
      "not",
      "but",
      "they",
      "their",
      "also",
      "can",
      "may",
      "would",
      "could",
      "should",
      "will",
      "its",
      "all",
      "one",
      "two",
      "new",
      "more",
      "use",
      "used",
      "using",
      "study",
      "studies",
      "research",
      "based",
      "data",
      "results",
      "patients",
      "analysis",
      "method",
      "methods",
      "cancer",
      "disease",
    ]);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));
  }

  _extractYear(dateStr) {
    if (!dateStr) return null;
    const y = parseInt(dateStr.toString().substring(0, 4));
    return isNaN(y) ? null : y;
  }
}

export default new RankingService();
