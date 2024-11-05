// sidepanel.js

// Notification System
const notification = document.getElementById('notification');

const showNotification = (message, type = 'info') => {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
};

// Logging System
const logContainer = document.getElementById('log-container');
const logContent = document.getElementById('log-content');
const toggleLogBtn = document.getElementById('toggle-log-btn');

let isLogVisible = false;

toggleLogBtn.addEventListener('click', () => {
  isLogVisible = !isLogVisible;
  logContent.style.display = isLogVisible ? 'block' : 'none';
  toggleLogBtn.textContent = isLogVisible ? 'Hide Log' : 'Show Log';
});

const addLogEntry = (message, type = 'info') => {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.innerHTML = `<time>[${timestamp}]</time> ${message}`;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
};

// DOM Elements
const dropzone = document.getElementById('dropzone');
const outputArea = document.getElementById('output');
const urlInput = document.getElementById('url-input');
const selectionDisplay = document.getElementById('selection-display');
const addUrlBtn = document.getElementById('add-url-btn');
const removeWhitespacesCheckbox = document.getElementById('remove-whitespaces');
const copyBtn = document.getElementById('copy-output');
const saveBtn = document.getElementById('save-output');
const processingIndicator = document.getElementById('processing-indicator');
const selectLink = document.querySelector('.select-link');
const getCurrentUrlBtn = document.getElementById('get-current-url-btn');

// Data Structures
let selectedFiles = new Map();
let selectedURLs = new Map();
let outputContents = new Map();

// Utility Functions
const isValidURL = (string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Event Listeners
const dropTargets = [dropzone, outputArea, urlInput, selectionDisplay];

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
        copyBtn.textContent = 'Copy to Clipboard';
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
  a.download = 'output.txt';
  a.click();

  URL.revokeObjectURL(url);

  showNotification('Output saved successfully!', 'success');
});

selectLink.addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.click();

  fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    for (const file of files) {
      addFile(file);
    }
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

// Functions
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
      const file = item.getAsFile();
      addFile(file);
    }
  }
};

const addFile = (file) => {
  if (selectedFiles.has(file.name)) {
    selectedFiles.set(file.name, file);
    showNotification(`File "${file.name}" updated.`, 'info');
    addLogEntry(`File "${file.name}" updated.`, 'info');
  } else {
    selectedFiles.set(file.name, file);
    showNotification(`File "${file.name}" added.`, 'success');
    addLogEntry(`File "${file.name}" added.`, 'success');
  }
  processFile(file);
  updateSelectionDisplay();
};

const addURL = (url) => {
  if (selectedURLs.has(url)) {
    selectedURLs.set(url, url);
    showNotification(`URL "${url}" updated.`, 'info');
    addLogEntry(`URL "${url}" updated.`, 'info');
  } else {
    selectedURLs.set(url, url);
    showNotification(`URL "${url}" added.`, 'success');
    addLogEntry(`URL "${url}" added.`, 'success');
  }
  processURL(url);
  updateSelectionDisplay();
};

const updateSelectionDisplay = () => {
  selectionDisplay.innerHTML = '';

  selectedFiles.forEach((file, fileName) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const span = document.createElement('span');
    const fileIcon = getFileIcon(file);
    span.innerHTML = `<span class="icon">${fileIcon}</span> ${fileName}`;
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Remove';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedFiles.delete(fileName);
      outputContents.delete(fileName);
      updateOutputArea();
      showNotification(`File "${fileName}" removed.`, 'info');
      addLogEntry(`File "${fileName}" removed.`, 'info');
      updateSelectionDisplay();
    });

    div.appendChild(deleteBtn);
    selectionDisplay.appendChild(div);
  });

  selectedURLs.forEach((url) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const span = document.createElement('span');
    span.innerHTML = `<span class="icon">🔗</span> ${url}`;
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Remove';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedURLs.delete(url);
      outputContents.delete(url);
      updateOutputArea();
      showNotification(`URL "${url}" removed.`, 'info');
      addLogEntry(`URL "${url}" removed.`, 'info');
      updateSelectionDisplay();
    });

    div.appendChild(deleteBtn);
    selectionDisplay.appendChild(div);
  });

  if (selectedFiles.size + selectedURLs.size > 1) {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const removeAllBtn = document.createElement('button');
    removeAllBtn.textContent = 'Remove All';
    removeAllBtn.classList.add('delete-btn');
    removeAllBtn.addEventListener('click', () => {
      selectedFiles.clear();
      selectedURLs.clear();
      outputContents.clear();
      updateOutputArea();
      showNotification('All items removed.', 'info');
      addLogEntry('All items removed.', 'info');
      updateSelectionDisplay();
    });

    div.appendChild(removeAllBtn);
    selectionDisplay.appendChild(div);
  }
};

const getFileIcon = (file) => {
  const type = file.type;
  if (type.includes('pdf')) {
    return '📄';
  } else if (type.includes('wordprocessingml')) {
    return '📄';
  } else if (type.includes('text')) {
    return '📄';
  } else {
    return '❓';
  }
};

