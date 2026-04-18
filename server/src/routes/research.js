import express from 'express';
import {
  hybridSearch,
  searchPubMed,
  searchOpenAlex,
  searchClinicalTrials,
  expandQuery,
  extractEntities,
  normalizeDisease,
  getPublicationDetails,
  getTrendingTopics,
  getResearchStats,
  comparePublications,
} from '../controllers/researchController.js';
import { protect } from '../middleware/auth.js';
import { researchLimiter } from '../middleware/rateLimiter.js';
import { validateSearchQuery } from '../middleware/validation.js';

import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
const router = express.Router();

// All routes are protected
router.use(protect);

// Main search routes
router.post('/search', researchLimiter, validateSearchQuery, hybridSearch);
router.post('/pubmed', researchLimiter, validateSearchQuery, searchPubMed);
router.post('/openalex', researchLimiter, validateSearchQuery, searchOpenAlex);
router.post('/clinical-trials', researchLimiter, searchClinicalTrials);

// Utility routes
router.post('/expand-query', expandQuery);
router.post('/extract-entities', extractEntities);
router.post('/normalize-disease', normalizeDisease);
router.post('/compare', comparePublications);

// Info routes
router.get('/trending',researchLimiter,cacheMiddleware(600), getTrendingTopics);
router.get('/stats',researchLimiter,cacheMiddleware(300), getResearchStats);
router.get('/publication/:source/:id', getPublicationDetails);

export default router;