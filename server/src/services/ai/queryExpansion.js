class QueryExpansionService {
  constructor() {
    this.currentYear = new Date().getFullYear();

    // ── Known drugs for intent detection ─────────────────────────────────
    this.knownDrugs = new Set([
      // Oncology
      "pembrolizumab", "nivolumab", "osimertinib", "atezolizumab", "durvalumab",
      "bevacizumab", "trastuzumab", "pertuzumab", "ibrutinib", "venetoclax",
      "rituximab", "cetuximab", "erlotinib", "alectinib", "brigatinib",
      "crizotinib", "olaparib", "rucaparib", "niraparib", "palbociclib",
      "ribociclib", "abemaciclib", "sacituzumab", "enfortumab", "benmelstobart",
      "anlotinib", "sigvotatug", "lorlatinib", "capmatinib", "tepotinib",
      "selpercatinib", "pralsetinib", "domvanalimab", "zimberelimab",
      "datopotamab", "amivantamab", "patritumab", "telisotuzumab",
      // Cardiology
      "inclisiran", "evolocumab", "alirocumab", "sacubitril", "vericiguat",
      "mavacamten", "aficamten", "bempedoic", "finerenone",
      // Diabetes / metabolic
      "metformin", "semaglutide", "empagliflozin", "dapagliflozin",
      "tirzepatide", "liraglutide", "sitagliptin", "canagliflozin",
      "glipizide", "pioglitazone", "insulin", "degludec", "orforglipron",
      // Neurology
      "lecanemab", "donanemab", "aducanumab", "levodopa", "carbidopa",
      "rasagiline", "selegiline", "pramipexole", "donepezil", "memantine",
      "rivastigmine",
      // Cardiology existing
      "atorvastatin", "rosuvastatin", "aspirin", "warfarin", "apixaban",
      "rivaroxaban", "dabigatran", "clopidogrel", "metoprolol", "carvedilol",
      "lisinopril", "sacubitril",
      // Immunology / Rheumatology
      "adalimumab", "etanercept", "infliximab", "tocilizumab", "baricitinib",
      "tofacitinib", "upadacitinib",
      // Respiratory
      "dupilumab", "mepolizumab", "benralizumab", "omalizumab",
      // Infectious
      "remdesivir", "nirmatrelvir", "molnupiravir", "dolutegravir",
      // Gene / Cell therapy
      "crispr", "cas9",
    ]);

    // ── Supplement terms ──────────────────────────────────────────────────
    this.supplementTerms = new Set([
      "vitamin", "supplement", "mineral", "omega", "zinc", "magnesium",
      "calcium", "selenium", "iron", "folate", "folic acid", "probiotic",
      "herbal", "natural remedy", "fish oil", "cod liver", "coenzyme",
      "coq10", "turmeric", "curcumin", "ashwagandha", "melatonin", "collagen",
    ]);

    // ── Medical procedures ────────────────────────────────────────────────
    this.procedureTerms = [
      "deep brain stimulation", "dbs",
      "transcranial magnetic stimulation", "tms",
      "vagus nerve stimulation", "vns",
      "spinal cord stimulation",
      "electroconvulsive therapy", "ect",
      "focused ultrasound",
      "angioplasty", "stent placement", "coronary bypass", "cabg",
      "dialysis", "hemodialysis",
      "stem cell transplant", "bone marrow transplant",
      "car-t therapy", "car t cell",
      "proton therapy", "cyberknife",
      "laser ablation", "thermal ablation",
      "photodynamic therapy",
      "percutaneous coronary intervention", "pci",
      "transcatheter aortic valve", "tavi", "tavr",
      "catheter ablation",
      "stereotactic radiosurgery", "srs",
      "whole brain radiation", "wbrt",
      "gamma knife",
    ];

    // ── Food / lifestyle terms (substring-safe) ───────────────────────────
    this.foodSubstringTerms = [
      "spicy", "capsaicin", "alcohol", "coffee", "fruit", "vegetable",
      "dairy", "nutrition", "fasting", "intermittent", "smoking", "vaping",
      "obesity", "bmi",
      "can i eat", "can i drink", "can i have", "should i eat",
      "should i avoid", "safe to eat", "safe to drink", "avoid eating",
      "avoid drinking", "safe to have", "can i smoke", "safe to use",
      "should i take", "is it safe", "is it okay", "is it good",
      "is it bad", "can i use",
    ];

    // ── Short lifestyle terms (word-boundary matching) ────────────────────
    this.foodWordBoundaryTerms = [
      "food", "diet", "eat", "eating", "drink", "drinking", "sugar",
      "meat", "fish", "dairy", "fat", "sleep", "smoke", "weight", "tea",
    ];

    // ── Disease-specific enrichment for better retrieval ──────────────────
    this.diseaseEnrichment = {
      "lung cancer": [
        "NSCLC", "overall survival", "progression-free survival",
        "immunotherapy", "targeted therapy", "EGFR", "PD-L1", "phase 3",
      ],
      "diabetes": [
        "glycemic control", "HbA1c", "cardiovascular outcomes",
        "SGLT2", "GLP-1", "randomized controlled trial",
      ],
      "type 2 diabetes": [
        "glycemic control", "HbA1c", "SGLT2", "GLP-1", "randomized",
      ],
      "heart disease": [
        "myocardial infarction", "cardiovascular outcomes",
        "major adverse cardiovascular", "randomized controlled trial",
      ],
      "alzheimer's disease": [
        "amyloid", "cognitive decline", "phase 3", "clinical trial", "biomarker",
      ],
      "parkinson's disease": [
        "motor symptoms", "levodopa", "dopamine", "randomized", "clinical trial",
      ],
    };
  }

  // ── Helper: detect diet/lifestyle query ──────────────────────────────────
  _isFoodOrLifestyleQuery(q) {
    if (this.foodSubstringTerms.some((term) => q.includes(term))) return true;
    return this.foodWordBoundaryTerms.some((term) => {
      try { return new RegExp(`\\b${term}\\b`).test(q); }
      catch { return false; }
    });
  }

  // ── Helper: get disease enrichment terms ─────────────────────────────────
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

  // ── Helper: extract disease from "clinical trials for X" pattern ─────────
  // Handles: "clinical trials for diabetes", "trials for heart disease"
  // Returns the disease name or falls back to the stored disease
  _extractQueryDisease(originalQuery, storedDisease) {
    const q = originalQuery.toLowerCase();

    // Pattern: "clinical trials for X", "trial for X", "trials in X"
    const forMatch = originalQuery.match(
      /(?:clinical\s+)?trials?\s+(?:for|in|of|on)\s+(.+?)(?:\s+in\s+|\s+near\s+|$)/i,
    );
    if (forMatch && forMatch[1] && forMatch[1].trim().length > 2) {
      return forMatch[1].trim();
    }

    // Pattern: "X clinical trials", "X trials"
    const beforeMatch = originalQuery.match(
      /^(.+?)\s+(?:clinical\s+)?trials?$/i,
    );
    if (beforeMatch && beforeMatch[1] && beforeMatch[1].trim().length > 2) {
      const candidate = beforeMatch[1].trim().toLowerCase();
      // Exclude generic words
      if (!["latest", "recent", "new", "best", "top"].includes(candidate)) {
        return beforeMatch[1].trim();
      }
    }

    return storedDisease || null;
  }

  // ════════════════════════════════════════════════════════════════════════
  // INTENT DETECTION
  // ════════════════════════════════════════════════════════════════════════

  detectQueryIntent(query) {
    if (!query || typeof query !== "string") {
      return { type: "general", description: "Find relevant research on this topic" };
    }

    const q = query.toLowerCase();

    // ── Researcher queries ────────────────────────────────────────────────
    if (
      q.includes("top researcher") || q.includes("best researcher") ||
      q.includes("leading researcher") || q.includes("leading expert") ||
      q.includes("who studies") || q.includes("pioneer") ||
      q.includes("expert in") || q.includes("scientist") ||
      q.includes("who works on") || q.includes("top expert") ||
      q.includes("key researcher") || q.includes("prominent researcher")
    ) {
      return { type: "researchers", description: "Find key researchers and their contributions" };
    }

    // ── Clinical trial queries ────────────────────────────────────────────
    if (
      q.includes("clinical trial") || q.includes("trial for") ||
      q.includes("study recruiting") || q.includes("enroll") ||
      q.includes("ongoing trial") || q.includes("recruiting trial") ||
      q.includes("phase 3") || q.includes("phase iii") ||
      q.includes("phase 2") || q.includes("phase ii") ||
      q.includes("open trial") || q.includes("join a trial") ||
      q.includes("participate in") || q.includes("trial near") ||
      q.includes("trials for") || q.includes("trials in")
    ) {
      return { type: "clinical_trials", description: "Find ongoing or completed clinical trials" };
    }

    // ── Drug-specific queries ─────────────────────────────────────────────
    const drugFound = [...this.knownDrugs].find((drug) => q.includes(drug));
    if (drugFound) {
      if (
        q.includes("mechanism") || q.includes("how does") ||
        q.includes("how it works") || q.includes("pathway") ||
        q.includes("biology")
      ) {
        return { type: "mechanism", description: `Mechanism of action for ${drugFound}` };
      }
      if (
        q.includes("side effect") || q.includes("adverse") ||
        q.includes("safe") || q.includes("toxicity") ||
        q.includes("risk") || q.includes("danger")
      ) {
        return { type: "side_effects", description: `Safety profile of ${drugFound}` };
      }
      if (
        q.includes("compare") || q.includes("versus") ||
        q.includes(" vs ") || q.includes("better than")
      ) {
        return { type: "comparison", description: `Comparative efficacy of ${drugFound}` };
      }
      return { type: "treatment_solutions", description: `Efficacy and outcomes of ${drugFound}` };
    }

    // ── Diet / lifestyle queries ──────────────────────────────────────────
    if (this._isFoodOrLifestyleQuery(q)) {
      return { type: "safety_efficacy", description: "Find safety and lifestyle guidance in disease context" };
    }

    // ── Supplement queries ────────────────────────────────────────────────
    const suppFound = [...this.supplementTerms].find((term) => q.includes(term));
    if (suppFound) {
      return { type: "safety_efficacy", description: "Find safety and efficacy in disease context" };
    }

    // ── Procedure queries ─────────────────────────────────────────────────
    const procedureFound = this.procedureTerms.find((proc) => q.includes(proc));
    if (procedureFound) {
      return { type: "treatment_solutions", description: `Find evidence on ${procedureFound}` };
    }

    // ── Post-progression / next-line queries ──────────────────────────────
    if (
      q.includes("progressed on") || q.includes("after progression") ||
      q.includes("stops working") || q.includes("stopped working") ||
      q.includes("next line after") || q.includes("second line after") ||
      q.includes("after immunotherapy") || q.includes("after chemotherapy") ||
      q.includes("post-immunotherapy") || q.includes("post-ici") ||
      q.includes("salvage") || q.includes("rechallenge") ||
      q.includes("refractory") || q.includes("resistant to") ||
      (q.includes("after") && (q.includes("failed") || q.includes("failure")))
    ) {
      return { type: "treatment_solutions", description: "Find second-line and salvage treatment options" };
    }

    // ── Treatment queries ─────────────────────────────────────────────────
    if (
      q.includes("latest treatment") || q.includes("new treatment") ||
      q.includes("best treatment") || q.includes("treatment option") ||
      q.includes("how to treat") || q.includes("therapy for") ||
      q.includes("medication for") || q.includes("drug for") ||
      q.includes("cure for") || q.includes("treatment of") ||
      q.includes("treatment approach") || q.includes("first line") ||
      q.includes("second line") || q.includes("first-line") ||
      q.includes("second-line") || q.includes("immunotherapy") ||
      q.includes("chemotherapy") || q.includes("targeted therapy") ||
      q.includes("regimen") || q.includes("brain metastases") ||
      q.includes("brain mets") || q.includes("metastatic") ||
      q.includes("what are the options") || q.includes("treatment plan") ||
      q.includes("how to manage") ||
      (q.includes("manage") && !this._isFoodOrLifestyleQuery(q))
    ) {
      return { type: "treatment_solutions", description: "Find treatment outcomes and efficacy data" };
    }

    // ── Recent research queries ───────────────────────────────────────────
    if (
      q.includes("recent studies") || q.includes("recent research") ||
      q.includes("latest research") || q.includes("new findings") ||
      q.includes("current research") || q.includes("what is new") ||
      q.includes("emerging research") || q.includes("latest study") ||
      q.includes("recent advances") || q.includes("new developments") ||
      q.includes("recent findings") || q.includes("latest findings") ||
      q.includes("new research") || q.includes("what is known") ||
      q.includes("research on") || q.includes("researches on") ||
      q.includes("studies on") || q.includes("evidence on") ||
      q.includes("overview of")
    ) {
      return { type: "recent_research", description: "Find the most recent research findings" };
    }

    // ── Mechanism queries ─────────────────────────────────────────────────
    if (
      q.includes("mechanism") || q.includes("how does") ||
      q.includes("why does") || q.includes("pathophysiology") ||
      q.includes("pathway") || q.includes("molecular") ||
      q.includes("biology of") || q.includes("cause of") ||
      q.includes("what causes") || q.includes("how it works") ||
      q.includes("pathogenesis") || q.includes("molecular basis") ||
      q.includes("signaling")
    ) {
      return { type: "mechanism", description: "Find papers explaining biological mechanisms" };
    }

    // ── Symptom / diagnosis queries ───────────────────────────────────────
    if (
      q.includes("symptom") || q.includes("sign of") ||
      q.includes("indication") || q.includes("how to know") ||
      q.includes("diagnosis") || q.includes("detect") ||
      q.includes("screening") || q.includes("biomarker") ||
      q.includes("test for") || q.includes("diagnose") ||
      q.includes("early sign") || q.includes("warning sign") ||
      q.includes("diagnostic test")
    ) {
      return { type: "symptoms_diagnosis", description: "Find diagnosis and symptom papers" };
    }

    // ── Prevention queries ────────────────────────────────────────────────
    if (
      q.includes("prevent") || q.includes("avoid") ||
      q.includes("reduce risk") || q.includes("lower risk") ||
      q.includes("prophylaxis") || q.includes("protection from") ||
      q.includes("how to avoid") || q.includes("risk reduction") ||
      q.includes("lifestyle") || q.includes("preventive")
    ) {
      return { type: "prevention", description: "Find prevention strategy papers" };
    }

    // ── Prognosis / survival queries ──────────────────────────────────────
    if (
      q.includes("prognosis") || q.includes("survival rate") ||
      q.includes("life expectancy") || q.includes("mortality") ||
      q.includes("5-year survival") || q.includes("how long") ||
      q.includes("progression") || q.includes("recurrence") ||
      q.includes("relapse") || q.includes("disease-free") ||
      q.includes("outlook")
    ) {
      return { type: "prognosis", description: "Find prognosis and survival data" };
    }

    // ── Comparison queries ────────────────────────────────────────────────
    if (
      q.includes("compare") || q.includes("versus") ||
      q.includes(" vs ") || q.includes("better than") ||
      q.includes("difference between") || q.includes("which is better") ||
      q.includes("which has better") || q.includes("superiority") ||
      q.includes("head-to-head") || q.includes("non-inferior")
    ) {
      return { type: "comparison", description: "Find comparative studies" };
    }

    // ── Side effects queries ──────────────────────────────────────────────
    if (
      q.includes("side effect") || q.includes("adverse") ||
      q.includes("risk of") || q.includes("danger") ||
      q.includes("complication") || q.includes("toxicity") ||
      q.includes("harm") || q.includes("tolerability") ||
      q.includes("safe to take") || q.includes("is it safe")
    ) {
      return { type: "side_effects", description: "Find safety and adverse effect data" };
    }

    // ── Cost / access queries ─────────────────────────────────────────────
    if (
      q.includes("cost") || q.includes("affordable") ||
      q.includes("available in") || q.includes("insurance") ||
      q.includes("covered") || q.includes("generic") ||
      q.includes("price") || q.includes("reimbursement") ||
      q.includes("access to")
    ) {
      return { type: "access_cost", description: "Find access and cost-related research" };
    }

    // ── Bare disease name → show latest clinical findings ─────────────────
    const BARE_DISEASE_SIGNALS = [
      "parkinson", "alzheimer", "diabetes", "cancer", "epilepsy",
      "depression", "anxiety", "stroke", "asthma", "copd", "hypertension",
      "arthritis", "lupus", "psoriasis", "obesity", "schizophrenia",
      "autism", "migraine", "osteoporosis", "heart disease", "heart failure",
      "kidney disease", "liver disease", "multiple sclerosis", "crohn",
    ];

    const isBareDiseaseQuery =
      BARE_DISEASE_SIGNALS.some((d) => q.includes(d)) &&
      !q.includes("treatment") && !q.includes("therapy") &&
      !q.includes("trial") && !q.includes("research") &&
      !q.includes("symptom") && !q.includes("diagnos") &&
      !q.includes("prevent") && !q.includes("prognos") &&
      !q.includes("cause") && !q.includes("mechanism") &&
      !q.includes("side") && !q.includes("cost") &&
      !q.includes("researcher") && !q.includes("study") &&
      q.split(/\s+/).filter((w) => w.length > 2).length <= 4;

    if (isBareDiseaseQuery) {
      return { type: "recent_research", description: "Show latest research on this condition" };
    }

    return { type: "general", description: "Find relevant research on this topic" };
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBMED QUERY BUILDER
  // ════════════════════════════════════════════════════════════════════════

  buildPubMedQuery(disease, intent, originalQuery, currentYear) {
    const minYear = currentYear - 3;

    // ✅ For clinical_trials intent: extract the actual disease from the query
    // "clinical trials for diabetes" → disease = "diabetes" not "lung cancer"
    const effectiveDisease =
      intent.type === "clinical_trials"
        ? this._extractQueryDisease(originalQuery, disease) || disease
        : disease;

    const diseaseTag = effectiveDisease
      ? `("${effectiveDisease}"[Title/Abstract] OR "${effectiveDisease}"[MeSH Terms])`
      : "";

    const drugFound = [...this.knownDrugs].find((drug) =>
      originalQuery.toLowerCase().includes(drug),
    );

    const suppMatch = originalQuery.match(
      /vitamin\s+[A-Za-z0-9]+|omega[-\s]?\d+|zinc|magnesium|calcium|selenium|iron|folate|folic\s+acid|probiotic|fish\s+oil|coq10|turmeric|curcumin|ashwagandha|melatonin/i,
    );
    const foodMatch =
      !suppMatch &&
      originalQuery.match(
        /spicy|capsaicin|sugar|alcohol|coffee|tea|fruit|vegetable|dairy|food|diet|exercise|smoking|sleep|nutrition/i,
      );

    const supplement = suppMatch ? suppMatch[0] : "";
    const food       = foodMatch ? foodMatch[0] : "";

    // ── Post-progression query ────────────────────────────────────────────
    const queryLower = originalQuery.toLowerCase();
    const isPostProgressionQuery =
      queryLower.includes("stops working") || queryLower.includes("stopped working") ||
      queryLower.includes("after immunotherapy") || queryLower.includes("after chemotherapy") ||
      queryLower.includes("progressed on") || queryLower.includes("after progression") ||
      queryLower.includes("post-immunotherapy") || queryLower.includes("post-ici") ||
      queryLower.includes("next line after") || queryLower.includes("second line after") ||
      queryLower.includes("salvage") || queryLower.includes("rechallenge") ||
      queryLower.includes("refractory");

    if (isPostProgressionQuery && effectiveDisease && intent.type === "treatment_solutions") {
      const failedTreatment =
        queryLower.includes("immunotherapy") || queryLower.includes("pd-1") ||
        queryLower.includes("pd-l1") || queryLower.includes("ici")
          ? `("after immunotherapy"[Title/Abstract] OR "PD-1 failure"[Title/Abstract] OR "ICI failure"[Title/Abstract] OR "second-line"[Title/Abstract] OR "salvage"[Title/Abstract])`
          : queryLower.includes("alectinib") || queryLower.includes("alk")
            ? `("after alectinib"[Title/Abstract] OR "ALK resistance"[Title/Abstract] OR "lorlatinib"[Title/Abstract] OR "post-alectinib"[Title/Abstract])`
            : queryLower.includes("egfr") || queryLower.includes("tki")
              ? `("EGFR resistance"[Title/Abstract] OR "TKI failure"[Title/Abstract] OR "post-TKI"[Title/Abstract] OR "osimertinib resistance"[Title/Abstract])`
              : `("second-line"[Title/Abstract] OR "salvage therapy"[Title/Abstract] OR "subsequent treatment"[Title/Abstract])`;

      console.log(`   🔄 Post-progression query detected`);
      return (
        `${diseaseTag} AND ${failedTreatment} AND ` +
        `("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND ` +
        `(${minYear}:${currentYear}[PDAT])`
      );
    }

    // ── CNS / BBB query ───────────────────────────────────────────────────
    const isCNSQuery =
      queryLower.includes("blood-brain barrier") || queryLower.includes("blood brain barrier") ||
      queryLower.includes("bbb") || queryLower.includes("cns penetrat") ||
      queryLower.includes("intracranial") || queryLower.includes("brain metastases") ||
      queryLower.includes("brain metastasis") || queryLower.includes("brain mets") ||
      queryLower.includes("leptomeningeal");

    if (isCNSQuery && effectiveDisease && intent.type === "treatment_solutions") {
      const cnsMinYear = currentYear - 6;
      return (
        `${diseaseTag} AND ` +
        `("brain metastases"[Title/Abstract] OR "brain metastasis"[Title/Abstract] OR ` +
        `"intracranial"[Title/Abstract] OR "CNS efficacy"[Title/Abstract] OR ` +
        `"blood-brain barrier"[Title/Abstract] OR "leptomeningeal"[Title/Abstract]) AND ` +
        `("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND ` +
        `(${cnsMinYear}:${currentYear}[PDAT])`
      );
    }

    const queries = {

      // ── treatment_solutions ─────────────────────────────────────────────
      treatment_solutions: (() => {
        const procedureFound = this.procedureTerms.find((p) =>
          originalQuery.toLowerCase().includes(p),
        );
        if (procedureFound && effectiveDisease) {
          return `${diseaseTag} AND "${procedureFound}"[Title/Abstract] AND (${minYear}:${currentYear}[PDAT])`;
        }
        if (drugFound && effectiveDisease) {
          return `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (${minYear}:${currentYear}[PDAT])`;
        }
        if (effectiveDisease) {
          return (
            `${diseaseTag} AND ` +
            `(treatment[Title] OR therapy[Title] OR efficacy[Title] OR outcome[Title] OR survival[Title] OR response[Title]) AND ` +
            `("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type] OR "systematic review"[Publication Type]) AND ` +
            `(${minYear}:${currentYear}[PDAT])`
          );
        }
        return `${originalQuery} treatment efficacy outcome randomized`;
      })(),

      // ── clinical_trials ─────────────────────────────────────────────────
      // ✅ FIX: Uses effectiveDisease (extracted from query, not stored disease)
      // "clinical trials for diabetes" in lung cancer conversation
      // → searches for diabetes trials, not lung cancer trials
      clinical_trials: (() => {
        const trialDisease = this._extractQueryDisease(originalQuery, disease);
        const trialTag = trialDisease
          ? `("${trialDisease}"[Title/Abstract] OR "${trialDisease}"[MeSH Terms])`
          : diseaseTag;

        if (trialTag) {
          return (
            `${trialTag} AND ` +
            `(treatment[Title] OR therapy[Title] OR drug[Title] OR intervention[Title] OR efficacy[Title]) AND ` +
            `"clinical trial"[Publication Type] AND ` +
            `(${minYear}:${currentYear}[PDAT])`
          );
        }
        // No disease context — extract from query
        const queryDiseaseName = originalQuery
          .replace(/clinical\s+trials?\s*(for|in|of|on)?\s*/i, "")
          .replace(/['"]/g, "")
          .trim();
        return `${queryDiseaseName} treatment intervention clinical trial randomized`;
      })(),

      // ── recent_research ─────────────────────────────────────────────────
      recent_research: (() => {
        if (effectiveDisease) {
          return (
            `${diseaseTag} AND ` +
            `("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type] OR "systematic review"[Publication Type]) AND ` +
            `(${minYear}:${currentYear}[PDAT])`
          );
        }
        return `${originalQuery} clinical trial randomized meta-analysis`;
      })(),

      // ── researchers ─────────────────────────────────────────────────────
      researchers: effectiveDisease
        ? `${diseaseTag} AND review[Title] AND (${minYear}:${currentYear}[PDAT])`
        : `${originalQuery} review`,

      // ── safety_efficacy ─────────────────────────────────────────────────
      safety_efficacy: (() => {
        if (supplement && effectiveDisease) {
          return `"${supplement}"[Title/Abstract] AND ${diseaseTag} AND (safety OR efficacy OR supplementation OR deficiency OR association OR outcome)`;
        }
        if (food && effectiveDisease) {
          return (
            `${diseaseTag} AND ` +
            `(diet[Title] OR nutrition[Title] OR dietary[Title] OR food[Title] OR "supportive care"[Title] OR lifestyle[Title]) AND ` +
            `(${minYear}:${currentYear}[PDAT])`
          );
        }
        return effectiveDisease
          ? `${diseaseTag} AND (safety[Title] OR efficacy[Title] OR adverse[Title])`
          : `${originalQuery} safety efficacy`;
      })(),

      // ── mechanism ───────────────────────────────────────────────────────
      mechanism: (() => {
        if (drugFound && effectiveDisease) {
          return `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (mechanism[Title] OR pathway[Title])`;
        }
        return effectiveDisease
          ? `${diseaseTag} AND (mechanism[Title] OR pathway[Title] OR pathogenesis[Title])`
          : `${originalQuery} mechanism pathway`;
      })(),

      // ── symptoms_diagnosis ──────────────────────────────────────────────
      symptoms_diagnosis: effectiveDisease
        ? `${diseaseTag} AND (diagnosis[Title] OR symptom[Title] OR biomarker[Title] OR screening[Title])`
        : `${originalQuery} diagnosis symptom`,

      // ── prevention ──────────────────────────────────────────────────────
      prevention: effectiveDisease
        ? (
            `${diseaseTag} AND ` +
            `(prevention[Title] OR prophylaxis[Title] OR "risk reduction"[Title]) AND ` +
            `("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND ` +
            `(${minYear}:${currentYear}[PDAT])`
          )
        : `${originalQuery} prevention`,

      // ── prognosis ───────────────────────────────────────────────────────
      prognosis: effectiveDisease
        ? `${diseaseTag} AND (prognosis[Title] OR survival[Title] OR mortality[Title] OR outcome[Title]) AND (${minYear}:${currentYear}[PDAT])`
        : `${originalQuery} prognosis survival`,

      // ── comparison ──────────────────────────────────────────────────────
      comparison: (() => {
        if (drugFound && effectiveDisease) {
          return (
            `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND ` +
            `(versus[Title] OR compared[Title] OR randomized[Title]) AND ` +
            `("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND ` +
            `(${minYear}:${currentYear}[PDAT])`
          );
        }
        return effectiveDisease
          ? (
              `${diseaseTag} AND ` +
              `(versus[Title] OR compared[Title] OR randomized[Title]) AND ` +
              `("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type] OR "meta-analysis"[Publication Type]) AND ` +
              `(${minYear}:${currentYear}[PDAT])`
            )
          : `${originalQuery} comparison randomized`;
      })(),

      // ── side_effects ─────────────────────────────────────────────────────
      side_effects: (() => {
        if (drugFound) {
          return effectiveDisease
            ? `"${drugFound}"[Title/Abstract] AND ${diseaseTag} AND (adverse[Title] OR "side effect"[Title] OR toxicity[Title])`
            : `"${drugFound}"[Title/Abstract] AND (adverse[Title] OR "side effect"[Title] OR toxicity[Title])`;
        }
        return effectiveDisease
          ? `${diseaseTag} AND (adverse[Title] OR "side effect"[Title] OR toxicity[Title] OR safety[Title])`
          : `${originalQuery} adverse safety`;
      })(),

      // ── access_cost ──────────────────────────────────────────────────────
      access_cost: effectiveDisease
        ? `${diseaseTag} AND (cost[Title] OR access[Title] OR affordable[Title])`
        : `${originalQuery} cost access`,

      // ── general ──────────────────────────────────────────────────────────
      general: effectiveDisease
        ? `${diseaseTag} AND (${minYear}:${currentYear}[PDAT])`
        : originalQuery,
    };

    return queries[intent.type] || queries.general;
  }

  // ════════════════════════════════════════════════════════════════════════
  // OPENALEX QUERY BUILDER
  // ════════════════════════════════════════════════════════════════════════

  buildOpenAlexQuery(disease, intent, originalQuery) {
    const currentYear = new Date().getFullYear();
    const queryLower  = originalQuery.toLowerCase();

    const drugFound = [...this.knownDrugs].find((drug) =>
      queryLower.includes(drug),
    );

    const suppMatch = originalQuery.match(
      /vitamin\s+[A-Za-z0-9]+|omega[-\s]?\d+|zinc|magnesium|calcium|selenium|iron|folate|folic\s+acid|probiotic|fish\s+oil|coq10|turmeric|curcumin|ashwagandha|melatonin|collagen/i,
    );
    const foodMatch =
      !suppMatch &&
      originalQuery.match(
        /spicy|capsaicin|sugar|alcohol|coffee|tea|fruit|vegetable|dairy|food|diet|exercise|smoking|sleep|nutrition/i,
      );

    const supplement = suppMatch ? suppMatch[0] : "";
    const food       = foodMatch ? foodMatch[0] : "";

    // ✅ For clinical_trials: use query disease, not stored disease
    const effectiveDisease =
      intent.type === "clinical_trials"
        ? this._extractQueryDisease(originalQuery, disease) || disease
        : disease;

    const enrichment = this._getDiseaseEnrichment(effectiveDisease).join(" ");

    // ── Post-progression detection ────────────────────────────────────────
    const isPostProgressionQuery =
      queryLower.includes("stops working") || queryLower.includes("stopped working") ||
      queryLower.includes("after immunotherapy") || queryLower.includes("after chemotherapy") ||
      queryLower.includes("progressed on") || queryLower.includes("after progression") ||
      queryLower.includes("salvage") || queryLower.includes("rechallenge") ||
      queryLower.includes("refractory") || queryLower.includes("resistant");

    // ── CNS detection ─────────────────────────────────────────────────────
    const isCNSQuery =
      queryLower.includes("blood-brain barrier") || queryLower.includes("bbb") ||
      queryLower.includes("intracranial") || queryLower.includes("brain metastases") ||
      queryLower.includes("brain metastasis") || queryLower.includes("brain mets") ||
      queryLower.includes("leptomeningeal") || queryLower.includes("cns penetrat");

    // ── Detect failed treatment for progression queries ────────────────────
    const getFailedTreatment = () => {
      if (queryLower.includes("immunotherapy") || queryLower.includes("pd-1") ||
          queryLower.includes("pd-l1") || queryLower.includes("ici") ||
          queryLower.includes("pembrolizumab") || queryLower.includes("nivolumab"))
        return "immunotherapy checkpoint inhibitor";
      if (queryLower.includes("alectinib") ||
          (queryLower.includes("alk") && isPostProgressionQuery))
        return "alectinib ALK inhibitor";
      if (queryLower.includes("osimertinib") || queryLower.includes("egfr") ||
          queryLower.includes("tki"))
        return "EGFR TKI osimertinib";
      if (queryLower.includes("chemotherapy") || queryLower.includes("platinum"))
        return "platinum-based chemotherapy";
      return "prior treatment";
    };

    const queries = {

      // ── treatment_solutions ─────────────────────────────────────────────
      treatment_solutions: (() => {
        // Post-progression
        if (isPostProgressionQuery && effectiveDisease) {
          const failedTreatment = getFailedTreatment();
          return (
            `${effectiveDisease} second-line treatment after ${failedTreatment} ` +
            `failure progression options outcomes salvage therapy clinical trial ${currentYear}`
          );
        }
        // CNS / BBB
        if (isCNSQuery && effectiveDisease) {
          return (
            `${effectiveDisease} brain metastases intracranial response ` +
            `CNS penetration systemic therapy CNS efficacy ` +
            `intracranial ORR progression-free survival ${currentYear}`
          );
        }
        // Procedure
        const procedureFound = this.procedureTerms.find((p) => queryLower.includes(p));
        if (procedureFound && effectiveDisease) {
          return `${effectiveDisease} ${procedureFound} efficacy outcomes clinical results randomized trial ${currentYear}`;
        }
        // Drug
        if (drugFound && effectiveDisease) {
          return `${drugFound} ${effectiveDisease} efficacy outcomes clinical trial survival ${currentYear}`;
        }
        // General treatment
        return effectiveDisease
          ? `${effectiveDisease} treatment efficacy outcomes randomized controlled trial survival ${enrichment} ${currentYear}`
          : `${originalQuery} efficacy outcomes results randomized trial`;
      })(),

      // ── clinical_trials ─────────────────────────────────────────────────
      // ✅ FIX: Uses the disease FROM THE QUERY, not stored disease
      // "clinical trials for diabetes" → searches "diabetes treatment drug trial"
      // NOT "lung cancer randomized trial" (which was the bug)
      clinical_trials: (() => {
        const trialDisease = this._extractQueryDisease(originalQuery, disease);
        if (trialDisease) {
          return (
            `${trialDisease} treatment drug intervention randomized controlled trial ` +
            `phase outcomes efficacy safety ${currentYear}`
          );
        }
        return effectiveDisease
          ? `${effectiveDisease} randomized controlled trial clinical results phase outcomes ${currentYear}`
          : `${originalQuery} clinical trial randomized treatment outcomes`;
      })(),

      // ── recent_research ─────────────────────────────────────────────────
      recent_research: effectiveDisease
        ? `${effectiveDisease} randomized controlled trial clinical outcomes treatment efficacy ${enrichment} ${currentYear}`
        : `${originalQuery} clinical trial outcomes ${currentYear}`,

      // ── researchers ─────────────────────────────────────────────────────
      researchers: effectiveDisease
        ? `${effectiveDisease} research breakthrough key findings review ${currentYear}`
        : `${originalQuery} research authors review`,

      // ── safety_efficacy ─────────────────────────────────────────────────
      safety_efficacy: (() => {
        if (supplement && effectiveDisease) {
          return `${supplement} ${effectiveDisease} patients safety efficacy supplementation outcomes`;
        }
        if (food && effectiveDisease) {
          return `${effectiveDisease} patients diet nutrition food ${food} safety clinical recommendation`;
        }
        return effectiveDisease
          ? `${effectiveDisease} safety efficacy adverse effects`
          : `${originalQuery} safety efficacy`;
      })(),

      // ── mechanism ───────────────────────────────────────────────────────
      mechanism: (() => {
        if (drugFound && effectiveDisease) {
          return `${drugFound} ${effectiveDisease} mechanism action pathway molecular`;
        }
        return effectiveDisease
          ? `${effectiveDisease} molecular mechanism pathogenesis pathway`
          : `${originalQuery} mechanism pathway biology`;
      })(),

      // ── symptoms_diagnosis ──────────────────────────────────────────────
      symptoms_diagnosis: effectiveDisease
        ? `${effectiveDisease} diagnosis symptoms biomarkers screening detection`
        : `${originalQuery} diagnosis symptoms detection`,

      // ── prevention ──────────────────────────────────────────────────────
      prevention: effectiveDisease
        ? `${effectiveDisease} prevention risk reduction prophylaxis randomized trial`
        : `${originalQuery} prevention risk reduction`,

      // ── prognosis ───────────────────────────────────────────────────────
      prognosis: effectiveDisease
        ? `${effectiveDisease} prognosis survival rate mortality outcomes randomized cohort`
        : `${originalQuery} prognosis survival`,

      // ── comparison ──────────────────────────────────────────────────────
      comparison: (() => {
        // Drug vs drug
        if (drugFound && effectiveDisease) {
          return `${drugFound} ${effectiveDisease} comparison versus randomized controlled trial outcomes survival ${currentYear}`;
        }
        // Procedure vs procedure (SRS vs WBRT, etc.)
        const procedureFound = this.procedureTerms.find((p) => queryLower.includes(p));
        if (procedureFound && effectiveDisease) {
          return `${effectiveDisease} ${procedureFound} versus comparison randomized controlled trial outcomes ${currentYear}`;
        }
        // Extract "X vs Y" pattern
        const vsPatterns = [
          /(\w[\w\s]+?)\s+vs\.?\s+([\w\s]+?)(?:\s+for|\s+in|\s+which|\s+$)/i,
          /(\w[\w\s]+?)\s+versus\s+([\w\s]+?)(?:\s+for|\s+in|\s+which|\s+$)/i,
        ];
        for (const pattern of vsPatterns) {
          const match = originalQuery.match(pattern);
          if (match) {
            const side1 = match[1].trim();
            const side2 = match[2].trim();
            console.log(`   🔄 Comparison extracted: "${side1}" vs "${side2}"`);
            return effectiveDisease
              ? `${effectiveDisease} ${side1} versus ${side2} randomized controlled trial outcomes ${currentYear}`
              : `${side1} versus ${side2} randomized controlled trial outcomes ${currentYear}`;
          }
        }
        return effectiveDisease
          ? `${effectiveDisease} comparison versus randomized controlled trial outcomes ${currentYear}`
          : `${originalQuery} comparison versus randomized trial`;
      })(),

      // ── side_effects ─────────────────────────────────────────────────────
      side_effects: (() => {
        if (drugFound) {
          return effectiveDisease
            ? `${drugFound} ${effectiveDisease} adverse effects safety toxicity grade 3`
            : `${drugFound} adverse effects safety toxicity`;
        }
        return effectiveDisease
          ? `${effectiveDisease} adverse effects safety toxicity grade 3 immune-related`
          : `${originalQuery} adverse effects safety`;
      })(),

      // ── access_cost ──────────────────────────────────────────────────────
      access_cost: effectiveDisease
        ? `${effectiveDisease} treatment cost access healthcare`
        : `${originalQuery} cost access`,

      // ── general ──────────────────────────────────────────────────────────
      general: effectiveDisease
        ? `${effectiveDisease} ${originalQuery} clinical research outcomes`
        : originalQuery,
    };

    return queries[intent.type] || queries.general;
  }

  // ════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ════════════════════════════════════════════════════════════════════════

  async expandQuery(originalQuery, disease, context = {}) {
    try {
      this.currentYear = new Date().getFullYear();
      const searchMode = context.searchMode || "keyword";

      if (searchMode === "semantic") {
        // SMART mode: LLM-powered expansion
        return this._runSmartExpansion(originalQuery, disease, context);
      }

      // FAST mode: rule-based expansion
      return this._runFastExpansion(originalQuery, disease, context);

    } catch (error) {
      console.error("Query expansion error:", error);
      const fallback = disease ? `${disease} ${originalQuery}` : originalQuery;
      context._intent = { type: "general", description: "General medical research" };
      context._pubmedQuery = fallback;
      context._openalexQuery = fallback;
      context._semanticQuery = fallback;
      context._expansionTerms = [];
      context._mustHaveSignals = [];
      context._avoidTerms = [];
      return fallback;
    }
  }

  // ── FAST expansion ────────────────────────────────────────────────────────
  _runFastExpansion(originalQuery, disease, context) {
    const intent = this.detectQueryIntent(originalQuery);

    console.log(`\n⚡ FAST expansion: "${originalQuery}"`);
    console.log(`   Intent: "${intent.type}" — ${intent.description}`);

    // ✅ For clinical_trials: log the effective disease being used
    if (intent.type === "clinical_trials") {
      const trialDisease = this._extractQueryDisease(originalQuery, disease);
      if (trialDisease && trialDisease !== disease) {
        console.log(`   🔄 Query disease override: "${disease}" → "${trialDisease}"`);
      }
    }

    const pubmedQuery   = this.buildPubMedQuery(disease, intent, originalQuery, this.currentYear);
    const openalexQuery = this.buildOpenAlexQuery(disease, intent, originalQuery);
    const enrichment    = this._getDiseaseEnrichment(disease).slice(0, 2).join(" ");
    const semanticQuery = disease
      ? `${disease} ${originalQuery} clinical outcomes treatment efficacy randomized trial ${enrichment}`
      : `${originalQuery} clinical outcomes treatment efficacy`;

    console.log(`   PubMed:   "${pubmedQuery.substring(0, 100)}"`);
    console.log(`   OpenAlex: "${openalexQuery}"`);

    context._intent          = intent;
    context._pubmedQuery     = pubmedQuery;
    context._openalexQuery   = openalexQuery;
    context._semanticQuery   = semanticQuery;
    context._expansionTerms  = [];
    context._mustHaveSignals = [];
    context._avoidTerms      = [];
    context._clinicalFocus   = originalQuery;

    return openalexQuery;
  }

  // ── SMART expansion ───────────────────────────────────────────────────────
  async _runSmartExpansion(originalQuery, disease, context) {
    console.log(`\n🧠 SMART expansion: "${originalQuery}"`);

    try {
      const { default: llmService } = await import("../ai/llmService.js");

      const systemPrompt = `You are a medical research query expert.
Analyze the clinical intent and generate NATURAL LANGUAGE search queries.
DO NOT write PubMed syntax. Write only natural language.

Rules:
1. Understand the CLINICAL INTENT — what outcome does the user need?
2. If query says "clinical trials for diabetes" and stored disease is "lung cancer"
   → the user wants DIABETES trials, not lung cancer trials
3. Expand with specific medical terminology
4. Target papers with: overall survival, response rates, phase 3, randomized trials
5. mustHaveSignals = short phrases proving a paper has ACTUAL clinical data
6. avoidTerms = title-level terms indicating irrelevant papers

Return ONLY this JSON:
{
  "intent": "treatment_solutions|recent_research|prognosis|mechanism|symptoms_diagnosis|prevention|comparison|side_effects|clinical_trials|safety_efficacy|researchers|general",
  "intentDescription": "one sentence: what clinical answer does the user need",
  "clinicalFocus": "specific clinical problem in 5 words",
  "openalexQuery": "natural language query — 10-15 words",
  "semanticQuery": "rich description of ideal paper — 20-30 words",
  "expansionTerms": ["term1", "term2", "term3"],
  "mustHaveSignals": ["signal1", "signal2"],
  "avoidTerms": ["avoid1", "avoid2"]
}`;

      const userPrompt = `User query: "${originalQuery}"
Stored disease context: "${disease || "not specified"}"
Current year: ${this.currentYear}

IMPORTANT: If the user asks about a DIFFERENT disease than the stored context,
use the disease from the QUERY, not the stored context.
Example: "clinical trials for diabetes" with stored "lung cancer"
→ generate queries about DIABETES, not lung cancer

Return JSON only.`;

      const response = await llmService.generate(
        `${systemPrompt}\n\n${userPrompt}`,
        { temperature: 0.1, max_tokens: 500 },
      );

      const jsonMatch = (response.text || "").match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in LLM expansion response");

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.intent || !parsed.openalexQuery) {
        throw new Error("LLM expansion missing required fields");
      }

      const VALID_INTENTS = [
        "treatment_solutions", "recent_research", "prognosis", "mechanism",
        "symptoms_diagnosis", "prevention", "comparison", "side_effects",
        "clinical_trials", "safety_efficacy", "researchers", "general",
      ];

      if (!VALID_INTENTS.includes(parsed.intent)) {
        parsed.intent = "treatment_solutions";
      }

      const intent = {
        type: parsed.intent,
        description: parsed.intentDescription || "Find relevant medical research",
      };

      // PubMed query is ALWAYS rule-based (prevents broken syntax)
      const pubmedQuery = this.buildPubMedQuery(
        disease, intent, originalQuery, this.currentYear,
      );

      const openalexQuery = parsed.openalexQuery ||
        this.buildOpenAlexQuery(disease, intent, originalQuery);

      const semanticQuery = parsed.semanticQuery ||
        `${disease || ""} ${originalQuery} clinical outcomes treatment efficacy randomized trial`;

      console.log(`   Intent:        "${intent.type}" — ${intent.description}`);
      console.log(`   Clinical focus: ${parsed.clinicalFocus || "N/A"}`);
      console.log(`   Must-have:      ${(parsed.mustHaveSignals || []).slice(0, 2).join(", ")}`);
      console.log(`   Avoid:          ${(parsed.avoidTerms || []).slice(0, 2).join(", ")}`);
      console.log(`   PubMed:         "${pubmedQuery.substring(0, 100)}" [rule-based ✅]`);
      console.log(`   OpenAlex:       "${openalexQuery}"`);

      context._intent          = intent;
      context._pubmedQuery     = pubmedQuery;
      context._openalexQuery   = openalexQuery;
      context._semanticQuery   = semanticQuery;
      context._expansionTerms  = parsed.expansionTerms  || [];
      context._mustHaveSignals = parsed.mustHaveSignals || [];
      context._avoidTerms      = parsed.avoidTerms      || [];
      context._clinicalFocus   = parsed.clinicalFocus   || originalQuery;

      return openalexQuery;

    } catch (llmError) {
      console.warn(`⚠️  SMART expansion failed (${llmError.message}) — falling back to FAST`);
      return this._runFastExpansion(originalQuery, disease, context);
    }
  }

  // ── Utility methods ────────────────────────────────────────────────────────
  extractIntent(query) {
    return this.detectQueryIntent(query);
  }

  generateSearchVariations(query, disease) {
    return [query, disease ? `${disease} ${query}` : query].filter(Boolean);
  }
}

export default new QueryExpansionService();