// ============================================================
// embeddingService.js — Semantic Similarity Engine
// ============================================================
// Architecture:
//   Layer 1 : TF-IDF weighted term vectors
//             Corpus-relative IDF built once per search batch
//             Rare clinical terms get higher IDF weight
//             Common words (stop words) get zero weight
//
//   Layer 2 : Cosine similarity
//             Measures semantic direction match between
//             query vector and paper vector
//             Length-independent — short abstract vs long
//             abstract scored fairly
//
//   Layer 3 : Clinical term boosting
//             Domain-specific terms (HR, OS, PFS, RCT etc.)
//             get 2.5x IDF multiplier — these are the most
//             discriminative signals in medical literature
//
//   Layer 4 : OpenAlex concept matching
//             Uses the semantic concepts OpenAlex assigns
//             to each paper (e.g. "Clinical Trial", "Oncology")
//             Weighted by OpenAlex concept relevance score
//
//   Layer 5 : Clinical bigram matching
//             Multi-word phrases like "overall survival",
//             "phase 3", "hazard ratio" matched as units
//             Single word matching would miss clinical meaning
//
// Outputs per paper:
//   _semanticScore   : 0-1  cosine similarity to query
//   _usefulnessScore : 0-100 intent-profile match
//   _solutionScore   : 0-100 real results present
//   _safetyScore     : 0-100 safety data present
//
// Performance: ~15-30ms for 200 papers (no API calls)
// ============================================================

