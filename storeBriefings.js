// storeBriefings.js

import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { updateSelectionDisplay } from './selectionlist.js';
import { updateOutputArea } from './main.js';
import { selectedFiles, selectedURLs, selectedNotes, selectedSpecials, outputContents, selectionOrder } from './state.js';
import { getFormattedDateTime } from './utils.js';

// UI Elements
import { 
  storeBtn, 
  storedBriefingsSelect, 
  briefingNamePopover, 
  briefingNameInput, 
  briefingNameSaveBtn, 
  briefingNameCancelBtn, 
  briefingActionsPopover, 
  briefingLoadBtn, 
  briefingDeleteBtn, 
  briefingCancelBtn 
} from './uiElements.js';

// GitHub Repository Details
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/franzenzenhofer/thisismy-briefings/main/';

// Storage Keys
const USER_BRIEFINGS_KEY = 'storedBriefings';
const PREPARED_BRIEFINGS_KEY = 'preparedBriefings';

// Initialize stored briefings
export const initializeStoredBriefings = () => {
  // Set up event listeners for user briefings
  storeBtn.addEventListener('click', handleStoreBriefing);
  storedBriefingsSelect.addEventListener('change', handleStoredBriefingSelection);
  briefingNameSaveBtn.addEventListener('click', saveBriefingName);
  briefingNameCancelBtn.addEventListener('click', hideBriefingNamePopover);
  briefingLoadBtn.addEventListener('click', () => handleBriefingAction('load'));
  briefingDeleteBtn.addEventListener('click', () => handleBriefingAction('delete'));
  briefingCancelBtn.addEventListener('click', hideBriefingActionsPopover);
  
  // Load both user and prepared briefings
  loadUserBriefings();
  loadPreparedBriefings();
};

// Variables to track selected briefing
let selectedBriefingName = '';
let selectedBriefingSource = ''; // 'user' or 'prepared'

// Handle the "Store" button click for user briefings
const handleStoreBriefing = () => {
  briefingNameInput.value = `Briefing ${getFormattedDateTime()}`;
  briefingNamePopover.style.display = 'block';
};

// Save the user briefing with the provided name
const saveBriefingName = () => {
  const briefingName = briefingNameInput.value.trim();
  if (briefingName) {
    storeUserBriefing(briefingName);
    hideBriefingNamePopover();
  } else {
    showNotification('Please enter a valid name.', 'error');
  }
};

// Hide the briefing name input popover
const hideBriefingNamePopover = () => {
  briefingNamePopover.style.display = 'none';
};

// Store a user briefing in chrome.storage.local under 'storedBriefings'
const storeUserBriefing = (name) => {
  try {
    const briefingData = {
      selectedFiles: Array.from(selectedFiles.entries()),
      selectedURLs: Array.from(selectedURLs.entries()),
      selectedNotes: Array.from(selectedNotes.entries()),
      selectedSpecials: Array.from(selectedSpecials.entries()),
      outputContents: Array.from(outputContents.entries()),
      selectionOrder: Array.from(selectionOrder),
    };

    chrome.storage.local.get({ [USER_BRIEFINGS_KEY]: {} }, (result) => {
      const storedBriefings = result[USER_BRIEFINGS_KEY];
      storedBriefings[name] = briefingData;
      chrome.storage.local.set({ [USER_BRIEFINGS_KEY]: storedBriefings }, () => {
        showNotification(`Briefing "${name}" stored successfully!`, 'success');
        addLogEntry(`Briefing "${name}" stored successfully.`, 'success');
        loadUserBriefings(); // Refresh the dropdown
      });
    });
  } catch (error) {
    console.error('Error storing briefing:', error);
    showNotification('Failed to store briefing.', 'error');
    addLogEntry(`Failed to store briefing: ${error.message}`, 'error');
  }
};

// Load user briefings from chrome.storage.local
const loadUserBriefings = () => {
  chrome.storage.local.get({ [USER_BRIEFINGS_KEY]: {} }, (result) => {
    const userBriefings = result[USER_BRIEFINGS_KEY];
    updateStoredBriefingsDropdown(userBriefings, 'user');
    updateSelectVisibility();
  });
};

