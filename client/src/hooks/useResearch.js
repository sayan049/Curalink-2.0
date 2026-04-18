import { useState } from 'react';
import { researchService } from '@/services/researchService';
import useUIStore from '@/store/uiStore';

const useResearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const { showToast } = useUIStore();

  const search = async (query, disease, location) => {
    setLoading(true);
    try {
      const response = await researchService.hybridSearch({
        query,
        disease,
        location,
      });
      setResults(response.data);
      return response.data;
    } catch (error) {
      showToast('Search failed', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTrending = async () => {
    try {
      const response = await researchService.getTrending();
      return response.data;
    } catch (error) {
      showToast('Failed to load trending topics', 'error');
      return [];
    }
  };

  const getStats = async (disease) => {
    try {
      const response = await researchService.getStats(disease);
      return response.data;
    } catch (error) {
      showToast('Failed to load statistics', 'error');
      return null;
    }
  };

  return {
    loading,
    results,
    search,
    getTrending,
    getStats,
  };
};

export default useResearch;