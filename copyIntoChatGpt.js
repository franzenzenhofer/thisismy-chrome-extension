// copyIntoChatGpt.js

import { outputArea } from './uiElements.js';
import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';

export const initializeChatGPTButton = () => {
  const chatgptBtn = document.getElementById('chatgpt-output');
  chatgptBtn.addEventListener('click', () => {
    let outputContent = outputArea.textContent;
    if (!outputContent) {
      showNotification('No output to send to ChatGPT.', 'error');
      return;
    }

    // Open a new tab with https://chatgpt.com/
    chrome.tabs.create({ url: 'https://chatgpt.com/', active: true }, (tab) => {
      const tabId = tab.id;

      // Wait for the tab to finish loading and DOM to be ready
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          // Remove the listener
          chrome.tabs.onUpdated.removeListener(listener);

          // Inject script into the tab
          chrome.scripting.executeScript(
            {
              target: { tabId: tabId },
              func: (outputContent) => {
                // Function to be executed in the tab

                const tryInsertContent = (attemptsLeft) => {
                  // Try multiple selectors to find the input area
                  const selectors = [
                    'div[contenteditable="true"][id="prompt-textarea"]',
                    'div[contenteditable="true"][class*="ProseMirror"]',
                    'div[contenteditable="true"][data-placeholder]',
                    'div[contenteditable="true"]',
                    'textarea[placeholder="Message ChatGPT"]',
                    'textarea',
                    'div[data-placeholder="Message ChatGPT"]',
                    'div[contenteditable="true"] div[data-placeholder]',
                  ];
                  let textarea = null;
                  for (let selector of selectors) {
                    textarea = document.querySelector(selector);
                    if (textarea) {
                      break;
                    }
                  }

                  if (textarea) {
                    textarea.focus();

                    // For contenteditable divs
                    if (textarea.contentEditable === 'true') {
                      // Remove any existing content
                      textarea.innerHTML = '';
                      // Split the content by <br> and insert as separate text nodes
                      const lines = outputContent.split('<br>');
                      lines.forEach((line, index) => {
                        if (index > 0) {
                          textarea.appendChild(document.createElement('br'));
                        }
                        textarea.appendChild(document.createTextNode(line));
                      });

                      // Move cursor to the beginning
                      const selection = window.getSelection();
                      const range = document.createRange();
                      range.setStart(textarea.firstChild, 0);
                      range.collapse(true);
                      selection.removeAllRanges();
                      selection.addRange(range);

                      // Scroll to the top
                      textarea.scrollTop = 0;
                    } else if (textarea.tagName.toLowerCase() === 'textarea') {
                      // For textarea elements
                      textarea.value = outputContent.replace(/<br>/g, '\n');
                      textarea.focus();
                      textarea.setSelectionRange(0, 0);

                      // Scroll to the top
                      textarea.scrollTop = 0;
                    }

                  } else if (attemptsLeft > 0) {
                    // If not found, wait 2.5 seconds and try again
                    setTimeout(() => {
                      tryInsertContent(attemptsLeft - 1);
                    }, 2500);
                  } else {
                    alert('ChatGPT input area not found after multiple attempts.');
                  }
                };

                // Wait until DOM is fully loaded and idle
                const waitForDOM = () => {
                  if (document.readyState === 'complete') {
                    if (window.requestIdleCallback) {
                      window.requestIdleCallback(() => {
                        tryInsertContent(5); // Try up to 5 times
                      });
                    } else {
                      setTimeout(() => {
                        tryInsertContent(5);
                      }, 1000);
                    }
                  } else {
                    setTimeout(waitForDOM, 500);
                  }
                };
                waitForDOM();
              },
              args: [outputContent],
              world: 'MAIN',
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error('Error injecting script: ', chrome.runtime.lastError);
                showNotification('Failed to inject content into ChatGPT.', 'error');
                addLogEntry(`Failed to inject content into ChatGPT: ${chrome.runtime.lastError.message}`, 'error');
              } else {
                showNotification('Content sent to ChatGPT.', 'success');
                addLogEntry('Content sent to ChatGPT.', 'success');
              }
            }
          );
        }
      });
    });
  });
};