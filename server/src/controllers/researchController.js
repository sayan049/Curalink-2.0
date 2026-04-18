import axios from 'axios';
import hybridSearchService from '../services/research/hybridSearchService.js';
import pubmedService from '../services/research/pubmedService.js';
import openalexService from '../services/research/openalexService.js';
import clinicalTrialsService from '../services/research/clinicalTrialsService.js';
import llmService from '../services/ai/llmService.js';
import queryExpansionService from '../services/ai/queryExpansion.js';

// ============================================
// HELPER FUNCTIONS (defined at top)
// ============================================

// Helper: Get top authors from publications
const getTopAuthors = (publications, limit = 5) => {
  const authorCounts = {};

  publications.forEach(pub => {
    if (pub.authors && Array.isArray(pub.authors)) {
      pub.authors.forEach(author => {
        if (author && author !== 'Unknown' && author.trim().length > 0) {
          const cleanAuthor = author.trim();
          authorCounts[cleanAuthor] = (authorCounts[cleanAuthor] || 0) + 1;
        }
      });
    }
  });

  return Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([author, count]) => ({ author, publications: count }));
};

// Helper: Group publications by year
const groupByYear = (publications) => {
  const yearGroups = {};

  publications.forEach(pub => {
    const year = pub.year;
    if (year) {
      yearGroups[year] = (yearGroups[year] || 0) + 1;
    }
  });

  return Object.entries(yearGroups)
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({ year: parseInt(year), count }));
};

// ============================================
// CONTROLLERS
// ============================================

// @desc    Search all sources (Hybrid Search)
// @route   POST /api/v1/research/search
// @access  Private
export const hybridSearch = async (req, res, next) => {
  try {
    const { query, disease, location, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    const startTime = Date.now();

    const results = location
      ? await hybridSearchService.searchWithLocation(query, disease, location, context)
      : await hybridSearchService.search(query, disease, context || {});

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        query,
        expandedQuery: results.expandedQuery,
        publications: results.publications,
        clinicalTrials: results.clinicalTrials,
        metadata: {
          ...results.metadata,
          processingTime,
        },
      },
    });
  } catch (error) {
    console.error('❌ Hybrid search error:', error);
    next(error);
  }
};

// @desc    Search PubMed only
// @route   POST /api/v1/research/pubmed
// @access  Private
export const searchPubMed = async (req, res, next) => {
  try {
    const { query, maxResults } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    const results = await pubmedService.search(
      query,
      maxResults || parseInt(process.env.INITIAL_FETCH_SIZE) || 200
    );

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('❌ PubMed search error:', error);
    next(error);
  }
};

// @desc    Search OpenAlex only
// @route   POST /api/v1/research/openalex
// @access  Private
export const searchOpenAlex = async (req, res, next) => {
  try {
    const { query, perPage, page } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    const results = await openalexService.search(
      query,
      perPage || parseInt(process.env.INITIAL_FETCH_SIZE) || 50,
      page || 1
    );

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('❌ OpenAlex search error:', error);
    next(error);
  }
};

// @desc    Search Clinical Trials
// @route   POST /api/v1/research/clinical-trials
// @access  Private
export const searchClinicalTrials = async (req, res, next) => {
  try {
    const { condition, status, pageSize, multipleStatuses } = req.body;

    if (!condition) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a condition',
      });
    }

    let results;

    if (multipleStatuses) {
      results = await clinicalTrialsService.searchMultipleStatuses(condition);
    } else {
      results = await clinicalTrialsService.search(
        condition,
        status || 'RECRUITING',
        pageSize || 100
      );
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('❌ Clinical Trials search error:', error);
    next(error);
  }
};

// @desc    Expand query using AI
// @route   POST /api/v1/research/expand-query
// @access  Private
export const expandQuery = async (req, res, next) => {
  try {
    const { query, disease, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a query',
      });
    }

    const expandedQuery = await queryExpansionService.expandQuery(
      query,
      disease,
      context || {}
    );

    const intent = await queryExpansionService.extractIntent(query);

    res.status(200).json({
      success: true,
      data: {
        originalQuery: query,
        expandedQuery,
        intent,
      },
    });
  } catch (error) {
    console.error('❌ Expand query error:', error);
    next(error);
  }
};

// @desc    Extract medical entities from text
// @route   POST /api/v1/research/extract-entities
// @access  Private
export const extractEntities = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Please provide text',
      });
    }

    const entities = await llmService.extractEntities(text);

    res.status(200).json({
      success: true,
      data: entities,
    });
  } catch (error) {
    console.error('❌ Extract entities error:', error);
    next(error);
  }
};

// @desc    Normalize disease name
// @route   POST /api/v1/research/normalize-disease
// @access  Private
export const normalizeDisease = async (req, res, next) => {
  try {
    const { disease } = req.body;

    if (!disease) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a disease name',
      });
    }

    const normalized = await llmService.normalizeDisease(disease);

    res.status(200).json({
      success: true,
      data: {
        original: disease,
        normalized,
      },
    });
  } catch (error) {
    console.error('❌ Normalize disease error:', error);
    next(error);
  }
};

