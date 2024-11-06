import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { initializeEventListeners } from './uiHandlers.js';
import { readFile } from './fileProcessor.js';
import { fetchURLContent } from './urlProcessor.js';
import {
  notification,
  logContainer,
  logContent,
  toggleLogBtn,
  dropzone,
  outputArea,
  urlInput,
  selectionDisplay,
  addUrlBtn,
  copyBtn,
  saveBtn,
  processingIndicator,
  selectLink,
  getCurrentUrlBtn,
  getCurrentPageContentBtn,
  getSelectedContentBtn,
  removeWhitespacesCheckbox,
} from './uiElements.js';
import { isUnsupportedFile } from './utils.js';

export const selectedFiles = new Map();
export const selectedURLs = new Map();
export const selectedSpecials = new Map();
export const outputContents = new Map();

pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.js';
initializeEventListeners();

export const addFile = (file) => {
  if (!file.filePath) {
    file.filePath = file.webkitRelativePath || file.name;
  }
  if (isUnsupportedFile(file)) {
    showNotification(`Unsupported file type: ${file.name}`, 'error');
    addLogEntry(`Unsupported file type: ${file.filePath}`, 'error');
    return;
  }
  showNotification(`Processing file: ${file.name}`, 'info');
  addLogEntry(`Processing file: ${file.filePath}`, 'info');
  processFile(file);
};

export const addURL = (url) => {
  showNotification(`Processing URL: ${url}`, 'info');
  addLogEntry(`Processing URL: ${url}`, 'info');
  processURL(url);
};

export const updateSelectionDisplay = () => {
  selectionDisplay.innerHTML = '';
  selectedFiles.forEach((file, filePath) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const fileIcon = getFileIcon(file);
    const fileName = file.name;
    const span = document.createElement('span');
    span.innerHTML = `<span class="icon">${fileIcon}</span> ${fileName}`;
    span.title = filePath; // Show full file path on hover
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedFiles.delete(filePath);
      outputContents.delete(filePath);
      updateOutputArea();
      showNotification(`File "${filePath}" removed.`, 'info');
      addLogEntry(`File "${filePath}" removed.`, 'info');
      updateSelectionDisplay();
    });

    div.appendChild(deleteBtn);

    // Add separator line
    const separator = document.createElement('hr');
    separator.classList.add('separator');

    selectionDisplay.appendChild(div);
    selectionDisplay.appendChild(separator);
  });

  // Remaining code for selectedURLs and selectedSpecials remains the same...

  if (selectedFiles.size + selectedURLs.size + selectedSpecials.size > 1) {
    const div = document.createElement('div');
    div.classList.add('selection-item');
    const removeAllBtn = document.createElement('button');
    removeAllBtn.textContent = 'Remove All';
    removeAllBtn.classList.add('delete-btn');
    removeAllBtn.addEventListener('click', () => {
      selectedFiles.clear();
      selectedURLs.clear();
      selectedSpecials.clear();
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
      selectedFiles.set(file.name, file);
      updateSelectionDisplay();
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
      selectedURLs.set(url, url);
      updateSelectionDisplay();
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

export const updateOutputArea = () => {
  let finalOutput = '';
  outputContents.forEach((content) => {
    finalOutput += content + '\n';
  });
  if (removeWhitespacesCheckbox.checked) {
    finalOutput = finalOutput.replace(/[\s\n]+/g, ' ').trim();
  }
  outputArea.textContent = finalOutput;
};


// Initialize selection display
updateSelectionDisplay();
