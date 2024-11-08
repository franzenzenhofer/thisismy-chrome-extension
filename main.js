// main.js

import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { initializeEventListeners } from './uiHandlers.js';
import { readFile } from './fileProcessor.js';
import { fetchURLContent } from './urlProcessor.js';
import { updateSelectionDisplay } from './selectionlist.js';
import { importBriefing } from './importexport.js';
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
import { isUnsupportedFile, getFileIcon, getFormattedDateTime } from './utils.js';

export const selectedFiles = new Map();
export const selectedURLs = new Map();
export const selectedNotes = new Map();
export const selectedSpecials = new Map();
export const outputContents = new Map();
export const selectionOrder = [];

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
  // Check if URL ends with .thisismy.json
  if (url.trim().endsWith('.thisismy.json')) {
    importBriefingFromURL(url);
  } else {
    showNotification(`Processing URL: ${url}`, 'info');
    addLogEntry(`Processing URL: ${url}`, 'info');
    processURL(url);
  }
};

const processURL = async (url) => {
  const urlKey = `url:${Date.now()}`; // Use timestamp as key to ensure uniqueness
  processingIndicator.textContent = `Processing URL "${url}"...`;
  processingIndicator.style.display = 'block';
  try {
    const content = await fetchURLContent(url);
    if (content !== null) {
      outputContents.set(urlKey, content);
      selectedURLs.set(urlKey, url);
      selectionOrder.push(urlKey);
      updateSelectionDisplay();
      updateOutputArea();
      showNotification(`Processed URL: ${url}`, 'success');
      addLogEntry(`Processed URL: ${url}`, 'success');
    } else {
      showNotification(`Failed to fetch content from URL: ${url}`, 'error');
      addLogEntry(`Failed to fetch content from URL: ${url}`, 'error');
    }
  } catch (error) {
    console.error(error);
    showNotification(`Error processing URL: ${url}`, 'error');
    addLogEntry(`Error processing URL: ${url}`, 'error');
  } finally {
    processingIndicator.style.display = 'none';
  }
};

export const addNote = (note) => {
  showNotification(`Added Note`, 'info');
  addLogEntry(`Added Note: ${note}`, 'info');
  processNote(note);
};

const processNote = (note) => {
  const key = `note:${Date.now()}`; // Use timestamp as key to ensure uniqueness
  const content = `----\n\n${note}\n\n----\n\n`;
  outputContents.set(key, content);
  selectedNotes.set(key, note);
  selectionOrder.push(key);
  updateSelectionDisplay();
  updateOutputArea();
};

const processFile = async (file) => {
  processingIndicator.textContent = `Processing "${file.name}"...`;
  processingIndicator.style.display = 'block';
  try {
    // Check if the file is a .thisismy.json file and only one file is being processed
    if (
      file.name.endsWith('.thisismy.json') &&
      selectedFiles.size + selectedURLs.size + selectedNotes.size + selectedSpecials.size === 0
    ) {
      await importBriefing(file);
    } else {
      const content = await readFile(file);
      if (content !== null) {
        outputContents.set(file.filePath, content);
        // Store file metadata instead of the File object
        selectedFiles.set(file.filePath, {
          name: file.name,
          filePath: file.filePath,
          type: file.type,
        });
        selectionOrder.push(file.filePath);
        updateSelectionDisplay();
        updateOutputArea();
        showNotification(`Processed file: ${file.name}`, 'success');
        addLogEntry(`Processed file: ${file.filePath}`, 'success');
      } else {
        showNotification(`Unsupported file type: ${file.name}`, 'error');
        addLogEntry(`Unsupported file type: ${file.name}`, 'error');
      }
    }
  } catch (error) {
    console.error(error);
    showNotification(`Error processing file: ${file.name}`, 'error');
    addLogEntry(`Error processing file: ${file.name}`, 'error');
  } finally {
    processingIndicator.style.display = 'none';
  }
};



export const updateOutputArea = () => {
  let finalOutput = '';
  selectionOrder.forEach((key) => {
    const content = outputContents.get(key);
    if (content) {
      finalOutput += content + '\n';
    }
  });
  if (removeWhitespacesCheckbox.checked) {
    finalOutput = finalOutput.replace(/[\s\n]+/g, ' ').trim();
  }
  outputArea.textContent = finalOutput;

  // Calculate approximate token count using the rule of thumb (1 token ≈ 4 characters)
  const tokenCount = Math.ceil(finalOutput.length / 4);

  // Update the title attribute of the copy button
  copyBtn.title = `~${tokenCount} tokens`;
};

// Initialize selection display
updateSelectionDisplay();

// Message listener to handle messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ADD_SELECTED_CONTENT') {
    const { content, url } = message;
    const title = `Selected content from ${url}`;
    const key = `selection:${Date.now()}`;
    outputContents.set(key, content);
    selectedSpecials.set(key, { name: title, icon: '✂️' });
    selectionOrder.push(key);
    updateSelectionDisplay();
    updateOutputArea();
    showNotification(`Received selected content from ${url}`, 'success');
    addLogEntry(`Received selected content from ${url}`, 'success');
    sendResponse({ success: true });
  }
  // Handle other message types if needed
});

// On side panel load, check for stored selected content
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('selectedContent', (data) => {
    if (data.selectedContent) {
      const { content, url } = data.selectedContent;
      const title = `Selected content from ${url}`;
      const key = `selection:${Date.now()}`;
      outputContents.set(key, content);
      selectedSpecials.set(key, { name: title, icon: '✂️' });
      selectionOrder.push(key);
      updateSelectionDisplay();
      updateOutputArea();
      showNotification(`Received selected content from ${url}`, 'success');
      addLogEntry(`Received selected content from ${url}`, 'success');

      // Remove the stored content
      chrome.storage.local.remove('selectedContent', () => {
        console.log('Selected content removed from chrome.storage.local');
      });
    }
  });
});

// Function to import briefing from a URL ending with .thisismy.json
const importBriefingFromURL = async (url) => {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const file = new File([text], 'briefing.thisismy.json', { type: 'application/json' });
    await importBriefing(file);
  } catch (error) {
    console.error('Error importing briefing from URL:', error);
    showNotification('Failed to import briefing from URL.', 'error');
    addLogEntry(`Failed to import briefing from URL: ${error.message}`, 'error');
  }
};
