// This will be expanded later to handle DOM parsing
console.log('DocChat content script loaded');

import DocParser from './utils/domParser.js';
import DocumentationIndex from './utils/indexer.js';
import DocFormatDetector from './utils/docFormatDetector.js';
import NavigationManager from './utils/navigationManager.js';

class DocumentationManager {
  constructor() {
    this.parser = new DocParser();
    this.index = new DocumentationIndex();
    this.isProcessing = false;
    this.navigation = new NavigationManager(new DocFormatDetector());
    this.currentPage = null;
    this.processingQueue = new Set();
  }

  async initialize() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Initialize navigation
      await this.navigation.initialize();
      
      // Track processing progress
      this.navigation.onProgress(progress => {
        chrome.runtime.sendMessage({
          type: 'PROCESSING_PROGRESS',
          progress
        });
      });

      // Process main page and sub-pages
      const structure = await this.parser.parseAll();
      this.currentPage = window.location.href;

      // Index content with navigation info
      await this.indexContent(structure);

      // Set up message listeners
      this.setupMessageListeners();

      // Notify completion
      chrome.runtime.sendMessage({
        type: 'DOCS_PARSED',
        pageUrl: this.currentPage,
        subPagesCount: structure.subPages.length,
        outline: await this.navigation.getPageOutline(this.currentPage)
      });

    } catch (error) {
      console.error('Error processing documentation:', error);
      chrome.runtime.sendMessage({
        type: 'PROCESSING_ERROR',
        error: error.message
      });
    } finally {
      this.isProcessing = false;
    }
  }

  async indexContent(structure) {
    // Index main page
    structure.mainPage.forEach((section, idx) => {
      const sectionId = `main_${idx}`;
      section.url = this.currentPage;
      section.navigationPath = this.navigation.getBreadcrumbs();
      this.index.indexSection(section, sectionId);
    });

    // Index sub-pages
    for (const page of structure.subPages) {
      if (!this.processingQueue.has(page.url)) {
        this.processingQueue.add(page.url);
        await this.processSubPage(page);
      }
    }
  }

  async processSubPage(page) {
    try {
      const pageContent = await this.navigation.processPage(page.url);
      if (pageContent) {
        page.content.forEach((section, idx) => {
          const sectionId = `${page.url}_${idx}`;
          section.url = page.url;
          section.navigationPath = this.navigation.getBreadcrumbs();
          this.index.indexSection(section, sectionId);
        });
      }
    } catch (error) {
      console.warn(`Failed to process page ${page.url}:`, error);
    } finally {
      this.processingQueue.delete(page.url);
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SEARCH_QUERY':
          const results = this.index.search(message.query);
          sendResponse({ results });
          break;

        case 'NAVIGATE_SECTION':
          this.navigation.navigateToSection(message.sectionId)
            .then(success => sendResponse({ success }));
          break;

        case 'GET_RELATED_SECTIONS':
          this.navigation.getRelatedSections(message.sectionId)
            .then(sections => sendResponse({ sections }));
          break;
      }
      return true;
    });
  }

  async retryProcessing() {
    this.isProcessing = false;
    this.processingQueue.clear();
    this.navigation.reset();
    await this.initialize();
  }
}

// Initialize when the page is ready
const docManager = new DocumentationManager();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => docManager.initialize());
} else {
  docManager.initialize();
}

// Add after DocumentationManager initialization
window.docManager = docManager; 