// background.js

// Existing message listener for FETCH_URL_CONTENT
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "FETCH_URL_CONTENT") {
      try {
        const tab = await chrome.tabs.create({ url: request.url, active: false });
        
        // Wait for the page to load
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Inject Readability.js into the tab
            chrome.scripting.executeScript(
              {
                target: { tabId: tab.id },
                files: ['libs/Readability.js']
              },
              () => {
                // Execute script in the tab to extract article content
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tab.id },
                    func: () => {
                      const article = new Readability(document).parse();
                      return article ? article.textContent : null;
                    },
                  },
                  async (results) => {
                    // Remove the tab after execution
                    await chrome.tabs.remove(tab.id);
  
                    if (chrome.runtime.lastError) {
                      console.error(chrome.runtime.lastError.message);
                      sendResponse({ content: null });
                    } else {
                      sendResponse({ content: results[0]?.result });
                    }
                  }
                );
              }
            );
          }
        });
      } catch (error) {
        console.error('Error in background script:', error);
        sendResponse({ content: null });
      }
      // Return true to indicate asynchronous response
      return true;
    }
  });
  
  // **Added Code Below: Set Side Panel Behavior on Extension Installation**
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("Error setting panel behavior:", error));
  });
  