class EmbeddingService {
  constructor() {

    // ── Clinical domain term boosting ─────────────────────────────────────
    // These terms are given 2.5x IDF weight because they are
    // the most discriminative signals in medical literature.
    // "pembrolizumab" appearing in a paper is far more informative
    // than "treatment" appearing — this reflects that.
    this.CLINICAL_BOOST_TERMS = new Set([
      // Efficacy endpoints
      "overall survival", "progression-free survival", "response rate",
      "objective response", "complete response", "partial response",
      "disease-free survival", "event-free survival", "relapse-free",
      "hazard ratio", "odds ratio", "relative risk", "confidence interval",
      "median os", "median pfs", "orr", "dcr", "disease control",
      // Safety endpoints
      "adverse events", "grade 3", "grade 4", "treatment-related",
      "immune-related", "dose-limiting", "discontinuation", "toxicity",
      "tolerability", "well-tolerated", "safety profile",
      // Study design
      "randomized controlled trial", "phase 3", "phase iii", "phase 2",
      "meta-analysis", "systematic review", "prospective cohort",
      "double-blind", "placebo-controlled", "open-label",
      // Biomarkers
      "egfr", "alk", "ros1", "kras", "braf", "her2", "pd-l1", "tmb",
      "mutation", "amplification", "fusion", "biomarker",
      // Diagnosis
      "sensitivity", "specificity", "auc", "roc", "positive predictive",
      "negative predictive", "diagnostic accuracy",
      // Prevention
      "risk reduction", "relative risk reduction", "number needed to treat",
      "prevention", "prophylaxis", "protective factor",
      // Mechanism
      "mechanism of action", "signaling pathway", "molecular target",
      "resistance mechanism",
    ]);

    // ── Stop words — zero weight ──────────────────────────────────────────
    this.STOP_WORDS = new Set([
      "the","and","for","with","that","this","are","from","has","have",
      "been","was","were","not","but","they","their","also","can","may",
      "would","could","should","will","its","all","one","two","new","more",
      "use","used","using","study","studies","research","based","data",
      "results","patients","analysis","method","methods","however","although",
      "therefore","thus","among","between","within","during","after","before",
      "these","those","such","each","both","other","into","over","under",
      "than","then","when","where","which","who","whom","whose","what",
      "how","why","our","their","your","its","his","her","we","they",
      "i","a","an","in","on","at","to","of","is","it","be","as","or",
      "by","do","did","had","him","her","his","she","he","they","we",
    ]);

    // ── IDF cache — rebuilt once per search session ───────────────────────
    this._idfCache = new Map();
    this._corpusSize = 0;

    // ── Clinical bigrams ──────────────────────────────────────────────────
    // These multi-word phrases lose meaning when split into unigrams.
    // Matched as units in both query and paper text.
    this.CLINICAL_BIGRAMS = [
      "overall survival", "progression free", "response rate", "hazard ratio",
      "phase 3", "phase iii", "phase 2", "phase ii", "phase 1", "phase i",
      "randomized controlled", "clinical trial", "systematic review",
      "meta analysis", "adverse events", "grade 3", "grade 4",
      "well tolerated", "safety profile", "dose reduction", "quality of life",
      "blood pressure", "heart rate", "body weight", "body mass",
      "risk reduction", "risk factor", "odds ratio", "relative risk",
      "confidence interval", "p value", "statistical significance",
      "complete response", "partial response", "stable disease",
    ];

    // ── Solution signals — hard outcome language ──────────────────────────
    // Used in computeSolutionScore() to detect papers with real results
    this.HARD_OUTCOME_PATTERNS = [
      /\d+\.?\d*\s*%\s*(?:response|survival|improvement|reduction|patients)/i,
      /hazard ratio\s*[=:]\s*0?\.\d+/i,
      /\bhr\s*[=:]\s*0?\.\d+/i,
      /median\s+(?:os|pfs|survival)\s+(?:of|was|:)?\s*\d+/i,
      /p\s*[<=>]\s*0\.\d+/i,
      /95%\s*ci/i,
      /odds ratio\s*[=:]\s*\d+\.?\d*/i,
      /\d+\.?\d*\s*months?\s+(?:os|pfs|survival)/i,
      /sensitivity\s+of\s+\d+\.?\d*\s*%/i,
      /specificity\s+of\s+\d+\.?\d*\s*%/i,
      /auc\s+of\s+\d+\.?\d*/i,
      /hba1c\s+(?:reduced|decreased|lowered)\s+by\s+\d+/i,
    ];

    this.RESULT_LANGUAGE = [
      "we found", "we observed", "we demonstrated", "results showed",
      "results demonstrate", "results indicate", "our findings",
      "the study showed", "demonstrated that", "showed that",
      "revealed that", "concluded that", "our results suggest",
      "significantly improved", "significantly reduced",
      "was associated with", "were associated with",
      "patients achieved", "patients who received",
    ];

    this.SAFETY_RESULT_TERMS = [
      "grade 3", "grade 4", "adverse events", "well-tolerated",
      "safety profile", "treatment-related", "immune-related",
      "discontinuation rate", "serious adverse", "no increased risk",
      "hepatotoxicity", "nephrotoxicity", "cardiotoxicity",
      "tolerability", "dose reduction", "irAE",
    ];

    this.PROTOCOL_SIGNALS = [
      "this study aims", "this trial aims", "we aim to",
      "will be enrolled", "is ongoing", "study protocol",
      "protocol for a", "will be recruited", "we plan to",
      "this article describes a protocol",
    ];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Build IDF index from corpus
  // Call once per search session with ALL fetched papers
  // ══════════════════════════════════════════════════════════════════════════
  buildCorpusIDF(papers) {
    if (!Array.isArray(papers) || papers.length === 0) return;

    this._idfCache.clear();
    this._corpusSize = papers.length;

    const df = new Map();

    for (const paper of papers) {
      const text = this._getPaperText(paper);
      const terms = new Set(this._extractTerms(text));
      for (const term of terms) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    // IDF = log((N+1) / (df+1)) + 1  (smoothed to avoid zero division)
    for (const [term, freq] of df.entries()) {
      const idf = Math.log((this._corpusSize + 1) / (freq + 1)) + 1;
      this._idfCache.set(term, idf);
    }

    // Apply clinical boost — rare medical terms get extra weight
    for (const boostTerm of this.CLINICAL_BOOST_TERMS) {
      const tokens = boostTerm.split(/\s+/);
      for (const token of tokens) {
        if (this._idfCache.has(token)) {
          this._idfCache.set(token, this._idfCache.get(token) * 2.5);
        } else {
          // Term not in corpus but is clinical — give it a high base IDF
          this._idfCache.set(token, Math.log(this._corpusSize + 1) * 2.5);
        }
      }
    }

    console.log(`📊 IDF index built: ${this._idfCache.size} terms across ${this._corpusSize} documents`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Batch score all papers
  // Called once per search session — efficient for 200 papers
  // Returns papers with _semanticScore, _usefulnessScore,
  //         _solutionScore, _safetyScore attached
  // ══════════════════════════════════════════════════════════════════════════
  batchScore(queryText, papers, intentProfile = null) {
    if (!Array.isArray(papers) || papers.length === 0) return [];

    const startTime = Date.now();

    // Build IDF index from this batch
    this.buildCorpusIDF(papers);

    // Build query vector once — reused for all papers
    const queryVector = this._buildTFIDFVector(queryText);

    const scored = papers.map(paper => {
      const paperText  = this._getPaperText(paper);
      const paperVector = this._buildTFIDFVector(paperText);

      const semanticScore  = this._cosineSimilarity(queryVector, paperVector);
      const conceptBonus   = this._computeConceptBonus(queryText, paper.concepts);
      const bigramBonus    = this._computeBigramBonus(queryText, paperText);

      // Combined semantic score: cosine is dominant
      const combinedSemantic = Math.min(1.0,
        (semanticScore * 0.70) +
        (conceptBonus  * 0.15) +
        (bigramBonus   * 0.15)
      );

      const usefulnessScore = intentProfile
        ? this.computeUsefulnessScore(paper, intentProfile)
        : 0;

      const solutionScore = this.computeSolutionScore(paper);
      const safetyScore   = this.computeSafetyScore(paper);

      return {
        ...paper,
        _semanticScore  : combinedSemantic,
        _usefulnessScore: usefulnessScore,
        _solutionScore  : solutionScore,
        _safetyScore    : safetyScore,
      };
    });

    console.log(`⚡ Semantic batch scoring: ${papers.length} papers in ${Date.now() - startTime}ms`);
    return scored;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Compute usefulness score for one paper
  // Answers: "Does this paper match what the user actually needs?"
  // Based on LLM-generated intent profile from queryExpansion
  // ══════════════════════════════════════════════════════════════════════════
  computeUsefulnessScore(paper, intentProfile) {
    if (!paper || !intentProfile) return 0;

    const paperText = this._getPaperText(paper).toLowerCase();
    let score = 0;

    // mustHave — LLM said these signals must be present for paper to be useful
    const mustHaveTerms = intentProfile.mustHave || [];
    if (mustHaveTerms.length > 0) {
      const mustHaveMatches = mustHaveTerms.filter(t =>
        typeof t === "string" && paperText.includes(t.toLowerCase())
      ).length;
      // Full coverage = 50 points — this is the dominant signal
      score += (mustHaveMatches / mustHaveTerms.length) * 50;
    }

    // strongSignals — high-confidence relevance signals
    const strongTerms = intentProfile.strongSignals || [];
    if (strongTerms.length > 0) {
      const strongMatches = strongTerms.filter(t =>
        typeof t === "string" && paperText.includes(t.toLowerCase())
      ).length;
      score += Math.min(30, strongMatches * 6);
    }

    // weakSignals — supporting signals (lower weight)
    const weakTerms = intentProfile.weakSignals || [];
    if (weakTerms.length > 0) {
      const weakMatches = weakTerms.filter(t =>
        typeof t === "string" && paperText.includes(t.toLowerCase())
      ).length;
      score += Math.min(10, weakMatches * 2);
    }

    // userNeed — semantic match against LLM's description of a useful paper
    // This is the most contextually rich signal
    if (intentProfile.userNeed && intentProfile.userNeed.length > 10) {
      const needVector  = this._buildTFIDFVector(intentProfile.userNeed);
      const paperVector = this._buildTFIDFVector(paperText);
      const needSim     = this._cosineSimilarity(needVector, paperVector);
      score += needSim * 40; // 40 points max for full userNeed match
    }

    return Math.min(100, Math.max(0, score));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Compute solution presence score
  // Answers: "Does this paper contain ACTUAL results?"
  // Papers with protocol-only language score ~0
  // Papers with outcome numbers score ~80-100
  // ══════════════════════════════════════════════════════════════════════════
  computeSolutionScore(paper) {
    if (!paper) return 0;

    const abstractL = (paper.abstract || "").toLowerCase();
    const titleL    = (paper.title    || "").toLowerCase();
    const combined  = `${titleL} ${abstractL}`;
    let score = 0;

    // Hard outcome patterns — paper reports ACTUAL numbers
    for (const pattern of this.HARD_OUTCOME_PATTERNS) {
      if (pattern.test(combined)) score += 12;
    }

    // Result language — paper says "we found", "results showed" etc
    const resultMatches = this.RESULT_LANGUAGE.filter(s =>
      combined.includes(s)
    ).length;
    score += Math.min(25, resultMatches * 8);

    // Safety result signals (safety IS a solution for safety queries)
    const safetyMatches = this.SAFETY_RESULT_TERMS.filter(s =>
      combined.includes(s)
    ).length;
    score += Math.min(15, safetyMatches * 4);

    // Protocol penalty — paper is a future study with no results yet
    // Reviews and meta-analyses are exempt (they synthesize results)
    const isReview = /systematic review|meta-analysis|pooled analysis/.test(combined);
    if (!isReview) {
      const protocolMatches = this.PROTOCOL_SIGNALS.filter(s =>
        combined.includes(s)
      ).length;
      score -= protocolMatches * 25;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Compute safety relevance score
  // Answers: "Does this paper contain safety-relevant information?"
  // ══════════════════════════════════════════════════════════════════════════
  computeSafetyScore(paper) {
    if (!paper) return 0;

    const combined = this._getPaperText(paper).toLowerCase();
    const safetyMatches = this.SAFETY_RESULT_TERMS.filter(s =>
      combined.includes(s)
    ).length;

    return Math.min(100, safetyMatches * 10);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: Build TF-IDF vector for a text
  // Returns Map<term, tfidf_weight>
  // ══════════════════════════════════════════════════════════════════════════
  _buildTFIDFVector(text) {
    const terms   = this._extractTerms(text);
    const tf      = new Map();
    const vector  = new Map();

    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }

    const totalTerms = terms.length || 1;

    for (const [term, count] of tf.entries()) {
      const termTF  = count / totalTerms;
      // If term not in corpus IDF cache, use a reasonable default
      const termIDF = this._idfCache.get(term) ||
                      (Math.log((this._corpusSize || 1) + 1) + 1);
      vector.set(term, termTF * termIDF);
    }

    return vector;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: Cosine similarity between two TF-IDF vectors
  // Sparse dot product — only iterates over terms in vectorA
  // ══════════════════════════════════════════════════════════════════════════
  _cosineSimilarity(vectorA, vectorB) {
    if (!vectorA.size || !vectorB.size) return 0;

    let dotProduct  = 0;
    let magnitudeA  = 0;
    let magnitudeB  = 0;

    for (const [term, weightA] of vectorA.entries()) {
      const weightB = vectorB.get(term) || 0;
      dotProduct   += weightA * weightB;
      magnitudeA   += weightA * weightA;
    }

    for (const [, weightB] of vectorB.entries()) {
      magnitudeB += weightB * weightB;
    }

    const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    if (denominator === 0) return 0;

    return Math.min(1.0, dotProduct / denominator);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: OpenAlex concept-level matching
  // Uses semantic concepts OpenAlex assigns to each paper
  // Concepts have a relevance score (0-1) from OpenAlex
  // ══════════════════════════════════════════════════════════════════════════
  _computeConceptBonus(queryText, concepts) {
    if (!Array.isArray(concepts) || concepts.length === 0) return 0;

    const queryTokens = new Set(this._extractTerms(queryText));
    let bonus = 0;

    for (const concept of concepts) {
      if (!concept?.name) continue;
      const conceptTerms = this._extractTerms(concept.name);
      const matches = conceptTerms.filter(t => queryTokens.has(t)).length;
      if (matches > 0) {
        bonus += matches * (concept.score || 0.5) * 0.3;
      }
    }

    return Math.min(1.0, bonus);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: Clinical bigram bonus
  // Multi-word clinical phrases matched as single units
  // If both query and paper share a clinical bigram → strong signal
  // ══════════════════════════════════════════════════════════════════════════
  _computeBigramBonus(queryText, paperText) {
    const queryL = queryText.toLowerCase();
    const paperL = paperText.toLowerCase();
    let bonus = 0;

    for (const bigram of this.CLINICAL_BIGRAMS) {
      const queryHas = queryL.includes(bigram);
      const paperHas = paperL.includes(bigram);

      if (queryHas && paperHas) {
        bonus += 0.15; // both share this clinical phrase — strong signal
      } else if (queryHas && !paperHas) {
        bonus -= 0.02; // query needs it but paper doesn't — slight penalty
      }
    }

    return Math.max(0, Math.min(1.0, bonus));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: Extract and clean terms from text
  // Title is weighted 3x (prepended 3 times in _getPaperText)
  // ══════════════════════════════════════════════════════════════════════════
  _extractTerms(text) {
    if (!text || typeof text !== "string") return [];

    const cleaned = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = cleaned.split(" ").filter(w =>
      w.length > 2 && !this.STOP_WORDS.has(w)
    );

    const terms = [...words];

    // Add clinical bigrams as single tokens
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (this.CLINICAL_BIGRAMS.includes(bigram)) {
        terms.push(bigram);
      }
    }

    return terms;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: Get full text from a paper
  // Title weighted 3x — title is most discriminative field
  // ══════════════════════════════════════════════════════════════════════════
  _getPaperText(paper) {
    if (!paper) return "";
    const title    = paper.title    || "";
    const abstract = paper.abstract || "";
    const journal  = paper.journalName || "";
    // Title repeated 3 times gives it 3x weight in TF-IDF
    return `${title} ${title} ${title} ${abstract} ${journal}`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BACKWARD COMPAT: Keep original methods for any existing callers
  // ══════════════════════════════════════════════════════════════════════════
  calculateSimilarity(text1, text2) {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    const intersection = tokens1.filter(t => tokens2.includes(t));
    const union = [...new Set([...tokens1, ...tokens2])];
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  calculateRelevance(item, query, queryTokens) {
    const title    = item.title    || "";
    const abstract = item.abstract || item.summary || "";
    const combined = `${title} ${abstract}`.toLowerCase();
    let score = 0;
    queryTokens.forEach(token => {
      const matches = combined.match(new RegExp(token, "gi"));
      if (matches) score += matches.length;
    });
    queryTokens.forEach(token => {
      if (title.toLowerCase().includes(token)) score += 5;
    });
    return score;
  }

  rankByRelevance(items, query) {
    const queryTokens = this.tokenize(query);
    return items.map(item => ({
      ...item,
      relevanceScore: this.calculateRelevance(item, query, queryTokens),
    }));
  }
}

export default new EmbeddingService();