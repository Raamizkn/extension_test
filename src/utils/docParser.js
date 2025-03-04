class DocParser {
  constructor() {
    // Existing constructor code...
    this.formatDetector = new DocFormatDetector();
    this.navigationManager = new NavigationManager(this.formatDetector);
  }

  async parseAll() {
    const format = this.formatDetector.detectFormat();
    const mainStructure = this.parseDocument(document, format.selectors);
    
    // Initialize navigation
    await this.navigationManager.initialize();
    
    // Process sub-pages
    const subPages = [];
    while (true) {
      const page = await this.navigationManager.processNextPage();
      if (!page) break;
      
      const pageStructure = this.parseDocument(page.document, format.selectors);
      subPages.push({
        url: page.url,
        content: pageStructure
      });
    }

    return {
      mainPage: mainStructure,
      subPages: subPages
    };
  }

  parseDocument(doc, selectors) {
    const mainContent = doc.querySelector(selectors.mainContent);
    if (!mainContent) return [];

    const walker = document.createTreeWalker(
      mainContent,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          return this.isDocumentationElement(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    const structure = [];
    let currentNode = walker.nextNode();
    
    while (currentNode) {
      const section = this.parseSection(currentNode);
      
      if (currentNode.tagName.toLowerCase() === 'pre' ||
          currentNode.tagName.toLowerCase() === 'code') {
        section.codeBlocks = this.extractCodeBlocks(currentNode);
      }
      
      structure.push(section);
      currentNode = walker.nextNode();
    }

    return structure;
  }
} 