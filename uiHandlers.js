// uiHandlers.js
import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { isValidURL, parseGitignore, matchGitignore } from './utils.js';
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
} from './uiElements.js';
import {
  selectedFiles,
  selectedURLs,
  selectedSpecials,
  outputContents,
  updateOutputArea,
  addFile,
  addURL,
  updateSelectionDisplay,
} from './main.js';

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

  // Add drop handling to selectionDisplay without CSS changes
  selectionDisplay.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  selectionDisplay.addEventListener('drop', (e) => {
    e.preventDefault();
    handleDrop(e);
  });

  addUrlBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (isValidURL(url)) {
      addURL(url);
      urlInput.value = '';
    } else {
      showNotification('Please enter a valid URL.', 'error');
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
        if (entry.isFile) {
          entry.file((file) => {
            addFile(file);
          });
        } else if (entry.isDirectory) {
          traverseFileTree(entry);
        }
      }
    }
  }
};

const traverseFileTree = async (entry, path = '') => {
  if (entry.isFile) {
    entry.file((file) => {
      file.filePath = path + file.name;
      if (!file.name.startsWith('.')) {
        addFile(file);
      }
    });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const entries = await readAllEntries(dirReader);

    // Check for .gitignore file in the directory
    const gitignoreEntry = entries.find((e) => e.name === '.gitignore');
    let gitignorePatterns = [];
    if (gitignoreEntry) {
      gitignorePatterns = await readGitignore(gitignoreEntry);
      addLogEntry(`Parsed .gitignore in ${path}${entry.name}`, 'info');
    }

    for (let childEntry of entries) {
      if (childEntry.name.startsWith('.')) {
        continue; // Ignore dotfiles
      }
      const childPath = path + entry.name + '/';
      if (gitignorePatterns.length > 0 && matchGitignore(childPath, gitignorePatterns)) {
        continue; // Ignore files/directories matching .gitignore
      }
      await traverseFileTree(childEntry, childPath);
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

const readGitignore = (entry) => {
  return new Promise((resolve) => {
    entry.file((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const patterns = parseGitignore(content);
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
  const gitignorePatterns = [];
  files.forEach((file) => {
    file.filePath = file.webkitRelativePath || file.name;
    if (!file.name.startsWith('.') && !matchGitignore(file.filePath, gitignorePatterns)) {
      addFile(file);
    }
  });
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
