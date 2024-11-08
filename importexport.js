// importexport.js

import {
  outputContents,
  updateOutputArea,
  selectionOrder,
  selectedFiles,
  selectedURLs,
  selectedNotes,
  selectedSpecials,
} from './main.js';
import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { updateSelectionDisplay } from './selectionlist.js';
import { isUnsupportedFile, getFileIcon, getFormattedDateTime } from './utils.js';


export const exportBriefing = () => {
  try {
    const briefingData = {
      selectedFiles: Array.from(selectedFiles.entries()), // Now contains file metadata
      selectedURLs: Array.from(selectedURLs.entries()),
      selectedNotes: Array.from(selectedNotes.entries()),
      selectedSpecials: Array.from(selectedSpecials.entries()),
      outputContents: Array.from(outputContents.entries()),
      selectionOrder: Array.from(selectionOrder),
    };

    const jsonString = JSON.stringify(briefingData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const filename = `thisismy-briefing-${getFormattedDateTime()}.thisismy.json`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Briefing exported successfully!', 'success');
    addLogEntry('Briefing exported successfully.', 'success');
  } catch (error) {
    console.error('Error exporting briefing:', error);
    showNotification('Failed to export briefing.', 'error');
    addLogEntry(`Failed to export briefing: ${error.message}`, 'error');
  }
};

export const importBriefing = async (file) => {
  try {
    const text = await file.text();
    const briefingData = JSON.parse(text);

    // Clear existing data
    selectedFiles.clear();
    selectedURLs.clear();
    selectedNotes.clear();
    selectedSpecials.clear();
    outputContents.clear();
    selectionOrder.length = 0;

    // Merge data with existing selections
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

    showNotification('Briefing imported successfully!', 'success');
    addLogEntry('Briefing imported successfully.', 'success');
  } catch (error) {
    console.error('Error importing briefing:', error);
    showNotification('Failed to import briefing.', 'error');
    addLogEntry(`Failed to import briefing: ${error.message}`, 'error');
  }
};


