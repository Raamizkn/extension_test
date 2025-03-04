class DocParser {
  constructor() {
    this.documentationElements = {
      headings: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      content: ['p', 'ul', 'ol', 'dl'],
      code: ['pre', 'code'],
      links: ['a']
    };
  }

  parseSection(element) {
    return {
      type: element.tagName.toLowerCase(),
      text: element.textContent.trim(),
      id: element.id || null,
      html: element.innerHTML,
      children: []
    };
  }

  isDocumentationElement(element) {
    return Object.values(this.documentationElements)
      .flat()
      .includes(element.tagName.toLowerCase());
  }

  extractCodeBlocks(element) {
    const codeBlocks = [];
    const codeElements = element.querySelectorAll('pre, code');
    
    codeElements.forEach(code => {
      codeBlocks.push({
        type: 'code',
        language: this.detectLanguage(code),
        content: code.textContent.trim()
      });
    });

    return codeBlocks;
  }

  detectLanguage(codeElement) {
    const classes = Array.from(codeElement.classList);
    const languageClass = classes.find(cls => 
      cls.startsWith('language-') || 
      cls.startsWith('lang-')
    );
    return languageClass ? languageClass.split('-')[1] : 'text';
  }

  parse() {
    const structure = [];
    const mainContent = document.querySelector('main') || document.body;
    
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

export default DocParser; 