import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import hybridSearchService from "../services/research/hybridSearchService.js";
import llmService from "../services/ai/llmService.js";
import contextManager from "../services/context/contextManager.js";


// SANITIZATION HELPERS


const sanitizeString = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) => sanitizeString(v)).join(". ");
  if (typeof val === "object") {
    return Object.values(val)
      .filter((v) => typeof v === "string")
      .join(" - ");
  }
  return String(val);
};

const sanitizeStringArray = (arr) => {
  if (!arr) return [];
  if (!Array.isArray(arr)) return [sanitizeString(arr)].filter(Boolean);
  return arr
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null) {
        const parts = [];
        Object.entries(item).forEach(([, val]) => {
          if (typeof val === "string") parts.push(val);
        });
        return parts.join(": ") || JSON.stringify(item);
      }
      return String(item);
    })
    .filter(Boolean);
};

const normalizeScores = (items, maxScore = 100) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    relevanceScore: item.relevanceScore
      ? Math.min(item.relevanceScore / maxScore, 1)
      : 0,
    finalScore: undefined,
    scoreBreakdown: undefined,
    isLocal: undefined,
    matchLevel: undefined,
    _matchPriority: undefined,
  }));
};

// ── Remove LLM placeholder text
const PLACEHOLDER_PATTERNS = [
  "specific finding",
  "drug/treatment name",
  "recommendation 1",
  "recommendation 2",
  "safety consideration from research",
  "evidence-based recommendation",
  "another specific",
  "third finding",
  "finding from research",
  "outcome [1]",
  "statistics [2]",
  "specific numbers",
  "finding with citation",
];

const removePlaceholders = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => {
    if (typeof item !== "string") return true;
    const lower = item.toLowerCase();
    return !PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
  });
};

// ── Remove cross-disease contamination 
const DISEASE_KEYWORDS = {
  diabetes: [
    "hba1c",
    "pioglitazone",
    "metformin",
    "glp-1",
    "sglt2",
    "semaglutide",
    "dapagliflozin",
    "empagliflozin",
    "orforglipron",
    "tirzepatide",
    "degludec",
    "glycemic control",
    "blood glucose",
    "hyperglycemia",
    "hypoglycemia",
    "insulin resistance",
  ],
  "lung cancer": [
    "pembrolizumab",
    "osimertinib",
    "egfr mutation",
    "nivolumab",
    "atezolizumab",
    "checkpoint inhibitor",
    "pd-l1 expression",
    "erlotinib",
    "alectinib",
    "brigatinib",
  ],
  "heart disease": [
    "statin therapy",
    "myocardial infarction",
    "coronary artery bypass",
    "atrial fibrillation",
    "angina pectoris",
    "lvef",
    "ejection fraction",
  ],
  "breast cancer": [
    "tamoxifen",
    "trastuzumab",
    "herceptin",
    "her2 positive",
    "mastectomy",
    "aromatase inhibitor",
    "letrozole",
  ],
  "alzheimer's disease": [
    "amyloid beta plaque",
    "tau tangle",
    "lecanemab",
    "donanemab",
    "aducanumab",
  ],
  "parkinson's disease": [
    "levodopa",
    "carbidopa",
    "dopamine agonist treatment",
    "deep brain stimulation for parkinson",
  ],
};

const removeCrossDisease = (findings, targetDisease) => {
  if (!Array.isArray(findings) || !targetDisease) return findings;

  const targetLower = targetDisease.toLowerCase();
  const foreignKeywords = [];

  for (const [disease, keywords] of Object.entries(DISEASE_KEYWORDS)) {
    const isTarget =
      targetLower === disease ||
      targetLower.includes(disease) ||
      disease.includes(targetLower.split(" ")[0].toLowerCase());
    if (!isTarget) foreignKeywords.push(...keywords);
  }

  if (foreignKeywords.length === 0) return findings;

  return findings.filter((finding) => {
    if (typeof finding !== "string") return true;
    const lower = finding.toLowerCase();
    const contaminated = foreignKeywords.some((kw) => lower.includes(kw));
    if (contaminated) {
      console.log(
        `🚫 Contaminated finding removed: "${finding.substring(0, 60)}"`,
      );
    }
    return !contaminated;
  });
};

