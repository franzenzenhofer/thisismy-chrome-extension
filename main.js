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
export const selectedNotes = new Map();
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

export const addNote = (note) => {
  showNotification(`Added Note`, 'info');
  addLogEntry(`Added Note: ${note}`, 'info');
  processNote(note);
};

const processNote = (note) => {
  const key = `note:${Date.now()}`; // Use timestamp as key to ensure uniqueness
  const content = `This is a Note:\n\n${note}\n\nEnd of Note.\n\n`;
  outputContents.set(key, content);
  selectedNotes.set(key, note);
  updateSelectionDisplay();
  updateOutputArea();
};

const processFile = async (file) => {
  processingIndicator.textContent = `Processing "${file.name}"...`;
  processingIndicator.style.display = 'block';
  try {
    const content = await readFile(file);
    if (content !== null) {
      outputContents.set(file.filePath, content);
      // Store file metadata instead of the File object
      selectedFiles.set(file.filePath, {
        name: file.name,
        filePath: file.filePath,
        type: file.type,
      });
      updateSelectionDisplay();
      updateOutputArea();
      showNotification(`Processed file: ${file.name}`, 'success');
      addLogEntry(`Processed file: ${file.filePath}`, 'success');
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

export const updateSelectionDisplay = () => {
  selectionDisplay.innerHTML = '';

  // Create a map to track filename occurrences
  const fileNameCounts = {};
  selectedFiles.forEach((fileInfo) => {
    const fileName = fileInfo.name;
    fileNameCounts[fileName] = (fileNameCounts[fileName] || 0) + 1;
  });

  // Display selected files
  selectedFiles.forEach((fileInfo, filePath) => {
    // Check if fileInfo is valid
    if (!fileInfo || !fileInfo.name) {
      return; // Skip invalid files
    }

    const div = document.createElement('div');
    div.classList.add('selection-item');

    const fileIcon = getFileIcon(fileInfo);
    let displayName = fileInfo.name;

    // Show full path if duplicate filenames exist
    if (fileNameCounts[fileInfo.name] > 1) {
      displayName = fileInfo.filePath;
    }

    const span = document.createElement('span');
    span.innerHTML = `<span class="icon">${fileIcon}</span> ${displayName}`;
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

  // Display selected URLs
  selectedURLs.forEach((url, key) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const urlIcon = '🔗';
    const urlName = url;
    const span = document.createElement('span');
    span.innerHTML = `<span class="icon">${urlIcon}</span> ${urlName}`;
    span.title = url;
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedURLs.delete(key);
      outputContents.delete(key);
      updateOutputArea();
      showNotification(`URL "${url}" removed.`, 'info');
      addLogEntry(`URL "${url}" removed.`, 'info');
      updateSelectionDisplay();
    });

    div.appendChild(deleteBtn);

    const separator = document.createElement('hr');
    separator.classList.add('separator');

    selectionDisplay.appendChild(div);
    selectionDisplay.appendChild(separator);
  });

  // Display selected Notes
  selectedNotes.forEach((note, key) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const noteIcon = '📝';
    const notePreview = note.length > 30 ? note.substring(0, 30) + '...' : note;
    const span = document.createElement('span');
    span.innerHTML = `<span class="icon">${noteIcon}</span> ${notePreview}`;
    span.title = note; // Show full note on hover
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedNotes.delete(key);
      outputContents.delete(key);
      updateOutputArea();
      showNotification(`Note removed.`, 'info');
      addLogEntry(`Note removed.`, 'info');
      updateSelectionDisplay();
    });

    div.appendChild(deleteBtn);

    const separator = document.createElement('hr');
    separator.classList.add('separator');

    selectionDisplay.appendChild(div);
    selectionDisplay.appendChild(separator);
  });

  // Display selected specials
  selectedSpecials.forEach((specialItem, key) => {
    const div = document.createElement('div');
    div.classList.add('selection-item');

    const specialIcon = specialItem.icon || '❓';
    const specialName = specialItem.name;
    const span = document.createElement('span');
    span.innerHTML = `<span class="icon">${specialIcon}</span> ${specialName}`;
    div.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => {
      selectedSpecials.delete(key);
      outputContents.delete(key);
      updateOutputArea();
      showNotification(`Item "${specialName}" removed.`, 'info');
      addLogEntry(`Item "${specialName}" removed.`, 'info');
      updateSelectionDisplay();
    });

    div.appendChild(deleteBtn);

    const separator = document.createElement('hr');
    separator.classList.add('separator');

    selectionDisplay.appendChild(div);
    selectionDisplay.appendChild(separator);
  });

  if (selectedFiles.size + selectedURLs.size + selectedNotes.size + selectedSpecials.size > 1) {
    const div = document.createElement('div');
    div.classList.add('selection-item');
    const removeAllBtn = document.createElement('button');
    removeAllBtn.textContent = 'Remove All';
    removeAllBtn.classList.add('remove-all-btn', 'btn', 'waves-effect', 'waves-light');
    removeAllBtn.addEventListener('click', () => {
      selectedFiles.clear();
      selectedURLs.clear();
      selectedNotes.clear();
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

const getFileIcon = (fileInfo) => {
  const name = fileInfo.name.toLowerCase();
  const type = fileInfo.type;

  if (type.includes('pdf')) {
    return '📄'; // PDF file
  } else if (type.includes('wordprocessingml') || name.endsWith('.doc') || name.endsWith('.docx')) {
    return '📄'; // Word document
  } else if (type.includes('json') || name.endsWith('.json')) {
    return '🔧'; // JSON file
  } else if (type.includes('xml') || name.endsWith('.xml')) {
    return '🔖'; // XML file
  } else if (type.includes('csv') || name.endsWith('.csv')) {
    return '📊'; // CSV file
  } else if (type.includes('text') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.log')) {
    return '📄'; // Plain text file
  } else {
    return '❓'; // Unknown file type
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

  // Calculate approximate token count using the rule of thumb (1 token ≈ 4 characters)
  const tokenCount = Math.ceil(finalOutput.length / 4);
  
  // Update the title attribute of the copy button
  copyBtn.title = `~${tokenCount} tokens`;
};

// Initialize selection display
updateSelectionDisplay();


// Message listener to handle messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ADD_SELECTED_CONTENT") {
    const { content, url } = message;
    const title = `Selected content from ${url}`;
    const key = `selection:${Date.now()}`;
    outputContents.set(key, content);
    selectedSpecials.set(key, { name: title, icon: '✂️' });
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
      updateSelectionDisplay();
      updateOutputArea();
      showNotification(`Received selected content from ${url}`, 'success');
      addLogEntry(`Received selected content from ${url}`, 'success');

      // Remove the stored content
      chrome.storage.local.remove('selectedContent', () => {
        console.log("Selected content removed from chrome.storage.local");
      });
    }
  });
});
