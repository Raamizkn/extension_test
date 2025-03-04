class NavigationManager {
  constructor(formatDetector) {
    this.formatDetector = formatDetector;
    this.visitedPages = new Set();
    this.pageQueue = [];
    this.maxDepth = 3; // Configurable depth for crawling
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.processedUrls = new Map(); // Track processing status
    this.failedUrls = new Map(); // Track failed attempts
    this.navigationHistory = [];
    this.currentSection = null;
    this.pageLoadCallbacks = new Set();
    this.sectionChangeCallbacks = new Set();
  }

  async initialize() {
    const format = this.formatDetector.detectFormat();
    await this.handleDynamicContent();
    const links = await this.collectDocumentationLinks(format.selectors);
    this.pageQueue = links.map(link => ({
      url: link,
      depth: 1,
      retries: 0
    }));
  }

  async handleDynamicContent() {
    // Handle infinite scroll and dynamic loading
    return new Promise(resolve => {
      let lastHeight = document.body.scrollHeight;
      let attempts = 0;
      const maxAttempts = 5;

      const scrollAndCheck = () => {
        window.scrollTo(0, document.body.scrollHeight);
        setTimeout(() => {
          const newHeight = document.body.scrollHeight;
          if (newHeight > lastHeight && attempts < maxAttempts) {
            lastHeight = newHeight;
            attempts++;
            scrollAndCheck();
          } else {
            window.scrollTo(0, 0);
            resolve();
          }
        }, 1000);
      };

      scrollAndCheck();
    });
  }

  async collectDocumentationLinks(selectors) {
    const links = new Set();
    
    // Handle different types of navigation structures
    const navigationElements = [
      ...document.querySelectorAll(selectors.navigation),
      ...document.querySelectorAll(selectors.subPages)
    ];

    for (const nav of navigationElements) {
      // Handle nested navigation structures
      const nestedLinks = nav.querySelectorAll('a');
      for (const link of nestedLinks) {
        if (link.href && this.isValidDocumentationUrl(link.href)) {
          links.add(this.normalizeUrl(link.href));
        }
      }
    }

    // Look for documentation links in the main content
    const mainContent = document.querySelector(selectors.mainContent);
    if (mainContent) {
      const contentLinks = mainContent.querySelectorAll('a[href]');
      for (const link of contentLinks) {
        if (this.isValidDocumentationUrl(link.href)) {
          links.add(this.normalizeUrl(link.href));
        }
      }
    }

    return Array.from(links);
  }

  isValidDocumentationUrl(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin === window.location.origin && 
             this.formatDetector.isDocumentationLink(url) &&
             !this.isAsset(url);
    } catch {
      return false;
    }
  }

  isAsset(url) {
    return /\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js)$/i.test(url);
  }

  normalizeUrl(url) {
    // Remove hash and query parameters
    const urlObj = new URL(url);
    urlObj.hash = '';
    urlObj.search = '';
    return urlObj.toString();
  }

  async fetchPageWithRetry(url, retryCount = 0) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      return { success: true, data: text };
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.fetchPageWithRetry(url, retryCount + 1);
      }
      return { success: false, error };
    }
  }

  async processNextPage() {
    if (this.pageQueue.length === 0) return null;

    const { url, depth, retries } = this.pageQueue.shift();
    if (this.visitedPages.has(url) || depth > this.maxDepth) return null;

    try {
      this.visitedPages.add(url);
      const response = await this.fetchPageWithRetry(url);
      
      if (!response.success) {
        if (retries < this.maxRetries) {
          this.pageQueue.push({ url, depth, retries: retries + 1 });
        }
        return null;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, 'text/html');
      
      // Update processing status
      this.processedUrls.set(url, true);
      
      // Add new links to queue if within depth limit
      if (depth < this.maxDepth) {
        const format = this.formatDetector.detectFormat();
        const newLinks = await this.collectDocumentationLinks(format.selectors);
        
        newLinks.forEach(link => {
          if (!this.visitedPages.has(link)) {
            this.pageQueue.push({ url: link, depth: depth + 1, retries: 0 });
          }
        });
      }

      // Notify progress
      this.pageLoadCallbacks.forEach(callback => callback({
        processed: this.processedUrls.size,
        total: this.processedUrls.size + this.pageQueue.length,
        failed: this.failedUrls.size
      }));

      return { url, document: doc };
    } catch (error) {
      console.error(`Error processing page ${url}:`, error);
      this.failedUrls.set(url, error.message);
      return null;
    }
  }

  async navigateToSection(sectionId) {
    try {
      const section = await this.findSection(sectionId);
      if (!section) return false;

      // Update navigation state
      this.currentSection = section;
      this.navigationHistory.push(section);
      
      // Scroll to section
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.highlightSection(element);
      }

      // Notify listeners
      this.sectionChangeCallbacks.forEach(callback => callback(section));
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }

  async findSection(sectionId) {
    // Check current page first
    const element = document.getElementById(sectionId);
    if (element) {
      return {
        id: sectionId,
        url: window.location.href,
        element
      };
    }

    // Check processed pages
    for (const [url, content] of this.processedUrls.entries()) {
      if (content.includes(sectionId)) {
        return {
          id: sectionId,
          url,
          needsNavigation: true
        };
      }
    }

    return null;
  }

  highlightSection(element) {
    // Remove previous highlights
    document.querySelectorAll('.doc-chat-highlight').forEach(el => {
      el.classList.remove('doc-chat-highlight');
    });

    // Add highlight
    element.classList.add('doc-chat-highlight');
    
    // Remove highlight after delay
    setTimeout(() => {
      element.classList.remove('doc-chat-highlight');
    }, 3000);
  }

  async getPageOutline(url) {
    const doc = url === window.location.href ? 
      document : 
      await this.fetchPageWithRetry(url).then(res => res.data);

    if (!doc) return [];

    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headings.map(heading => ({
      level: parseInt(heading.tagName[1]),
      text: heading.textContent.trim(),
      id: heading.id || this.generateHeadingId(heading.textContent)
    }));
  }

  generateHeadingId(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  getBreadcrumbs() {
    return this.navigationHistory.map(section => ({
      id: section.id,
      title: section.element ? 
        section.element.textContent.trim() : 
        this.extractTitle(section),
      url: section.url
    }));
  }

  extractTitle(section) {
    const titleElement = section.element?.querySelector('h1, h2, h3, h4, h5, h6');
    return titleElement ? 
      titleElement.textContent.trim() : 
      'Untitled Section';
  }

  // Add navigation event handlers
  onSectionChange(callback) {
    this.sectionChangeCallbacks.add(callback);
    return () => this.sectionChangeCallbacks.delete(callback);
  }

  onPageLoad(callback) {
    this.pageLoadCallbacks.add(callback);
    return () => this.pageLoadCallbacks.delete(callback);
  }

  // Navigation history management
  async goBack() {
    if (this.navigationHistory.length > 1) {
      this.navigationHistory.pop(); // Remove current
      const previousSection = this.navigationHistory[this.navigationHistory.length - 1];
      return this.navigateToSection(previousSection.id);
    }
    return false;
  }
}

export default NavigationManager; 