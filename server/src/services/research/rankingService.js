class RankingService {
  constructor() {
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
      "journal of neurology",
      "alzheimer",
      "neuron",
      "nature neuroscience",
      "gut",
      "hepatology",
      "chest",
      "cancer cell",
      "clinical cancer research",
      "jama oncology",
      "lancet oncology",
      "nature cancer",
      "cancer discovery",
      "journal of thoracic oncology",
    ]);

    this.publicationTypeWeights = {
      "randomized controlled trial": 15,
      "systematic review": 14,
      "meta-analysis": 14,
      "clinical trial": 12,
      "phase 3": 12,
      "phase iii": 12,
      "cohort study": 10,
      "case-control study": 8,
      review: 7,
      "observational study": 6,
    };

    this.solutionKeywords = {
      treatment_solutions: [
        "efficacy",
        "response rate",
        "overall survival",
        "progression-free",
        "randomized",
        "outcome",
        "result",
        "improved",
        "reduced",
        "complete response",
        "partial response",
        "phase 3",
        "phase iii",
        "approved",
        "first-line",
        "second-line",
        "adjuvant",
        "neoadjuvant",
        "median survival",
        "hazard ratio",
        "objective response",
        "disease control",
        "pembrolizumab",
        "osimertinib",
        "nivolumab",
        "immunotherapy",
        "chemotherapy",
        "targeted therapy",
        "checkpoint",
        "car-t",
        "clinical benefit",
        "durable response",
        "relapse-free",
      ],
      clinical_trials: [
        "recruiting",
        "randomized",
        "placebo",
        "double-blind",
        "single-blind",
        "phase 1",
        "phase 2",
        "phase 3",
        "phase 4",
        "endpoints",
        "primary outcome",
        "secondary outcome",
        "eligibility",
        "enrollment",
        "multicenter",
        "open-label",
        "crossover",
        "dose-escalation",
      ],
      researchers: [
        "review",
        "systematic review",
        "meta-analysis",
        "landmark",
        "multicenter",
        "key findings",
        "significant",
        "pioneering",
        "contributed",
        "developed",
        "demonstrated",
        "identified",
        "proposed",
        "discovered",
        "established",
      ],
      recent_research: [
        "novel",
        "new",
        "emerging",
        "advance",
        "breakthrough",
        "discovery",
        "first",
        "innovative",
        "promising",
        "recent",
        "latest",
        "2024",
        "2025",
        "identified",
        "developed",
        "proposed",
        "demonstrated",
        "cutting-edge",
      ],
      safety_efficacy: [
        "safe",
        "safety",
        "efficacy",
        "tolerated",
        "well-tolerated",
        "adverse",
        "side effect",
        "benefit",
        "supplementation",
        "level",
        "deficiency",
        "status",
        "association",
        "correlation",
        "risk",
        "protective",
        "prevent",
        "reduce risk",
        "dose",
        "serum",
      ],
      mechanism: [
        "mechanism",
        "pathway",
        "signaling",
        "molecular",
        "cellular",
        "receptor",
        "inhibitor",
        "activator",
        "expression",
        "gene",
        "protein",
        "mutation",
        "biomarker",
        "pathogenesis",
        "pathophysiology",
        "downstream",
        "upstream",
        "interaction",
        "binding",
      ],
      symptoms_diagnosis: [
        "diagnosis",
        "diagnostic",
        "symptom",
        "sign",
        "biomarker",
        "screening",
        "detection",
        "sensitivity",
        "specificity",
        "accuracy",
        "imaging",
        "biopsy",
        "staging",
        "grading",
        "classification",
        "early detection",
        "clinical presentation",
        "manifestation",
      ],
      prevention: [
        "prevention",
        "preventive",
        "prophylaxis",
        "reduce risk",
        "avoid",
        "lifestyle",
        "screening",
        "early detection",
        "risk factor",
        "modifiable",
        "intervention",
        "protective",
        "vaccination",
        "exercise",
      ],
      prognosis: [
        "prognosis",
        "prognostic",
        "survival",
        "mortality",
        "morbidity",
        "outcome",
        "stage",
        "grade",
        "recurrence",
        "relapse",
        "5-year",
        "overall survival",
        "disease-free",
        "median",
        "hazard ratio",
        "risk factor",
        "predictor",
        "life expectancy",
      ],
      comparison: [
        "versus",
        "compared",
        "comparison",
        "superiority",
        "non-inferior",
        "head-to-head",
        "randomized",
        "better",
        "superior",
        "inferior",
        "equivalent",
        "difference",
        "advantage",
        "benefit over",
      ],
      side_effects: [
        "adverse",
        "side effect",
        "toxicity",
        "safety",
        "complication",
        "risk",
        "harm",
        "tolerability",
        "discontinuation",
        "grade 3",
        "serious adverse",
        "treatment-related",
        "immune-related",
      ],
      access_cost: [
        "cost",
        "cost-effective",
        "affordable",
        "access",
        "availability",
        "insurance",
        "reimbursement",
        "barrier",
        "disparity",
        "equity",
        "economic",
        "burden",
        "healthcare system",
      ],
      general: [
        "study",
        "research",
        "analysis",
        "findings",
        "evidence",
        "data",
        "population",
        "cohort",
        "association",
      ],
    };

    this.intentRequiredInTitle = {
      treatment_solutions: [
        "treatment",
        "therapy",
        "efficacy",
        "outcome",
        "response",
        "survival",
        "phase 3",
        "phase iii",
        "randomized",
        "first-line",
        "second-line",
        "inhibitor",
        "immunotherapy",
        "chemotherapy",
        "targeted",
        "adjuvant",
        "neoadjuvant",
        "pembrolizumab",
        "nivolumab",
        "osimertinib",
        "drug",
        "regimen",
        "combined",
        "versus",
        "compared",
        "trial",
        "controlled",
      ],
      recent_research: [
        "novel",
        "new",
        "emerging",
        "advance",
        "breakthrough",
        "discovery",
        "innovative",
        "recent",
        "latest",
        "first",
        "update",
        "progress",
        "development",
        "insight",
        "2024",
        "2025",
        "2026",
        "trial",
        "analysis",
        "review",
        "cohort",
        "meta-analysis",
        "randomized",
        "observational",
        "systematic",
        "prospective",
        "retrospective",
        "findings",
        "evidence",
        "outcomes",
      ],
      prevention: [
        "prevention",
        "preventive",
        "prophylaxis",
        "reduce risk",
        "risk reduction",
        "protective",
      ],
      mechanism: [
        "mechanism",
        "pathway",
        "molecular",
        "signaling",
        "pathogenesis",
        "biology",
        "receptor",
        "expression",
      ],
      symptoms_diagnosis: [
        "diagnosis",
        "diagnostic",
        "symptom",
        "detection",
        "screening",
        "biomarker",
        "staging",
        "classification",
      ],
      prognosis: [
        "prognosis",
        "prognostic",
        "survival",
        "mortality",
        "outcome",
        "recurrence",
        "relapse",
      ],
      side_effects: [
        "adverse",
        "toxicity",
        "safety",
        "side effect",
        "complication",
        "tolerability",
      ],
      clinical_trials: [],
      researchers: [],
      safety_efficacy: [],
      comparison: [],
      access_cost: [],
      general: [],
    };

    this.intentDisqualifiers = {
      treatment_solutions: [
        "machine learning",
        "deep learning",
        "artificial intelligence",
        "prediction model",
        "predictive model",
        "neural network",
        "cost-effective",
        "healthcare cost",
        "economic burden",
        "methodological quality",
        "quality assessment",
        "bibliometric",
        "survey of",
        "knowledge of",
        "awareness of",
        "drug delivery",
        "nanoparticle",
        "nanostructured",
        "nanocrystal",
        "chitosan platform",
        "liposome",
        "drug release",
        "biological age",
        "assessment of biological",
        "acupuncture",
        "traditional chinese medicine",
        "herbal medicine",
        "herb pair",
        "salvia miltiorrhiza",
        "pulmonary fibrosis",
        "pulmonary hypertension",
        "idiopathic pulmonary",
        "corrigendum",
        "erratum",
        "correction to",
        "publisher correction",
        "author correction",
        "as a predictor of",
        "predictor of response",
        "predictive biomarker",
        "predicts response to",
        "predicts outcomes",
        "nomogram for",
        "risk score for",
        "scoring system for response",
        "who benefits from",
        "patient selection for",
        "resting energy expenditure",
        "body composition",
        "nutritional status as",
      ],
      recent_research: [
        "corrigendum",
        "erratum",
        "correction to",
        "drug delivery",
        "nanoparticle",
        "chitosan",
        "liposome",
      ],
      clinical_trials: [],
      prevention: [
        "machine learning",
        "drug delivery",
        "nanoparticle",
        "in vitro",
        "cell line",
        "corrigendum",
        "erratum",
      ],
      mechanism: [],
      symptoms_diagnosis: [
        "machine learning",
        "deep learning",
        "neural network",
        "drug delivery",
        "nanoparticle",
        "corrigendum",
        "erratum",
        "in vitro",
      ],
      prognosis: [
        "in vitro",
        "in vivo",
        "cell line",
        "mouse model",
        "murine",
        "drug delivery",
        "nanoparticle",
        "corrigendum",
        "erratum",
      ],
      side_effects: [
        "machine learning",
        "prediction model",
        "drug delivery",
        "nanoparticle",
        "in vitro",
        "cell line",
        "corrigendum",
        "erratum",
      ],
      researchers: [],
      safety_efficacy: [
        "risk factor for cancer",
        "risk factors for cancer",
        "narrative review of risk factors",
        "in vitro",
        "in vivo",
        "cell line",
        "mouse model",
        "murine",
        "calpain pathway",
        "apoptosis in human",
        "synergizes with camptothecin",
        "corrigendum",
        "erratum",
        "drug delivery",
        "nanoparticle",
      ],
      comparison: [
        "machine learning",
        "deep learning",
        "prediction model",
        "predictive model",
        "neural network",
        "cost-effective",
        "economic burden",
        "drug delivery",
        "nanoparticle",
        "corrigendum",
        "erratum",
      ],
      access_cost: [
        "in vitro",
        "cell line",
        "mouse model",
        "murine",
        "drug delivery",
        "nanoparticle",
        "corrigendum",
        "erratum",
      ],
      general: ["corrigendum", "erratum"],
    };

    this.intentAnswerSignals = {
      treatment_solutions: {
        positive: [
          "showed efficacy",
          "demonstrated efficacy",
          "improved survival",
          "overall survival",
          "progression-free survival",
          "response rate",
          "complete response",
          "partial response",
          "disease control rate",
          "hazard ratio",
          "median survival",
          "significantly improved",
          "approved",
          "first-line treatment",
          "second-line treatment",
          "randomized controlled trial",
          "phase 3 trial",
          "phase iii trial",
          "versus",
          "compared with",
          "superior to",
          "non-inferior",
          "objective response rate",
          "orr",
          "clinical benefit",
        ],
        negativeTitle: [
          "study protocol",
          "protocol for",
          "proposed method",
          "we propose",
          "aims to investigate",
          "will evaluate",
          "will be conducted",
          "planned study",
          "prior to approval",
          "before approval",
          "before adjuvant",
          "before targeted",
          "imaging protocol",
          "protocol study",
          "corrigendum to",
          "corrigendum:",
          "erratum to",
          "erratum:",
          "correction to",
          "correction:",
          "publisher's note",
          "authors regret",
          "retraction",
          "retracted",
        ],
        negativeAbstract: [
          "prediction model",
          "we developed a model",
          "machine learning model",
          "scoring system",
          "retrospective review of records",
          "historical cohort",
          "aims to investigate",
          "will be enrolled",
          "this study aims to",
          "we aim to evaluate",
          "will be recruited",
          "is currently recruiting",
          "study is ongoing",
        ],
      },
      recent_research: {
        positive: [
          "novel",
          "first",
          "breakthrough",
          "discovered",
          "identified",
          "demonstrated",
          "showed",
          "revealed",
          "found that",
          "our findings",
          "we found",
          "we demonstrated",
          "results show",
          "significantly",
          "compared with",
          "associated with",
          "randomized",
          "clinical trial",
          "phase",
          "cohort study",
          "meta-analysis",
          "systematic review",
          "outcome",
        ],
        negativeTitle: [
          "study protocol",
          "aims to investigate",
          "will evaluate",
          "acupuncture",
          "traditional chinese medicine",
          "ayurvedic",
          "homeopathic",
          "yoga therapy",
          "herbal medicine",
          "herb pair",
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
        ],
        negativeAbstract: [
          "traditional chinese medicine",
          "herbal formula",
          "herb pair",
          "acupuncture point",
          "moxibustion",
        ],
      },
      clinical_trials: {
        positive: [
          "recruiting",
          "enrolling",
          "phase 3",
          "phase 2",
          "randomized",
          "controlled trial",
          "participants",
        ],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
          "study protocol",
          "protocol for",
        ],
        negativeAbstract: [],
      },
      mechanism: {
        positive: [
          "mechanism",
          "pathway",
          "signaling",
          "demonstrated that",
          "showed that",
          "revealed",
          "identified",
        ],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
        ],
        negativeAbstract: [],
      },
      symptoms_diagnosis: {
        positive: [
          "sensitivity",
          "specificity",
          "accuracy",
          "positive predictive",
          "negative predictive",
          "diagnostic",
          "detected",
          "identified",
        ],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
          "study protocol",
        ],
        negativeAbstract: [],
      },
      prognosis: {
        positive: [
          "survival",
          "mortality",
          "prognosis",
          "prognostic",
          "hazard ratio",
          "overall survival",
          "disease-free",
          "recurrence",
          "relapse",
        ],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
        ],
        negativeAbstract: [],
      },
      safety_efficacy: {
        positive: [
          "safe",
          "safety",
          "well-tolerated",
          "adverse events",
          "efficacy",
          "benefit",
          "association",
          "significantly",
          "dietary",
          "nutrition",
          "nutritional",
          "diet",
          "food",
          "patients should",
          "recommended",
          "recommendation",
          "management of",
          "supportive care",
          "quality of life",
          "clinical guidance",
          "guideline",
        ],
        negativeTitle: [
          "in vitro",
          "cell line",
          "apoptosis pathway",
          "calpain",
          "synergizes with",
          "mouse model",
          "murine model",
          "molecular mechanism of",
          "signaling pathway of",
          "narrative review of risk factors",
          "study protocol",
          "protocol of the",
          "protocol for a",
          "protocol of a",
          "trial protocol",
        ],
        negativeAbstract: [
          "cell viability assay",
          "western blot",
          "flow cytometry",
          "tumor xenograft",
          "ic50",
          "in vitro study",
        ],
      },
      prevention: {
        positive: [
          "reduced risk",
          "prevented",
          "protective",
          "lower incidence",
          "risk reduction",
        ],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
          "study protocol",
        ],
        negativeAbstract: [],
      },
      comparison: {
        positive: [
          "versus",
          "compared",
          "superior",
          "non-inferior",
          "better",
          "difference",
          "head-to-head",
        ],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
          "study protocol",
        ],
        negativeAbstract: [],
      },
      side_effects: {
        positive: [
          "adverse",
          "toxicity",
          "side effect",
          "complication",
          "immune-related",
          "treatment-related",
        ],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
        ],
        negativeAbstract: [],
      },
      researchers: {
        positive: [],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
        ],
        negativeAbstract: [],
      },
      access_cost: {
        positive: [],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
        ],
        negativeAbstract: [],
      },
      general: {
        positive: [],
        negativeTitle: [
          "corrigendum to",
          "erratum to",
          "correction to",
          "retraction",
        ],
        negativeAbstract: [],
      },
    };

    this.paperTypePatterns = {
      clinical_outcome: [
        "randomized controlled trial",
        "randomised controlled trial",
        "phase 3",
        "phase iii",
        "phase 2",
        "phase ii",
        "overall survival",
        "progression-free survival",
        "response rate",
        "hazard ratio",
        "median survival",
        "clinical benefit",
        "real-world evidence",
        "real world evidence",
        "real-world study",
        "cohort study",
        "prospective study",
        "retrospective study",
        "efficacy and safety",
        "safety and efficacy",
        "patients received",
        "patients were treated",
        "treatment outcomes",
        "clinical outcomes",
      ],
      mechanism_paper: [
        "molecular mechanism",
        "signaling pathway",
        "crosstalk between",
        "in vitro",
        "in vivo",
        "cell line",
        "mouse model",
        "murine model",
        "pathway analysis",
        "gene expression",
        "protein interaction",
        "autophagy",
        "ferroptosis",
        "apoptosis pathway",
        "mechanistic study",
        "mechanistic insights",
        "synergizes with",
        "calpain pathway",
        "apoptosis in human",
        "cell viability",
        "ic50",
        "tumor xenograft",
      ],
      prediction_model: [
        "machine learning",
        "deep learning",
        "neural network",
        "prediction model",
        "predictive model",
        "artificial intelligence",
        "random forest",
        "support vector machine",
        "xgboost",
        "classifier",
        "algorithm",
        "feature selection",
        "auc",
        "roc curve",
        "model performance",
      ],
      drug_delivery: [
        "nanoparticle",
        "nanostructured",
        "nanocrystal",
        "nanomedicine",
        "liposome",
        "drug delivery",
        "drug release",
        "encapsulation",
        "chitosan",
        "polymer",
        "formulation",
        "bioavailability",
        "controlled release",
        "targeted delivery",
        "drug loading",
      ],
      diagnostic_biomarker: [
        "biosensor",
        "diagnostic accuracy",
        "sensitivity and specificity",
        "area under the curve",
        "receiver operating characteristic",
        "imaging technique",
        "detection method",
        "screening tool",
        "liquid biopsy",
        "circulating tumor",
        "ctdna",
      ],
      cost_analysis: [
        "cost-effectiveness",
        "cost effectiveness",
        "economic analysis",
        "budget impact",
        "quality-adjusted life year",
        "qaly",
        "willingness to pay",
        "incremental cost",
        "healthcare cost",
        "cost-utility",
        "pharmacoeconomic",
      ],
      review_article: [
        "systematic review",
        "meta-analysis",
        "narrative review",
        "literature review",
        "scoping review",
        "umbrella review",
        "(review)",
        ": a review",
        "review of the literature",
        "current evidence",
        "state of the art",
        "overview of",
      ],
      correction_notice: [
        "corrigendum",
        "erratum",
        "correction to",
        "publisher's correction",
        "author correction",
        "retraction",
        "retracted",
        "authors regret",
        "this corrects",
      ],
      methodology_protocol: [
        "study protocol",
        "protocol for",
        "methodological",
        "biological age",
        "assessment of biological",
        "cross-disease validation",
        "proof-of-concept",
        "stratified impact analysis",
        "intrinsic phenotype",
      ],
    };

    this.intentPaperTypeMap = {
      treatment_solutions: {
        preferred: ["clinical_outcome"],
        acceptable: ["review_article"],
        penalised: [
          "mechanism_paper",
          "prediction_model",
          "drug_delivery",
          "diagnostic_biomarker",
          "cost_analysis",
          "methodology_protocol",
          "correction_notice",
        ],
      },
      recent_research: {
        preferred: ["clinical_outcome", "review_article"],
        acceptable: ["mechanism_paper", "diagnostic_biomarker"],
        penalised: [
          "prediction_model",
          "drug_delivery",
          "cost_analysis",
          "methodology_protocol",
          "correction_notice",
        ],
      },
      mechanism: {
        preferred: ["mechanism_paper"],
        acceptable: ["review_article"],
        penalised: [
          "cost_analysis",
          "methodology_protocol",
          "correction_notice",
        ],
      },
      symptoms_diagnosis: {
        preferred: ["diagnostic_biomarker"],
        acceptable: ["clinical_outcome", "review_article"],
        penalised: [
          "cost_analysis",
          "drug_delivery",
          "methodology_protocol",
          "correction_notice",
        ],
      },
      clinical_trials: {
        preferred: ["clinical_outcome"],
        acceptable: ["review_article", "diagnostic_biomarker"],
        penalised: [
          "mechanism_paper",
          "cost_analysis",
          "methodology_protocol",
          "correction_notice",
        ],
      },
      prognosis: {
        preferred: ["clinical_outcome"],
        acceptable: ["review_article", "diagnostic_biomarker"],
        penalised: [
          "mechanism_paper",
          "drug_delivery",
          "cost_analysis",
          "correction_notice",
        ],
      },
      side_effects: {
        preferred: ["clinical_outcome"],
        acceptable: ["review_article"],
        penalised: [
          "mechanism_paper",
          "prediction_model",
          "cost_analysis",
          "correction_notice",
        ],
      },
      prevention: {
        preferred: ["clinical_outcome"],
        acceptable: ["review_article"],
        penalised: [
          "mechanism_paper",
          "drug_delivery",
          "cost_analysis",
          "correction_notice",
        ],
      },
      comparison: {
        preferred: ["clinical_outcome"],
        acceptable: ["review_article"],
        penalised: [
          "mechanism_paper",
          "prediction_model",
          "cost_analysis",
          "correction_notice",
        ],
      },
      safety_efficacy: {
        preferred: ["clinical_outcome"],
        acceptable: ["review_article", "diagnostic_biomarker"],
        penalised: [
          "mechanism_paper",
          "drug_delivery",
          "cost_analysis",
          "correction_notice",
        ],
      },
      researchers: {
        preferred: ["review_article", "clinical_outcome"],
        acceptable: ["mechanism_paper", "diagnostic_biomarker"],
        penalised: [
          "cost_analysis",
          "methodology_protocol",
          "correction_notice",
        ],
      },
      access_cost: {
        preferred: ["cost_analysis"],
        acceptable: ["review_article", "clinical_outcome"],
        penalised: ["mechanism_paper", "drug_delivery", "correction_notice"],
      },
      general: {
        preferred: ["clinical_outcome", "review_article"],
        acceptable: ["mechanism_paper", "diagnostic_biomarker"],
        penalised: [
          "cost_analysis",
          "methodology_protocol",
          "correction_notice",
        ],
      },
    };

    this.evidenceHierarchy = [
      {
        tier: 1,
        label: "Phase 3 RCT",
        score: 40,
        patterns: [
          "phase 3",
          "phase iii",
          "phase 3 trial",
          "phase iii trial",
          "randomized controlled trial",
          "randomised controlled trial",
          "blinded, randomised, controlled",
          "randomized, controlled, phase 3",
        ],
      },
      {
        tier: 2,
        label: "Meta-analysis / Systematic Review",
        score: 35,
        patterns: [
          "meta-analysis",
          "network meta-analysis",
          "systematic review",
          "meta analysis",
          "pooled analysis",
        ],
      },
      {
        tier: 3,
        label: "Real-World / Prospective Cohort",
        score: 28,
        patterns: [
          "real-world evidence",
          "real world evidence",
          "real-world study",
          "multicenter retrospective",
          "multicentre retrospective",
          "prospective cohort",
          "cohort study",
          "population-based study",
        ],
      },
      {
        tier: 4,
        label: "Phase 2 Trial",
        score: 22,
        patterns: [
          "phase 2",
          "phase ii",
          "phase 2 trial",
          "phase ii trial",
          "randomized phase 2",
          "randomised phase 2",
        ],
      },
      {
        tier: 5,
        label: "Single-arm / Exploratory",
        score: 15,
        patterns: [
          "single-arm",
          "single arm",
          "exploratory study",
          "open-label",
          "prospective single-arm",
          "pilot study",
        ],
      },
      {
        tier: 6,
        label: "Retrospective",
        score: 8,
        patterns: [
          "retrospective study",
          "retrospective analysis",
          "retrospective review",
          "observational study",
          "historical cohort",
        ],
      },
    ];

    this.clinicalEndpointSignals = [
      "overall survival",
      "progression-free survival",
      "disease-free survival",
      "objective response rate",
      "complete response rate",
      "hazard ratio",
      "median survival",
      "median progression-free",
      "disease control rate",
      "overall response rate",
      "pathologic complete response",
      "event-free survival",
      "time to progression",
    ];

    // ✅ EXPANDED: More diseases with subtype exactness
    this.subtypeExactness = {
      "lung cancer": {
        exact: ["nsclc", "non-small cell", "non-small-cell"],
        partial: ["sclc", "small cell lung"],
        exactBonus: 20,
        partialPenalty: -20,
      },
      diabetes: {
        exact: ["type 2", "t2dm"],
        partial: ["type 1", "t1dm"],
        exactBonus: 15,
        partialPenalty: -10,
      },
      "alzheimer's disease": {
        exact: ["alzheimer", "alzheimer's"],
        partial: ["dementia", "cognitive"],
        exactBonus: 12,
        partialPenalty: -5,
      },
      // ✅ NEW: Breast cancer subtypes
      "breast cancer": {
        exact: [
          "her2",
          "triple negative",
          "hormone receptor",
          "er positive",
          "hr positive",
        ],
        partial: ["male breast cancer"],
        exactBonus: 12,
        partialPenalty: -8,
      },
      // ✅ NEW: Leukemia subtypes
      leukemia: {
        exact: [
          "aml",
          "acute myeloid",
          "cml",
          "chronic myeloid",
          "all",
          "acute lymphoblastic",
          "cll",
          "chronic lymphocytic",
        ],
        partial: [],
        exactBonus: 12,
        partialPenalty: 0,
      },
      // ✅ NEW: Lymphoma subtypes
      lymphoma: {
        exact: [
          "hodgkin",
          "non-hodgkin",
          "dlbcl",
          "follicular",
          "diffuse large",
        ],
        partial: [],
        exactBonus: 10,
        partialPenalty: 0,
      },
      // ✅ NEW: COPD vs Asthma separation
      copd: {
        exact: ["copd", "emphysema", "chronic obstructive"],
        partial: ["asthma"],
        exactBonus: 12,
        partialPenalty: -8,
      },
      // ✅ NEW: Parkinson's vs Alzheimer's
      "parkinson's disease": {
        exact: ["parkinson", "parkinsonian", "dopamine", "levodopa"],
        partial: ["alzheimer", "dementia"],
        exactBonus: 12,
        partialPenalty: -8,
      },
      // ✅ NEW: Type 2 diabetes specific
      "type 2 diabetes": {
        exact: ["type 2", "t2dm", "type 2 diabetes"],
        partial: ["type 1", "t1dm"],
        exactBonus: 15,
        partialPenalty: -10,
      },
      // ✅ NEW: Type 1 diabetes specific
      "type 1 diabetes": {
        exact: ["type 1", "t1dm", "type 1 diabetes"],
        partial: ["type 2", "t2dm"],
        exactBonus: 15,
        partialPenalty: -10,
      },
    };

    this.trialAnswerTypePatterns = {
      treatment_trial: [
        "treatment of",
        "therapy for",
        "first-line",
        "second-line",
        "chemotherapy",
        "immunotherapy",
        "targeted therapy",
        "radiation therapy",
        "versus",
        "compared with",
        "efficacy of",
        "safety and efficacy",
        "randomized controlled trial of",
        "phase 3",
        "phase iii",
        "pembrolizumab",
        "nivolumab",
        "osimertinib",
        "paclitaxel",
        "carboplatin",
        "durvalumab",
        "atezolizumab",
        "tki",
        "egfr",
        "adjuvant",
        "neoadjuvant",
        "consolidative",
        "maintenance therapy",
      ],
      diagnostic_trial: [
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
        "computed tomography",
        "spect",
        "pet",
        "liquid biopsy",
        "mutation detection",
        "ctdna",
        "concordance of detecting",
      ],
      supportive_trial: [
        "cachexia",
        "pain management",
        "quality of life",
        "palliative",
        "nausea",
        "fatigue",
        "anemia",
        "neuropathy",
        "nutrition",
        "rehabilitation",
        "survivorship",
        "bronchoscopy",
        "endoscopy",
        "cough suppression",
        "pain relief during",
        "sedation",
        "anaesthesia",
        "anesthesia",
        "lignocaine",
        "lidocaine",
        "topical anesthetic",
        "local anesthetic",
        "procedural pain",
      ],
      prevention_trial: [
        "prevention",
        "prophylaxis",
        "chemoprevention",
        "risk reduction",
        "screening program",
      ],
    };

    this.trialHardExclusionPatterns = [
      "cough suppression",
      "pain relief during",
      "bronchoscopy comfort",
      "lignocaine in",
      "lidocaine in",
      "sedation during",
      "dental",
      "endodontic treatment on cardiovascular",
      "bowel preparation",
      "cool roofs on health",
      "induction of labour",
      "spontaneous labour",
      "dexmedetomidine and ketofol",
      "radial hemostasis",
      "challenges faced by",
      "cross-sectional study of therapist",
      "survey of physiotherapist",
      "perception of healthcare",
      "awareness among",
      "knowledge and attitude",
      "telerehabilitation within",
      "mycobacterium w in combination",
      "mycobacterium w combination",
      "survey among",
      "knowledge among",
      "attitude among",
      "practices among",
      "perception among",
      "intraoperative neuromonitoring",
      "surgical site infection prevention",
      "venous thromboembolism prophylaxis",
      "urinary catheter",
      "central line insertion",
      "hand hygiene",
      "hospital acquired infection",
    ];

    this.intentTrialTypeMap = {
      treatment_solutions: {
        preferred: ["treatment_trial"],
        acceptable: [],
        penalised: ["diagnostic_trial", "supportive_trial", "prevention_trial"],
      },
      recent_research: {
        preferred: ["treatment_trial"],
        acceptable: ["diagnostic_trial"],
        penalised: ["supportive_trial"],
      },
      symptoms_diagnosis: {
        preferred: ["diagnostic_trial"],
        acceptable: ["treatment_trial"],
        penalised: ["supportive_trial"],
      },
      prevention: {
        preferred: ["prevention_trial"],
        acceptable: ["treatment_trial"],
        penalised: ["supportive_trial"],
      },
      clinical_trials: {
        preferred: ["treatment_trial"],
        acceptable: ["diagnostic_trial", "supportive_trial"],
        penalised: [],
      },
      prognosis: {
        preferred: ["treatment_trial"],
        acceptable: ["diagnostic_trial"],
        penalised: ["supportive_trial"],
      },
      side_effects: {
        preferred: ["treatment_trial", "supportive_trial"],
        acceptable: [],
        penalised: ["diagnostic_trial"],
      },
      comparison: {
        preferred: ["treatment_trial"],
        acceptable: [],
        penalised: ["diagnostic_trial", "supportive_trial"],
      },
      safety_efficacy: {
        preferred: ["treatment_trial"],
        acceptable: ["supportive_trial"],
        penalised: ["diagnostic_trial"],
      },
      mechanism: {
        preferred: ["treatment_trial"],
        acceptable: [],
        penalised: [],
      },
      researchers: {
        preferred: ["treatment_trial"],
        acceptable: ["diagnostic_trial"],
        penalised: [],
      },
      access_cost: {
        preferred: ["treatment_trial"],
        acceptable: [],
        penalised: [],
      },
      general: {
        preferred: ["treatment_trial"],
        acceptable: ["diagnostic_trial", "supportive_trial"],
        penalised: [],
      },
    };

    this.synonymInvalidators = {
      "heart disease": [
        "cirrhotic",
        "alcoholic cardiomyopathy",
        "stress cardiomyopathy",
        "septic cardiomyopathy",
        "takotsubo",
        "liver cirrhosis",
        "hepatic",
        "cirrhosis",
        "renal cardiomyopathy",
      ],
      "cardiovascular disease": ["cirrhotic", "hepatic", "cirrhosis", "liver"],
      "heart failure": ["cirrhotic", "hepatic", "liver cirrhosis"],
      "lung cancer": [
        "breast cancer",
        "colon cancer",
        "prostate cancer",
        "gastric cancer",
        "ovarian cancer",
        "pancreatic cancer",
        "cervical cancer",
        "bladder cancer",
        "kidney cancer",
        "liver cancer",
        "brain cancer",
        "pulmonary fibrosis",
        "pulmonary hypertension",
        "lung fibrosis",
        "idiopathic pulmonary",
        "interstitial lung disease",
        "pulmonary arterial",
        "chronic obstructive",
      ],
      "alzheimer's disease": [
        "parkinson",
        "lewy body dementia",
        "frontotemporal",
      ],
      "parkinson's disease": ["alzheimer", "lewy body dementia"],
    };

    this.trialDiseaseExclusions = {
      "heart disease": [
        "cirrhosis",
        "decompensated cirrhosis",
        "liver cirrhosis",
        "hepatic decompensation",
        "nash",
        "nafld",
        "steatohepatitis",
        "chronic liver disease",
      ],
      "cardiovascular disease": [
        "cirrhosis",
        "decompensated cirrhosis",
        "liver cirrhosis",
        "chronic liver disease",
      ],
      diabetes: ["cirrhosis", "liver cirrhosis"],
      "lung cancer": [
        "breast cancer",
        "colorectal cancer",
        "prostate cancer",
        "ovarian cancer",
        "pancreatic cancer",
      ],
    };

    this.subtypeMap = {
      "lung cancer": {
        primary: [
          "non-small cell",
          "nsclc",
          "adenocarcinoma",
          "squamous cell lung",
        ],
        secondary: ["small cell lung cancer", "sclc"],
      },
      nsclc: {
        primary: ["non-small cell", "nsclc", "adenocarcinoma"],
        secondary: ["small cell", "sclc"],
      },
      sclc: {
        primary: ["small cell", "sclc"],
        secondary: ["non-small cell", "nsclc"],
      },
      "breast cancer": {
        primary: [
          "breast cancer",
          "breast carcinoma",
          "her2",
          "triple negative",
        ],
        secondary: [],
      },
      leukemia: {
        primary: ["leukemia", "leukaemia", "aml", "cml", "all", "cll"],
        secondary: [],
      },
      lymphoma: {
        primary: ["lymphoma", "hodgkin", "non-hodgkin", "dlbcl"],
        secondary: [],
      },
      cancer: { primary: [], secondary: [] },
      diabetes: {
        primary: ["type 2", "t2dm", "type 2 diabetes"],
        secondary: ["type 1", "t1dm"],
      },
      "type 2 diabetes": {
        primary: ["type 2", "t2dm", "type 2 diabetes"],
        secondary: ["type 1", "t1dm", "gestational"],
      },
      "type 1 diabetes": {
        primary: ["type 1", "t1dm", "type 1 diabetes"],
        secondary: ["type 2", "t2dm"],
      },
      "heart disease": {
        primary: [
          "coronary artery",
          "coronary heart",
          "ischemic heart",
          "myocardial",
        ],
        secondary: [],
      },
      "cardiovascular disease": {
        primary: [
          "cardiovascular",
          "coronary",
          "cardiac",
          "myocardial",
          "atherosclerosis",
        ],
        secondary: [],
      },
      "alzheimer's disease": {
        primary: ["alzheimer", "dementia", "cognitive decline"],
        secondary: ["parkinson", "lewy body"],
      },
      "parkinson's disease": {
        primary: ["parkinson", "dopamine", "levodopa"],
        secondary: ["alzheimer", "dementia"],
      },
      "multiple sclerosis": {
        primary: ["multiple sclerosis", "demyelinating", "relapsing remitting"],
        secondary: [],
      },
      copd: {
        primary: [
          "copd",
          "emphysema",
          "chronic obstructive",
          "airflow obstruction",
        ],
        secondary: [],
      },
      "kidney disease": {
        primary: [
          "renal",
          "nephropathy",
          "chronic kidney",
          "glomerulonephritis",
        ],
        secondary: [],
      },
    };

    this.diseaseSynonyms = {
      "heart disease": [
        "cardiac",
        "cardiovascular",
        "coronary",
        "myocardial",
        "cardiomyopathy",
        "atherosclerosis",
        "angina",
        "arrhythmia",
        "ischemic",
        "ischaemic",
      ],
      "heart failure": [
        "cardiac failure",
        "cardiomyopathy",
        "ventricular dysfunction",
        "hfref",
        "hfpef",
        "ejection fraction",
      ],
      "cardiovascular disease": [
        "cardiac",
        "cardiovascular",
        "coronary",
        "myocardial",
        "atherosclerosis",
        "arrhythmia",
        "heart failure",
        "ischemic",
      ],
      "lung cancer": [
        "pulmonary carcinoma",
        "pulmonary cancer",
        "pulmonary tumor",
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
        "memory loss",
      ],
      "parkinson's disease": [
        "parkinson",
        "parkinsonian",
        "dopaminergic",
        "lewy body",
      ],
      "neurological disease": [
        "neurological",
        "neurodegenerative",
        "neuropathy",
        "neuroinflammation",
      ],
      diabetes: [
        "diabetic",
        "glycemic",
        "hyperglycemia",
        "insulin resistance",
        "hba1c",
        "glucose metabolism",
        "t2dm",
        "t1dm",
        "glycaemic",
      ],
      "type 2 diabetes": [
        "diabetic",
        "glycemic",
        "t2dm",
        "insulin resistance",
        "hyperglycemia",
        "glucose",
        "hba1c",
        "glycaemic",
      ],
      "type 1 diabetes": [
        "diabetic",
        "t1dm",
        "autoimmune diabetes",
        "juvenile diabetes",
        "insulin dependent",
      ],
      "breast cancer": [
        "mammary carcinoma",
        "mammary cancer",
        "breast carcinoma",
        "her2",
        "triple negative",
        "brca",
      ],
      hypertension: [
        "high blood pressure",
        "blood pressure",
        "antihypertensive",
        "systolic",
        "diastolic",
        "hypertensive",
      ],
      stroke: [
        "cerebrovascular",
        "cerebral infarction",
        "brain attack",
        "ischemic stroke",
        "hemorrhagic stroke",
        "tia",
        "transient ischemic",
      ],
      "atrial fibrillation": [
        "afib",
        "a-fib",
        "atrial flutter",
        "cardiac arrhythmia",
      ],
      copd: [
        "emphysema",
        "chronic bronchitis",
        "obstructive pulmonary",
        "pulmonary disease",
        "airflow obstruction",
        "spirometry",
      ],
      asthma: [
        "bronchial asthma",
        "airway hyperresponsiveness",
        "bronchospasm",
        "inhaler therapy",
        "bronchodilator",
      ],
      "kidney disease": [
        "renal disease",
        "nephropathy",
        "chronic kidney",
        "renal failure",
        "glomerulonephritis",
        "proteinuria",
        "creatinine",
        "egfr renal",
      ],
      "liver disease": [
        "hepatic disease",
        "cirrhosis",
        "hepatitis",
        "liver failure",
        "fibrosis",
        "steatohepatitis",
        "nash",
        "nafld",
      ],
      "multiple sclerosis": [
        "demyelinating",
        "ms patients",
        "relapsing remitting",
        "myelin",
        "sclerosis",
      ],
      "rheumatoid arthritis": [
        "rheumatoid",
        "inflammatory arthritis",
        "synovitis",
        "anti-tnf",
        "methotrexate arthritis",
      ],
      depression: [
        "depressive disorder",
        "major depression",
        "antidepressant",
        "ssri",
        "serotonin",
        "mood disorder",
      ],
      anxiety: [
        "anxiety disorder",
        "generalized anxiety",
        "panic disorder",
        "anxiolytic",
        "benzodiazepine",
      ],
      "covid-19": [
        "sars-cov-2",
        "coronavirus",
        "covid",
        "pandemic",
        "spike protein",
      ],
      "hiv/aids": [
        "hiv",
        "human immunodeficiency",
        "antiretroviral",
        "art therapy",
        "cd4",
      ],
      obesity: [
        "overweight",
        "adiposity",
        "bmi",
        "bariatric",
        "weight loss",
        "metabolic syndrome",
      ],
      epilepsy: ["seizure", "antiepileptic", "convulsion", "epileptic"],
      "gene therapy": [
        "crispr",
        "cas9",
        "gene editing",
        "gene modification",
        "viral vector",
        "aav",
        "lentiviral",
        "genome editing",
        "base editing",
        "prime editing",
      ],
      "chronic pain": [
        "neuropathic",
        "fibromyalgia",
        "pain management",
        "analgesic",
        "opioid",
        "chronic pain",
      ],
      osteoporosis: [
        "bone density",
        "bone loss",
        "fracture risk",
        "bisphosphonate",
        "denosumab",
        "bone mineral density",
      ],
      psoriasis: [
        "psoriatic",
        "plaque psoriasis",
        "biologic therapy psoriasis",
      ],
      lupus: [
        "systemic lupus",
        "sle",
        "lupus erythematosus",
        "autoimmune lupus",
      ],
      "crohn's disease": [
        "inflammatory bowel",
        "crohn",
        "ibd",
        "intestinal inflammation",
      ],
      tuberculosis: [
        "tb",
        "mycobacterium",
        "pulmonary tuberculosis",
        "anti-tb",
      ],
    };

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

    this.countryAliases = {
      india: ["india", "indian"],
      "united states": ["united states", "usa", "us", "america"],
      "united kingdom": ["united kingdom", "uk", "england", "britain"],
      australia: ["australia", "australian"],
      canada: ["canada", "canadian"],
      germany: ["germany", "german", "deutschland"],
      france: ["france", "french"],
      japan: ["japan", "japanese"],
      china: ["china", "chinese"],
      brazil: ["brazil", "brasil", "brazilian"],
      "south korea": ["south korea", "korea", "korean"],
      italy: ["italy", "italian"],
      spain: ["spain", "spanish"],
      netherlands: ["netherlands", "dutch", "holland"],
      sweden: ["sweden", "swedish"],
      singapore: ["singapore"],
      taiwan: ["taiwan"],
      malaysia: ["malaysia"],
      thailand: ["thailand"],
      argentina: ["argentina", "argentinian"],
      mexico: ["mexico", "mexican"],
      turkey: ["turkey", "turkish"],
      russia: ["russia", "russian"],
      norway: ["norway", "norwegian"],
      denmark: ["denmark", "danish"],
      finland: ["finland", "finnish"],
      poland: ["poland", "polish"],
      greece: ["greece", "greek"],
      portugal: ["portugal", "portuguese"],
      "hong kong": ["hong kong"],
      pakistan: ["pakistan", "pakistani"],
      bangladesh: ["bangladesh", "bangladeshi"],
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
      kanpur: "india",
      nagpur: "india",
      indore: "india",
      thane: "india",
      bhopal: "india",
      visakhapatnam: "india",
      patna: "india",
      vadodara: "india",
      chandigarh: "india",
      coimbatore: "india",
      kochi: "india",
      guwahati: "india",
      bhubaneswar: "india",
      mysore: "india",
      mysuru: "india",
      mangalore: "india",
      mangaluru: "india",
      aurangabad: "india",
      jodhpur: "india",
      goa: "india",
      shimla: "india",
      dehradun: "india",
      thiruvananthapuram: "india",
      toronto: "canada",
      vancouver: "canada",
      montreal: "canada",
      calgary: "canada",
      ottawa: "canada",
      edmonton: "canada",
      london: "united kingdom",
      manchester: "united kingdom",
      birmingham: "united kingdom",
      leeds: "united kingdom",
      glasgow: "united kingdom",
      liverpool: "united kingdom",
      sydney: "australia",
      melbourne: "australia",
      brisbane: "australia",
      perth: "australia",
      "new york": "united states",
      chicago: "united states",
      boston: "united states",
      "los angeles": "united states",
      houston: "united states",
      phoenix: "united states",
      philadelphia: "united states",
      dallas: "united states",
      seattle: "united states",
      denver: "united states",
      berlin: "germany",
      munich: "germany",
      hamburg: "germany",
      paris: "france",
      lyon: "france",
      marseille: "france",
      tokyo: "japan",
      osaka: "japan",
      kyoto: "japan",
      beijing: "china",
      shanghai: "china",
      guangzhou: "china",
      "sao paulo": "brazil",
      "rio de janeiro": "brazil",
      seoul: "south korea",
      busan: "south korea",
      "hong kong": "hong kong",
      taipei: "taiwan",
      singapore: "singapore",
      "kuala lumpur": "malaysia",
      bangkok: "thailand",
      istanbul: "turkey",
      ankara: "turkey",
      moscow: "russia",
      "saint petersburg": "russia",
      amsterdam: "netherlands",
      brussels: "belgium",
      vienna: "austria",
      zurich: "switzerland",
      geneva: "switzerland",
      stockholm: "sweden",
      oslo: "norway",
      copenhagen: "denmark",
      helsinki: "finland",
      warsaw: "poland",
      athens: "greece",
      lisbon: "portugal",
      madrid: "spain",
      barcelona: "spain",
      rome: "italy",
      milan: "italy",
      "buenos aires": "argentina",
      "mexico city": "mexico",
      karachi: "pakistan",
      lahore: "pakistan",
      dhaka: "bangladesh",
      colombo: "sri lanka",
      kathmandu: "nepal",
    };

    this.abstractNoResultSignals = [
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
      "the authors regret",
      "publisher's correction",
      "author correction",
      "retraction notice",
      "this article has been retracted",
      "will be recruited",
      "is currently recruiting",
      "study is ongoing",
      "we propose to",
      "we plan to",
    ];

    this.abstractRealResultSignals = [
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
      "identified significant",
    ];

    this.clinicalNumberPatterns = [
      /\d+\.?\d*\s*%/,
      /\d+\.?\d*\s*months/,
      /hr\s*[=:]\s*0?\.\d+/i,
      /hazard ratio.*\d/i,
      /p\s*[<=>]\s*0?\.\d+/i,
      /p\s*value.*\d/i,
      /median.*\d+\.?\d*\s*months/i,
      /os.*\d+\.?\d*\s*months/i,
      /pfs.*\d+\.?\d*\s*months/i,
      /orr.*\d+\.?\d*\s*%/i,
      /response rate.*\d+\.?\d*\s*%/i,
      /survival.*\d+\.?\d*\s*%/i,
      /\d+\.?\d*\s*months.*survival/i,
      /\(\d+\.?\d*.*\d+\.?\d*\)/,
    ];

    this.intentConceptMap = {
      treatment_solutions: [
        "drug therapy",
        "treatment",
        "chemotherapy",
        "immunotherapy",
        "targeted therapy",
        "clinical trial",
        "efficacy",
        "pharmacotherapy",
        "antineoplastic",
        "therapeutic",
        "first-line therapy",
        "combination therapy",
      ],
      mechanism: [
        "molecular biology",
        "biochemistry",
        "signaling pathway",
        "gene expression",
        "molecular mechanism",
        "cell biology",
      ],
      prognosis: [
        "prognosis",
        "survival analysis",
        "mortality",
        "disease-free survival",
        "overall survival",
      ],
      symptoms_diagnosis: [
        "diagnosis",
        "biomarker",
        "screening",
        "detection",
        "diagnostic imaging",
        "medical imaging",
      ],
      prevention: [
        "prevention",
        "risk reduction",
        "prophylaxis",
        "risk factor",
      ],
    };

    this.predictorConcepts = [
      "predictive biomarker",
      "patient selection",
      "prognostic factor",
      "risk stratification",
      "biomarker",
      "prediction",
      "nomogram",
    ];

    this.trialMaxAgeForIntent = {
      treatment_solutions: 12,
      recent_research: 8,
      comparison: 10,
      access_cost: 10,
      safety_efficacy: 10,
      prevention: 12,
      side_effects: 15,
      prognosis: 15,
      symptoms_diagnosis: 12,
      mechanism: 20,
      researchers: 20,
      clinical_trials: 20,
      general: 15,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  _synonymMatchValid(text, synonym, diseaseLower) {
    if (!text.includes(synonym)) return false;
    const invalidators = this.synonymInvalidators[diseaseLower] || [];
    if (invalidators.length === 0) return true;
    return !invalidators.some((inv) => text.includes(inv));
  }

  _extractYear(dateStr) {
    if (!dateStr) return null;
    const year = parseInt(dateStr.toString().substring(0, 4));
    return isNaN(year) ? null : year;
  }

  // ✅ FIXED: _abstractHasRealAnswer now actually rejects papers
  // with no result signals. Previously returned true at the end
  // even when nothing was found, making the filter useless.
  _abstractHasRealAnswer(abstractLower, titleLower) {
    // Too short to be meaningful
    if (abstractLower.length < 80) return false;

    // Title contains correction/protocol signals → reject immediately
    const titleHasNoResult = this.abstractNoResultSignals.some((sig) =>
      titleLower.includes(sig),
    );
    if (titleHasNoResult) return false;

    // Abstract contains future study / protocol signals → reject
    const abstractHasNoResult = this.abstractNoResultSignals.some((sig) =>
      abstractLower.includes(sig),
    );
    if (abstractHasNoResult) return false;

    // ✅ Check for real result signals
    const hasResultSignal = this.abstractRealResultSignals.some((sig) =>
      abstractLower.includes(sig),
    );
    if (hasResultSignal) return true;

    // ✅ Check for real clinical numbers
    const hasRealNumbers = this.clinicalNumberPatterns.some((pattern) =>
      pattern.test(abstractLower),
    );
    if (hasRealNumbers) return true;

    // ✅ FIXED: Previously returned true here — now returns false
    // If abstract has no result signals AND no clinical numbers,
    // the paper has not reported results yet or is a review
    // without quantitative data. For result-required intents, reject it.
    // Exception: review articles often lack specific numbers
    // but contain synthesis language — check for that
    const REVIEW_SIGNALS = [
      "systematic review",
      "meta-analysis",
      "we reviewed",
      "we analyzed",
      "we analysed",
      "literature review",
      "current evidence",
      "overview of",
      "pooled analysis",
      "summarize",
      "summarise",
    ];
    const isReview = REVIEW_SIGNALS.some((sig) => abstractLower.includes(sig));
    if (isReview) return true;

    // No result signals, no numbers, not a review → reject
    return false;
  }

  _hasRealClinicalNumbers(abstractLower) {
    return this.clinicalNumberPatterns.some((pattern) =>
      pattern.test(abstractLower),
    );
  }

  _getConceptPenalty(pub, intentType) {
    const concepts = pub.concepts || [];
    if (concepts.length === 0) return 1.0;

    if (intentType === "treatment_solutions") {
      const isPredictorPaper = concepts.some(
        (c) =>
          this.predictorConcepts.some((pc) => c.name.includes(pc)) &&
          c.score > 0.6,
      );
      const hasTreatmentConcept = concepts.some(
        (c) =>
          (this.intentConceptMap.treatment_solutions || []).some((tc) =>
            c.name.includes(tc),
          ) && c.score > 0.4,
      );
      if (isPredictorPaper && !hasTreatmentConcept) {
        console.log(
          `   🔬 Concept: predictor paper (×0.5): "${pub.title?.substring(0, 50)}"`,
        );
        return 0.5;
      }
    }

    return 1.0;
  }

  _trialIsRelevant(conditionsCombined, titleLower, disease, diseaseTokens) {
    if (!disease || diseaseTokens.length === 0) return true;

    const isHardExcluded = this.trialHardExclusionPatterns.some((pattern) =>
      titleLower.includes(pattern),
    );
    if (isHardExcluded) {
      console.log(
        `🚫 Hard excluded (off-topic procedure): "${titleLower.substring(0, 60)}"`,
      );
      return false;
    }

    const diseaseLower = disease.toLowerCase();
    const synonyms = this.diseaseSynonyms[diseaseLower] || [];
    const exclusions = this.trialDiseaseExclusions[diseaseLower] || [];

    const mentionsDisease =
      conditionsCombined.includes(diseaseLower) ||
      titleLower.includes(diseaseLower) ||
      diseaseTokens.some(
        (t) => t.length > 3 && conditionsCombined.includes(t),
      ) ||
      diseaseTokens.some((t) => t.length > 3 && titleLower.includes(t)) ||
      synonyms.some((s) =>
        this._synonymMatchValid(conditionsCombined, s, diseaseLower),
      ) ||
      synonyms.some((s) =>
        this._synonymMatchValid(titleLower, s, diseaseLower),
      );

    if (!mentionsDisease) return false;

    if (exclusions.length > 0) {
      const isDominated = exclusions.some((excl) =>
        conditionsCombined.includes(excl),
      );
      if (isDominated) {
        const diseaseIsStandalone =
          conditionsCombined.includes(diseaseLower) ||
          diseaseTokens.some(
            (t) =>
              t.length > 3 &&
              conditionsCombined.includes(t) &&
              !exclusions.some((excl) => excl.includes(t)),
          );
        if (!diseaseIsStandalone) {
          console.log(
            `🚫 Pre-filtered (excluded disease dominates): "${titleLower.substring(0, 60)}"`,
          );
          return false;
        }
      }
    }

    return true;
  }

  _classifyPaperType(titleLower, abstractLower, intentType) {
    const combined = `${titleLower} ${abstractLower}`;
    const allTypes = [];

    for (const [type, patterns] of Object.entries(this.paperTypePatterns)) {
      const titleMatchCount = patterns.filter((p) =>
        titleLower.includes(p),
      ).length;
      const totalMatchCount = patterns.filter((p) =>
        combined.includes(p),
      ).length;
      const strength = titleMatchCount * 2 + totalMatchCount;
      if (titleMatchCount >= 1 || totalMatchCount >= 2) {
        allTypes.push({ type, strength });
      }
    }

    allTypes.sort((a, b) => b.strength - a.strength);

    const primaryType = allTypes[0]?.type || "general_research";
    const typeNames = allTypes.map((t) => t.type);
    const mapping =
      this.intentPaperTypeMap[intentType] || this.intentPaperTypeMap.general;
    const isPreferred = (mapping.preferred || []).some((p) =>
      typeNames.includes(p),
    );
    const isPenalised =
      !isPreferred &&
      (mapping.penalised || []).some((p) => typeNames.includes(p));

    return { primaryType, allTypes: typeNames, isPreferred, isPenalised };
  }

  _getEvidenceTier(titleLower, abstractLower) {
    const combined = `${titleLower} ${abstractLower}`;
    for (const tier of this.evidenceHierarchy) {
      const titleMatches = tier.patterns.filter((p) =>
        titleLower.includes(p),
      ).length;
      const totalMatches = tier.patterns.filter((p) =>
        combined.includes(p),
      ).length;
      if (titleMatches >= 1 || totalMatches >= 2) {
        return {
          tier: tier.tier,
          tierLabel: tier.label,
          tierScore: tier.score,
        };
      }
    }
    return { tier: 7, tierLabel: "unclassified", tierScore: 5 };
  }

  _countClinicalEndpoints(titleLower, abstractLower) {
    const combined = `${titleLower} ${abstractLower}`;
    const titleHits = this.clinicalEndpointSignals.filter((e) =>
      titleLower.includes(e),
    ).length;
    const abstractHits = this.clinicalEndpointSignals.filter((e) =>
      combined.includes(e),
    ).length;
    return { titleHits, abstractHits };
  }

  _getSubtypeExactnessBonus(titleLower, abstractLower, diseaseLower) {
    const exactness = this.subtypeExactness[diseaseLower];
    if (!exactness) return 0;

    const combined = `${titleLower} ${abstractLower}`;
    const hasExact = exactness.exact.some(
      (e) => titleLower.includes(e) || combined.includes(e),
    );
    const hasPartial = exactness.partial.some((p) => titleLower.includes(p));

    if (hasExact && !hasPartial) return exactness.exactBonus;
    if (hasExact && hasPartial) return Math.floor(exactness.exactBonus / 2);
    if (!hasExact && hasPartial) return exactness.partialPenalty;
    return 0;
  }

  _classifyTrialType(titleLower, conditionsCombined, intentType) {
    const combined = `${titleLower} ${conditionsCombined}`;
    const detectedTypes = [];

    for (const [type, patterns] of Object.entries(
      this.trialAnswerTypePatterns,
    )) {
      const titleHits = patterns.filter((p) => titleLower.includes(p)).length;
      const totalHits = patterns.filter((p) => combined.includes(p)).length;
      if (titleHits >= 1 || totalHits >= 2) {
        detectedTypes.push({ type, strength: titleHits * 2 + totalHits });
      }
    }

    detectedTypes.sort((a, b) => b.strength - a.strength);

    const primaryType = detectedTypes[0]?.type || "treatment_trial";
    const typeNames = detectedTypes.map((t) => t.type);
    const mapping =
      this.intentTrialTypeMap[intentType] || this.intentTrialTypeMap.general;
    const isPerfect = (mapping.preferred || []).some((p) =>
      typeNames.includes(p),
    );
    const isPenalised =
      !isPerfect &&
      (mapping.penalised || []).some((p) => typeNames.includes(p));

    return { primaryType, isPerfect, isPenalised };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLICATION RANKING
  // ══════════════════════════════════════════════════════════════════════════

  rankPublications(publications, query, disease, context = {}, intent = null) {
    if (!Array.isArray(publications) || publications.length === 0) return [];

    const currentYear = new Date().getFullYear();
    const queryTokens = this.tokenize(query);
    const diseaseTokens = disease ? this.tokenize(disease) : [];
    const intentType = intent?.type || context._intent?.type || "general";
    const solutionKws = this.solutionKeywords[intentType] || [];

    console.log(`\n🎯 Ranking publications with intent: "${intentType}"`);
    if (Array.isArray(solutionKws) && solutionKws.length > 0) {
      console.log(
        `   Solution keywords: ${solutionKws.slice(0, 6).join(", ")}...`,
      );
    }

    const scored = publications.map((pub) =>
      this._scorePublication(
        pub,
        queryTokens,
        diseaseTokens,
        disease,
        currentYear,
        intentType,
        solutionKws,
      ),
    );

    const relevant = scored.filter((pub) => pub._rawScore > 0);
    if (relevant.length === 0) {
      console.log("   ⚠️  No relevant publications found after scoring.");
      return [];
    }

    const maxScore = Math.max(...relevant.map((p) => p._rawScore), 1);
    const normalised = relevant.map((pub) => ({
      ...pub,
      relevanceScore: parseFloat(((pub._rawScore / maxScore) * 100).toFixed(2)),
      _rawScore: undefined,
    }));

    const MAX_AGE_FOR_INTENT = {
      treatment_solutions: 5,
      recent_research: 3,
      comparison: 5,
      access_cost: 5,
      side_effects: 7,
      prognosis: 7,
      safety_efficacy: 8,
      prevention: 8,
      symptoms_diagnosis: 8,
      clinical_trials: 10,
      researchers: 10,
      general: 8,
      mechanism: null,
    };

    const maxAge = MAX_AGE_FOR_INTENT[intentType] ?? null;

    const ranked = normalised
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter((pub) => {
        if (pub.relevanceScore <= 2) return false;

        if (maxAge !== null) {
          const pubAge = currentYear - (pub.year || currentYear);
          if (pubAge > maxAge) {
            console.log(
              `   📅 Age filtered (${pubAge}yr > max ${maxAge}yr for ${intentType}): ` +
                `"${pub.title?.substring(0, 50)}"`,
            );
            return false;
          }
        }

        return true;
      });

    console.log(
      `   📊 Total: ${publications.length} → Relevant: ${relevant.length}` +
        ` → Age-filtered: ${ranked.length} → Final: ${Math.min(ranked.length, 8)}`,
    );

    return ranked;
  }

  _scorePublication(
    pub,
    queryTokens,
    diseaseTokens,
    disease,
    currentYear,
    intentType,
    solutionKws,
  ) {
    if (!pub || typeof pub.title !== "string" || !pub.title.trim()) {
      return { ...pub, _rawScore: 0 };
    }

    const titleLower = pub.title.toLowerCase();
    const abstractLower = (pub.abstract || "").toLowerCase();
    const journalLower = (pub.journalName || "").toLowerCase();
    const combined = `${titleLower} ${abstractLower}`;
    const diseaseLower = disease ? disease.toLowerCase() : "";

    // ── Hard filter 1: Disease ────────────────────────────────────────────
    if (disease && diseaseTokens.length > 0) {
      const synonyms = this.diseaseSynonyms[diseaseLower] || [];
      const isMultiWord = diseaseTokens.length >= 2;
      const titleTokenHits = diseaseTokens.filter(
        (t) => t.length > 3 && titleLower.includes(t),
      ).length;
      const absTokenHits = diseaseTokens.filter(
        (t) => t.length > 3 && abstractLower.includes(t),
      ).length;

      const inTitle =
        titleLower.includes(diseaseLower) ||
        (isMultiWord ? titleTokenHits >= 2 : titleTokenHits >= 1) ||
        synonyms.some((s) =>
          this._synonymMatchValid(titleLower, s, diseaseLower),
        );
      const inAbstract =
        abstractLower.includes(diseaseLower) ||
        (isMultiWord ? absTokenHits >= 2 : absTokenHits >= 1) ||
        synonyms.some((s) =>
          this._synonymMatchValid(abstractLower, s, diseaseLower),
        );
      if (!inTitle && !inAbstract) return { ...pub, _rawScore: 0 };
    }

    // ── Hard filter 2: Intent required keywords ───────────────────────────
    const requiredKws = this.intentRequiredInTitle[intentType] || [];
    if (requiredKws.length > 0) {
      const inTitle = requiredKws.some((kw) => titleLower.includes(kw));
      const inAbstract = requiredKws.some((kw) => abstractLower.includes(kw));
      if (!inTitle && !inAbstract) {
        console.log(
          `   ❌ Missing intent keywords: "${pub.title.substring(0, 60)}"`,
        );
        return { ...pub, _rawScore: 0 };
      }
    }

    // ── Hard filter 3: Negative title signals ─────────────────────────────
    const answerSignals = this.intentAnswerSignals[intentType] || {};
    const negativeTitles = answerSignals.negativeTitle || [];
    if (
      negativeTitles.length > 0 &&
      negativeTitles.some((sig) => titleLower.includes(sig))
    ) {
      console.log(`   🚫 Negative title: "${pub.title.substring(0, 70)}"`);
      return { ...pub, _rawScore: 0 };
    }

    // ── Hard filter 4: Abstract must contain real results ─────────────────
    const RESULT_REQUIRED_INTENTS = [
      "treatment_solutions",
      "recent_research",
      "prognosis",
      "comparison",
      "side_effects",
    ];
    if (RESULT_REQUIRED_INTENTS.includes(intentType)) {
      const hasRealAnswer = this._abstractHasRealAnswer(
        abstractLower,
        titleLower,
      );
      if (!hasRealAnswer) {
        console.log(
          `   ❌ No real results in abstract: "${pub.title.substring(0, 60)}"`,
        );
        return { ...pub, _rawScore: 0 };
      }
    }

    // ── Hard filter 5: Minimum abstract length + medical content ─────────
    const MEANINGFUL_ABSTRACT_SIGNALS = [
      "patients",
      "treatment",
      "therapy",
      "clinical",
      "cancer",
      "disease",
      "study",
      "trial",
      "results",
      "outcomes",
      "efficacy",
      "safety",
      "diagnosis",
      "survival",
      "response",
      "analysis",
      "cohort",
      "randomized",
    ];
    if (abstractLower.length < 80) {
      console.log(`   ❌ Abstract too short: "${pub.title.substring(0, 60)}"`);
      return { ...pub, _rawScore: 0 };
    }
    const hasMedicalContent = MEANINGFUL_ABSTRACT_SIGNALS.some((sig) =>
      abstractLower.includes(sig),
    );
    if (!hasMedicalContent) {
      console.log(
        `   ❌ Abstract no medical content: "${pub.title.substring(0, 60)}"`,
      );
      return { ...pub, _rawScore: 0 };
    }

    // ── Hard filter 6: Wrong cancer subtype — REMOVED not penalised ───────
    // ✅ NEW: For lung cancer queries, SCLC papers are not relevant
    // -20 penalty alone is not enough — we need a hard filter
    // SCLC treatment is completely different from NSCLC treatment
    // A paper specifically about SCLC should not appear for NSCLC queries
    if (disease && diseaseLower) {
      const subtypeConfig = this.subtypeExactness[diseaseLower];
      if (subtypeConfig && subtypeConfig.partial.length > 0) {
        const hasWrongSubtypeInTitle = subtypeConfig.partial.some((p) =>
          titleLower.includes(p),
        );
        const hasRightSubtypeAnywhere = subtypeConfig.exact.some(
          (e) => titleLower.includes(e) || abstractLower.includes(e),
        );
        const hasGeneralDiseaseInTitle = titleLower.includes(diseaseLower);

        // Paper is specifically about wrong subtype
        // AND does not mention correct subtype
        // AND does not mention general disease name
        if (
          hasWrongSubtypeInTitle &&
          !hasRightSubtypeAnywhere &&
          !hasGeneralDiseaseInTitle
        ) {
          console.log(
            `   🚫 Wrong subtype hard filter: "${pub.title.substring(0, 60)}"`,
          );
          return { ...pub, _rawScore: 0 };
        }
      }
    }

    // ── Keyword penalty ───────────────────────────────────────────────────
    const negativeAbstract = answerSignals.negativeAbstract || [];
    const disqualifiers = this.intentDisqualifiers[intentType] || [];
    const isKwDisqualified =
      disqualifiers.length > 0 &&
      disqualifiers.some((kw) => titleLower.includes(kw));
    const hasNegAbstract =
      negativeAbstract.length > 0 &&
      negativeAbstract.some((sig) => abstractLower.includes(sig));

    let penaltyPct = 1.0;
    if (isKwDisqualified) penaltyPct = 0.2;
    else if (hasNegAbstract) penaltyPct = 0.6;
    if (isKwDisqualified)
      console.log(`   🚫 KW Disqualified: "${pub.title.substring(0, 60)}"`);

    // ── Paper type classification ─────────────────────────────────────────
    const paperType = this._classifyPaperType(
      titleLower,
      abstractLower,
      intentType,
    );
    if (paperType.isPenalised && !isKwDisqualified) {
      penaltyPct = Math.min(penaltyPct, 0.25);
      console.log(
        `   📄 Wrong type [${paperType.primaryType}] for [${intentType}]: "${pub.title.substring(0, 55)}"`,
      );
    } else if (paperType.isPreferred) {
      console.log(
        `   📄 ✅ Preferred [${paperType.primaryType}]: "${pub.title.substring(0, 55)}"`,
      );
    }

    // ── OpenAlex concept penalty ──────────────────────────────────────────
    const conceptPenalty = this._getConceptPenalty(pub, intentType);
    if (conceptPenalty < 1.0) {
      penaltyPct = Math.min(penaltyPct, conceptPenalty);
    }

    let score = 0;

    // ── Factor 0: Paper type bonus (0–25 pts) ─────────────────────────────
    if (paperType.isPreferred) score += 25;
    else if (!paperType.isPenalised) score += 10;

    // ── Factor 0.5: Evidence hierarchy (0–40 pts) ─────────────────────────
    const evidenceTier = this._getEvidenceTier(titleLower, abstractLower);
    score += evidenceTier.tierScore;
    if (evidenceTier.tier <= 2) {
      console.log(
        `   🏆 Tier ${evidenceTier.tier} [${evidenceTier.tierLabel}] +${evidenceTier.tierScore}pts: ` +
          `"${pub.title.substring(0, 50)}"`,
      );
    }

    // ── Factor 0.55: Retrospective penalty for treatment queries ──────────
    if (intentType === "treatment_solutions" && evidenceTier.tier === 6) {
      score = Math.floor(score * 0.7);
      console.log(
        `   📉 Retrospective penalty ×0.7 for treatment query: "${pub.title.substring(0, 50)}"`,
      );
    }

    // ── Factor 0.6: Clinical endpoint signals (0–30 pts) ──────────────────
    const endpoints = this._countClinicalEndpoints(titleLower, abstractLower);
    score += Math.min(20, endpoints.titleHits * 12);
    score += Math.min(10, endpoints.abstractHits * 2);
    if (endpoints.titleHits >= 1) {
      console.log(
        `   📊 Clinical endpoints (${endpoints.titleHits}): "${pub.title.substring(0, 50)}"`,
      );
    }

    // ── Factor 0.7: Subtype exactness (+20 / -20 pts) ─────────────────────
    const subtypeBonus = this._getSubtypeExactnessBonus(
      titleLower,
      abstractLower,
      diseaseLower,
    );
    score += subtypeBonus;
    if (subtypeBonus !== 0) {
      console.log(
        `   🎯 Subtype ${subtypeBonus > 0 ? "+" : ""}${subtypeBonus}pts: "${pub.title.substring(0, 50)}"`,
      );
    }

    // ── Factor 0.8: Real clinical numbers bonus (+20 pts) ─────────────────
    if (this._hasRealClinicalNumbers(abstractLower)) {
      score += 20;
      console.log(
        `   📈 Real clinical numbers (+20): "${pub.title.substring(0, 50)}"`,
      );
    }

    // ── Factor 1: Positive answer signal bonus (0–30 pts) ─────────────────
    const positiveSignals = answerSignals.positive || [];
    if (positiveSignals.length > 0) {
      const titlePosHits = positiveSignals.filter((sig) =>
        titleLower.includes(sig),
      ).length;
      const abstractPosHits = positiveSignals.filter((sig) =>
        abstractLower.includes(sig),
      ).length;
      score += Math.min(20, titlePosHits * 8);
      score += Math.min(10, abstractPosHits * 2);
      if (titlePosHits >= 2) {
        console.log(
          `   ⭐ Direct answer (${titlePosHits} signals): "${pub.title.substring(0, 60)}"`,
        );
      }
    }

    // ── Factor 2: Solution match (0–50 pts) ───────────────────────────────
    const kwList = Array.isArray(solutionKws) ? solutionKws : [];
    if (kwList.length > 0) {
      const titleMatches = kwList.filter((kw) =>
        titleLower.includes(kw),
      ).length;
      const abstractMatches = kwList.filter((kw) =>
        abstractLower.includes(kw),
      ).length;
      score += Math.min(30, titleMatches * 12);
      score += Math.min(20, abstractMatches * 3);
      if (titleMatches >= 2) {
        score += 15;
        console.log(
          `   ✅ High-intent (${titleMatches} kws): "${pub.title.substring(0, 60)}"`,
        );
      }
      const diseaseInTitle =
        disease &&
        (titleLower.includes(diseaseLower) ||
          diseaseTokens.some((t) => t.length > 3 && titleLower.includes(t)));
      if (titleMatches >= 1 && diseaseInTitle) score += 10;
    }

    // ── Factor 3: Disease relevance (0–45 pts) ────────────────────────────
    if (disease && diseaseTokens.length > 0) {
      if (titleLower.includes(diseaseLower)) {
        score += 45;
      } else {
        score += Math.min(
          30,
          diseaseTokens.filter((t) => t.length > 3 && titleLower.includes(t))
            .length * 10,
        );
      }
      if (abstractLower.includes(diseaseLower)) {
        score += 18;
      } else {
        score += Math.min(
          12,
          diseaseTokens.filter((t) => t.length > 3 && abstractLower.includes(t))
            .length * 4,
        );
      }
    }

    // ── Factor 3.5: Synonym bonus (0–15 pts) ─────────────────────────────
    if (disease) {
      const synonyms = this.diseaseSynonyms[diseaseLower] || [];
      if (synonyms.length > 0) {
        score += Math.min(
          10,
          synonyms.filter((s) =>
            this._synonymMatchValid(titleLower, s, diseaseLower),
          ).length * 5,
        );
        score += Math.min(
          5,
          synonyms.filter((s) =>
            this._synonymMatchValid(abstractLower, s, diseaseLower),
          ).length * 2,
        );
      }
    }

    // ── Factor 4: Query relevance (0–25 pts) ──────────────────────────────
    if (queryTokens.length > 0) {
      score += Math.min(
        18,
        queryTokens.filter((t) => t.length > 3 && titleLower.includes(t))
          .length * 5,
      );
      score += Math.min(
        7,
        queryTokens.filter((t) => t.length > 3 && abstractLower.includes(t))
          .length * 2,
      );
    }

    // ── Factor 4.5: Exact query phrase match (0–30 pts) ───────────────────
    if (queryTokens.length >= 2) {
      const queryPhrase = queryTokens.join(" ");

      if (queryPhrase.length > 5 && titleLower.includes(queryPhrase)) {
        score += 30;
        console.log(
          `   🎯 Exact query phrase in title (+30): "${pub.title.substring(0, 55)}"`,
        );
      } else {
        let bigramMatched = false;
        for (let i = 0; i < queryTokens.length - 1; i++) {
          const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
          if (bigram.length > 6 && titleLower.includes(bigram)) {
            score += 15;
            if (!bigramMatched) {
              console.log(
                `   🎯 Query bigram in title (+15): "${pub.title.substring(0, 55)}"`,
              );
              bigramMatched = true;
            }
            break;
          }
        }

        if (
          !bigramMatched &&
          queryPhrase.length > 5 &&
          abstractLower.includes(queryPhrase)
        ) {
          score += 10;
          console.log(
            `   🎯 Exact query phrase in abstract (+10): "${pub.title.substring(0, 55)}"`,
          );
        }
      }
    }

    // ── Factor 5: Publication type (0–15 pts) ─────────────────────────────
    for (const [type, weight] of Object.entries(this.publicationTypeWeights)) {
      if (combined.includes(type)) {
        score += weight;
        break;
      }
    }

    // ── Factor 6: Recency (0–20 pts) ──────────────────────────────────────
    const age = currentYear - (pub.year || currentYear);
    if (age === 0) score += 20;
    else if (age === 1) score += 18;
    else if (age === 2) score += 15;
    else if (age <= 3) score += 12;
    else if (age <= 5) score += 8;
    else if (age <= 7) score += 0;

    // ── Factor 7: Source credibility (0–15 pts) ───────────────────────────
    if (pub.source === "pubmed") score += 10;
    else if (pub.source === "openalex") score += 7;
    if (this.highImpactJournals.has(journalLower)) score += 5;
    else if ([...this.highImpactJournals].some((j) => journalLower.includes(j)))
      score += 3;

    // ── Factor 8: Citation impact (0–15 pts) ──────────────────────────────
    const citations = pub.citationCount || 0;
    if (citations >= 1000) score += 15;
    else if (citations >= 500) score += 12;
    else if (citations >= 100) score += 9;
    else if (citations >= 50) score += 6;
    else if (citations >= 10) score += 3;
    else if (citations > 0) score += 1;

    // ── Factor 9: Abstract quality (0–5 pts) ──────────────────────────────
    const absLen = abstractLower.length;
    if (absLen > 400) score += 5;
    else if (absLen > 200) score += 3;
    else if (absLen > 80) score += 1;

    // ── Factor 10: Author count (0–3 pts) ─────────────────────────────────
    const ac = pub.authors?.length || 0;
    if (ac >= 5) score += 3;
    else if (ac >= 3) score += 2;
    else if (ac >= 1) score += 1;

    return { ...pub, _rawScore: Math.max(0, Math.floor(score * penaltyPct)) };
  }

  _getSubtypeKeywords(disease) {
    if (!disease) return { primary: [], secondary: [] };
    const dl = disease.toLowerCase();
    for (const [key, val] of Object.entries(this.subtypeMap)) {
      if (dl === key || dl.includes(key) || key.includes(dl)) return val;
    }
    return { primary: [], secondary: [] };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLINICAL TRIAL RANKING
  // ══════════════════════════════════════════════════════════════════════════

  rankClinicalTrials(trials, query, disease, context = {}, intent = null) {
    if (!Array.isArray(trials) || trials.length === 0) return [];

    const queryTokens = this.tokenize(query);
    const diseaseTokens = disease ? this.tokenize(disease) : [];
    const location = context.location || null;
    const intentType = intent?.type || context._intent?.type || "general";
    const currentYear = new Date().getFullYear();
    const trialMaxAge = this.trialMaxAgeForIntent[intentType] ?? 20;

    const taggedTrials = location
      ? trials.map((trial) => this._tagTrialLocation(trial, location))
      : trials.map((trial) => ({
          ...trial,
          isLocal: false,
          matchLevel: null,
          _matchPriority: 0,
        }));

    const relevantTrials = taggedTrials.filter((trial) => {
      const conditionsCombined = (trial.conditions || [])
        .map((c) => c.toLowerCase())
        .join(" ");
      const titleLower = (trial.title || "").toLowerCase();
      const isRelevant = this._trialIsRelevant(
        conditionsCombined,
        titleLower,
        disease,
        diseaseTokens,
      );
      if (!isRelevant)
        console.log(
          `🚫 Pre-filtered: "${(trial.title || "").substring(0, 60)}"`,
        );
      return isRelevant;
    });

    console.log(
      `   🔍 Pre-filter: ${taggedTrials.length} → ${relevantTrials.length} disease-relevant`,
    );
    if (relevantTrials.length === 0) return [];

    const scored = relevantTrials.map((trial) =>
      this._scoreTrial(
        trial,
        queryTokens,
        diseaseTokens,
        disease,
        location,
        context,
        intentType,
      ),
    );

    const maxScore = Math.max(...scored.map((t) => t._rawScore), 1);
    const normalised = scored.map((trial) => ({
      ...trial,
      relevanceScore: parseFloat(
        ((trial._rawScore / maxScore) * 100).toFixed(2),
      ),
      _rawScore: undefined,
      _matchPriority: undefined,
    }));

    const MIN_TRIALS_THRESHOLD = 5;

    const ranked = normalised
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter((trial) => {
        if (
          normalised.filter((t) => t.relevanceScore > 1).length >=
          MIN_TRIALS_THRESHOLD
        ) {
          if (trial.relevanceScore <= 1) return false;
        } else {
          if (trial.relevanceScore <= 0) return false;
        }

        if (trial.status === "COMPLETED" && trial.startDate) {
          const startYear = this._extractYear(trial.startDate);
          if (startYear !== null) {
            const trialAge = currentYear - startYear;
            if (trialAge > trialMaxAge) {
              console.log(
                `   📅 Trial age filtered (${trialAge}yr > max ${trialMaxAge}yr): ` +
                  `"${(trial.title || "").substring(0, 50)}"`,
              );
              return false;
            }
          }
        }

        return true;
      });

    const localCount = ranked.filter((t) => t.isLocal).length;
    console.log(
      `   📊 Trials: ${trials.length} total → ${relevantTrials.length} relevant` +
        ` → ${ranked.length} ranked (${localCount} local to "${location || "N/A"}")`,
    );

    return ranked;
  }

  _tagTrialLocation(trial, userLocation) {
    if (!userLocation || !trial.locations || trial.locations.length === 0) {
      return { ...trial, isLocal: false, matchLevel: null, _matchPriority: 0 };
    }

    const userLocationLower = userLocation.toLowerCase().trim();
    const userParts = userLocationLower
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 1);

    let userCity = null;
    let userCountry = null;

    for (const part of userParts) {
      if (this.cityToCountry[part]) {
        userCity = part;
        userCountry = this.cityToCountry[part];
        continue;
      }
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
      if (userCountry) break;
    }

    let bestMatchLevel = null;
    let bestMatchPriority = 0;

    for (const trialLocation of trial.locations) {
      const trialLower = trialLocation.toLowerCase();

      if (userCity && bestMatchPriority < 3) {
        try {
          if (new RegExp(`\\b${userCity}\\b`).test(trialLower)) {
            bestMatchLevel = userCity;
            bestMatchPriority = 3;
            break;
          }
        } catch {
          if (trialLower.includes(userCity)) {
            bestMatchLevel = userCity;
            bestMatchPriority = 3;
            break;
          }
        }
      }

      if (userCountry && bestMatchPriority < 2) {
        const aliases = this.countryAliases[userCountry] || [userCountry];
        const countryMatch = aliases.some((alias) => {
          try {
            return new RegExp(`\\b${alias}\\b`, "i").test(trialLower);
          } catch {
            return trialLower.includes(alias);
          }
        });
        if (countryMatch) {
          bestMatchLevel = userCountry;
          bestMatchPriority = 2;
        }
      }

      if (bestMatchPriority < 1) {
        for (const part of userParts) {
          if (part.length > 3) {
            try {
              if (new RegExp(`\\b${part}\\b`).test(trialLower)) {
                bestMatchLevel = part;
                bestMatchPriority = 1;
                break;
              }
            } catch {
              if (trialLower.includes(part)) {
                bestMatchLevel = part;
                bestMatchPriority = 1;
                break;
              }
            }
          }
        }
      }
    }

    const isLocal = bestMatchPriority > 0;
    if (isLocal) {
      console.log(
        `📍 Tagged [${bestMatchLevel}] (priority ${bestMatchPriority}): "${(trial.title || "").substring(0, 50)}"`,
      );
    }

    return {
      ...trial,
      isLocal,
      matchLevel: bestMatchLevel,
      _matchPriority: bestMatchPriority,
    };
  }

  reorderTrialLocations(trials, userLocation) {
    if (!userLocation || !Array.isArray(trials)) return trials;

    const userLocationLower = userLocation.toLowerCase().trim();
    const userParts = userLocationLower
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 1);

    let userCountry = null;
    for (const part of userParts) {
      if (this.cityToCountry[part]) {
        userCountry = this.cityToCountry[part];
        break;
      }
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
      if (userCountry) break;
    }

    if (!userCountry) return trials;
    const aliases = this.countryAliases[userCountry] || [userCountry];

    return trials.map((trial) => {
      if (!trial.locations || trial.locations.length <= 1) return trial;

      const localIndex = trial.locations.findIndex((loc) => {
        const locLower = loc.toLowerCase();
        return (
          aliases.some((a) => {
            try {
              return new RegExp(`\\b${a.replace(/[-\s]/g, "[\\s-]")}\\b`).test(
                locLower,
              );
            } catch {
              return locLower.includes(a);
            }
          }) ||
          userParts.some((p) => {
            if (p.length <= 3) return false;
            try {
              return new RegExp(`\\b${p}\\b`).test(locLower);
            } catch {
              return locLower.includes(p);
            }
          })
        );
      });

      if (localIndex > 0) {
        const reordered = [...trial.locations];
        const [localLoc] = reordered.splice(localIndex, 1);
        reordered.unshift(localLoc);
        console.log(
          `📍 Reordered: "${localLoc}" → front of "${(trial.title || "").substring(0, 40)}"`,
        );
        return { ...trial, locations: reordered };
      }

      return trial;
    });
  }

  _scoreTrial(
    trial,
    queryTokens,
    diseaseTokens,
    disease,
    location,
    context,
    intentType,
  ) {
    let score = 0;

    const titleLower = (trial.title || "").toLowerCase();
    const conditionsCombined = (trial.conditions || [])
      .map((c) => c.toLowerCase())
      .join(" ");
    const diseaseLower = disease ? disease.toLowerCase() : "";

    // ── Factor 1: Location scoring ────────────────────────────────────────
    if (location) {
      if (trial.isLocal) {
        const priority = trial._matchPriority || 1;
        if (priority === 3) {
          score += 500;
          console.log(
            `📍 EXACT CITY    (+500): "${titleLower.substring(0, 50)}"`,
          );
        } else if (priority === 2) {
          score += 300;
          console.log(
            `📍 COUNTRY       (+300): "${titleLower.substring(0, 50)}"`,
          );
        } else {
          score += 150;
          console.log(
            `📍 PARTIAL       (+150): "${titleLower.substring(0, 50)}"`,
          );
        }
      } else if (trial.matchSource === "global_fallback") {
        score += 0;
        console.log(
          `🌍 GLOBAL FALLBACK (+0): "${titleLower.substring(0, 50)}"`,
        );
      } else {
        score -= 300;
        console.log(
          `🌍 NON-LOCAL     (-300): "${titleLower.substring(0, 50)}"`,
        );
      }
    }

    // ── Factor 2: Disease match (0–58 pts) ────────────────────────────────
    if (disease && diseaseTokens.length > 0) {
      const synonyms = this.diseaseSynonyms[diseaseLower] || [];

      const exactInConditions =
        conditionsCombined.includes(diseaseLower) ||
        synonyms.some((s) =>
          this._synonymMatchValid(conditionsCombined, s, diseaseLower),
        );

      score += exactInConditions
        ? 40
        : Math.min(
            28,
            diseaseTokens.filter(
              (t) => t.length > 3 && conditionsCombined.includes(t),
            ).length * 9,
          );

      const exactInTitle =
        titleLower.includes(diseaseLower) ||
        synonyms.some((s) =>
          this._synonymMatchValid(titleLower, s, diseaseLower),
        );

      score += exactInTitle
        ? 18
        : Math.min(
            12,
            diseaseTokens.filter((t) => t.length > 3 && titleLower.includes(t))
              .length * 4,
          );
    }

    // ── Factor 2.5: Trial answer type ─────────────────────────────────────
    const trialType = this._classifyTrialType(
      titleLower,
      conditionsCombined,
      intentType,
    );
    if (trialType.isPerfect) {
      score += 30;
      console.log(
        `   🏆 Perfect trial type [${trialType.primaryType}]: "${titleLower.substring(0, 50)}"`,
      );
    } else if (trialType.isPenalised) {
      const penaltyMultiplier =
        intentType === "treatment_solutions" ? 0.2 : 0.4;
      score = Math.floor(score * penaltyMultiplier);
      console.log(
        `   ⚠️  Wrong trial type [${trialType.primaryType}] penalty ×${penaltyMultiplier}: "${titleLower.substring(0, 50)}"`,
      );
    }

    // ── Factor 3: Status ──────────────────────────────────────────────────
    let statusScore = this.trialStatusScores[trial.status] || 5;
    if (
      trial.status === "COMPLETED" &&
      (intentType === "recent_research" || intentType === "treatment_solutions")
    ) {
      statusScore += 30;
    }
    score += statusScore;

    // ── Factor 4: Phase ───────────────────────────────────────────────────
    score +=
      this.trialPhaseScores[
        (trial.phase || "N/A").toUpperCase().replace(/\s+/g, "")
      ] || 5;

    // ── Factor 5: Query relevance ─────────────────────────────────────────
    if (queryTokens.length > 0) {
      score += Math.min(
        20,
        queryTokens.filter(
          (t) =>
            t.length > 3 &&
            (titleLower.includes(t) || conditionsCombined.includes(t)),
        ).length * 5,
      );
    }

    // ── Factor 6: Enrollment ──────────────────────────────────────────────
    const enrollment = trial.enrollmentCount || 0;
    if (enrollment >= 10000) score += 12;
    else if (enrollment >= 1000) score += 10;
    else if (enrollment >= 500) score += 8;
    else if (enrollment >= 100) score += 6;
    else if (enrollment >= 50) score += 4;
    else if (enrollment > 0) score += 2;

    // ── Factor 7: Contact ─────────────────────────────────────────────────
    if (trial.contact?.email && trial.contact?.phone) score += 8;
    else if (trial.contact?.email || trial.contact?.phone) score += 5;

    // ── Factor 8: Interventions ───────────────────────────────────────────
    if (trial.interventions?.length > 0)
      score += Math.min(5, trial.interventions.length * 2);

    // ── Factor 9: Multi-site ──────────────────────────────────────────────
    const lc = trial.locations?.length || 0;
    if (lc >= 10) score += 8;
    else if (lc >= 5) score += 6;
    else if (lc >= 2) score += 3;
    else if (lc >= 1) score += 1;

    // ── Factor 10: Recency ────────────────────────────────────────────────
    if (trial.startDate) {
      const startYear = this._extractYear(trial.startDate);
      if (startYear !== null) {
        const age = new Date().getFullYear() - startYear;
        if (age <= 1) score += 10;
        else if (age <= 2) score += 8;
        else if (age <= 3) score += 6;
        else if (age <= 5) score += 4;
        else score += 1;
      }
    }

    return { ...trial, _rawScore: Math.max(0, score) };
  }

  calculateLocationScore(trial, userLocation) {
    if (!userLocation || !trial.locations?.length) return 0;
    const tagged = this._tagTrialLocation(trial, userLocation);
    if (!tagged.isLocal) return 0;
    return { 3: 40, 2: 25, 1: 15 }[tagged._matchPriority] || 0;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DIVERSIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  diversifyResults(rankedItems, topK = 8, similarityThreshold = 0.8) {
    const selected = [];
    const rejectedIds = new Set();

    for (const item of rankedItems) {
      if (selected.length >= topK) break;
      let tooSimilar = false;
      for (const sel of selected) {
        const sim = this.calculateTitleSimilarity(
          (item.title || "").toLowerCase(),
          (sel.title || "").toLowerCase(),
        );
        if (sim > similarityThreshold) {
          tooSimilar = true;
          rejectedIds.add(item.id ?? item.nctId);
          break;
        }
      }
      if (!tooSimilar) selected.push(item);
    }

    if (selected.length < topK) {
      const selectedIds = new Set(selected.map((s) => s.id ?? s.nctId));

      const tier1 = rankedItems.filter(
        (item) =>
          !selectedIds.has(item.id ?? item.nctId) &&
          !rejectedIds.has(item.id ?? item.nctId) &&
          (item.relevanceScore || 0) > 20,
      );

      const tier2 = rankedItems.filter(
        (item) =>
          !selectedIds.has(item.id ?? item.nctId) &&
          !rejectedIds.has(item.id ?? item.nctId) &&
          item.matchSource === "global_fallback" &&
          (item.relevanceScore || 0) > 10,
      );

      const backfillIds = new Set();
      const backfillPool = [];
      for (const item of [...tier1, ...tier2]) {
        const id = item.id ?? item.nctId;
        if (!backfillIds.has(id)) {
          backfillIds.add(id);
          backfillPool.push(item);
        }
      }

      selected.push(...backfillPool.slice(0, topK - selected.length));
    }

    return selected;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ══════════════════════════════════════════════════════════════════════════

  calculateTitleSimilarity(title1, title2) {
    if (!title1 || !title2) return 0;
    const tokens1 = new Set(title1.split(/\s+/).filter((t) => t.length > 2));
    const tokens2 = new Set(title2.split(/\s+/).filter((t) => t.length > 2));
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    const intersection = [...tokens1].filter((t) => tokens2.has(t)).length;
    const union = new Set([...tokens1, ...tokens2]).size;
    return intersection / union;
  }

  tokenize(text) {
    if (!text || typeof text !== "string") return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !this.isStopWord(token));
  }

  isStopWord(word) {
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
    ]);
    return stopWords.has(word);
  }

  explainRanking(item, query, disease, location) {
    return {
      id: item.id || item.nctId,
      title: (item.title || "").substring(0, 80),
      finalScore: item.relevanceScore,
      isLocal: item.isLocal || false,
      matchLevel: item.matchLevel || "Global",
      factors: {
        relevanceScore: item.relevanceScore,
        status: item.status,
        phase: item.phase,
      },
    };
  }
}

export default new RankingService();
