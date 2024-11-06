// background.js

// Message listener for FETCH_URL_CONTENT_TAB (unchanged)
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
  // Create context menu item for "Get Selected Content"
  chrome.contextMenus.create({
    id: "thisismy-get-selected-content",
    title: "thisismy: get Selected Content",
    contexts: ["selection"]
  });

  // Set side panel behavior
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "thisismy-get-selected-content") {
    console.log("Context menu item clicked: get selected content");

    // Use info.selectionText to get the selected text synchronously
    const selectedText = info.selectionText ? info.selectionText.trim() : '';
    if (selectedText) {
      console.log("Selected text:", selectedText);

      // Store the selected content in chrome.storage.local
      chrome.storage.local.set({ selectedContent: { content: selectedText, url: tab.url } }, () => {
        console.log("Selected content stored in chrome.storage.local");

        // Send message to the side panel
        chrome.runtime.sendMessage({ type: "ADD_SELECTED_CONTENT", content: selectedText, url: tab.url }, () => {
          console.log("Message sent to side panel");

          // Open the side panel
          chrome.sidePanel.open({}).catch((error) => console.error("Error opening side panel:", error));
        });
      });
    } else {
      console.warn("No content selected.");
    }
  }
});