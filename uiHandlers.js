// uiHandlers.js

import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { isValidURL, parseIgnoreFile, matchIgnore, getFormattedDateTime } from './utils.js';
import {
  dropzone,
  outputArea,
  urlInput,
  selectionDisplay,
  addUrlBtn,
  removeWhitespacesCheckbox,
  copyBtn,
  saveBtn,
  selectLink,
  getCurrentUrlBtn,
  getCurrentPageContentBtn,
  getSelectedContentBtn,
  processingIndicator,
  importBtn,
  exportBtn,
} from './uiElements.js';
import {
  selectedFiles,
  selectedURLs,
  selectedNotes,
  selectedSpecials,
  outputContents,
  selectionOrder,
  dragSrcEl,
} from './state.js';
import { updateOutputArea, addFile, addURL, addNote } from './main.js';
import { importBriefing, exportBriefing } from './importexport.js';
import { updateSelectionDisplay } from './selectionlist.js';
import { traverseFileTree } from './fileHandler.js';

// Export handleDrop for reuse
export const handleDrop = (event) => {
  addLogEntry('Processing dropped items', 'info');
  const items = event.dataTransfer.items;
  
  for (let item of items) {
    try {
      if (item.kind === 'string' && item.type === 'text/uri-list') {
        item.getAsString((url) => {
          if (isValidURL(url)) {
            addURL(url);
            addLogEntry(`Processing dropped URL: ${url}`, 'info');
          } else {
            addLogEntry(`Invalid URL dropped: ${url}`, 'warning');
            showNotification('Invalid URL dropped.', 'error');
          }
        });
      } else if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          addLogEntry(`Processing dropped file/directory: ${entry.name}`, 'info');
          traverseFileTree(entry);
        }
      }
    } catch (error) {
      addLogEntry(`Error processing dropped item: ${error.message}`, 'error');
      showNotification('Error processing dropped item.', 'error');
    }
  }
};

let dropzoneHoverTimeout = null;

