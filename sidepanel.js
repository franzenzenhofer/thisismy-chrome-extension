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

// DOM Elements
const dropzone = document.getElementById('dropzone');
const outputArea = document.getElementById('output');
const urlInput = document.getElementById('url-input');
const selectionDisplay = document.getElementById('selection-display');
const addUrlBtn = document.getElementById('add-url-btn');
const processBtn = document.getElementById('process-btn');
const removeWhitespacesCheckbox = document.getElementById('remove-whitespaces');
const copyBtn = document.getElementById('copy-output');
const saveBtn = document.getElementById('save-output');
const processingIndicator = document.getElementById('processing-indicator');
const selectLink = document.querySelector('.select-link');

// Data Structures
let selectedFiles = new Map();
let selectedURLs = new Map();

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

processBtn.addEventListener('click', () => {
  processFilesAndURLs();
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
  } else {
    selectedFiles.set(file.name, file);
  }
  updateSelectionDisplay();
};

const addURL = (url) => {
  if (selectedURLs.has(url)) {
    selectedURLs.set(url, url);
    showNotification(`URL "${url}" updated.`, 'info');
  } else {
    selectedURLs.set(url, url);
  }
  updateSelectionDisplay();
};

const updateSelectionDisplay = () => {
  selectionDisplay.innerHTML = '';

  selectedFiles.forEach((file, fileName) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const span = document.createElement('span');
    span.innerHTML = `<img src="icons/file-icon.png" alt="File Icon"> ${fileName}`;
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Remove';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedFiles.delete(fileName);
      updateSelectionDisplay();
    });

    div.appendChild(deleteBtn);
    selectionDisplay.appendChild(div);
  });

  selectedURLs.forEach((url) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const span = document.createElement('span');
    span.innerHTML = `<img src="icons/url-icon.png" alt="URL Icon"> ${url}`;
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Remove';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedURLs.delete(url);
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
      updateSelectionDisplay();
    });

    div.appendChild(removeAllBtn);
    selectionDisplay.appendChild(div);
  }
};

const processFilesAndURLs = async () => {
  if (selectedFiles.size === 0 && selectedURLs.size === 0) {
    processingIndicator.style.display = 'none';
    outputArea.textContent = '';
    return;
  }

  const options = {
    removeWhitespaces: removeWhitespacesCheckbox.checked,
  };

  processingIndicator.textContent = 'Processing...';
  processingIndicator.style.display = 'block';

  try {
    let outputArr = [];

    // Process Files
    for (const [fileName, file] of selectedFiles.entries()) {
      const content = await readFile(file);
      if (content !== null) {
        outputArr.push(content);
      } else {
        showNotification(`Failed to read file: ${fileName}`, 'error');
      }
    }

    // Process URLs
    for (const [url] of selectedURLs.entries()) {
      const content = await fetchURLContent(url);
      if (content !== null) {
        outputArr.push(content);
      } else {
        showNotification(`Failed to fetch URL: ${url}`, 'error');
      }
    }

    let finalOutput = outputArr.join('\n');

    if (options.removeWhitespaces && finalOutput) {
      finalOutput = finalOutput.replace(/\s+/g, ' ').trim();
    }

    outputArea.textContent = finalOutput;

    processingIndicator.style.display = 'none';

    showNotification('Processing complete!', 'success');
  } catch (error) {
    console.error(error);
    showNotification('An error occurred during processing.', 'error');
    processingIndicator.style.display = 'none';
  }
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
  } else {
    const textContent = await readTextFile(file);
    if (textContent !== null) {
      content = header + textContent + footer;
    } else {
      return null;
    }
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
    return parseHTMLContent(html, url);
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
    chrome.runtime.sendMessage({ type: "FETCH_URL_CONTENT", url }, (response) => {
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

// Debounce the processing function to prevent rapid calls
const processFilesAndURLsDebounced = debounce(processFilesAndURLs, 500);

// Update selection display initially
updateSelectionDisplay();