// ── Build source snippets from publications (fallback) ────────────────────────
const buildSourceSnippets = (publications = []) =>
  publications.slice(0, 5).map((pub) => ({
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


// DISEASE LIST


const DISEASE_LIST = [
  // Specific cancers first
  {
    name: "Lung Cancer",
    patterns: [
      "lung cancer",
      "nsclc",
      "sclc",
      "pulmonary carcinoma",
      "non-small cell",
      "small cell lung",
    ],
  },
  { name: "Breast Cancer", patterns: ["breast cancer"] },
  {
    name: "Colorectal Cancer",
    patterns: ["colorectal cancer", "colon cancer", "rectal cancer"],
  },
  { name: "Prostate Cancer", patterns: ["prostate cancer"] },
  { name: "Leukemia", patterns: ["leukemia", "leukaemia"] },
  { name: "Lymphoma", patterns: ["lymphoma", "hodgkin", "non-hodgkin"] },
  {
    name: "Pancreatic Cancer",
    patterns: ["pancreatic cancer", "pancreatic carcinoma"],
  },
  { name: "Ovarian Cancer", patterns: ["ovarian cancer", "ovarian carcinoma"] },
  { name: "Bladder Cancer", patterns: ["bladder cancer"] },
  {
    name: "Liver Cancer",
    patterns: ["liver cancer", "hepatocellular carcinoma", "hcc"],
  },
  { name: "Stomach Cancer", patterns: ["stomach cancer", "gastric cancer"] },
  { name: "Melanoma", patterns: ["melanoma", "skin cancer"] },
  // General cancer (after specific)
  {
    name: "Cancer",
    patterns: ["cancer", "tumor", "malignancy", "oncology", "carcinoma"],
  },
  // Specific diabetes first
  {
    name: "Type 2 Diabetes",
    patterns: ["type 2 diabetes", "type ii diabetes", "t2dm"],
  },
  {
    name: "Type 1 Diabetes",
    patterns: ["type 1 diabetes", "type i diabetes", "t1dm"],
  },
  { name: "Diabetes", patterns: ["diabetes", "diabetic"] },
  // Cardiovascular
  {
    name: "Heart Disease",
    patterns: [
      "heart disease",
      "heart attack",
      "coronary artery",
      "cardiac arrest",
      "coronary heart",
    ],
  },
  { name: "Heart Failure", patterns: ["heart failure", "cardiac failure"] },
  { name: "Hypertension", patterns: ["hypertension", "high blood pressure"] },
  {
    name: "Stroke",
    patterns: ["stroke", "brain attack", "cerebral infarction"],
  },
  {
    name: "Atrial Fibrillation",
    patterns: ["atrial fibrillation", "afib", "a-fib"],
  },
  {
    name: "Cardiovascular Disease",
    patterns: ["cardiovascular", "cardiac disease", "heart condition"],
  },
  // Neurological — procedures that imply disease included here
  {
    name: "Parkinson's Disease",
    patterns: [
      "parkinson",
      "parkinsons",
      "perkinson",
      "parkinsons disease",
    "parkinson disease",
      "deep brain stimulation",
      "dbs",
      "subthalamic nucleus",
      "levodopa therapy",
    ],
  },
  { name: "Alzheimer's Disease", patterns: ["alzheimer", "alzheimers"] },
  {
    name: "Multiple Sclerosis",
    patterns: ["multiple sclerosis", "ms disease"],
  },
  { name: "Epilepsy", patterns: ["epilepsy", "seizure disorder"] },
  { name: "Migraine", patterns: ["migraine", "cluster headache"] },
  {
    name: "Neurological Disease",
    patterns: ["neurological", "neurodegenerative"],
  },
  // Respiratory
  { name: "Asthma", patterns: ["asthma", "asthmatic"] },
  {
    name: "COPD",
    patterns: ["copd", "emphysema", "chronic obstructive pulmonary"],
  },
  // Infectious
  {
    name: "COVID-19",
    patterns: ["covid", "coronavirus", "covid-19", "sars-cov-2"],
  },
  { name: "HIV/AIDS", patterns: ["hiv", "aids", "human immunodeficiency"] },
  { name: "Hepatitis", patterns: ["hepatitis b", "hepatitis c"] },
  {
    name: "Tuberculosis",
    patterns: ["tuberculosis", "tb disease", "mycobacterium tuberculosis"],
  },
  {
    name: "Infectious Disease",
    patterns: ["infectious disease", "bacterial infection", "viral infection"],
  },
  // Mental health
  {
    name: "Depression",
    patterns: ["depression", "depressive disorder", "major depressive"],
  },
  {
    name: "Anxiety",
    patterns: ["anxiety disorder", "generalized anxiety", "panic disorder"],
  },
  { name: "Schizophrenia", patterns: ["schizophrenia"] },
  {
    name: "Bipolar Disorder",
    patterns: ["bipolar disorder", "manic depression"],
  },
  {
    name: "ADHD",
    patterns: ["adhd", "attention deficit", "hyperactivity disorder"],
  },
  { name: "Autism", patterns: ["autism", "autism spectrum", "asd"] },
  { name: "PTSD", patterns: ["ptsd", "post-traumatic stress"] },
  // Musculoskeletal
  { name: "Rheumatoid Arthritis", patterns: ["rheumatoid arthritis"] },
  { name: "Arthritis", patterns: ["arthritis", "osteoarthritis"] },
  {
    name: "Osteoporosis",
    patterns: ["osteoporosis", "bone density", "bone loss"],
  },
  {
    name: "Chronic Pain",
    patterns: ["chronic pain", "fibromyalgia", "neuropathic pain"],
  },
  // Other
  { name: "Obesity", patterns: ["obesity", "obese", "overweight treatment"] },
  {
    name: "Kidney Disease",
    patterns: ["kidney disease", "renal disease", "chronic kidney"],
  },
  {
    name: "Liver Disease",
    patterns: ["liver disease", "liver failure", "cirrhosis"],
  },
  { name: "Thyroid Disease", patterns: ["hypothyroidism", "hyperthyroidism"] },
  { name: "Psoriasis", patterns: ["psoriasis"] },
  { name: "Lupus", patterns: ["lupus", "systemic lupus"] },
  { name: "Crohn's Disease", patterns: ["crohn", "inflammatory bowel"] },
  {
    name: "Sleep Disorders",
    patterns: ["insomnia", "sleep apnea", "narcolepsy"],
  },
  { name: "Autoimmune Disease", patterns: ["autoimmune", "immune disorder"] },
  {
    name: "Gene Therapy",
    patterns: ["gene therapy", "crispr", "gene editing"],
  },
];


// KNOWN DRUGS


const KNOWN_DRUGS = new Set([
  // Oncology
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
  "benmelstobart",
  "anlotinib",
  "sigvotatug",
  // Diabetes
  "metformin",
  "semaglutide",
  "empagliflozin",
  "dapagliflozin",
  "tirzepatide",
  "liraglutide",
  "sitagliptin",
  "canagliflozin",
  "glipizide",
  "pioglitazone",
  "insulin",
  "degludec",
  // Neurology
  "lecanemab",
  "donanemab",
  "aducanumab",
  "levodopa",
  "carbidopa",
  "rasagiline",
  "selegiline",
  "pramipexole",
  "donepezil",
  "memantine",
  "rivastigmine",
  // Cardiology
  "atorvastatin",
  "rosuvastatin",
  "aspirin",
  "warfarin",
  "apixaban",
  "rivaroxaban",
  "dabigatran",
  "clopidogrel",
  "metoprolol",
  "carvedilol",
  "lisinopril",
  "sacubitril",
  // Immunology / Rheumatology
  "adalimumab",
  "etanercept",
  "infliximab",
  "tocilizumab",
  "baricitinib",
  "tofacitinib",
  "upadacitinib",
  // Respiratory
  "dupilumab",
  "mepolizumab",
  "benralizumab",
  "omalizumab",
  // Infectious
  "remdesivir",
  "nirmatrelvir",
  "molnupiravir",
  "dolutegravir",
  // Gene / Cell therapy
  "crispr",
  "cas9",
]);

const extractDrugFromQuery = (query) => {
  if (!query || typeof query !== "string") return null;
  const lower = query.toLowerCase();
  for (const drug of KNOWN_DRUGS) {
    if (lower.includes(drug)) return drug;
  }
  return null;
};


// QUERY TYPE HELPERS


/**
 * Detects if the query is completely off-topic (not medical).
 */
const isOffTopicQuery = (query) => {
  if (!query || typeof query !== "string") return false;
  const lower = query.toLowerCase().trim();

  // ── Greetings and very short non-medical messages
  const GREETING_PATTERNS = [
    "hi",
    "hello",
    "hey",
    "hii",
    "hiii",
    "helo",
    "good morning",
    "good evening",
    "good afternoon",
    "good night",
    "whats up",
    "what's up",
    "wassup",
    "sup",
    "namaste",
    "namaskar",
    "thanks",
    "thank you",
    "thank u",
    "thx",
    "bye",
    "goodbye",
    "good bye",
    "see you",
    "see ya",
    "ok",
    "okay",
    "k",
    "cool",
    "nice",
    "great",
    "awesome",
    "hmm",
    "hmmm",
    "um",
    "umm",
    "ah",
    "oh",
    "lol",
    "haha",
    "hehe",
    "lmao",
  ];

  // ✅ Exact match for single-word/short greetings
  // Handles: "hi", "hello", "hey", "thanks", "ok"
  const tokens = lower.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length <= 2) {
    const isGreeting = GREETING_PATTERNS.some(
      (g) =>
        lower === g || lower.startsWith(g + " ") || lower.endsWith(" " + g),
    );
    if (isGreeting) return true;
  }

  // ── Hard off-topic signals ────────────────────────────────────────────
  const OFF_TOPIC_PATTERNS = [
    // Entertainment
    "great movie",
    "best movie",
    "good movie",
    "nice movie",
    "great film",
    "best film",
    "love this movie",
    "watch this",
    "great show",
    "best show",
    "great series",
    "binge watch",
    "great song",
    "best song",
    "great album",
    "great actor",
    "great actress",
    "great director",
    // Sports
    "great match",
    "best match",
    "great game",
    "best game",
    "great player",
    "best player",
    "great team",
    "best team",
    "great goal",
    "won the match",
    "lost the match",
    "cricket",
    "football match",
    "ipl",
    "fifa",
    "olympics",
    // Politics / finance
    "great politician",
    "great leader",
    "election result",
    "stock market",
    "cryptocurrency",
    "bitcoin price",
    // Random
    "great weather",
    "nice weather",
    "rainy today",
    "great restaurant",
    "best restaurant",
    "great food",
    "great recipe",
    "best recipe",
    // Meta questions about the bot
    "how are you",
    "what is your name",
    "who are you",
    "tell me a joke",
    "tell me something funny",
    "what can you do",
    "are you a bot",
    "are you ai",
  ];

  if (OFF_TOPIC_PATTERNS.some((p) => lower.includes(p))) return true;

  // ── "X is a great Y" pattern with no medical context ──────────────────
  const isGreatPattern =
    /\bis (a |an )?(great|best|good|nice|awesome|amazing|fantastic)\b/.test(
      lower,
    );

  const MEDICAL_SIGNALS = [
    "disease",
    "cancer",
    "diabetes",
    "treatment",
    "therapy",
    "drug",
    "medicine",
    "symptom",
    "diagnosis",
    "clinical",
    "health",
    "patient",
    "doctor",
    "hospital",
    "pain",
    "surgery",
    "vaccine",
    "virus",
    "bacteria",
    "infection",
    "vitamin",
    "supplement",
    "exercise",
    "sleep",
    "diet",
    "blood",
    "heart",
    "lung",
    "brain",
    "kidney",
    "liver",
  ];

  const hasMedicalSignal = MEDICAL_SIGNALS.some((m) => lower.includes(m));

  if (isGreatPattern && !hasMedicalSignal) return true;

  // ── Very short messages with no medical terms 
  // Catches: "hi there", "hello world", "yo", "hey buddy", etc.
  if (tokens.length <= 3 && !hasMedicalSignal) {
    // Check if ANY token is a medical-adjacent word
    const MEDICAL_TOKENS = [
      "cancer",
      "diabetes",
      "treatment",
      "therapy",
      "drug",
      "medicine",
      "symptom",
      "trial",
      "clinical",
      "vitamin",
      "disease",
      "parkinson",
      "alzheimer",
      "heart",
      "lung",
      "brain",
      "surgery",
      "immunotherapy",
      "chemotherapy",
    ];
    const hasMedicalToken = tokens.some((t) => MEDICAL_TOKENS.includes(t));
    if (!hasMedicalToken) return true;
  }

  return false;
};

/**
 * Returns true if the query requires a disease context to produce
 * meaningful results — e.g. "clinical trials near me" with no disease.
 */
const requiresDiseaseContext = (query) => {
  if (!query || typeof query !== "string") return false;
  const lower = query.toLowerCase();

  const DISEASE_REQUIRED_PATTERNS = [
    // Trial queries
    "clinical trial",
    "trial near",
    "trial for",
    "trials near",
    "trials for",
    "recruiting trial",
    "ongoing trial",
    "join a trial",
    "enroll",
    "participate in trial",
    // Location-based without disease
    "near me",
    "near my location",
    "in my city",
    "in my area",
    "locally available",
    "available near",
    // Generic action queries
    "can i take",
    "can i use",        // ✅ ADD THIS
    "can i eat",        // ✅ ADD THIS
    "can i drink",      // ✅ ADD THIS
    "can i have",       // ✅ ADD THIS
    "should i take",
    "should i use",     // ✅ ADD THIS
    "should i eat",     // ✅ ADD THIS
    "should i avoid",
    "is it safe",
    "is it okay",       // ✅ ADD THIS
    "is it good",       // ✅ ADD THIS
    "is it bad",        // ✅ ADD THIS
    "safe to take",     // ✅ ADD THIS
    "safe to use",      // ✅ ADD THIS
    "latest treatment",
    "new treatment",
    "best treatment",
    "treatment option",
    "therapy for",
    "medication for",
    "recent studies",
    "latest research",
    "new findings",
    "recent research",
    "latest study",
  ];

  return DISEASE_REQUIRED_PATTERNS.some((p) => lower.includes(p));
};

const COMPARISON_PHRASES = [
  "compared to",
  "versus",
  " vs ",
  "unlike",
  "instead of",
  "rather than",
  "in contrast to",
  "as opposed to",
  "better than",
  "worse than",
  "difference between",
];

const isComparisonQuery = (query) => {
  if (!query || typeof query !== "string") return false;
  return COMPARISON_PHRASES.some((p) => query.toLowerCase().includes(p));
};

const detectNewDisease = (message, currentDisease) => {
  if (!message || typeof message !== "string") return null;
  const messageLower = message.toLowerCase();

  for (const disease of DISEASE_LIST) {
    const found = disease.patterns.some((pattern) =>
      messageLower.includes(pattern),
    );
    if (!found) continue;

    if (!currentDisease) return disease.name;

    const curr = currentDisease.toLowerCase();
    const det = disease.name.toLowerCase();

    if (curr === det) return null;
    if (curr.includes(det) || det.includes(curr.split(" ")[0])) return null;

    console.log(`🆕 New disease detected: "${disease.name}"`);
    return disease.name;
  }
  return null;
};

/**
 * Word-boundary safe lifestyle/supplement detector.
 * Prevents "treatments" matching "eat", "safety" matching "fat", etc.
 */
const isLifestyleQuery = (query) => {
  if (!query || typeof query !== "string") return false;
  const lower = query.toLowerCase();

  const SUBSTRING_TERMS = [
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
    "natural remedy",
    "fish oil",
    "cod liver",
    "coenzyme",
    "coq10",
    "turmeric",
    "curcumin",
    "ashwagandha",
    "melatonin",
    "collagen",
    "spicy",
    "alcohol",
    "coffee",
    "fruit",
    "vegetable",
    "carbohydrate",
    "calorie",
    "nutrition",
    "nutritional",
    "fasting",
    "intermittent",
    "exercise",
    "yoga",
    "meditation",
    "stress",
    "smoking",
    "vaping",
    "obesity",
    "bmi",
    "can i take",
    "can i eat",
    "can i drink",
    "can i have",
    "should i take",
    "can i smoke",
    "can i use",
    "should i eat",
    "should i avoid",
    "is it safe",
    "is it okay",
    "is it good",
    "is it bad",
    "is it harmful",
    "safe to eat",
    "safe to drink",
    "avoid eating",
    "avoid drinking",
  ];

  if (SUBSTRING_TERMS.some((term) => lower.includes(term))) return true;

  // Short terms require word-boundary to avoid false positives
  const WORD_BOUNDARY_TERMS = [
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

  return WORD_BOUNDARY_TERMS.some((term) => {
    try {
      return new RegExp(`\\b${term}\\b`).test(lower);
    } catch {
      return false;
    }
  });
};

// Backward-compatible alias
const isSupplementQuery = isLifestyleQuery;

const hasAmbiguousReferent = (query) => {
  if (!query || typeof query !== "string") return false;
  const lower = query.toLowerCase();
  const REFERENTS = [
    "which one",
    "that drug",
    "the first",
    "the second",
    "the third",
    "that trial",
    "this treatment",
    "those results",
    "the one ",
    "the same",
    "mentioned above",
    "you mentioned",
    "listed above",
    "that one",
    "this one",
    "it work",
    "does it",
    "is it ",
    "tell me more",
    "more about",
    "elaborate",
    "explain more",
    "what about it",
    "how about it",
    "go on",
    "continue",
    "and then",
    "what else",
    "anything else",
    "more detail",
    "the drug",
    "the treatment",
    "the therapy",
    "the trial",
    "the study",
    "the research",
    "the finding",
    "that finding",
    "those drugs",
    "these treatments",
    "the above",
    "the one you",
    "the ones you",
  ];
  return REFERENTS.some((r) => lower.includes(r));
};

const isVagueQuery = (query) => {
  if (!query || typeof query !== "string") return false;
  const lower = query.toLowerCase().trim();
  const tokens = lower.split(/\s+/).filter((t) => t.length > 2);

  const SPECIFIC_MEDICAL_TERMS = [
    "deep brain stimulation",
    "dbs",
    "chemotherapy",
    "immunotherapy",
    "radiotherapy",
    "radiation therapy",
    "dialysis",
    "hemodialysis",
    "angioplasty",
    "bypass surgery",
    "pacemaker",
    "transplant",
    "biopsy",
    "endoscopy",
    "colonoscopy",
    "mri",
    "ct scan",
    "pet scan",
    "stem cell",
    "bone marrow",
    "gene therapy",
    "crispr",
    "insulin pump",
    "glucose monitor",
  ];

  if (SPECIFIC_MEDICAL_TERMS.some((term) => lower.includes(term))) return false;
  if (tokens.length <= 2) return true;

  const VAGUE_PATTERNS = [
    "tell me more",
    "more info",
    "what else",
    "go on",
    "elaborate",
    "details please",
    "really?",
    "interesting",
    "wow",
    "ok so",
    "i see",
    "and?",
    "so what",
    "then what",
    "keep going",
    "continue please",
    "what next",
  ];
  return VAGUE_PATTERNS.some((p) => lower.includes(p));
};

const isProcedureQuery = (query) => {
  if (!query || typeof query !== "string") return false;
  const lower = query.toLowerCase();
  const PROCEDURES = [
    "deep brain stimulation",
    "chemotherapy",
    "radiotherapy",
    "immunotherapy",
    "dialysis",
    "angioplasty",
    "transplant",
    "surgery",
    "ablation",
    "stimulation",
  ];
  return PROCEDURES.some((p) => lower.includes(p));
};

const extractResponseEntities = (structuredResponse) => {
  if (!structuredResponse) return [];

  const findings = Array.isArray(structuredResponse.keyFindings)
    ? structuredResponse.keyFindings
    : [];
  const overview = structuredResponse.conditionOverview || "";
  const insights = structuredResponse.researchInsights || "";
  const allText = [overview, insights, ...findings].join(" ").toLowerCase();

  const entities = [];
  for (const drug of KNOWN_DRUGS) {
    if (allText.includes(drug.toLowerCase())) entities.push(drug);
  }
  return [...new Set(entities)].slice(0, 10);
};


// SHARED HELPER: save system message + update metadata + respond


const sendSystemMessage = async ({
  res,
  conversation,
  userMessage,
  messageData,
  startTime,
  effectiveLocation,
}) => {
  const processingTime = Date.now() - startTime;

  const assistantMessage = await Message.create({
    conversationId: conversation._id,
    role: "assistant",
    content: messageData.content,
    metadata: {
      ...messageData.metadata,
      processingTime,
      tokensUsed: 0,
      searchStrategy: "none",
    },
  });

  try {
    await conversation.updateMetadata({
      messageCount: (conversation.metadata?.messageCount || 0) + 2,
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
  } catch (metaError) {
    console.error("Metadata update (non-fatal):", metaError.message);
  }

  return res.status(201).json({
    success: true,
    data: { userMessage, assistantMessage, processingTime },
    meta: {
      hasLocation: !!effectiveLocation,
      locationSource: null,
      effectiveLocation: effectiveLocation || null,
      locationPrompt: null,
      usingProfileLocation: false,
      ...(messageData.metaExtra || {}),
    },
  });
};

// ============================================================
// CREATE CONVERSATION
// ============================================================

export const createConversation = async (req, res, next) => {
  try {
    const { title, disease, location } = req.body;

    console.log("\n📝 Creating conversation");
    console.log(
      `   Title: "${title}", Disease: "${disease || "none"}", Location: "${location || "none"}"`,
    );

    const conversation = await Conversation.create({
      userId: req.user.id,
      title: title || "New Conversation",
      context: {
        disease: disease || null,
        location: location || null,
        entities: {
          diseases: disease ? [disease] : [],
          treatments: [],
          symptoms: [],
          medications: [],
          procedures: [],
        },
        previousQueries: [],
        responseEntities: [],
      },
    });

    console.log(`✅ Conversation created: ${conversation._id}`);
    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error("❌ Create conversation error:", error);
    next(error);
  }
};


// GET CONVERSATIONS (list)


export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      userId: req.user.id,
      isActive: true,
    })
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .select("title lastMessageAt metadata context.disease context.location")
      .limit(50);

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    console.error("❌ Get conversations error:", error);
    next(error);
  }
};


// GET SINGLE CONVERSATION + MESSAGES


export const getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(100);

    res.status(200).json({ success: true, data: { conversation, messages } });
  } catch (error) {
    console.error("❌ Get conversation error:", error);
    next(error);
  }
};


