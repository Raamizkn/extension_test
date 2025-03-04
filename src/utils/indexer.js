class DocumentationIndex {
  constructor() {
    this.index = new Map();
    this.sections = [];
    this.keywords = new Set();
  }

  addToIndex(term, sectionId) {
    term = term.toLowerCase();
    if (!this.index.has(term)) {
      this.index.set(term, new Set());
    }
    this.index.get(term).add(sectionId);
    this.keywords.add(term);
  }

  indexSection(section, sectionId) {
    // Index the text content
    const words = section.text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2);

    words.forEach(word => this.addToIndex(word, sectionId));

    // Special handling for code blocks
    if (section.codeBlocks) {
      section.codeBlocks.forEach(block => {
        const codeWords = block.content
          .split(/\W+/)
          .filter(word => word.length > 2);
        
        codeWords.forEach(word => this.addToIndex(word, sectionId));
      });
    }

    this.sections[sectionId] = section;
  }

  search(query) {
    const terms = query.toLowerCase().split(/\W+/).filter(term => term.length > 2);
    const results = new Map();

    terms.forEach(term => {
      if (this.index.has(term)) {
        this.index.get(term).forEach(sectionId => {
          results.set(sectionId, (results.get(sectionId) || 0) + 1);
        });
      }
    });

    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sectionId]) => this.sections[sectionId]);
  }

  getSuggestions(partial, limit = 5) {
    const partialLower = partial.toLowerCase();
    return Array.from(this.keywords)
      .filter(keyword => keyword.startsWith(partialLower))
      .slice(0, limit);
  }
}

export default DocumentationIndex; 