// @desc    Get trending medical topics with real data
// @route   GET /api/v1/research/trending
// @access  Private
export const getTrendingTopics = async (req, res, next) => {
  try {
    console.log('🔥 Fetching trending topics with REAL counts...');

    const trendingTopics = [
      "Alzheimer's Disease",
      'Cancer Immunotherapy',
      'Type 2 Diabetes',
      'Heart Disease',
      "Parkinson's Disease",
      'COVID-19',
      'Mental Health',
      'Gene Therapy',
      'Obesity Treatment',
      'Stroke Prevention',
    ];

    // ✅ Use axios (already installed) instead of fetch
    const topicsWithData = await Promise.all(
      trendingTopics.map(async (topic) => {
        try {
          // ✅ Use per-page=1 but read meta.count for TOTAL
          const response = await axios.get('https://api.openalex.org/works', {
            params: {
              search: topic,
              'per-page': 1,
              filter: 'from_publication_date:2020-01-01',
            },
            timeout: 8000,
          });

          // ✅ meta.count is the REAL total, not results.length
          const totalCount = response.data?.meta?.count || 0;
          const latestYear =
            response.data?.results?.[0]?.publication_year ||
            new Date().getFullYear();

          console.log(`📊 ${topic}: ${totalCount.toLocaleString()} publications`);

          return {
            topic,
            recentPublications: totalCount,
            latestYear,
          };
        } catch (error) {
          console.error(`❌ Error for "${topic}":`, error.message);
          return {
            topic,
            recentPublications: 0,
            latestYear: new Date().getFullYear(),
          };
        }
      })
    );

    // Sort by count descending
    const sorted = topicsWithData.sort(
      (a, b) => b.recentPublications - a.recentPublications
    );

    sorted.forEach(t => {
      console.log(`  ${t.topic}: ${t.recentPublications.toLocaleString()}`);
    });

    res.status(200).json({
      success: true,
      data: sorted,
    });
  } catch (error) {
    console.error('❌ Trending topics error:', error);
    next(error);
  }
};

// @desc    Get research statistics for a disease
// @route   GET /api/v1/research/stats
// @access  Private
export const getResearchStats = async (req, res, next) => {
  try {
    const { disease } = req.query;

    if (!disease) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a disease',
      });
    }

    console.log(`📊 Fetching stats for: ${disease}`);

    // ✅ Fetch from multiple sources in parallel
    const [pubmedResults, openalexResults, clinicalTrials] = await Promise.all([
      pubmedService.search(disease, 50).catch(err => {
        console.error('PubMed stats error:', err.message);
        return [];
      }),
      openalexService.search(disease, 50).catch(err => {
        console.error('OpenAlex stats error:', err.message);
        return [];
      }),
      clinicalTrialsService.searchMultipleStatuses(disease).catch(err => {
        console.error('Clinical Trials stats error:', err.message);
        return [];
      }),
    ]);

    const allPublications = [...pubmedResults, ...openalexResults];

    // ✅ Use standalone helper functions (NOT this.getTopAuthors)
    const topAuthors = getTopAuthors(allPublications, 5);
    const publicationsByYear = groupByYear(allPublications);

    // Calculate year range
    const years = allPublications
      .map(p => p.year)
      .filter(Boolean);

    const yearRange = years.length > 0
      ? {
        oldest: Math.min(...years),
        newest: Math.max(...years),
      }
      : { oldest: 2015, newest: new Date().getFullYear() };

    const stats = {
      disease,
      totalPublications: allPublications.length,
      pubmedCount: pubmedResults.length,
      openalexCount: openalexResults.length,
      clinicalTrialsCount: clinicalTrials.length,
      activeTrials: clinicalTrials.filter(t =>
        t.status === 'RECRUITING' || t.status === 'ACTIVE_NOT_RECRUITING'
      ).length,
      yearRange,
      topAuthors,
      publicationsByYear,
    };

    console.log(`✅ Stats fetched for ${disease}`);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Get research stats error:', error);
    next(error);
  }
};

// @desc    Get publication details by ID
// @route   GET /api/v1/research/publication/:source/:id
// @access  Private
export const getPublicationDetails = async (req, res, next) => {
  try {
    const { source, id } = req.params;

    let publication;

    if (source === 'pubmed') {
      const results = await pubmedService.fetchDetails([id]);
      publication = results[0];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid source. Use "pubmed"',
      });
    }

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found',
      });
    }

    res.status(200).json({
      success: true,
      data: publication,
    });
  } catch (error) {
    console.error('❌ Get publication details error:', error);
    next(error);
  }
};

// @desc    Compare publications from different queries
// @route   POST /api/v1/research/compare
// @access  Private
export const comparePublications = async (req, res, next) => {
  try {
    const { query1, query2 } = req.body;

    if (!query1 || !query2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide two queries to compare',
      });
    }

    const [results1, results2] = await Promise.all([
      hybridSearchService.search(query1, null, {}),
      hybridSearchService.search(query2, null, {}),
    ]);

    const overlapping = results1.publications.filter(pub1 =>
      results2.publications.some(pub2 => pub2.title === pub1.title)
    );

    res.status(200).json({
      success: true,
      data: {
        query1: {
          query: query1,
          publicationsCount: results1.publications.length,
          trialsCount: results1.clinicalTrials.length,
        },
        query2: {
          query: query2,
          publicationsCount: results2.publications.length,
          trialsCount: results2.clinicalTrials.length,
        },
        overlapping: {
          count: overlapping.length,
          publications: overlapping.slice(0, 5),
        },
      },
    });
  } catch (error) {
    console.error('❌ Compare publications error:', error);
    next(error);
  }
};