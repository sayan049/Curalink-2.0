// Simplified embedding service (for hybrid search)
// In production, you'd use Sentence Transformers or similar

class EmbeddingService {
  // Simple TF-IDF based similarity (placeholder for real embeddings)
  calculateSimilarity(text1, text2) {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    
    const intersection = tokens1.filter(token => tokens2.includes(token));
    const union = [...new Set([...tokens1, ...tokens2])];
    
    // Jaccard similarity
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  // Calculate relevance score
  calculateRelevance(item, query, queryTokens) {
    const title = item.title || '';
    const abstract = item.abstract || item.summary || '';
    const combined = `${title} ${abstract}`.toLowerCase();

    // Calculate term frequency
    let score = 0;
    queryTokens.forEach(token => {
      const regex = new RegExp(token, 'gi');
      const matches = combined.match(regex);
      if (matches) {
        score += matches.length;
      }
    });

    // Boost for title matches
    queryTokens.forEach(token => {
      if (title.toLowerCase().includes(token)) {
        score += 5;
      }
    });

    return score;
  }

  // Rank items by relevance
  rankByRelevance(items, query) {
    const queryTokens = this.tokenize(query);
    
    return items.map(item => ({
      ...item,
      relevanceScore: this.calculateRelevance(item, query, queryTokens),
    }));
  }
}

export default new EmbeddingService();