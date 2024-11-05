// main.js
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
  removeWhitespacesCheckbox,
  copyBtn,
  saveBtn,
  processingIndicator,
  selectLink,
  getCurrentUrlBtn,
  getCurrentPageContentBtn,
  getSelectedContentBtn,
} from './uiElements.js';

export const selectedFiles = new Map();
export const selectedURLs = new Map();
export const outputContents = new Map();

initializeEventListeners();

export const addFile = (file) => {
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

export const addURL = (url) => {
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

export const updateSelectionDisplay = () => {
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

export const updateOutputArea = () => {
  let finalOutput = '';
  outputContents.forEach((content) => {
    finalOutput += content + '\n';
  });
  if (removeWhitespacesCheckbox.checked) {
    finalOutput = finalOutput.replace(/\s+/g, ' ').trim();
  }
  outputArea.textContent = finalOutput;
};

// Initialize selection display
updateSelectionDisplay();
