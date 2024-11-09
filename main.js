// main.js

import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { initializeEventListeners } from './uiHandlers.js';
import { readFile } from './fileProcessor.js';
import { fetchURLContent } from './urlProcessor.js';
import { updateSelectionDisplay } from './selectionlist.js';
import { importBriefing } from './importexport.js';
import { initializeStoredBriefings } from './storeBriefings.js';
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

// Import shared state variables
import { selectedFiles, selectedURLs, selectedNotes, selectedSpecials, outputContents, selectionOrder } from './state.js';
import { isUnsupportedFile } from './utils.js';

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
    if (
      file.name.endsWith('.thisismy.json') &&
      selectedFiles.size + selectedURLs.size + selectedNotes.size + selectedSpecials.size === 0
    ) {
      await importBriefing(file);
    } else {
      const content = await readFile(file);
      if (content !== null) {
        outputContents.set(file.filePath, content);
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

  const tokenCount = Math.ceil(finalOutput.length / 4);

  copyBtn.title = `~${tokenCount} tokens`;
};

updateSelectionDisplay();

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
});

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

      chrome.storage.local.remove('selectedContent', () => {
        console.log('Selected content removed from chrome.storage.local');
      });
    }
  });
});

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

// Import the ChatGPT functionality
import { initializeChatGPTButton } from './copyIntoChatGpt.js';

initializeChatGPTButton();

initializeStoredBriefings();
