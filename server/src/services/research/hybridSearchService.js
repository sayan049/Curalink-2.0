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

      // Clear stale query context from previous message
      delete context._pubmedQuery;
      delete context._openalexQuery;
      delete context._intent;

      // Step 1: Fresh intent-aware query expansion
      const expandedQuery = await queryExpansionService.expandQuery(
        query,
        disease,
        context,
      );

      const intent = context._intent;
      const pubmedQuery = context._pubmedQuery || expandedQuery;
      const openalexQuery = context._openalexQuery || expandedQuery;

      console.log(`\n🧠 Intent: ${intent?.type || "general"}`);
      console.log(`📝 PubMed Query:   "${pubmedQuery}"`);
      console.log(`📝 OpenAlex Query: "${openalexQuery}"`);

      const fetchSize = parseInt(process.env.INITIAL_FETCH_SIZE) || 200;

      console.log(`\n📚 Fetching from all sources...`);

      // Step 2: Parallel fetch from all sources
      const [pubmedResults, openalexResults, clinicalTrials] =
        await Promise.all([
          pubmedService.search(pubmedQuery, fetchSize).catch((err) => {
            console.error(
              "⚠️  PubMed error (using OpenAlex only):",
              err.message,
            );
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
      console.log(
        `   PubMed:   ${pubmedResults.length}  ${pubmedResults.length === 0 ? "⚠️  (timeout/error)" : "✅"}`,
      );
      console.log(
        `   OpenAlex: ${openalexResults.length} ${openalexResults.length === 0 ? "⚠️" : "✅"}`,
      );
      console.log(`   Trials:   ${clinicalTrials.length}  ✅`);

      // Step 3: Merge + validate
      const allPublications = [...pubmedResults, ...openalexResults];
      const validPublications = allPublications.filter(
        (pub) => pub && pub.title && typeof pub.title === "string",
      );

      console.log(`   Valid Publications: ${validPublications.length}`);

      // Step 4: Deduplicate
      const uniquePublications = this.removeDuplicates(validPublications);
      console.log(`   Unique Publications: ${uniquePublications.length}`);

      // Step 5: Intent-aware ranking
      const rankedPublications = rankingService.rankPublications(
        uniquePublications,
        query,
        disease,
        context,
        intent,
      );

      // ✅ FIX: Pass intent to rankClinicalTrials
      // Previously intent was never passed — intentType was always "general"
      // This meant trial type matching, COMPLETED bonus, and age filter
      // were never using the actual query intent
      const rankedTrials = rankingService.rankClinicalTrials(
        clinicalTrials,
        query,
        disease,
        context,
        intent, // ✅ NOW PASSED
      );

      const finalSize = parseInt(process.env.FINAL_RESULTS_SIZE) || 8;

      // Step 6 + 7: Diversify from larger candidate pool
      const diversifiedPublications = rankingService.diversifyResults(
        rankedPublications.slice(0, 20),
        finalSize,
      );

      const diversifiedTrials = rankingService.diversifyResults(
        rankedTrials.slice(0, 20),
        finalSize,
      );

      // Step 8: Reorder trial locations (local site first)
      const location = context.location || null;
      const reorderedTrials = location
        ? rankingService.reorderTrialLocations(diversifiedTrials, location)
        : diversifiedTrials;

      const processingTime = Date.now() - startTime;

      console.log(`\n✅ Search Complete in ${processingTime}ms`);
      console.log(`   Top Publications: ${diversifiedPublications.length}`);
      console.log(`   Top Trials:       ${reorderedTrials.length}`);

      // Step 9: Locality stats for chatController
      const localTrialCount = reorderedTrials.filter((t) => t.isLocal).length;
      const fallbackTrialCount = reorderedTrials.filter(
        (t) => t.matchSource === "global_fallback",
      ).length;

      return {
        publications: diversifiedPublications,
        clinicalTrials: reorderedTrials,
        expandedQuery: openalexQuery,
        intent: intent?.type,
        localTrialCount,
        fallbackTrialCount,
        metadata: {
          totalPublicationsFound: allPublications.length,
          totalTrialsFound: clinicalTrials.length,
          publicationsReturned: diversifiedPublications.length,
          trialsReturned: reorderedTrials.length,
          processingTime,
          sources: {
            pubmed: pubmedResults.length,
            openalex: openalexResults.length,
          },
        },
      };
    } catch (error) {
      console.error("❌ Hybrid search error:", error);
      throw error;
    }
  }

  removeDuplicates(publications) {
    const seen = new Map();
    const doiSeen = new Set();

    return publications.filter((pub) => {
      if (!pub || !pub.title || typeof pub.title !== "string") return false;

      if (pub.doi) {
        const cleanDoi = pub.doi
          .replace("https://doi.org/", "")
          .toLowerCase()
          .trim();
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
        const similarity = this.calculateTitleSimilarity(
          normalizedTitle,
          existingTitle,
        );
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

  calculateTitleSimilarity(title1, title2) {
    if (!title1 || !title2) return 0;
    const tokens1 = new Set(title1.split(/\s+/).filter((t) => t.length > 2));
    const tokens2 = new Set(title2.split(/\s+/).filter((t) => t.length > 2));
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);
    return intersection.size / union.size;
  }
}

export default new HybridSearchService();