// Load prepared briefings from GitHub repository
const loadPreparedBriefings = async () => {
  try {
    const rootTxtUrl = `${GITHUB_RAW_BASE_URL}root.txt`;
    const response = await fetch(rootTxtUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch root.txt: ${response.status} ${response.statusText}`);
    }
    const rootTxt = await response.text();
    const briefingMap = parseRootTxt(rootTxt);

    // Fetch all briefing JSON files listed in root.txt
    const fetchedBriefings = {};
    for (const [key, filename] of Object.entries(briefingMap)) {
      const fileUrl = `${GITHUB_RAW_BASE_URL}briefings/${filename}`;
      try {
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch ${filename}: ${fileResponse.status} ${fileResponse.statusText}`);
        }
        const briefingData = await fileResponse.json();
        fetchedBriefings[key] = briefingData;
      } catch (fileError) {
        console.error(`Error fetching ${filename}:`, fileError);
        addLogEntry(`Error fetching ${filename}: ${fileError.message}`, 'error');
      }
    }

    // Update preparedBriefings in storage
    chrome.storage.local.get({ [PREPARED_BRIEFINGS_KEY]: {} }, (result) => {
      const currentPrepared = result[PREPARED_BRIEFINGS_KEY];
      const updatedPrepared = {};

      // Add or update fetched briefings
      for (const [key, data] of Object.entries(fetchedBriefings)) {
        updatedPrepared[key] = data;
      }

      // Identify and remove briefings that are no longer in the repo
      for (const key of Object.keys(currentPrepared)) {
        if (!fetchedBriefings.hasOwnProperty(key)) {
          addLogEntry(`Removing outdated prepared briefing: ${key}`, 'info');
        }
      }

      chrome.storage.local.set({ [PREPARED_BRIEFINGS_KEY]: updatedPrepared }, () => {
        showNotification('Prepared briefings updated from GitHub.', 'success');
        addLogEntry('Prepared briefings updated from GitHub.', 'success');
        loadPreparedBriefingsDropdown(); // Refresh the dropdown for prepared briefings
        updateSelectVisibility();
      });
    });
  } catch (error) {
    console.error('Error loading prepared briefings:', error);
    showNotification('Failed to load prepared briefings.', 'error');
    addLogEntry(`Failed to load prepared briefings: ${error.message}`, 'error');
  }
};

// Parse root.txt into a key-filename map
const parseRootTxt = (rootTxt) => {
  const lines = rootTxt.split('\n');
  const briefingMap = {};
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === '') continue;
    const [key, filename] = trimmedLine.split(':').map(part => part.trim());
    if (key && filename) {
      briefingMap[key] = filename;
    }
  }
  return briefingMap;
};

// Update the dropdown with briefings, separated by source ('user' or 'prepared')
const updateStoredBriefingsDropdown = (briefings, source) => {
  // Find or create optgroup for the source
  let optgroup = Array.from(storedBriefingsSelect.querySelectorAll(`optgroup[label="${source === 'user' ? 'User Stored Briefings' : 'Prepared Briefings'}"]`))[0];
  if (!optgroup) {
    optgroup = document.createElement('optgroup');
    optgroup.label = source === 'user' ? 'User Stored Briefings' : 'Prepared Briefings';
    storedBriefingsSelect.appendChild(optgroup);
  }

  // Clear existing options in the optgroup
  optgroup.innerHTML = '';

  // Populate the optgroup with options
  for (const name in briefings) {
    const option = document.createElement('option');
    option.value = `${source}:${name}`;
    option.textContent = name;
    optgroup.appendChild(option);
  }

  // Show or hide the optgroup based on whether it has options
  optgroup.style.display = briefings && Object.keys(briefings).length > 0 ? 'block' : 'none';
};

// Load prepared briefings dropdown after updating
const loadPreparedBriefingsDropdown = () => {
  chrome.storage.local.get({ [PREPARED_BRIEFINGS_KEY]: {} }, (result) => {
    const preparedBriefings = result[PREPARED_BRIEFINGS_KEY];
    updateStoredBriefingsDropdown(preparedBriefings, 'prepared');
  });
};

// Handle selection from the dropdown
const handleStoredBriefingSelection = () => {
  const selectedValue = storedBriefingsSelect.value;
  if (selectedValue) {
    const [source, name] = selectedValue.split(':');
    selectedBriefingName = name;
    selectedBriefingSource = source;
    briefingActionsPopover.style.display = 'block';
  }
};

// Handle actions (load/delete) on selected briefing
const handleBriefingAction = (action) => {
  if (action === 'load') {
    loadBriefing(selectedBriefingName, selectedBriefingSource);
  } else if (action === 'delete') {
    if (selectedBriefingSource === 'user') {
      deleteBriefing(selectedBriefingName);
    } else {
      showNotification('Cannot delete prepared briefings.', 'error');
      addLogEntry(`Attempted to delete prepared briefing: ${selectedBriefingName}`, 'error');
    }
  }
  hideBriefingActionsPopover();
  storedBriefingsSelect.value = ''; // Reset selection
};

