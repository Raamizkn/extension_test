import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';

class CodeHighlighter {
  static highlight(code, language) {
    try {
      if (!language || !Prism.languages[language]) {
        language = 'text';
      }
      return Prism.highlight(code, Prism.languages[language], language);
    } catch (error) {
      console.error('Highlighting error:', error);
      return code;
    }
  }

  static wrapCodeBlock(code, language) {
    const highlighted = this.highlight(code, language);
    return `<pre class="language-${language}"><code>${highlighted}</code></pre>`;
  }
}

export default CodeHighlighter; 