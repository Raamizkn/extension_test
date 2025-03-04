class QueryProcessor {
  constructor(index) {
    this.index = index;
    this.relevanceThreshold = 0.3;
  }

  processQuery(query) {
    const tokens = this.tokenize(query);
    const expandedTokens = this.expandTokens(tokens);
    const results = this.searchWithRelevance(expandedTokens);
    return this.formatResults(results);
  }

  tokenize(query) {
    return query
      .toLowerCase()
      .split(/\W+/)
      .filter(token => token.length > 2);
  }

  expandTokens(tokens) {
    const expanded = new Set();
    tokens.forEach(token => {
      expanded.add(token);
      // Add common programming variations
      if (token.endsWith('s')) expanded.add(token.slice(0, -1));
      if (token.endsWith('ing')) expanded.add(token.slice(0, -3));
      this.index.getSuggestions(token, 3).forEach(suggestion => expanded.add(suggestion));
    });
    return Array.from(expanded);
  }

  searchWithRelevance(tokens) {
    const scores = new Map();
    const maxScore = tokens.length;

    tokens.forEach(token => {
      const matches = this.index.search(token);
      matches.forEach(match => {
        const currentScore = scores.get(match) || 0;
        scores.set(match, currentScore + 1);
      });
    });

    return Array.from(scores.entries())
      .map(([section, score]) => ({
        section,
        relevance: score / maxScore
      }))
      .filter(result => result.relevance >= this.relevanceThreshold)
      .sort((a, b) => b.relevance - a.relevance);
  }

  formatResults(results) {
    if (results.length === 0) {
      return {
        type: 'no_results',
        message: "I couldn't find any relevant information."
      };
    }

    return {
      type: 'results',
      results: results.map(result => ({
        content: result.section,
        relevance: result.relevance
      }))
    };
  }
}

export default QueryProcessor; 