export const initializeEventListeners = () => {
  // Event Listeners
  const dropTargets = [dropzone, outputArea, urlInput];
  dropTargets.forEach((element) => {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragSrcEl) {
        e.dataTransfer.dropEffect = 'copy';
        dropzone.classList.add('dragover');

        // Reset hover state after a delay
        clearTimeout(dropzoneHoverTimeout);
        dropzoneHoverTimeout = setTimeout(() => {
          dropzone.classList.remove('dragover');
        }, 2000); // Adjust delay as needed
      }
    });

    element.addEventListener('dragleave', () => {
      if (!dragSrcEl) {
        dropzone.classList.remove('dragover');
      }
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragSrcEl) {
        dropzone.classList.remove('dragover');
        handleDrop(e);
      }
    });
  });

  exportBtn.addEventListener('click', () => {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';
    exportBriefing();
    setTimeout(() => {
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export';
    }, 5000);
  });

  importBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.click();
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';
        importBriefing(file)
          .catch((error) => {
            console.error('Error during import:', error);
            showNotification('Import failed.', 'error');
            addLogEntry(`Import failed: ${error.message}`, 'error');
          })
          .finally(() => {
            importBtn.disabled = false;
            importBtn.textContent = 'Import';
          });
      } else {
        showNotification('No file selected for import.', 'error');
      }
    });
  });

  // Add drop handling to selectionDisplay
  selectionDisplay.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  selectionDisplay.addEventListener('drop', (e) => {
    e.preventDefault();
    handleDrop(e);
  });

  addUrlBtn.addEventListener('click', () => {
    const inputText = urlInput.value.trim();
    if (inputText) {
      if (isValidURL(inputText)) {
        addURL(inputText);
        addLogEntry(`Added URL: ${inputText}`, 'info');
      } else {
        addNote(inputText);
        addLogEntry(`Added Note: ${inputText}`, 'info');
      }
      urlInput.value = '';
    } else {
      showNotification('Please enter a URL or Note.', 'error');
    }
  });

  urlInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      addUrlBtn.click();
    }
  });

  removeWhitespacesCheckbox.addEventListener('change', () => {
    updateOutputArea();
  });

  copyBtn.addEventListener('click', () => {
    const output = outputArea.textContent;
    if (!output) {
      showNotification('No output to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(output).then(
      () => {
        showNotification('Output copied to clipboard!', 'success');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 2000);
      },
      (err) => {
        console.error('Failed to copy text: ', err);
        showNotification('Failed to copy output to clipboard.', 'error');
      }
    );
  });

  saveBtn.addEventListener('click', () => {
    const output = outputArea.textContent;
    if (!output) {
      showNotification('No output to save.', 'error');
      return;
    }
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${getFormattedDateTime()}-thisismy-briefing.txt`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Output saved successfully!', 'success');
  });

  selectLink.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.webkitdirectory = true;
    fileInput.click();
    fileInput.addEventListener('change', (event) => {
      const files = event.target.files;
      handleFiles(files);
    });
  });

  getCurrentUrlBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      if (isValidURL(url)) {
        addURL(url);
      } else {
        showNotification('Failed to get the current URL.', 'error');
      }
    });
  });

  getCurrentPageContentBtn.addEventListener('click', () => {
    console.log('Get Current Page Content button clicked.');
    addLogEntry('Get Current Page Content button clicked.', 'info');
    getCurrentPageContent();
  });

  getSelectedContentBtn.addEventListener('click', () => {
    console.log('Get Selected Content button clicked.');
    addLogEntry('Get Selected Content button clicked.', 'info');
    getSelectedContent();
  });
};

const handleFiles = (fileList) => {
  const files = Array.from(fileList);
  let ignorePatterns = [];

  // Check if any of the files is .thisismyignore or .gitignore
  const ignoreFile = files.find((file) => file.name === '.thisismyignore' || file.name === '.gitignore');

  if (ignoreFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const patterns = parseIgnoreFile(content);
      if (ignoreFile.name === '.thisismyignore') {
        ignorePatterns = patterns; // Override existing patterns
        addLogEntry(`Parsed .thisismyignore in root`, 'info');
      } else if (ignoreFile.name === '.gitignore') {
        ignorePatterns = patterns; // Use .gitignore patterns
        addLogEntry(`Parsed .gitignore in root`, 'info');
      }

      // Process remaining files
      files.forEach((file) => {
        if (file.name.startsWith('.')) {
          return; // Ignore dotfiles
        }
        if (!matchIgnore(file.webkitRelativePath || file.name, ignorePatterns)) {
          addFile(file);
        } else {
          addLogEntry(`Ignored file: ${file.webkitRelativePath || file.name}`, 'info');
        }
      });
    };
    reader.onerror = () => {
      // If reading fails, process files without ignore patterns
      files.forEach((file) => {
        if (!file.name.startsWith('.')) {
          addFile(file);
        }
      });
    };
    reader.readAsText(ignoreFile);
  } else {
    // No ignore file, process normally
    files.forEach((file) => {
      if (!file.name.startsWith('.')) {
        addFile(file);
      }
    });
  }
};

function getCurrentPageContent() {
  processingIndicator.textContent = 'Getting current page content...';
  processingIndicator.style.display = 'block';
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ['libs/Readability.js'],
      },
      () => {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
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
          (results) => {
            processingIndicator.style.display = 'none';
            addLogEntry('Current page content processing.', 'success');
            if (chrome.runtime.lastError) {
              showNotification('Failed to get page content.', 'error');
              addLogEntry(`Failed to get current page content: ${chrome.runtime.lastError.message}`, 'error');
            } else if (!results || !results[0].result) {
              showNotification('Failed to get page content.', 'error');
              addLogEntry('Failed to get current page content: No results returned.', 'error');
            } else {
              const content = results[0].result;
              const url = tabs[0].url;
              const now = new Date();
              const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
              const header = `Fetched content from ${url} on ${formattedDate}\n\n`;
              const footer = `\n\nEnd of content from ${url}`;
              const fullContent = header + content + footer;
              const key = `page:${Date.now()}`; // Use Date.now() for uniqueness
              selectedSpecials.set(key, { name: `Current Page Content from ${url}`, icon: '📰' });
              outputContents.set(key, fullContent);
              selectionOrder.push(key); // Add key to selectionOrder
              updateSelectionDisplay();
              updateOutputArea();
              showNotification('Got current page content.', 'success');
              addLogEntry(`Got current page content from ${url}`, 'success');
            }
          }
        );
      }
    );
  });
}

function getSelectedContent() {
  processingIndicator.textContent = 'Getting selected content...';
  processingIndicator.style.display = 'block';
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => {
          const selection = window.getSelection();
          return selection ? selection.toString() : '';
        },
        world: 'MAIN',
      },
      (results) => {
        processingIndicator.style.display = 'none';
        if (chrome.runtime.lastError) {
          showNotification('Failed to get selected content.', 'error');
          addLogEntry(`Failed to get selected content: ${chrome.runtime.lastError.message}`, 'error');
        } else if (!results || !results[0].result) {
          showNotification('Failed to get selected content.', 'error');
          addLogEntry('Failed to get selected content: No results returned.', 'error');
        } else {
          const content = results[0].result.trim();
          if (content) {
            const url = tabs[0].url;
            const now = new Date();
            const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
            const header = `Selected content from ${url} on ${formattedDate}\n\n`;
            const footer = `\n\nEnd of selected content from ${url}`;
            const fullContent = header + content + footer;
            const key = `selection:${Date.now()}`; // Use Date.now() for uniqueness
            selectedSpecials.set(key, { name: `Selected Content from ${url}`, icon: '✂️' });
            outputContents.set(key, fullContent);
            selectionOrder.push(key); // Add key to selectionOrder
            updateSelectionDisplay();
            updateOutputArea();
            showNotification('Got selected content.', 'success');
            addLogEntry(`Got selected content from ${url}`, 'success');
          } else {
            showNotification('No content selected.', 'info');
            addLogEntry('No content selected.', 'info');
          }
        }
      }
    );
  });
}