// SEND MESSAGE — MAIN LOGIC


export const sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const conversationId = req.params.id;
    const startTime = Date.now();

    // ── 0. Validate input 
    if (!content || typeof content !== "string" || !content.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message content is required" });
    }

    const trimmedContent = content.trim();

    console.log("\n" + "=".repeat(60));
    console.log("💬 NEW MESSAGE");
    console.log("=".repeat(60));
    console.log(`Query: "${trimmedContent}"`);

    // ── 1. Validate conversation ───────────────────────────────────────────
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.id,
    });
    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    // ── 2. Get user profile ────────────────────────────────────────────────
    const userProfile = await User.findById(req.user.id).select(
      "name diseaseOfInterest location medicalHistory",
    );
    if (!userProfile) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ── 3. Save user message immediately ──────────────────────────────────
    const userMessage = await Message.create({
      conversationId,
      role: "user",
      content: trimmedContent,
    });

    if ((conversation.metadata?.messageCount || 0) === 0) {
      try {
        await conversation.generateTitle(trimmedContent);
      } catch (titleError) {
        console.error("Title generation (non-fatal):", titleError.message);
      }
    }

    // ── 4. Classify query type ─────────────────────────────────────────────
    const isSupplement = isLifestyleQuery(trimmedContent);
    const isLifestyle = isSupplement;
    const hasReferent = hasAmbiguousReferent(trimmedContent);
    const isComparison = isComparisonQuery(trimmedContent);
    const isVague = isVagueQuery(trimmedContent);
    const drugMention = extractDrugFromQuery(trimmedContent);
    const isProcedure = isProcedureQuery(trimmedContent);
    const isOffTopic = isOffTopicQuery(trimmedContent);

    console.log(`\n🔎 Query classification:`);
    console.log(`   Supplement/Lifestyle: ${isSupplement}`);
    console.log(`   Referent:             ${hasReferent}`);
    console.log(`   Comparison:           ${isComparison}`);
    console.log(`   Vague:                ${isVague}`);
    console.log(`   Drug:                 ${drugMention || "none"}`);
    console.log(`   Procedure:            ${isProcedure}`);
    console.log(`   Off-topic:            ${isOffTopic}`);

    // ── ✅ OFF-TOPIC GUARD 
    if (isOffTopic) {
      console.log("🚫 Off-topic query detected — returning polite redirect");

      const earlyDisease =
        conversation.context?.disease || userProfile?.diseaseOfInterest || null;
      const earlyLocation =
        conversation.context?.location || userProfile?.location || null;

      return sendSystemMessage({
        res,
        conversation,
        userMessage,
        startTime,
        effectiveLocation: earlyLocation,
        messageData: {
          content: `I'm Curalink, a medical research assistant. I can only help with medical and health-related questions.${earlyDisease ? ` I'm currently helping you with information about ${earlyDisease}.` : ""} Please ask me something related to your health or medical research.`,
          metadata: {
            disease: earlyDisease,
            intent: "off_topic",
            location: earlyLocation,
            publications: [],
            clinicalTrials: [],
            structuredResponse: {
              conditionOverview: earlyDisease
                ? `I can help you with research about ${earlyDisease}. Please ask a medical question.`
                : "I can help you with medical research. Please ask a health-related question.",
              keyFindings: [],
              researchInsights:
                "This message does not appear to be a medical question. Please ask about a disease, treatment, clinical trial, or health topic.",
              clinicalTrialsSummary: "",
              recommendations: [
                "Please ask a medical or health-related question to get research-backed answers.",
              ],
              safetyConsiderations: [],
              sourceSnippets: [],
              references: { publicationCount: 0, trialCount: 0 },
            },
            queryExpansion: trimmedContent,
            originalQuery: trimmedContent,
            modelUsed: "off_topic_guard",
          },
        },
      });
    }

    // ── 5. Detect disease + topic switch
    const currentDisease = conversation.context?.disease || null;
    const newDiseaseDetected = detectNewDisease(trimmedContent, currentDisease);
    let isTopicSwitch = false;

    console.log(`\n🔍 Current disease:  "${currentDisease || "none"}"`);
    console.log(`🔍 Detected disease: "${newDiseaseDetected || "none"}"`);

    if (
      newDiseaseDetected &&
      currentDisease &&
      newDiseaseDetected.toLowerCase() !== currentDisease.toLowerCase() &&
      !isComparison
    ) {
      isTopicSwitch = true;
      console.log(
        `\n🔄 TOPIC SWITCH: "${currentDisease}" → "${newDiseaseDetected}"`,
      );

      try {
        await Conversation.findByIdAndUpdate(
          conversationId,
          {
            $set: {
              "context.disease": newDiseaseDetected,
              "context.previousQueries": [trimmedContent],
              "context.responseEntities": [],
            },
          },
          { new: true },
        );
        await contextManager.clearContext(req.user.id, conversationId);
        console.log(`✅ Disease persisted: "${newDiseaseDetected}"`);
      } catch (switchError) {
        console.error("Topic switch update (non-fatal):", switchError.message);
      }
    }

    // ── 6. Extract entities into context
    try {
      await contextManager.extractAndUpdateContext(
        req.user.id,
        conversationId,
        trimmedContent,
      );
    } catch (ctxError) {
      console.error("Context extraction (non-fatal):", ctxError.message);
    }

    const context =
      (await contextManager.getContext(req.user.id, conversationId)) || {};

    // ── 7. Resolve effective disease + location
    const effectiveDisease =
      newDiseaseDetected ||
      conversation.context?.disease ||
      context?.disease ||
      userProfile?.diseaseOfInterest ||
      null;

    const effectiveLocation = (() => {
      if (conversation.context?.location) {
        console.log(
          `📍 Location source: CONVERSATION → "${conversation.context.location}"`,
        );
        return conversation.context.location;
      }
      if (context?.location) {
        console.log(
          `📍 Location source: MESSAGE CONTEXT → "${context.location}"`,
        );
        return context.location;
      }
      if (userProfile?.location) {
        console.log(`📍 Location source: PROFILE → "${userProfile.location}"`);
        return userProfile.location;
      }
      console.log("📍 Location source: NONE → global search");
      return null;
    })();

    const previousResponseEntities = Array.isArray(context?.responseEntities)
      ? context.responseEntities
      : [];

    console.log(`\n👤 User:          ${userProfile.name}`);
    console.log(`🏥 Disease:       "${effectiveDisease || "Not set"}"`);
    console.log(`📍 Location:      "${effectiveLocation || "Not set"}"`);
    console.log(`🔄 Topic Switch:  ${isTopicSwitch}`);
    console.log(
      `🧩 Prev entities: ${previousResponseEntities.slice(0, 5).join(", ") || "none"}`,
    );

    if (!effectiveLocation) {
      console.log("⚠️  No location set — trials will be returned globally");
    }

    // ── ✅ DISEASE CONTEXT GATE 
    // If no disease found AND query requires disease to be useful,
    // ask user to specify before running any search.
    if (!effectiveDisease && requiresDiseaseContext(trimmedContent)) {
      console.log("❓ No disease context — asking user to specify");

      // Save pending query so we can re-run it once user provides disease
      try {
        await contextManager.updateContext(req.user.id, conversationId, {
          pendingQuery: trimmedContent,
          awaitingDisease: true,
        });
      } catch (ctxErr) {
        console.error("Pending query save (non-fatal):", ctxErr.message);
      }

      return sendSystemMessage({
        res,
        conversation,
        userMessage,
        startTime,
        effectiveLocation,
        messageData: {
          content:
            'To find relevant results, I need to know which medical condition you are interested in. Could you please tell me your disease or condition of interest? For example: "Lung Cancer", "Diabetes", "Parkinson\'s Disease", etc.',
          metadata: {
            disease: null,
            intent: "clarification_needed",
            location: effectiveLocation,
            publications: [],
            clinicalTrials: [],
            structuredResponse: {
              conditionOverview:
                "Please specify your disease or condition of interest so I can find relevant research and clinical trials for you.",
              keyFindings: [],
              researchInsights: "",
              clinicalTrialsSummary: "",
              recommendations: [
                "Please tell me which disease or condition you are researching.",
                'Example: "I have lung cancer" or "I am looking for diabetes trials"',
              ],
              safetyConsiderations: [],
              sourceSnippets: [],
              references: { publicationCount: 0, trialCount: 0 },
            },
            queryExpansion: trimmedContent,
            originalQuery: trimmedContent,
            modelUsed: "clarification_guard",
            awaitingDisease: true,
          },
          metaExtra: { awaitingDisease: true },
        },
      });
    }

    // ── 8. Count messages + determine follow-up
    let existingMsgCount = 0;
    try {
      existingMsgCount = await Message.countDocuments({
        conversationId,
        role: "user",
      });
    } catch {
      /* non-fatal */
    }

    const isFollowUp = existingMsgCount > 1 && !isTopicSwitch;

    // ── 9. Build search query ──────────────────────────────────────────────
    const queryLower = trimmedContent.toLowerCase();
    let searchQuery = trimmedContent;

    // Check if we're re-running a pending query after user provided disease
    const pendingQuery = context?.pendingQuery || null;
    const wasAwaitingDisease = context?.awaitingDisease || false;

    if (wasAwaitingDisease && newDiseaseDetected && pendingQuery) {
      // User replied with disease name → re-run the original pending query
      searchQuery = `${newDiseaseDetected} ${pendingQuery}`;
      console.log(
        `\n🔄 Re-running pending query with disease: "${searchQuery}"`,
      );

      try {
        await contextManager.updateContext(req.user.id, conversationId, {
          pendingQuery: null,
          awaitingDisease: false,
        });
      } catch (ctxErr) {
        console.error("Clear pending query (non-fatal):", ctxErr.message);
      }
    } else if (isTopicSwitch) {
      searchQuery = trimmedContent;
      console.log(`\n🔄 Fresh search (topic switch)`);
    } else if (isFollowUp && effectiveDisease) {
      const diseaseInQuery =
        queryLower.includes(effectiveDisease.toLowerCase()) ||
        queryLower.includes(effectiveDisease.split(" ")[0].toLowerCase());

      if (!diseaseInQuery) {
        if (isSupplement || isLifestyle) {
          try {
            await contextManager.updateContext(req.user.id, conversationId, {
              _pubmedQuery: undefined,
              _openalexQuery: undefined,
              _intent: undefined,
            });
          } catch (clearErr) {
            console.error(
              "Context intent clear (non-fatal):",
              clearErr.message,
            );
          }
        } else if (drugMention) {
          searchQuery = `${effectiveDisease} ${drugMention} efficacy safety outcomes`;
          console.log(`\n💊 Drug-specific query: "${searchQuery}"`);
        } else if (hasReferent && previousResponseEntities.length > 0) {
          const entityContext = previousResponseEntities.slice(0, 3).join(" ");
          searchQuery = `${effectiveDisease} ${entityContext} ${trimmedContent}`;
          console.log(`\n🧩 Referent-resolved query: "${searchQuery}"`);
        } else if (isVague && previousResponseEntities.length > 0) {
          const entityContext = previousResponseEntities.slice(0, 3).join(" ");
          searchQuery = `${effectiveDisease} ${entityContext}`;
          console.log(`\n💭 Vague + entities query: "${searchQuery}"`);
        } else if (isVague) {
          const vagueSignal = trimmedContent.replace(/[.!?,]/g, "").trim();
          const TRULY_VAGUE = [
            "tell me more",
            "more info",
            "what else",
            "go on",
            "elaborate",
            "ok",
            "i see",
            "interesting",
            "really",
            "wow",
            "and",
          ];
          const hasUsefulSignal =
            vagueSignal.length > 5 &&
            !TRULY_VAGUE.some((p) => vagueSignal.toLowerCase() === p);

          if (hasUsefulSignal) {
            searchQuery = `${effectiveDisease} ${vagueSignal}`;
            console.log(`\n💭 Vague with signal: "${searchQuery}"`);
          } else {
            const prevQueries = Array.isArray(context?.previousQueries)
              ? context.previousQueries
              : [];
            const lastMeaningful =
              prevQueries
                .filter((q) => q && q.length > 5 && q !== trimmedContent)
                .slice(-1)[0] || effectiveDisease;
            searchQuery = `${effectiveDisease} ${lastMeaningful}`;
            console.log(`\n💭 Vague fallback: "${searchQuery}"`);
          }
        } else {
          searchQuery = `${effectiveDisease} ${trimmedContent}`;
          console.log(`\n🔄 Follow-up query: "${searchQuery}"`);
        }
      }
    } else if (!effectiveDisease && drugMention) {
      searchQuery = `${drugMention} clinical efficacy safety outcomes`;
      console.log(`\n💊 Drug-only query (no disease): "${searchQuery}"`);
    }

    // ── 10. Build enhanced context 
    const enhancedContext = {
      ...(isTopicSwitch ? {} : context),
      disease: effectiveDisease,
      location: effectiveLocation,
      previousQueries: isTopicSwitch
        ? [trimmedContent]
        : Array.isArray(context?.previousQueries)
          ? context.previousQueries
          : [],
      responseEntities: previousResponseEntities,
      isLifestyleQuery: isLifestyle,
      originalQuery: trimmedContent,
    };

    console.log(`\n🔍 Final search query: "${searchQuery}"`);

    // ── 11. Hybrid search ──────────────────────────────────────────────────
    let searchResults = {
      publications: [],
      clinicalTrials: [],
      expandedQuery: searchQuery,
      intent: null,
      localTrialCount: 0,
      fallbackTrialCount: 0,
      metadata: {},
    };

    try {
      searchResults = await hybridSearchService.search(
        searchQuery,
        effectiveDisease,
        enhancedContext,
      );
    } catch (searchError) {
      console.error("Search error (non-fatal):", searchError.message);
    }

    const publications = searchResults.publications || [];
    const clinicalTrials = searchResults.clinicalTrials || [];

    const localTrialCount = searchResults.localTrialCount || 0;
    const fallbackTrialCount = searchResults.fallbackTrialCount || 0;
    const hasOnlyGlobalTrials =
      localTrialCount === 0 && clinicalTrials.length > 0;

    if (hasOnlyGlobalTrials) {
      console.log(
        `⚠️  No local trials for "${effectiveDisease}" near "${effectiveLocation}"` +
          ` — showing ${fallbackTrialCount} global fallback trials`,
      );
    }

    enhancedContext.noLocalTrials = hasOnlyGlobalTrials;
    enhancedContext.fallbackTrialCount = fallbackTrialCount;

    console.log(
      `\n📚 Results: ${publications.length} pubs, ${clinicalTrials.length} trials`,
    );

    // ── 12. Conversation history limit ─────────────────────────────────────
    const historyLimit = isTopicSwitch
      ? 0
      : isSupplement
        ? 0
        : hasReferent
          ? 6
          : isProcedure
            ? 2
            : isVague
              ? 4
              : isFollowUp
                ? 2
                : 4;

    let conversationHistory = [];
    if (historyLimit > 0) {
      try {
        conversationHistory = await contextManager.getConversationHistory(
          conversationId,
          historyLimit,
        );
      } catch (hErr) {
        console.error("History fetch (non-fatal):", hErr.message);
      }
    }

    console.log(
      `📜 History: ${conversationHistory.length} msgs (limit: ${historyLimit})`,
    );

    // ── 13. Generate AI response 

    // ✅ HARD BLOCK — No papers AND no trials found — skip LLM entirely
    // Prevents hallucination when search returns nothing
    if (publications.length === 0 && clinicalTrials.length === 0) {
      console.log(
        "⚠️  No publications or trials found — skipping LLM to prevent hallucination",
      );

      return sendSystemMessage({
        res,
        conversation,
        userMessage,
        startTime,
        effectiveLocation,
        messageData: {
          content: `I searched PubMed, OpenAlex, and ClinicalTrials.gov for "${trimmedContent}" but could not find relevant research papers or clinical trials${effectiveDisease ? ` for ${effectiveDisease}` : ""}. This may be because the topic is very specific or the query needs rephrasing. Please try a different search term or consult a healthcare professional directly.`,
          metadata: {
            disease: effectiveDisease,
            intent: searchResults.intent,
            location: effectiveLocation,
            publications: [],
            clinicalTrials: [],
            structuredResponse: {
              conditionOverview: `No research papers were found for this query${effectiveDisease ? ` about ${effectiveDisease}` : ""}.`,
              keyFindings: [],
              researchInsights:
                "No relevant publications were found in PubMed or OpenAlex for this specific query. Try rephrasing or broadening your search.",
              clinicalTrialsSummary:
                "No clinical trials were found for this query.",
              recommendations: [
                "Try rephrasing your query with different terms",
                "Broaden your search — for example, search the disease name only",
                "Consult ClinicalTrials.gov directly for the latest trial listings",
                "Speak with a qualified healthcare professional",
              ],
              safetyConsiderations: [],
              sourceSnippets: [],
              references: { publicationCount: 0, trialCount: 0 },
            },
            queryExpansion: searchResults.expandedQuery || searchQuery,
            originalQuery: trimmedContent,
            modelUsed: "no_results_guard",
            processingTime: Date.now() - startTime,
          },
        },
      });
    }

    // ✅ LOW PAPER COUNT — Add honesty flag to context before LLM call
    // Triggers extra instruction in system prompt to not fill gaps
    // with training data when only 1-2 papers were found
    if (publications.length < 3) {
      enhancedContext.lowResultCount = true;
      enhancedContext.actualPaperCount = publications.length;
      console.log(
        `⚠️  Low paper count: ${publications.length} — injecting honesty instruction into prompt`,
      );
    }

    let aiResponse = {
      structuredResponse: {
        conditionOverview: `Research on: ${effectiveDisease || trimmedContent}`,
        keyFindings: [],
        researchInsights: "Please try again or rephrase your question.",
        clinicalTrialsSummary: "",
        recommendations: [
          "Consult with a healthcare professional for personalized advice.",
        ],
        safetyConsiderations: [],
        sourceSnippets: [],
      },
      rawText: "",
      tokensUsed: 0,
    };

    try {
      aiResponse = await llmService.generateMedicalResponse(
        trimmedContent,
        enhancedContext,
        publications,
        clinicalTrials,
        conversationHistory,
        userProfile,
      );
    } catch (llmError) {
      console.error("LLM error (using fallback):", llmError.message);
      if (publications.length > 0) {
        aiResponse.structuredResponse.keyFindings = publications
          .slice(0, 3)
          .map(
            (pub, idx) =>
              `${(pub.title || "").substring(0, 100)} (${pub.year || "N/A"}) [${idx + 1}]`,
          );
        aiResponse.structuredResponse.researchInsights = `Found ${publications.length} publications on ${effectiveDisease || "your query"}.`;
        aiResponse.structuredResponse.sourceSnippets =
          buildSourceSnippets(publications);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`⏱️  Total: ${processingTime}ms`);

    // ── 14. Post-process: clean LLM output ────────────────────────────────
    const rawFindings = sanitizeStringArray(
      aiResponse.structuredResponse?.keyFindings,
    );
    const cleanedKeyFindings = removeCrossDisease(
      removePlaceholders(rawFindings),
      effectiveDisease,
    );

    const safeRecommendations = removePlaceholders(
      sanitizeStringArray(aiResponse.structuredResponse?.recommendations),
    );

    const safeSafetyConsiderations = removePlaceholders(
      sanitizeStringArray(aiResponse.structuredResponse?.safetyConsiderations),
    );

    const hasGoodSnippets =
      Array.isArray(aiResponse.structuredResponse?.sourceSnippets) &&
      aiResponse.structuredResponse.sourceSnippets.length > 0 &&
      aiResponse.structuredResponse.sourceSnippets[0]?.title;

    const effectiveSourceSnippets = hasGoodSnippets
      ? aiResponse.structuredResponse.sourceSnippets
      : buildSourceSnippets(publications);

    // ── 14.5. Store response entities ─────────────────────────────────────
    const newResponseEntities = extractResponseEntities(
      aiResponse.structuredResponse,
    );
    if (newResponseEntities.length > 0) {
      try {
        await contextManager.updateContext(req.user.id, conversationId, {
          responseEntities: newResponseEntities,
        });
        console.log(`🧩 Stored entities: ${newResponseEntities.join(", ")}`);
      } catch (entityError) {
        console.error("Entity store (non-fatal):", entityError.message);
      }
    }

    // ── 15. Persist assistant message ──────────────────────────────────────
    const assistantMessage = await Message.create({
      conversationId,
      role: "assistant",
      content: sanitizeString(aiResponse.rawText),
      metadata: {
        disease: effectiveDisease,
        intent: searchResults.intent,
        location: effectiveLocation,
        publications: normalizeScores(publications, 100),
        clinicalTrials: normalizeScores(clinicalTrials, 100),
        structuredResponse: {
          conditionOverview: sanitizeString(
            aiResponse.structuredResponse?.conditionOverview,
          ),
          keyFindings: cleanedKeyFindings,
          researchInsights: sanitizeString(
            aiResponse.structuredResponse?.researchInsights,
          ),
          clinicalTrialsSummary: sanitizeString(
            aiResponse.structuredResponse?.clinicalTrialsSummary,
          ),
          recommendations: safeRecommendations,
          safetyConsiderations: safeSafetyConsiderations,
          sourceSnippets: effectiveSourceSnippets,
          references: {
            publicationCount: publications.length,
            trialCount: clinicalTrials.length,
          },
        },
        queryExpansion: searchResults.expandedQuery || searchQuery,
        originalQuery: trimmedContent,
        processingTime,
        tokensUsed: aiResponse.tokensUsed || 0,
        modelUsed: "llama3.1:8b",
        searchStrategy: "hybrid",
      },
    });

    // ── 16. Update conversation metadata ───────────────────────────────────
    try {
      await conversation.updateMetadata({
        messageCount: (conversation.metadata?.messageCount || 0) + 2,
        totalPublications:
          (conversation.metadata?.totalPublications || 0) + publications.length,
        totalClinicalTrials:
          (conversation.metadata?.totalClinicalTrials || 0) +
          clinicalTrials.length,
      });
      conversation.lastMessageAt = new Date();
      await conversation.save();
    } catch (metaError) {
      console.error("Metadata update (non-fatal):", metaError.message);
    }

    console.log("✅ Response sent\n");

    res.status(201).json({
      success: true,
      data: { userMessage, assistantMessage, processingTime },
      meta: {
        hasLocation: !!effectiveLocation,
        locationSource: effectiveLocation
          ? conversation.context?.location
            ? "conversation"
            : context?.location
              ? "message"
              : userProfile?.location
                ? "profile"
                : "unknown"
          : null,
        effectiveLocation: effectiveLocation || null,
        locationPrompt:
          !effectiveLocation && clinicalTrials.length > 0
            ? "Set your location in your profile to see nearby clinical trials"
            : null,
        usingProfileLocation:
          !conversation.context?.location &&
          !context?.location &&
          !!userProfile?.location,
      },
    });
  } catch (error) {
    console.error("❌ Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process message. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


// DELETE CONVERSATION


export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    conversation.isActive = false;
    await conversation.save();

    try {
      await contextManager.clearContext(req.user.id, conversation._id);
    } catch (clearError) {
      console.error("Context clear (non-fatal):", clearError.message);
    }

    console.log(`🗑️  Deleted: ${conversation._id}`);
    res
      .status(200)
      .json({ success: true, message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("❌ Delete conversation error:", error);
    next(error);
  }
};
