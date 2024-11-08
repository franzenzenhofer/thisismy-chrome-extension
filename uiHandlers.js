// uiHandlers.js

import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { isValidURL, parseIgnoreFile, matchIgnore } from './utils.js';
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
  updateOutputArea,
  addFile,
  addURL,
  addNote,

} from './main.js';
import { importBriefing, exportBriefing } from './importexport.js';
import {  updateSelectionDisplay, } from './selectionlist.js';

export const initializeEventListeners = () => {
  // Event Listeners
  const dropTargets = [dropzone, outputArea, urlInput];
  dropTargets.forEach((element) => {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    element.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    element.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleDrop(e);
    });

  
  

  });


  exportBtn.addEventListener('click', () => {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';
    exportBriefing();
    // Re-enable the button after 5 seconds or when the download starts
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

  // Add drop handling to selectionDisplay without CSS changes
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
    getCurrentPageContent();
  });

  getSelectedContentBtn.addEventListener('click', () => {
    getSelectedContent();
  });
};

const handleDrop = (event) => {
  const items = event.dataTransfer.items;
  for (let item of items) {
    if (item.kind === 'string' && item.type === 'text/uri-list') {
      item.getAsString((url) => {
        if (isValidURL(url)) {
          addURL(url);
        } else {
          showNotification('Invalid URL dropped.', 'error');
        }
      });
    } else if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        traverseFileTree(entry);
      }
    }
  }
};

const traverseFileTree = async (entry, path = '', ignorePatterns = []) => {
  if (entry.isFile) {
    entry.file((file) => {
      file.filePath = '/' + path + file.name;
      if (!matchIgnore(file.filePath, ignorePatterns)) {
        addFile(file);
      } else {
        addLogEntry(`Ignored file: ${file.filePath}`, 'info');
      }
    });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const entries = await readAllEntries(dirReader);

    // Initialize ignore patterns for this directory
    let currentIgnorePatterns = [...ignorePatterns]; // Copy existing patterns

    // Look for .thisismyignore or .gitignore
    const ignoreFileEntry = entries.find((e) => e.name === '.thisismyignore' || e.name === '.gitignore');

    if (ignoreFileEntry) {
      const newPatterns = await readIgnoreFile(ignoreFileEntry);
      if (ignoreFileEntry.name === '.thisismyignore') {
        currentIgnorePatterns = newPatterns; // Override existing patterns
        addLogEntry(`Parsed .thisismyignore in ${'/' + path + entry.name}`, 'info');
      } else if (ignoreFileEntry.name === '.gitignore') {
        // Only use .gitignore if .thisismyignore is not present
        if (!entries.some((e) => e.name === '.thisismyignore')) {
          currentIgnorePatterns = currentIgnorePatterns.concat(newPatterns); // Append patterns
          addLogEntry(`Parsed .gitignore in ${'/' + path + entry.name}`, 'info');
        }
      }
    }

    for (let childEntry of entries) {
      if (childEntry.name.startsWith('.')) {
        continue; // Ignore dotfiles
      }
      const childPath = path + entry.name + '/';
      const relativePath = '/' + childPath + childEntry.name;

      // Check if the child entry should be ignored
      if (matchIgnore(relativePath, currentIgnorePatterns)) {
        if (childEntry.isDirectory) {
          addLogEntry(`Ignored directory: ${relativePath}`, 'info');
        } else {
          addLogEntry(`Ignored file: ${relativePath}`, 'info');
        }
        continue; // Skip ignored files/directories
      }

      await traverseFileTree(childEntry, childPath, currentIgnorePatterns);
    }
  }
};


const readAllEntries = (dirReader) => {
  return new Promise((resolve) => {
    let entries = [];
    const readEntries = () => {
      dirReader.readEntries((results) => {
        if (!results.length) {
          resolve(entries);
        } else {
          entries = entries.concat(Array.from(results));
          readEntries();
        }
      });
    };
    readEntries();
  });
};

const readIgnoreFile = (entry) => {
  return new Promise((resolve) => {
    entry.file((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const patterns = parseIgnoreFile(content);
        resolve(patterns);
      };
      reader.onerror = () => {
        resolve([]);
      };
      reader.readAsText(file);
    });
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

// Function to Get Current Page Content
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
            if (chrome.runtime.lastError || !results || !results[0].result) {
              showNotification('Failed to get page content.', 'error');
              addLogEntry('Failed to get current page content.', 'error');
            } else {
              const content = results[0].result;
              const url = tabs[0].url;
              const header = `Content from ${url}\n\n`;
              const footer = `\n\nEnd of content from ${url}`;
              const fullContent = header + content + footer;
              const key = `page:${url}`;
              outputContents.set(key, fullContent);
              selectedSpecials.set(key, { name: `Current Page Content from ${url}`, icon: '📰' });
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

// Function to Get Selected Content
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
        if (chrome.runtime.lastError || !results || !results[0].result) {
          showNotification('Failed to get selected content.', 'error');
          addLogEntry('Failed to get selected content.', 'error');
        } else {
          const content = results[0].result.trim();
          if (content) {
            const url = tabs[0].url;
            const header = `Selected content from ${url}\n\n`;
            const footer = `\n\nEnd of selected content from ${url}`;
            const fullContent = header + content + footer;
            const key = `selection:${url}`;
            selectedSpecials.set(key, { name: `Selected Content from ${url}`, icon: '✂️' });
            outputContents.set(key, fullContent);
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

function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth()+1).padStart(2,'0');
  const day = String(now.getDate()).padStart(2,'0');
  const hour = String(now.getHours()).padStart(2,'0');
  const minute = String(now.getMinutes()).padStart(2,'0');
  const second = String(now.getSeconds()).padStart(2,'0');
  return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
}
