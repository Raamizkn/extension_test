class DocFormatDetector {
  constructor() {
    this.formats = {
      mdnWeb: {
        selector: 'body.document-page',
        navigation: '#sidebar-quicklinks',
        mainContent: 'article',
        subPages: '.sidebar-inner a'
      },
      readTheDocs: {
        selector: '.rst-content',
        navigation: '.wy-nav-side',
        mainContent: '.document',
        subPages: '.toctree-l1 a, .toctree-l2 a'
      },
      gitbook: {
        selector: '.gb-page-wrapper',
        navigation: '.gb-sidebar',
        mainContent: '.gb-markdown',
        subPages: '.gb-sidebar-link'
      },
      devTo: {
        selector: '#article-body',
        navigation: '#article-navigation',
        mainContent: '.article-wrapper',
        subPages: '.series-article-link'
      },
      default: {
        selector: 'main, .main-content, .content, article',
        navigation: 'nav, .navigation, .sidebar',
        mainContent: 'article, .content, main',
        subPages: 'a[href*="docs"], a[href*="reference"], a[href*="guide"]'
      },
      gatsby: {
        selector: '.gatsby-highlight, .docusaurus-highlight-code-line',
        navigation: '.table-of-contents, .docs-sidebar',
        mainContent: 'article, main',
        subPages: '.nav-links a, .menu__link'
      },
      vuepress: {
        selector: '.theme-default-content',
        navigation: '.sidebar, .sidebar-links',
        mainContent: '.content__default',
        subPages: '.sidebar-link'
      },
      sphinx: {
        selector: '.sphinx-doc',
        navigation: '.sphinxsidebar',
        mainContent: '.document',
        subPages: '.toctree-l1 a, .toctree-l2 a'
      },
      swagger: {
        selector: '.swagger-ui',
        navigation: '.opblock-tag-section',
        mainContent: '.swagger-ui',
        subPages: '.opblock'
      },
      storybook: {
        selector: '.sbdocs',
        navigation: '.sidebar-container',
        mainContent: '#docs-root',
        subPages: '.sidebar-item'
      },
      custom: {
        selector: '[class*="docs"], [class*="documentation"], [id*="docs"]',
        navigation: '[class*="nav"], [class*="sidebar"], [class*="menu"]',
        mainContent: '[class*="content"], [class*="main"], article',
        subPages: 'a[href*="/docs"], a[href*="/guide"], a[href*="/api"]'
      }
    };
  }

  detectFormat() {
    for (const [format, selectors] of Object.entries(this.formats)) {
      if (format !== 'custom' && document.querySelector(selectors.selector)) {
        return { format, selectors };
      }
    }

    if (document.querySelector(this.formats.custom.selector)) {
      return { format: 'custom', selectors: this.formats.custom };
    }

    return this.detectGenericDocumentation();
  }

  detectGenericDocumentation() {
    const possibleContent = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.documentation',
      '#documentation',
      '.main-content',
    ].find(selector => document.querySelector(selector));

    const possibleNavigation = [
      'nav',
      '[role="navigation"]',
      '.sidebar',
      '.menu',
      '.navigation',
      '#table-of-contents',
    ].find(selector => document.querySelector(selector));

    return {
      format: 'generic',
      selectors: {
        selector: possibleContent || 'body',
        navigation: possibleNavigation || 'nav',
        mainContent: possibleContent || 'body',
        subPages: 'a[href]'
      }
    };
  }

  isDocumentationLink(href) {
    const docPatterns = [
      /docs?/i,
      /reference/i,
      /guide/i,
      /tutorial/i,
      /api/i,
      /manual/i,
      /learn/i,
      /getting[-]?started/i,
      /examples?/i,
      /concepts?/i,
      /(v\d+|latest|stable|dev)\/docs?/i,
      /\/docs?\/[^/]+$/i,
    ];

    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;

    return docPatterns.some(pattern => pattern.test(url.pathname));
  }
}

export default DocFormatDetector; 