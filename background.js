// background.js

// Message listener for FETCH_URL_CONTENT_TAB
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "FETCH_URL_CONTENT_TAB") {
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
                      try {
                        const article = new Readability(document).parse();
                        if (article && article.textContent) {
                          return article.textContent;
                        } else {
                          return document.body.innerText || '';
                        }
                      } catch (e) {
                        return document.body.innerText || '';
                      }
                    },
                    world: 'MAIN',
                  },
                  async (results) => {
                    // Remove the tab after execution
                    await chrome.tabs.remove(tab.id);
  
                    if (chrome.runtime.lastError) {
                      console.error('Error executing script:', chrome.runtime.lastError.message);
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
  
  // Set Side Panel Behavior on Extension Installation
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("Error setting panel behavior:", error));
  });
  