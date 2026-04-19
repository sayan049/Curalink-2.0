class QueryExpansionService {
  constructor() {
    this.currentYear = new Date().getFullYear();

    // ── Known drug names for drug-specific intent detection 
    this.knownDrugs = new Set([
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

    // ── Supplement terms for safety_efficacy detection ────────────────────────
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
    ]);

    // ── Medical procedures that map to treatment_solutions intent 
    this.procedureTerms = [
      "deep brain stimulation",
      "dbs",
      "transcranial magnetic stimulation",
      "tms",
      "vagus nerve stimulation",
      "vns",
      "spinal cord stimulation",
      "electroconvulsive therapy",
      "ect",
      "focused ultrasound",
      "angioplasty",
      "stent placement",
      "coronary bypass",
      "cabg",
      "dialysis",
      "hemodialysis",
      "stem cell transplant",
      "bone marrow transplant",
      "car-t therapy",
      "car t cell",
      "proton therapy",
      "cyberknife",
      "laser ablation",
      "thermal ablation",
      "photodynamic therapy",
    ];

    // ── Food / lifestyle terms for safety_efficacy detection ─────────────────
    // ✅ Separated into substring-safe and word-boundary-required lists
    // to prevent "eat" matching "treatment", "tea" matching "treatment" etc.
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
      
      "can i drink",
      "safe to have",
      "can i smoke",
      "safe to use",
      "should i take",
      "is it safe",
      "is it okay",
      "is it good",
      "is it bad",
      "can i use",

    ];

    // These short terms MUST use word-boundary matching
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
  }

  // ── Helper: detect if query is about diet/lifestyle 
  _isFoodOrLifestyleQuery(q) {
    // Check substring-safe terms first
    if (this.foodSubstringTerms.some((term) => q.includes(term))) return true;

    // Check word-boundary terms — prevents "eat" in "treatment", "tea" in "treatment"
    return this.foodWordBoundaryTerms.some((term) => {
      try {
        return new RegExp(`\\b${term}\\b`).test(q);
      } catch {
        return false;
      }
    });
  }

 
  // INTENT DETECTION
  

  detectQueryIntent(query) {
    if (!query || typeof query !== "string") {
      return {
        type: "general",
        description: "Find relevant research on this topic",
      };
    }

    const q = query.toLowerCase();

    // ─── RESEARCHER QUERIES 
    if (
      q.includes("top researcher") ||
      q.includes("best researcher") ||
      q.includes("leading researcher") ||
      q.includes("leading expert") ||
      q.includes("who studies") ||
      q.includes("pioneer") ||
      q.includes("expert in") ||
      q.includes("scientist") ||
      q.includes("who works on") ||
      q.includes("top expert") ||
      q.includes("key researcher") ||
      q.includes("prominent researcher")
    ) {
      return {
        type: "researchers",
        description: "Find key researchers and their contributions",
      };
    }

    // ─── CLINICAL TRIAL QUERIES 
    if (
      q.includes("clinical trial") ||
      q.includes("trial for") ||
      q.includes("study recruiting") ||
      q.includes("enroll") ||
      q.includes("ongoing trial") ||
      q.includes("recruiting trial") ||
      q.includes("phase 3") ||
      q.includes("phase iii") ||
      q.includes("phase 2") ||
      q.includes("phase ii") ||
      q.includes("open trial") ||
      q.includes("join a trial") ||
      q.includes("participate in") ||
      q.includes("trial near")
    ) {
      return {
        type: "clinical_trials",
        description: "Find ongoing or completed clinical trials",
      };
    }

    // ─── DRUG-SPECIFIC QUERIES (check before treatment)
    const drugFound = [...this.knownDrugs].find((drug) => q.includes(drug));
    if (drugFound) {
      if (
        q.includes("mechanism") ||
        q.includes("how does") ||
        q.includes("how it works") ||
        q.includes("how work") ||
        q.includes("pathway") ||
        q.includes("biology")
      ) {
        return {
          type: "mechanism",
          description: `Mechanism of action for ${drugFound}`,
        };
      }
      if (
        q.includes("side effect") ||
        q.includes("adverse") ||
        q.includes("safe") ||
        q.includes("toxicity") ||
        q.includes("risk") ||
        q.includes("danger")
      ) {
        return {
          type: "side_effects",
          description: `Safety profile of ${drugFound}`,
        };
      }
      if (
        q.includes("compare") ||
        q.includes("versus") ||
        q.includes(" vs ") ||
        q.includes("better than")
      ) {
        return {
          type: "comparison",
          description: `Comparative efficacy of ${drugFound}`,
        };
      }
      return {
        type: "treatment_solutions",
        description: `Efficacy and outcomes of ${drugFound}`,
      };
    }

    // ─── DIET / LIFESTYLE QUERIES
    // ✅ Uses word-boundary matching for short terms to prevent false positives
    // e.g. "eat" inside "treatment", "tea" inside "treatment"
    if (this._isFoodOrLifestyleQuery(q)) {
      return {
        type: "safety_efficacy",
        description: "Find safety and lifestyle guidance in disease context",
      };
    }

    // ─── SUPPLEMENT / SAFETY QUERIES 
    const suppFound = [...this.supplementTerms].find((term) =>
      q.includes(term),
    );
    if (suppFound) {
      return {
        type: "safety_efficacy",
        description: "Find safety and efficacy in disease context",
      };
    }

    // ─── SPECIFIC PROCEDURE / TECHNIQUE QUERIES 
    const procedureFound = this.procedureTerms.find((proc) => q.includes(proc));
    if (procedureFound) {
      return {
        type: "treatment_solutions",
        description: `Find evidence on ${procedureFound}`,
      };
    }

    // ─── TREATMENT QUERIES 
    if (
      q.includes("latest treatment") ||
      q.includes("new treatment") ||
      q.includes("best treatment") ||
      q.includes("treatment option") ||
      q.includes("how to treat") ||
      q.includes("therapy for") ||
      q.includes("medication for") ||
      q.includes("drug for") ||
      q.includes("cure for") ||
      q.includes("treatment of") ||
      q.includes("manage") ||
      q.includes("treatment approach") ||
      q.includes("first line") ||
      q.includes("second line") ||
      q.includes("first-line") ||
      q.includes("second-line") ||
      q.includes("immunotherapy") ||
      q.includes("chemotherapy") ||
      q.includes("targeted therapy") ||
      q.includes("regimen")
    ) {
      return {
        type: "treatment_solutions",
        description: "Find treatment outcomes and efficacy data",
      };
    }

    // ─── RECENT STUDIES QUERIES 
    if (
      q.includes("recent studies") ||
      q.includes("recent research") ||
      q.includes("latest research") ||
      q.includes("new findings") ||
      q.includes("current research") ||
      q.includes("what is new") ||
      q.includes("emerging research") ||
      q.includes("latest study") ||
      q.includes("recent advances") ||
      q.includes("new developments") ||
      q.includes("recent findings") ||
      q.includes("latest findings") ||
      q.includes("new research") ||
      q.includes("what is known")
    ) {
      return {
        type: "recent_research",
        description: "Find the most recent research findings",
      };
    }

    // ─── MECHANISM / HOW IT WORKS ─────────────────────────────────────────
    if (
      q.includes("mechanism") ||
      q.includes("how does") ||
      q.includes("why does") ||
      q.includes("pathophysiology") ||
      q.includes("pathway") ||
      q.includes("molecular") ||
      q.includes("biology of") ||
      q.includes("cause of") ||
      q.includes("what causes") ||
      q.includes("how it works") ||
      q.includes("pathogenesis") ||
      q.includes("molecular basis") ||
      q.includes("signaling")
    ) {
      return {
        type: "mechanism",
        description: "Find papers explaining biological mechanisms",
      };
    }

    // ─── SYMPTOM / DIAGNOSIS QUERIES
    if (
      q.includes("symptom") ||
      q.includes("sign of") ||
      q.includes("indication") ||
      q.includes("how to know") ||
      q.includes("diagnosis") ||
      q.includes("detect") ||
      q.includes("screening") ||
      q.includes("biomarker") ||
      q.includes("test for") ||
      q.includes("diagnose") ||
      q.includes("how do i know") ||
      q.includes("early sign") ||
      q.includes("warning sign") ||
      q.includes("diagnostic test")
    ) {
      return {
        type: "symptoms_diagnosis",
        description: "Find diagnosis and symptom papers",
      };
    }

    // ─── PREVENTION QUERIES ───────────────────────────────────────────────
    if (
      q.includes("prevent") ||
      q.includes("avoid") ||
      q.includes("reduce risk") ||
      q.includes("lower risk") ||
      q.includes("prophylaxis") ||
      q.includes("protection from") ||
      q.includes("how to avoid") ||
      q.includes("risk reduction") ||
      q.includes("lifestyle") ||
      q.includes("preventive")
    ) {
      return {
        type: "prevention",
        description: "Find prevention strategy papers",
      };
    }

    // ─── PROGNOSIS / SURVIVAL QUERIES 
    if (
      q.includes("prognosis") ||
      q.includes("survival rate") ||
      q.includes("life expectancy") ||
      q.includes("mortality") ||
      q.includes("5-year survival") ||
      q.includes("how long") ||
      q.includes("progression") ||
      q.includes("recurrence") ||
      q.includes("relapse") ||
      q.includes("disease-free") ||
      q.includes("outlook")
    ) {
      return {
        type: "prognosis",
        description: "Find prognosis and survival data",
      };
    }

    // ─── COMPARISON QUERIES ───────────────────────────────────────────────
    if (
      q.includes("compare") ||
      q.includes("versus") ||
      q.includes(" vs ") ||
      q.includes("better than") ||
      q.includes("difference between") ||
      q.includes("which is better") ||
      q.includes("superiority") ||
      q.includes("head-to-head") ||
      q.includes("non-inferior")
    ) {
      return { type: "comparison", description: "Find comparative studies" };
    }

    // ─── SIDE EFFECTS QUERIES ─────────────────────────────────────────────
    if (
      q.includes("side effect") ||
      q.includes("adverse") ||
      q.includes("risk of") ||
      q.includes("danger") ||
      q.includes("complication") ||
      q.includes("toxicity") ||
      q.includes("harm") ||
      q.includes("tolerability") ||
      q.includes("safe to take") ||
      q.includes("is it safe")
    ) {
      return {
        type: "side_effects",
        description: "Find safety and adverse effect data",
      };
    }

    // ─── COST / ACCESSIBILITY QUERIES ─────────────────────────────────────
    if (
      q.includes("cost") ||
      q.includes("affordable") ||
      q.includes("available in") ||
      q.includes("insurance") ||
      q.includes("covered") ||
      q.includes("generic") ||
      q.includes("price") ||
      q.includes("reimbursement") ||
      q.includes("access to")
    ) {
      return {
        type: "access_cost",
        description: "Find access and cost-related research",
      };
    }
    // ─── BARE DISEASE NAME (no action words) ─────────────────────────────────
    // When user types just a disease name with no intent signals,
    // default to recent_research to show latest clinical findings
    // instead of generic papers. This gives a much more useful overview.
    const BARE_DISEASE_SIGNALS = [
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

    const isBareDiseaseQuery =
      BARE_DISEASE_SIGNALS.some((d) => q.includes(d)) &&
      // No action words present
      !q.includes("treatment") &&
      !q.includes("therapy") &&
      !q.includes("trial") &&
      !q.includes("research") &&
      !q.includes("symptom") &&
      !q.includes("diagnos") &&
      !q.includes("prevent") &&
      !q.includes("prognos") &&
      !q.includes("cause") &&
      !q.includes("mechanism") &&
      !q.includes("side") &&
      !q.includes("cost") &&
      !q.includes("researcher") &&
      !q.includes("study") &&
      // Short query — just disease name, maybe with "disease" word
      q.split(/\s+/).filter((w) => w.length > 2).length <= 4;

    if (isBareDiseaseQuery) {
      return {
        type: "recent_research",
        description: "Show latest research on this condition",
      };
    }

    // Default
    return {
      type: "general",
      description: "Find relevant research on this topic",
    };

 
  }

  // PUBMED QUERY BUILDER
  

  buildPubMedQuery(disease, intent, originalQuery, currentYear) {
    const minYear = currentYear - 3;
    const diseaseTag = disease
      ? `("${disease}"[Title/Abstract] OR "${disease}"[MeSH Terms])`
      : "";

    const drugFound = [...this.knownDrugs].find((drug) =>
      originalQuery.toLowerCase().includes(drug),
    );

    // Supplement match — checked FIRST before food
    const suppMatch = originalQuery.match(
      /vitamin\s+[A-Za-z0-9]+|omega[-\s]?\d+|zinc|magnesium|calcium|selenium|iron|folate|folic\s+acid|probiotic|fish\s+oil|coq10|turmeric|curcumin|ashwagandha|melatonin/i,
    );
    // Food match — only if no supplement found
    const foodMatch =
      !suppMatch &&
      originalQuery.match(
        /spicy|capsaicin|sugar|alcohol|coffee|tea|fruit|vegetable|dairy|food|diet|exercise|smoking|sleep|nutrition/i,
      );

    const supplement = suppMatch ? suppMatch[0] : "";
    const food = foodMatch ? foodMatch[0] : "";

    const queries = {
      treatment_solutions: (() => {
        const procedureFound = this.procedureTerms.find((p) =>
          originalQuery.toLowerCase().includes(p),
        );

        if (procedureFound && disease) {
          return `${diseaseTag} AND "${procedureFound}"[Title/Abstract] AND (${minYear}:${currentYear}[PDAT])`;
        }
        if (drugFound && disease) {
          return `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (${minYear}:${currentYear}[PDAT])`;
        }
        return disease
          ? `${diseaseTag} AND (treatment[Title] OR therapy[Title] OR efficacy[Title] OR outcome[Title] OR response[Title]) AND (${minYear}:${currentYear}[PDAT])`
          : `${originalQuery} treatment efficacy outcome`;
      })(),

      clinical_trials: disease
        ? `${diseaseTag} AND "clinical trial"[Publication Type]`
        : `${originalQuery} clinical trial`,

      researchers: disease
        ? `${diseaseTag} AND review[Title] AND (${minYear}:${currentYear}[PDAT])`
        : `${originalQuery} review`,

      recent_research: disease
        ? `${diseaseTag} AND (${minYear}:${currentYear}[PDAT])`
        : originalQuery,

      safety_efficacy: (() => {
        if (supplement && disease) {
          return `"${supplement}"[Title/Abstract] AND ${diseaseTag} AND (safety OR efficacy OR supplementation OR deficiency OR association OR outcome)`;
        }
        if (food && disease) {
          return `${diseaseTag} AND (diet[Title] OR nutrition[Title] OR dietary[Title] OR food[Title] OR "supportive care"[Title] OR lifestyle[Title]) AND (${minYear}:${currentYear}[PDAT])`;
        }
        return disease
          ? `${diseaseTag} AND (safety[Title] OR efficacy[Title] OR adverse[Title])`
          : `${originalQuery} safety efficacy`;
      })(),

      mechanism: (() => {
        if (drugFound && disease) {
          return `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (mechanism[Title] OR pathway[Title])`;
        }
        return disease
          ? `${diseaseTag} AND (mechanism[Title] OR pathway[Title] OR pathogenesis[Title])`
          : `${originalQuery} mechanism pathway`;
      })(),

      symptoms_diagnosis: disease
        ? `${diseaseTag} AND (diagnosis[Title] OR symptom[Title] OR biomarker[Title] OR screening[Title])`
        : `${originalQuery} diagnosis symptom`,

      prevention: disease
        ? `${diseaseTag} AND (prevention[Title] OR prophylaxis[Title] OR "risk reduction"[Title])`
        : `${originalQuery} prevention`,

      prognosis: disease
        ? `${diseaseTag} AND (prognosis[Title] OR survival[Title] OR mortality[Title] OR outcome[Title])`
        : `${originalQuery} prognosis survival`,

      comparison: (() => {
        if (drugFound && disease) {
          return `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (versus[Title] OR compared[Title] OR randomized[Title])`;
        }
        return disease
          ? `${diseaseTag} AND (versus[Title] OR compared[Title] OR randomized[Title])`
          : `${originalQuery} comparison`;
      })(),

      side_effects: (() => {
        if (drugFound) {
          return disease
            ? `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (adverse[Title] OR "side effect"[Title] OR toxicity[Title])`
            : `"${drugFound}"[Title/Abstract] AND (adverse[Title] OR "side effect"[Title] OR toxicity[Title])`;
        }
        return disease
          ? `${diseaseTag} AND (adverse[Title] OR "side effect"[Title] OR toxicity[Title] OR safety[Title])`
          : `${originalQuery} adverse safety`;
      })(),

      access_cost: disease
        ? `${diseaseTag} AND (cost[Title] OR access[Title] OR affordable[Title])`
        : `${originalQuery} cost access`,

      general: disease
        ? `${diseaseTag} AND (${minYear}:${currentYear}[PDAT])`
        : originalQuery,
    };

    return queries[intent.type] || queries.general;
  }

  
  // OPENALEX QUERY BUILDER


  buildOpenAlexQuery(disease, intent, originalQuery) {
    const currentYear = new Date().getFullYear();

    const drugFound = [...this.knownDrugs].find((drug) =>
      originalQuery.toLowerCase().includes(drug),
    );

    // Supplement match — checked FIRST before food
    const suppMatch = originalQuery.match(
      /vitamin\s+[A-Za-z0-9]+|omega[-\s]?\d+|zinc|magnesium|calcium|selenium|iron|folate|folic\s+acid|probiotic|fish\s+oil|coq10|turmeric|curcumin|ashwagandha|melatonin|collagen/i,
    );
    const foodMatch =
      !suppMatch &&
      originalQuery.match(
        /spicy|capsaicin|sugar|alcohol|coffee|tea|fruit|vegetable|dairy|food|diet|exercise|smoking|sleep|nutrition/i,
      );

    const supplement = suppMatch ? suppMatch[0] : "";
    const food = foodMatch ? foodMatch[0] : "";

    const queries = {
      treatment_solutions: (() => {
        const procedureFound = this.procedureTerms.find((p) =>
          originalQuery.toLowerCase().includes(p),
        );
        if (procedureFound && disease) {
          return `${disease} ${procedureFound} efficacy outcomes clinical results`;
        }
        if (drugFound && disease) {
          return `${drugFound} ${disease} efficacy outcomes clinical trial ${currentYear}`;
        }
        return disease
          ? `${disease} treatment efficacy outcomes clinical results ${currentYear}`
          : `${originalQuery} efficacy outcomes results`;
      })(),

      clinical_trials: disease
        ? `${disease} randomized controlled trial clinical results phase 3`
        : `${originalQuery} clinical trial randomized`,

      researchers: disease
        ? `${disease} research breakthrough key findings review ${currentYear}`
        : `${originalQuery} research authors review`,

      recent_research: disease
        ? `${disease} latest advances findings ${currentYear}`
        : `${originalQuery} ${currentYear}`,

      safety_efficacy: (() => {
        if (supplement && disease) {
          return `${supplement} ${disease} patients safety efficacy supplementation deficiency association outcomes`;
        }
        if (food && disease) {
          return `${disease} patients diet nutrition food ${food} safety clinical recommendation`;
        }
        return disease
          ? `${disease} safety efficacy adverse effects`
          : `${originalQuery} safety efficacy`;
      })(),

      mechanism: (() => {
        if (drugFound && disease) {
          return `${drugFound} ${disease} mechanism action pathway molecular`;
        }
        return disease
          ? `${disease} molecular mechanism pathogenesis pathway`
          : `${originalQuery} mechanism pathway biology`;
      })(),

      symptoms_diagnosis: disease
        ? `${disease} diagnosis symptoms biomarkers screening detection`
        : `${originalQuery} diagnosis symptoms detection`,

      prevention: disease
        ? `${disease} prevention risk reduction prophylaxis strategies`
        : `${originalQuery} prevention risk reduction`,

      prognosis: disease
        ? `${disease} prognosis survival rate mortality outcomes`
        : `${originalQuery} prognosis survival`,

      comparison: (() => {
        if (drugFound && disease) {
          return `${drugFound} ${disease} comparison versus randomized controlled trial`;
        }
        return disease
          ? `${disease} comparison versus randomized controlled trial`
          : `${originalQuery} comparison versus`;
      })(),

      side_effects: (() => {
        if (drugFound) {
          return disease
            ? `${drugFound} ${disease} adverse effects safety toxicity`
            : `${drugFound} adverse effects safety toxicity complications`;
        }
        return disease
          ? `${disease} adverse effects safety toxicity complications`
          : `${originalQuery} adverse effects safety`;
      })(),

      access_cost: disease
        ? `${disease} treatment cost access healthcare`
        : `${originalQuery} cost access`,

      general: disease ? `${disease} ${originalQuery} research` : originalQuery,
    };

    return queries[intent.type] || queries.general;
  }


  // MAIN ENTRY POINT
  

  async expandQuery(originalQuery, disease, context = {}) {
    try {
      this.currentYear = new Date().getFullYear();

      const intent = this.detectQueryIntent(originalQuery);

      console.log(`\n🧠 Intent: "${intent.type}" → ${intent.description}`);

      const pubmedQuery = this.buildPubMedQuery(
        disease,
        intent,
        originalQuery,
        this.currentYear,
      );
      const openalexQuery = this.buildOpenAlexQuery(
        disease,
        intent,
        originalQuery,
      );

      console.log(`   PubMed:   "${pubmedQuery.substring(0, 100)}"`);
      console.log(`   OpenAlex: "${openalexQuery}"`);

      context._intent = intent;
      context._pubmedQuery = pubmedQuery;
      context._openalexQuery = openalexQuery;

      return openalexQuery;
    } catch (error) {
      console.error("Query expansion error:", error);
      return disease ? `${disease} ${originalQuery}` : originalQuery;
    }
  }

  
  // UTILITY
  

  extractIntent(query) {
    return this.detectQueryIntent(query);
  }

  generateSearchVariations(query, disease) {
    return [query, disease ? `${disease} ${query}` : query].filter(Boolean);
  }
}

export default new QueryExpansionService();
