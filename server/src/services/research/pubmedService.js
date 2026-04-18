import axios from "axios";
import xml2js from "xml2js";
import redisClient from "../../config/redis.js";

class PubMedService {
  constructor() {
    this.baseURL =
      process.env.PUBMED_BASE_URL ||
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
    this.apiKey = process.env.PUBMED_API_KEY || null;
    this.cacheTTL = parseInt(process.env.CACHE_TTL_LONG) || 3600;
    this.searchTimeout = parseInt(process.env.PUBMED_SEARCH_TIMEOUT) || 25000;
    this.fetchTimeout = parseInt(process.env.PUBMED_FETCH_TIMEOUT) || 30000;
    this.maxRetries = 3;
    this.retryDelay = 1500;

    console.log(
      `🔑 PubMed API Key: ${
        this.apiKey
          ? "✅ Loaded (" + this.apiKey.substring(0, 8) + "...)"
          : "❌ NOT SET — will be rate limited"
      }`,
    );
    console.log(
      `⏱️  PubMed timeouts: search=${this.searchTimeout}ms, fetch=${this.fetchTimeout}ms`,
    );
  }

  // ── Determine if this query should bypass cache ───────────────────────────
  _shouldSkipCache(query) {
    const q = query.toLowerCase();

    // Supplement / food queries — must be fresh to avoid cross-query pollution
    const isSupplementQuery =
      /vitamin|supplement|mineral|omega|zinc|magnesium|calcium/i.test(q);
    const isFoodQuery = /spicy|diet|food|nutrition|glycemic|carotenoid/i.test(
      q,
    );

    // ✅ Treatment / recency queries — must be fresh so new recency scoring applies
    // Without this, 2019/2020 papers cached from previous runs keep appearing
    const isTreatmentQuery =
      /treatment|therapy|efficacy|outcome|survival|first.line|second.line/i.test(
        q,
      );
    const isRecentQuery = /latest|recent|new findings|current|emerging/i.test(
      q,
    );

    return (
      isSupplementQuery || isFoodQuery || isTreatmentQuery || isRecentQuery
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEARCH — with retry logic
  // ══════════════════════════════════════════════════════════════════════════

  async search(query, maxResults = 200) {
    try {
      const cacheKey = `pubmed:search:${query}:${maxResults}`;
      const skipCache = this._shouldSkipCache(query);

      if (!skipCache) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log("✅ PubMed cache hit");
          return cached;
        }
      } else {
        console.log(
          `🔄 PubMed cache skipped (query type requires fresh results): "${query.substring(0, 60)}"`,
        );
      }

      console.log(`🔍 Searching PubMed: "${query.substring(0, 80)}"`);

      const currentYear = new Date().getFullYear();
      const minYear = parseInt(process.env.MIN_PUBLICATION_YEAR) || 2015;

      const params = {
        db: "pubmed",
        term: query,
        retmax: maxResults,
        sort: "pub date",
        retmode: "json",
        datetype: "pdat",
        mindate: minYear.toString(),
        maxdate: currentYear.toString(),
      };

      if (this.apiKey) {
        params.api_key = this.apiKey;
      }

      const searchResponse = await this._requestWithRetry(
        `${this.baseURL}/esearch.fcgi`,
        params,
        this.searchTimeout,
        "PubMed search",
      );

      const ids = searchResponse.data?.esearchresult?.idlist || [];

      if (ids.length === 0) {
        console.log("⚠️  No PubMed results found");
        return [];
      }

      console.log(`📚 Found ${ids.length} PubMed IDs`);

      const batchSize = 50;
      const idsToFetch = ids.slice(0, maxResults);
      const batches = [];

      for (let i = 0; i < idsToFetch.length; i += batchSize) {
        batches.push(idsToFetch.slice(i, i + batchSize));
      }

      const allArticles = [];
      const concurrency = this.apiKey ? 3 : 2;

      for (let i = 0; i < batches.length; i += concurrency) {
        const concurrentBatches = batches.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          concurrentBatches.map((batch) => this.fetchDetails(batch)),
        );

        results.forEach((result, idx) => {
          if (result.status === "fulfilled") {
            allArticles.push(...result.value);
          } else {
            console.error(
              `⚠️  Batch ${i + idx + 1} failed:`,
              result.reason?.message,
            );
          }
        });
      }

      console.log(`✅ PubMed: ${allArticles.length} articles fetched`);

      // ✅ Only cache if query is NOT time-sensitive
      if (allArticles.length > 0 && !skipCache) {
        await redisClient.set(cacheKey, allArticles, this.cacheTTL);
      }

      return allArticles;
    } catch (error) {
      console.error("❌ PubMed search error:", error.message);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FETCH DETAILS — with retry logic
  // ══════════════════════════════════════════════════════════════════════════

  async fetchDetails(ids) {
    try {
      const params = {
        db: "pubmed",
        id: ids.join(","),
        retmode: "xml",
      };

      if (this.apiKey) {
        params.api_key = this.apiKey;
      }

      const response = await this._requestWithRetry(
        `${this.baseURL}/efetch.fcgi`,
        params,
        this.fetchTimeout,
        `PubMed fetch (${ids.length} ids)`,
      );

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);

      const articles = [];
      const pubmedArticles = result.PubmedArticleSet?.PubmedArticle || [];
      const articleArray = Array.isArray(pubmedArticles)
        ? pubmedArticles
        : [pubmedArticles];

      for (const article of articleArray) {
        try {
          const medlineCitation = article.MedlineCitation;
          const articleData = medlineCitation?.Article;
          const pmid = medlineCitation?.PMID?._ || medlineCitation?.PMID || "";

          if (!articleData) continue;

          const authorList = articleData.AuthorList?.Author || [];
          const authors = (
            Array.isArray(authorList) ? authorList : [authorList]
          )
            .map((author) => {
              const lastName = author.LastName || "";
              const foreName = author.ForeName || author.Initials || "";
              return `${lastName} ${foreName}`.trim();
            })
            .filter((name) => name.length > 0)
            .slice(0, 5);

          const abstractText = articleData.Abstract?.AbstractText;
          let abstract = "";
          if (abstractText) {
            if (Array.isArray(abstractText)) {
              abstract = abstractText.map((a) => a._ || a).join(" ");
            } else {
              abstract = abstractText._ || abstractText;
            }
          }

          const pubDate = articleData.Journal?.JournalIssue?.PubDate;
          const year = pubDate?.Year || new Date().getFullYear();
          const journalName =
            articleData.Journal?.Title ||
            articleData.Journal?.ISOAbbreviation ||
            "";

          const eLocationList = articleData.ELocationID;
          let doi = null;
          if (eLocationList) {
            const locations = Array.isArray(eLocationList)
              ? eLocationList
              : [eLocationList];
            const doiEntry = locations.find(
              (loc) => loc?.$?.EIdType === "doi" || loc?.EIdType === "doi",
            );
            doi = doiEntry?._ || doiEntry || null;
          }

          articles.push({
            id: pmid,
            title: articleData.ArticleTitle?.toString() || "No title available",
            abstract: abstract || "No abstract available",
            authors: authors.length > 0 ? authors : ["Unknown"],
            year: parseInt(year) || new Date().getFullYear(),
            source: "pubmed",
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            doi: doi ? String(doi) : null,
            journalName: journalName || "Unknown Journal",
            citationCount: null,
          });
        } catch (parseError) {
          console.error("⚠️  Article parse error:", parseError.message);
        }
      }

      console.log(`✅ Parsed ${articles.length} PubMed articles`);
      return articles;
    } catch (error) {
      console.error("❌ PubMed fetch details error:", error.message);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REQUEST WITH RETRY
  // ══════════════════════════════════════════════════════════════════════════

  async _requestWithRetry(url, params, timeout, label = "request") {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = this.retryDelay * attempt;
          console.log(
            `⏳ ${label}: retry ${attempt}/${this.maxRetries} (wait ${delay}ms)`,
          );
          await this._sleep(delay);
        }

        const response = await axios.get(url, { params, timeout });
        return response;
      } catch (error) {
        lastError = error;

        const isTimeout =
          error.code === "ECONNABORTED" || error.message.includes("timeout");
        const isRateLimit = error.response?.status === 429;
        const isServerError = error.response?.status >= 500;

        if (isTimeout) {
          console.warn(`⏰ ${label}: timeout on attempt ${attempt}`);
        } else if (isRateLimit) {
          console.warn(`🚦 ${label}: rate limited — waiting longer`);
          await this._sleep(this.retryDelay * 3);
        } else if (isServerError) {
          console.warn(`🔴 ${label}: server error ${error.response.status}`);
        } else {
          console.error(`❌ ${label}: non-retryable error:`, error.message);
          throw error;
        }

        if (attempt === this.maxRetries) {
          throw lastError;
        }
      }
    }

    throw lastError;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new PubMedService();