// Hide the briefing actions popover
const hideBriefingActionsPopover = () => {
  briefingActionsPopover.style.display = 'none';
};

// Load a briefing based on its source
const loadBriefing = (name, source) => {
  if (source === 'user') {
    chrome.storage.local.get({ [USER_BRIEFINGS_KEY]: {} }, (result) => {
      const userBriefings = result[USER_BRIEFINGS_KEY];
      const briefingData = userBriefings[name];
      if (briefingData) {
        // Merge stored data with existing selections
        briefingData.selectedFiles?.forEach(([key, value]) => {
          selectedFiles.set(key, value);
        });
        briefingData.selectedURLs?.forEach(([key, value]) => {
          selectedURLs.set(key, value);
        });
        briefingData.selectedNotes?.forEach(([key, value]) => {
          selectedNotes.set(key, value);
        });
        briefingData.selectedSpecials?.forEach(([key, value]) => {
          selectedSpecials.set(key, value);
        });
        briefingData.outputContents?.forEach(([key, value]) => {
          outputContents.set(key, value);
        });
        briefingData.selectionOrder?.forEach((key) => {
          // To avoid duplicate entries in selectionOrder
          if (!selectionOrder.includes(key)) {
            selectionOrder.push(key);
          }
        });

        updateSelectionDisplay();
        updateOutputArea();

        showNotification(`Briefing "${name}" loaded successfully!`, 'success');
        addLogEntry(`Briefing "${name}" loaded successfully.`, 'success');
      } else {
        showNotification(`Briefing "${name}" not found.`, 'error');
      }
    });
  } else if (source === 'prepared') {
    chrome.storage.local.get({ [PREPARED_BRIEFINGS_KEY]: {} }, (result) => {
      const preparedBriefings = result[PREPARED_BRIEFINGS_KEY];
      const briefingData = preparedBriefings[name];
      if (briefingData) {
        // Merge prepared data with existing selections
        briefingData.selectedFiles?.forEach(([key, value]) => {
          selectedFiles.set(key, value);
        });
        briefingData.selectedURLs?.forEach(([key, value]) => {
          selectedURLs.set(key, value);
        });
        briefingData.selectedNotes?.forEach(([key, value]) => {
          selectedNotes.set(key, value);
        });
        briefingData.selectedSpecials?.forEach(([key, value]) => {
          selectedSpecials.set(key, value);
        });
        briefingData.outputContents?.forEach(([key, value]) => {
          outputContents.set(key, value);
        });
        briefingData.selectionOrder?.forEach((key) => {
          // To avoid duplicate entries in selectionOrder
          if (!selectionOrder.includes(key)) {
            selectionOrder.push(key);
          }
        });

        updateSelectionDisplay();
        updateOutputArea();

        showNotification(`Prepared Briefing "${name}" loaded successfully!`, 'success');
        addLogEntry(`Prepared Briefing "${name}" loaded successfully.`, 'success');
      } else {
        showNotification(`Prepared Briefing "${name}" not found.`, 'error');
      }
    });
  }
};

// Delete a user briefing
const deleteBriefing = (name) => {
  chrome.storage.local.get({ [USER_BRIEFINGS_KEY]: {} }, (result) => {
    const userBriefings = result[USER_BRIEFINGS_KEY];
    if (userBriefings[name]) {
      delete userBriefings[name];
      chrome.storage.local.set({ [USER_BRIEFINGS_KEY]: userBriefings }, () => {
        showNotification(`Briefing "${name}" deleted successfully.`, 'success');
        addLogEntry(`Briefing "${name}" deleted successfully.`, 'success');
        loadUserBriefings(); // Refresh the dropdown
      });
    } else {
      showNotification(`Briefing "${name}" not found.`, 'error');
    }
  });
};

// Update the visibility of the storedBriefingsSelect based on existing briefings
const updateSelectVisibility = () => {
  chrome.storage.local.get(
    { [USER_BRIEFINGS_KEY]: {}, [PREPARED_BRIEFINGS_KEY]: {} },
    (result) => {
      const userBriefings = result[USER_BRIEFINGS_KEY];
      const preparedBriefings = result[PREPARED_BRIEFINGS_KEY];
      const hasUserBriefings = Object.keys(userBriefings).length > 0;
      const hasPreparedBriefings = Object.keys(preparedBriefings).length > 0;

      if (hasUserBriefings || hasPreparedBriefings) {
        storedBriefingsSelect.style.display = 'inline-block';
      } else {
        storedBriefingsSelect.style.display = 'none';
      }
    }
  );
};
