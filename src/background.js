let currentDocumentation = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'DOCS_PARSED':
      currentDocumentation = {
        url: message.pageUrl,
        tabId: sender.tab.id
      };
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