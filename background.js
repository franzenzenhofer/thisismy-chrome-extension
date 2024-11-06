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


// Set Side Panel Behavior on Extension Installation
chrome.runtime.onInstalled.addListener(() => {
// Create context menu items
chrome.contextMenus.create({
    id: "thisismy-get-selected-content",
    title: "thisismy: get Selected Content",
    contexts: ["selection"]
});

chrome.contextMenus.create({
    id: "thisismy-get-page-content",
    title: "thisismy: get Page Content",
    contexts: ["page"]
});

chrome.contextMenus.create({
    id: "thisismy-get-current-url",
    title: "thisismy: get Current URL",
    contexts: ["page"]
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
if (info.menuItemId === "thisismy-get-selected-content") {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
    }, (results) => {
        const selectedText = results[0].result.trim();
        if (selectedText) {
            chrome.runtime.sendMessage({ type: "ADD_SELECTED_CONTENT", content: selectedText, url: tab.url });
        } else {
            console.warn("No content selected.");
        }
    });
} else if (info.menuItemId === "thisismy-get-page-content") {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["libs/Readability.js"]
    }, () => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const article = new Readability(document).parse();
                return article && article.textContent ? article.textContent : document.body.innerText;
            }
        }, (results) => {
            const pageContent = results[0].result.trim();
            chrome.runtime.sendMessage({ type: "ADD_PAGE_CONTENT", content: pageContent, url: tab.url });
        });
    });
} else if (info.menuItemId === "thisismy-get-current-url") {
    chrome.runtime.sendMessage({ type: "ADD_CURRENT_URL", url: tab.url });
}
});

// Listener to handle content messages from context menu actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
switch (message.type) {
    case "ADD_SELECTED_CONTENT":
        addContentToPanel(`Selected content from ${message.url}`, message.content);
        sendResponse({ success: true });
        break;
    case "ADD_PAGE_CONTENT":
        addContentToPanel(`Page content from ${message.url}`, message.content);
        sendResponse({ success: true });
        break;
    case "ADD_CURRENT_URL":
        addContentToPanel(`URL from ${message.url}`, message.url);
        sendResponse({ success: true });
        break;
}
});

// Function to add content to the panel and update output
function addContentToPanel(title, content) {
// Send message to the side panel
chrome.runtime.sendMessage({ type: "UPDATE_OUTPUT", title, content });
}
