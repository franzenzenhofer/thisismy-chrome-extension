// storeBriefings.js

import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { updateSelectionDisplay } from './selectionlist.js';
import { updateOutputArea } from './main.js';
import { selectedFiles, selectedURLs, selectedNotes, selectedSpecials, outputContents, selectionOrder } from './state.js';
import { getFormattedDateTime } from './utils.js';

// UI Elements
import { storeBtn, storedBriefingsSelect, briefingNamePopover, briefingNameInput, briefingNameSaveBtn, briefingNameCancelBtn, briefingActionsPopover, briefingLoadBtn, briefingDeleteBtn, briefingCancelBtn } from './uiElements.js';

// Initialize stored briefings
export const initializeStoredBriefings = () => {
  storeBtn.addEventListener('click', handleStoreBriefing);
  storedBriefingsSelect.addEventListener('change', handleStoredBriefingSelection);
  briefingNameSaveBtn.addEventListener('click', saveBriefingName);
  briefingNameCancelBtn.addEventListener('click', hideBriefingNamePopover);
  briefingLoadBtn.addEventListener('click', () => handleBriefingAction('load'));
  briefingDeleteBtn.addEventListener('click', () => handleBriefingAction('delete'));
  briefingCancelBtn.addEventListener('click', hideBriefingActionsPopover);
  loadStoredBriefings();
};

let selectedBriefingName = '';

const handleStoreBriefing = () => {
  briefingNameInput.value = `Briefing ${getFormattedDateTime()}`;
  briefingNamePopover.style.display = 'block';
};

const saveBriefingName = () => {
  const briefingName = briefingNameInput.value.trim();
  if (briefingName) {
    storeBriefing(briefingName);
    hideBriefingNamePopover();
  } else {
    showNotification('Please enter a valid name.', 'error');
  }
};

const hideBriefingNamePopover = () => {
  briefingNamePopover.style.display = 'none';
};

const storeBriefing = (name) => {
  try {
    const briefingData = {
      selectedFiles: Array.from(selectedFiles.entries()),
      selectedURLs: Array.from(selectedURLs.entries()),
      selectedNotes: Array.from(selectedNotes.entries()),
      selectedSpecials: Array.from(selectedSpecials.entries()),
      outputContents: Array.from(outputContents.entries()),
      selectionOrder: Array.from(selectionOrder),
    };

    chrome.storage.local.get({ storedBriefings: {} }, (result) => {
      const storedBriefings = result.storedBriefings;
      storedBriefings[name] = briefingData;
      chrome.storage.local.set({ storedBriefings }, () => {
        showNotification(`Briefing "${name}" stored successfully!`, 'success');
        addLogEntry(`Briefing "${name}" stored successfully.`, 'success');
        loadStoredBriefings();
      });
    });
  } catch (error) {
    console.error('Error storing briefing:', error);
    showNotification('Failed to store briefing.', 'error');
    addLogEntry(`Failed to store briefing: ${error.message}`, 'error');
  }
};

const loadStoredBriefings = () => {
  chrome.storage.local.get({ storedBriefings: {} }, (result) => {
    const storedBriefings = result.storedBriefings;
    updateStoredBriefingsDropdown(storedBriefings);
  });
};

const updateStoredBriefingsDropdown = (storedBriefings) => {
  storedBriefingsSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select Stored Briefing';
  storedBriefingsSelect.appendChild(defaultOption);

  for (const name in storedBriefings) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    storedBriefingsSelect.appendChild(option);
  }

  storedBriefingsSelect.style.display = Object.keys(storedBriefings).length > 0 ? 'inline-block' : 'none';
};

const handleStoredBriefingSelection = () => {
  selectedBriefingName = storedBriefingsSelect.value;
  if (selectedBriefingName) {
    briefingActionsPopover.style.display = 'block';
  }
};

const handleBriefingAction = (action) => {
  if (action === 'load') {
    loadBriefing(selectedBriefingName);
  } else if (action === 'delete') {
    deleteBriefing(selectedBriefingName);
  }
  hideBriefingActionsPopover();
  storedBriefingsSelect.value = ''; // Reset selection
};

const hideBriefingActionsPopover = () => {
  briefingActionsPopover.style.display = 'none';
};

const loadBriefing = (name) => {
  chrome.storage.local.get({ storedBriefings: {} }, (result) => {
    const storedBriefings = result.storedBriefings;
    const briefingData = storedBriefings[name];
    if (briefingData) {
      // Clear existing data
      selectedFiles.clear();
      selectedURLs.clear();
      selectedNotes.clear();
      selectedSpecials.clear();
      outputContents.clear();
      selectionOrder.length = 0;

      // Load stored data
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
        selectionOrder.push(key);
      });

      updateSelectionDisplay();
      updateOutputArea();

      showNotification(`Briefing "${name}" loaded successfully!`, 'success');
      addLogEntry(`Briefing "${name}" loaded successfully.`, 'success');
    } else {
      showNotification(`Briefing "${name}" not found.`, 'error');
    }
  });
};

const deleteBriefing = (name) => {
  chrome.storage.local.get({ storedBriefings: {} }, (result) => {
    const storedBriefings = result.storedBriefings;
    if (storedBriefings[name]) {
      delete storedBriefings[name];
      chrome.storage.local.set({ storedBriefings }, () => {
        showNotification(`Briefing "${name}" deleted successfully.`, 'success');
        addLogEntry(`Briefing "${name}" deleted successfully.`, 'success');
        loadStoredBriefings();
      });
    } else {
      showNotification(`Briefing "${name}" not found.`, 'error');
    }
  });
};