const processFile = async (file) => {
  processingIndicator.textContent = `Processing "${file.name}"...`;
  processingIndicator.style.display = 'block';

  try {
    const content = await readFile(file);
    if (content !== null) {
      outputContents.set(file.name, content);
      updateOutputArea();
      showNotification(`Processed file: ${file.name}`, 'success');
      addLogEntry(`Processed file: ${file.name}`, 'success');
    } else {
      showNotification(`Unsupported file type: ${file.name}`, 'error');
      addLogEntry(`Unsupported file type: ${file.name}`, 'error');
    }
  } catch (error) {
    console.error(error);
    showNotification(`Error processing file: ${file.name}`, 'error');
    addLogEntry(`Error processing file: ${file.name}`, 'error');
  } finally {
    processingIndicator.style.display = 'none';
  }
};

const processURL = async (url) => {
  processingIndicator.textContent = `Fetching "${url}"...`;
  processingIndicator.style.display = 'block';

  try {
    const content = await fetchURLContent(url);
    if (content !== null) {
      outputContents.set(url, content);
      updateOutputArea();
      showNotification(`Fetched content from URL: ${url}`, 'success');
      addLogEntry(`Fetched content from URL: ${url}`, 'success');
    } else {
      showNotification(`Failed to fetch URL: ${url}`, 'error');
      addLogEntry(`Failed to fetch URL: ${url}`, 'error');
    }
  } catch (error) {
    console.error(error);
    showNotification(`Error fetching URL: ${url}`, 'error');
    addLogEntry(`Error fetching URL: ${url}`, 'error');
  } finally {
    processingIndicator.style.display = 'none';
  }
};

const updateOutputArea = () => {
  let finalOutput = '';
  outputContents.forEach((content) => {
    finalOutput += content + '\n';
  });

  if (removeWhitespacesCheckbox.checked) {
    finalOutput = finalOutput.replace(/\s+/g, ' ').trim();
  }

  outputArea.textContent = finalOutput;
};

const readFile = async (file) => {
  let content = '';
  const header = `This is my current ${file.name}\n\n`;
  const footer = `\n\nThis is the end of ${file.name}`;

  if (file.type === 'application/pdf') {
    const pdfContent = await readPDFFile(file);
    if (pdfContent !== null) {
      content = header + pdfContent + footer;
    } else {
      return null;
    }
  } else if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const wordContent = await readWordFile(file);
    if (wordContent !== null) {
      content = header + wordContent + footer;
    } else {
      return null;
    }
  } else if (file.type.startsWith('text/')) {
    const textContent = await readTextFile(file);
    if (textContent !== null) {
      content = header + textContent + footer;
    } else {
      return null;
    }
  } else {
    return null; // Unsupported file type
  }

  return content;
};

const readTextFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsText(file);
  });
};

const readPDFFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let pdfText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      pdfText += pageText + '\n';
    }

    return pdfText;
  } catch (error) {
    console.error('Error reading PDF file:', error);
    return null;
  }
};

const readWordFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error reading Word file:', error);
    return null;
  }
};

const fetchURLContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const content = parseHTMLContent(html, url);
    if (content !== null) {
      return content;
    } else {
      throw new Error('Failed to parse content');
    }
  } catch (error) {
    console.warn('Fetch failed, trying alternative method:', error);
    return fetchURLContentAlternative(url);
  }
};

const parseHTMLContent = (html, url) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const article = new Readability(doc).parse();
  if (article && article.textContent) {
    const header = `Content from ${url}\n\n`;
    const footer = `\n\nEnd of content from ${url}`;
    const content = header + article.textContent + footer;
    return content;
  } else {
    return null;
  }
};

const fetchURLContentAlternative = async (url) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FETCH_URL_CONTENT_TAB", url }, (response) => {
      if (response && response.content) {
        const header = `Content from ${url}\n\n`;
        const footer = `\n\nEnd of content from ${url}`;
        resolve(header + response.content + footer);
      } else {
        resolve(null);
      }
    });
  });
};

// New DOM Elements
const getCurrentPageContentBtn = document.getElementById('get-current-page-content-btn');
const getSelectedContentBtn = document.getElementById('get-selected-content-btn');

// Event Listeners for New Buttons
getCurrentPageContentBtn.addEventListener('click', () => {
  getCurrentPageContent();
});

getSelectedContentBtn.addEventListener('click', () => {
  getSelectedContent();
});

// Function to Get Current Page Content
function getCurrentPageContent() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ['libs/Readability.js']
      },
      () => {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            func: () => {
              const article = new Readability(document).parse();
              return article ? article.textContent : document.body.innerText;
            },
            world: 'MAIN'
          },
          (results) => {
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
              updateOutputArea();
              showNotification('Got current page content.', 'success');
              addLogEntry(`Got current page content from ${url}`, 'success');

              // Optionally, add it to the selection display
              if (!selectedURLs.has(url)) {
                selectedURLs.set(url, url);
                updateSelectionDisplay();
              }
            }
          }
        );
      }
    );
  });
}

// Function to Get Selected Content
function getSelectedContent() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => {
          const selection = window.getSelection();
          return selection ? selection.toString() : '';
        },
        world: 'MAIN'
      },
      (results) => {
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
            outputContents.set(key, fullContent);
            updateOutputArea();
            showNotification('Got selected content.', 'success');
            addLogEntry(`Got selected content from ${url}`, 'success');

            // Optionally, add it to the selection display
            if (!selectedURLs.has(url)) {
              selectedURLs.set(url, url);
              updateSelectionDisplay();
            }
          } else {
            showNotification('No content selected.', 'info');
            addLogEntry('No content selected.', 'info');
          }
        }
      }
    );
  });
}

// Update selection display initially
updateSelectionDisplay();
