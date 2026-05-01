// ============================================================
// hybridSearchService.js — Orchestrates all research sources
// ============================================================
// Changes from original:
//   Step 6: Publications use diversifyResults(items, size, intentType)
//           Trials use diversifyTrials(items, size)
//   Step 6b: NEW — Sort final 8 by relevanceScore so strongest
//            papers reach LLM first (token budget cuts from bottom)
// ============================================================

import pubmedService from "./pubmedService.js";
import openalexService from "./openalexService.js";
import clinicalTrialsService from "./clinicalTrialsService.js";
import queryExpansionService from "../ai/queryExpansion.js";
import rankingService from "./rankingService.js";

class HybridSearchService {
  async search(query, disease, context = {}) {
    const startTime = Date.now();

    try {
      console.log(`\n🔍 Starting Hybrid Search`);
      console.log(`   Query:    "${query}"`);
      console.log(`   Disease:  "${disease}"`);
      console.log(`   Location: "${context.location || "Not set"}"`);

      // ── Clear stale context from previous conversation turn ─────────────
      delete context._pubmedQuery;
      delete context._openalexQuery;
      delete context._intent;
      delete context._clinicalSignals;
      delete context._clinicalFocus;
      delete context._mustHaveSignals;

      // ── Step 1: Intent-aware query expansion ────────────────────────────
      const expandedQuery = await queryExpansionService.expandQuery(
        query,
        disease,
        context,
      );

      const intent          = context._intent;
      const pubmedQuery     = context._pubmedQuery    || expandedQuery;
      const openalexQuery   = context._openalexQuery  || expandedQuery;
      const clinicalSignals = context._clinicalSignals || null;

      // intentType extracted here — used in Step 6 for usefulness-aware selection
      const intentType = intent?.type || "general";

      console.log(`\n🧠 Intent: ${intentType}`);
      console.log(`📝 PubMed Query:   "${pubmedQuery}"`);
      console.log(`📝 OpenAlex Query: "${openalexQuery}"`);
      if (clinicalSignals?.mustHave?.length) {
        console.log(`🎯 Must-have signals: ${clinicalSignals.mustHave.slice(0, 4).join(", ")}`);
      }

      const fetchSize = parseInt(process.env.INITIAL_FETCH_SIZE) || 200;

      console.log(`\n📚 Fetching from all sources...`);

      // ── Step 2: Parallel fetch ──────────────────────────────────────────
      const [pubmedResults, openalexResults, clinicalTrials] =
        await Promise.all([
          pubmedService.search(pubmedQuery, fetchSize).catch((err) => {
            console.error("⚠️  PubMed error:", err.message);
            return [];
          }),
          openalexService.search(openalexQuery, fetchSize).catch((err) => {
            console.error("⚠️  OpenAlex error:", err.message);
            return [];
          }),
          clinicalTrialsService
            .searchWithLocation(disease || query, context.location)
            .catch((err) => {
              console.error("⚠️  Clinical Trials error:", err.message);
              return [];
            }),
        ]);

      console.log(`\n📊 Source results:`);
      console.log(`   PubMed:   ${pubmedResults.length}  ${pubmedResults.length === 0 ? "⚠️" : "✅"}`);
      console.log(`   OpenAlex: ${openalexResults.length} ${openalexResults.length === 0 ? "⚠️" : "✅"}`);
      console.log(`   Trials:   ${clinicalTrials.length}  ✅`);

      // ── Step 3: Merge + normalize + validate ────────────────────────────
      const allPublications = [
        ...pubmedResults.map((p) => this.normalizePublication(p, "pubmed")),
        ...openalexResults.map((p) => this.normalizePublication(p, "openalex")),
      ];

      const validPublications = allPublications.filter((pub) =>
        pub &&
        pub.title &&
        typeof pub.title === "string" &&
        pub.title.trim().length > 10 &&
        pub.title !== "[object Object]" &&
        pub.abstract &&
        pub.abstract.length >= 80
      );

      console.log(`   Valid Publications: ${validPublications.length}`);

      // ── Step 4: Deduplicate ─────────────────────────────────────────────
      const uniquePublications = this.removeDuplicates(validPublications);
      console.log(`   Unique Publications: ${uniquePublications.length}`);

      // ── Step 5: Rank ─────────────────────────────────────────────────────
      const rankedPublications = rankingService.rankPublications(
        uniquePublications,
        query,
        disease,
        context,
        intent,
      );

      const rankedTrials = rankingService.rankClinicalTrials(
        clinicalTrials,
        query,
        disease,
        context,
        intent,
      );

      const finalSize = parseInt(process.env.FINAL_RESULTS_SIZE) || 8;

      // ── Step 6: Final selection ───────────────────────────────────────────
      const diversifiedPublications = rankingService.diversifyResults(
        rankedPublications.slice(0, 40),
        finalSize,
        intentType,
      );

      // ── Step 6b: Sort final 8 so strongest papers reach LLM first ────────
      // The LLM token budget for 8B models limits input to 6 papers.
      // Without sorting, a high-quality RCT at position [8] gets cut off
      // and only meta-analyses at [1]-[6] reach the LLM.
      // With sorting by relevanceScore, the strongest-evidence paper
      // (regardless of what diversifyResults placed it at) is always
      // in the first 6 positions that the LLM will process.
      // This ensures queries like "can I take vitamin D" send the
      // NSCLC-specific RCT to the LLM instead of generic reviews.
      const sortedPublications = [...diversifiedPublications].sort(
        (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
      );

      const diversifiedTrials = rankingService.diversifyTrials(
        rankedTrials.slice(0, 30),
        finalSize,
      );

      // ── Step 7: Reorder trial locations ─────────────────────────────────
      const location = context.location || null;
      const reorderedTrials = location
        ? rankingService.reorderTrialLocations(diversifiedTrials, location)
        : diversifiedTrials;

      const processingTime = Date.now() - startTime;

      console.log(`\n✅ Search Complete in ${processingTime}ms`);
      console.log(`   Top Publications: ${sortedPublications.length}`);
      console.log(`   Top Trials:       ${reorderedTrials.length}`);

      // ── Step 8: Locality stats for chatController ───────────────────────
      const localTrialCount    = reorderedTrials.filter((t) => t.isLocal).length;
      const fallbackTrialCount = reorderedTrials.filter((t) => t.matchSource === "global_fallback").length;

      return {
        publications    : sortedPublications,
        clinicalTrials  : reorderedTrials,
        expandedQuery   : openalexQuery,
        intent          : intent?.type,
        localTrialCount,
        fallbackTrialCount,
        metadata: {
          totalPublicationsFound : allPublications.length,
          totalTrialsFound       : clinicalTrials.length,
          publicationsReturned   : sortedPublications.length,
          trialsReturned         : reorderedTrials.length,
          processingTime,
          sources: {
            pubmed   : pubmedResults.length,
            openalex : openalexResults.length,
          },
        },
      };

    } catch (error) {
      console.error("❌ Hybrid search error:", error);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NORMALIZE — identical to original
  // ══════════════════════════════════════════════════════════════════════════
  normalizePublication(pub, source) {
    if (!pub || typeof pub !== "object") return null;

    try {
      // ── Title ───────────────────────────────────────────────────────────
      let title = pub.title;
      if (title && typeof title === "object") {
        title = title.en || title.value || title.text ||
                Object.values(title).find((v) => typeof v === "string") ||
                null;
      }
      if (typeof title !== "string") title = null;
      if (title) {
        title = title.replace(/<[^>]*>/g, "").trim();
        title = title.replace(/^\[(.+)\]$/, "$1").trim();
        title = title.replace(/\s+/g, " ").trim();
      }
      if (!title || title.length < 5) return null;

      // ── Abstract ────────────────────────────────────────────────────────
      let abstract = pub.abstract;
      if (abstract && typeof abstract === "object") {
        abstract = abstract.en || abstract.value || abstract.text ||
                   Object.values(abstract).find((v) => typeof v === "string") ||
                   "";
      }
      if (typeof abstract !== "string") abstract = "";
      abstract = abstract.replace(/<[^>]*>/g, " ");
      abstract = abstract.replace(/^(abstract|background|summary|objective|introduction):?\s*/i, "");
      abstract = abstract.replace(/\s+/g, " ").trim();

      // ── Year ────────────────────────────────────────────────────────────
      let year = pub.year;
      if (typeof year === "string") year = parseInt(year.substring(0, 4));
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        const dateStr  = pub.publicationDate || pub.publishedDate || pub.date || "";
        const yearMatch= String(dateStr).match(/\b(19|20)\d{2}\b/);
        year = yearMatch ? parseInt(yearMatch[0]) : null;
      }

      // ── Authors ─────────────────────────────────────────────────────────
      let authors = pub.authors;
      if (!Array.isArray(authors)) {
        authors = [];
      } else {
        authors = authors
          .map((a) => {
            if (typeof a === "string") return a.trim();
            if (a && typeof a === "object") {
              return a.name || a.displayName || a.authorName ||
                     [a.firstName, a.lastName].filter(Boolean).join(" ") ||
                     null;
            }
            return null;
          })
          .filter((a) => a && typeof a === "string" && a.length > 0);
      }

      // ── DOI ─────────────────────────────────────────────────────────────
      let doi = pub.doi;
      if (doi && typeof doi === "object") {
        doi = doi.value || doi.id || String(doi);
      }
      if (typeof doi === "string") {
        doi = doi.replace("https://doi.org/", "").trim();
      } else {
        doi = null;
      }

      // ── Citation count ──────────────────────────────────────────────────
      let citationCount = pub.citationCount || pub.citations || pub.cited_by_count || 0;
      if (typeof citationCount !== "number") citationCount = parseInt(citationCount) || 0;

      // ── Journal ─────────────────────────────────────────────────────────
      let journalName = pub.journalName || pub.journal || pub.venue || "";
      if (journalName && typeof journalName === "object") {
        journalName = journalName.name || journalName.displayName || String(journalName);
      }
      if (typeof journalName !== "string") journalName = "";

      // ── URL ─────────────────────────────────────────────────────────────
      let url = pub.url || (doi ? `https://doi.org/${doi}` : "");
      if (typeof url !== "string") url = "";

      return {
        ...pub,
        title,
        abstract,
        year,
        authors,
        doi,
        citationCount,
        journalName,
        url,
        source: source || pub.source || "unknown",
      };

    } catch (err) {
      console.warn(`⚠️  normalizePublication error: ${err.message}`);
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DEDUPLICATE — identical to original
  // ══════════════════════════════════════════════════════════════════════════
  removeDuplicates(publications) {
    const seen    = new Map();
    const doiSeen = new Set();

    return publications.filter((pub) => {
      if (!pub?.title || typeof pub.title !== "string") return false;

      if (pub.doi) {
        const cleanDoi = pub.doi.toLowerCase().trim();
        if (doiSeen.has(cleanDoi)) return false;
        doiSeen.add(cleanDoi);
      }

      const normalizedTitle = pub.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ");

      if (seen.has(normalizedTitle)) return false;

      for (const [existingTitle, existingPub] of seen.entries()) {
        const similarity = this.calculateTitleSimilarity(normalizedTitle, existingTitle);
        if (similarity > 0.85) {
          const keepCurrent =
            (pub.source === "pubmed" && existingPub.source !== "pubmed") ||
            (pub.abstract?.length || 0) > (existingPub.abstract?.length || 0);

          if (keepCurrent) {
            seen.delete(existingTitle);
            seen.set(normalizedTitle, pub);
          }
          return false;
        }
      }
    
      seen.set(normalizedTitle, pub);
      return true;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITY — identical to original
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
}

export default new HybridSearchService();