import axios from 'axios';
import redisClient from '../../config/redis.js';

class OpenAlexService {
  constructor() {
    this.baseURL  = process.env.OPENALEX_BASE_URL || 'https://api.openalex.org';
    this.cacheTTL = parseInt(process.env.CACHE_TTL_LONG) || 3600;
    this.timeout  = parseInt(process.env.OPENALEX_TIMEOUT) || 15000;
  }

  // ── Determine if this query should bypass cache ───────────────────────────
  // Mirrors the same logic as pubmedService to ensure consistency.
  // Treatment/recent queries must always fetch fresh results so the
  // recency scoring fix (age ≤ 7 → 0 pts) actually takes effect.
  // Without this, a cached 2019 OpenAlex paper would keep appearing.
  _shouldSkipCache(query) {
    const q = query.toLowerCase();

    const isSupplementQuery = /vitamin|supplement|mineral|omega|zinc|magnesium|calcium/i.test(q);
    const isFoodQuery       = /spicy|diet|food|nutrition|glycemic|carotenoid/i.test(q);
    const isTreatmentQuery  = /treatment|therapy|efficacy|outcome|survival|first.line|second.line/i.test(q);
    const isRecentQuery     = /latest|recent|new findings|current|emerging/i.test(q);

    return isSupplementQuery || isFoodQuery || isTreatmentQuery || isRecentQuery;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════════════════════════════════════

  async search(query, perPage = 200, page = 1) {
    try {
      const cacheKey  = `openalex:search:${query}:${perPage}:${page}`;
      const skipCache = this._shouldSkipCache(query);

      if (!skipCache) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log('✅ OpenAlex cache hit');
          return cached;
        }
      } else {
        console.log(
          `🔄 OpenAlex cache skipped (fresh results needed): "${query.substring(0, 60)}"`
        );
      }

      console.log(`🔍 Searching OpenAlex: "${query}"`);

      const currentYear = new Date().getFullYear();
      const minYear     = parseInt(process.env.MIN_PUBLICATION_YEAR) || 2015;

      const response = await axios.get(`${this.baseURL}/works`, {
        params: {
          search:     query,
          'per-page': Math.min(perPage, 200),
          page,
          sort:       'relevance_score:desc',
          filter:     `from_publication_date:${minYear}-01-01,to_publication_date:${currentYear}-12-31`,
        },
        timeout: this.timeout,
      });

      const works = response.data.results || [];
      console.log(`📚 Found ${works.length} OpenAlex works`);

      const publications = works.map(work => ({
        id:            work.id,
        title:         work.title?.toString() || 'No title available',
        abstract:      work.abstract ||
          (work.abstract_inverted_index
            ? this.reconstructAbstract(work.abstract_inverted_index)
            : 'No abstract available'),
        authors:       (work.authorships || [])
          .map(a => a.author?.display_name)
          .filter(Boolean)
          .slice(0, 5),
        year:          work.publication_year || new Date().getFullYear(),
        source:        'openalex',
        url:           work.doi
          ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}`
          : work.id,
        doi:           work.doi,
        citationCount: work.cited_by_count || 0,
        journalName:   work.primary_location?.source?.display_name || 'Unknown',
      }));

      // ✅ Only cache non-time-sensitive queries
      // Treatment/recent queries are never stored so recency scoring
      // always works on fresh data — prevents 2019/2020 papers being served
      if (publications.length > 0 && !skipCache) {
        await redisClient.set(cacheKey, publications, this.cacheTTL);
      }

      return publications;

    } catch (error) {
      console.error('OpenAlex search error:', error.message);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RECONSTRUCT ABSTRACT FROM INVERTED INDEX
  // ══════════════════════════════════════════════════════════════════════════

  reconstructAbstract(invertedIndex) {
    if (!invertedIndex) return '';
    try {
      const words = [];
      for (const [word, positions] of Object.entries(invertedIndex)) {
        positions.forEach(pos => { words[pos] = word; });
      }
      return words.filter(Boolean).join(' ').substring(0, 500) + '...';
    } catch {
      return '';
    }
  }
}

export default new OpenAlexService();