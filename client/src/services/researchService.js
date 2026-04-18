import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';

export const researchService = {
  hybridSearch: async (data) => {
    const response = await api.post(API_ENDPOINTS.HYBRID_SEARCH, data);
    return response.data;
  },

  searchPubMed: async (data) => {
    const response = await api.post(API_ENDPOINTS.PUBMED_SEARCH, data);
    return response.data;
  },

  searchOpenAlex: async (data) => {
    const response = await api.post(API_ENDPOINTS.OPENALEX_SEARCH, data);
    return response.data;
  },

  searchClinicalTrials: async (data) => {
    const response = await api.post(API_ENDPOINTS.CLINICAL_TRIALS, data);
    return response.data;
  },

  getTrending: async () => {
    const response = await api.get(API_ENDPOINTS.TRENDING);
    return response.data;
  },

  getStats: async (disease) => {
    const response = await api.get(API_ENDPOINTS.STATS, { params: { disease } });
    return response.data;
  },
};