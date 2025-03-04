let currentDocumentation = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'DOCS_PARSED':
      currentDocumentation = {
        url: message.pageUrl,
        tabId: sender.tab.id,
        outline: message.outline
      };
      // Notify popup that documentation is ready
      chrome.runtime.sendMessage({
        type: 'PROCESSING_STATUS',
        status: 'complete',
        outline: message.outline
      });
      break;

    case 'PROCESSING_ERROR':
      console.error('Documentation processing error:', message.error);
      chrome.runtime.sendMessage({
        type: 'PROCESSING_STATUS',
        status: 'error',
        message: message.error
      });
      break;

    case 'PROCESSING_PROGRESS':
      chrome.runtime.sendMessage({
        type: 'PROCESSING_STATUS',
        status: 'progress',
        progress: message.progress
      });
      break;

    case 'NAVIGATE_SECTION':
      if (currentDocumentation) {
        chrome.tabs.sendMessage(
          currentDocumentation.tabId,
          { 
            type: 'NAVIGATE_SECTION', 
            sectionId: message.sectionId 
          },
          (response) => {
            sendResponse(response);
          }
        );
        return true;
      }
      sendResponse({ success: false, error: 'No active documentation' });
      break;

    case 'QUERY':
      if (currentDocumentation) {
        // Forward the query to the content script
        chrome.tabs.sendMessage(
          currentDocumentation.tabId,
          { type: 'SEARCH_QUERY', query: message.text },
          (response) => {
            if (response && response.results) {
              const formattedResponse = formatSearchResults(response.results);
              sendResponse({ text: formattedResponse });
            } else {
              sendResponse({ text: "Sorry, I couldn't find relevant information." });
            }
          }
        );
        return true; // Keep the message channel open for async response
      }
      break;

    case 'RETRY_PROCESSING':
      if (currentDocumentation) {
        chrome.tabs.sendMessage(
          currentDocumentation.tabId,
          { type: 'RETRY_PROCESSING' }
        );
      }
      break;
  }
});

function formatSearchResults(results) {
  if (results.length === 0) {
    return "I couldn't find any relevant information.";
  }

  const topResult = results[0];
  let response = topResult.text;
  
  if (topResult.codeBlocks && topResult.codeBlocks.length > 0) {
    response += '\n\nRelated code example:\n```' + 
      topResult.codeBlocks[0].language + '\n' +
      topResult.codeBlocks[0].content + '\n```';
  }

  return response;
} 