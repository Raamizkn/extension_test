import CodeHighlighter from '../utils/codeHighlighter.js';

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  const sendButton = document.getElementById('sendButton');
  const chatMessages = document.getElementById('chatMessages');
  const navigationContainer = document.createElement('div');
  navigationContainer.className = 'navigation-container';
  
  // Add navigation container to the UI
  document.querySelector('.chat-container').insertBefore(
    navigationContainer,
    chatMessages
  );

  // Initialize navigation controls
  initializeNavigation(navigationContainer);

  function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    if (typeof content === 'string') {
      messageDiv.textContent = content;
    } else if (content.type === 'results') {
      content.results.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = result.content.text;

        if (result.content.codeBlocks) {
          result.content.codeBlocks.forEach(block => {
            const codeDiv = document.createElement('div');
            codeDiv.className = 'code-block';
            codeDiv.innerHTML = CodeHighlighter.wrapCodeBlock(
              block.content,
              block.language
            );
            resultDiv.appendChild(codeDiv);
          });
        }

        const relevanceDiv = document.createElement('div');
        relevanceDiv.className = 'relevance-indicator';
        relevanceDiv.textContent = `Relevance: ${Math.round(result.relevance * 100)}%`;
        resultDiv.appendChild(relevanceDiv);

        messageDiv.appendChild(resultDiv);
      });
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleSend() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, true);
    chatInput.value = '';

    // Send message to background script
    chrome.runtime.sendMessage({ type: 'QUERY', text: message }, (response) => {
      if (chrome.runtime.lastError) {
        addMessage('Error: Could not process query');
        return;
      }
      addMessage(response.text);
    });
  }

  sendButton.addEventListener('click', handleSend);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Add navigation state handling
  chrome.runtime.onMessage.addListener((message, sender) => {
    switch (message.type) {
      case 'PROCESSING_PROGRESS':
        updateProgress(message.progress);
        break;
      case 'DOCS_PARSED':
        updateNavigation(message.outline);
        break;
    }
  });

  // Add new event listeners and functions
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'PROCESSING_STATUS':
        handleProcessingStatus(message);
        break;
    }
  });
});

function initializeNavigation(container) {
  // Add progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-container';
  progressBar.innerHTML = `
    <div class="progress-bar"></div>
    <div class="progress-text">Processing documentation...</div>
  `;
  container.appendChild(progressBar);

  // Add breadcrumbs
  const breadcrumbs = document.createElement('div');
  breadcrumbs.className = 'breadcrumbs';
  container.appendChild(breadcrumbs);

  // Add outline container
  const outline = document.createElement('div');
  outline.className = 'outline-container';
  container.appendChild(outline);
}

function updateProgress(progress) {
  const progressBar = document.querySelector('.progress-bar');
  const progressText = document.querySelector('.progress-text');
  
  if (progressBar && progressText) {
    progressBar.style.width = `${progress.percentage}%`;
    progressText.textContent = `Processing: ${progress.processed}/${progress.total} pages`;
  }
}

function updateNavigation(outline) {
  const outlineContainer = document.querySelector('.outline-container');
  if (!outlineContainer) return;

  outlineContainer.innerHTML = '';
  outline.forEach(item => {
    const link = document.createElement('a');
    link.href = '#';
    link.className = `outline-item level-${item.level}`;
    link.textContent = item.text;
    link.onclick = (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({
        type: 'NAVIGATE_SECTION',
        sectionId: item.id
      });
    };
    outlineContainer.appendChild(link);
  });
}

function handleProcessingStatus(message) {
  const statusContainer = document.querySelector('.status-container') || 
    createStatusContainer();

  switch (message.status) {
    case 'error':
      statusContainer.innerHTML = `
        <div class="error-message">
          Error: ${message.message}
          <button class="retry-button">Retry</button>
        </div>
      `;
      statusContainer.querySelector('.retry-button')?.addEventListener('click', 
        () => chrome.runtime.sendMessage({ type: 'RETRY_PROCESSING' }));
      break;

    case 'progress':
      const { processed, total, failed } = message.progress;
      const percentage = Math.round((processed / total) * 100);
      statusContainer.innerHTML = `
        <div class="progress-container">
          <div class="progress-bar" style="width: ${percentage}%"></div>
          <div class="progress-text">
            Processing: ${processed}/${total} pages
            ${failed > 0 ? `(${failed} failed)` : ''}
          </div>
        </div>
      `;
      break;

    case 'complete':
      statusContainer.innerHTML = '<div class="success-message">Documentation ready</div>';
      if (message.outline) {
        updateNavigation(message.outline);
      }
      break;
  }
}

function createStatusContainer() {
  const container = document.createElement('div');
  container.className = 'status-container';
  document.querySelector('.navigation-container').appendChild(container);
  return container;
} 