// importexport.js

import { outputContents, updateOutputArea, updateSelectionDisplay } from './main.js';
import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { selectedFiles, selectedURLs, selectedNotes, selectedSpecials } from './main.js';

export const exportBriefing = () => {
  try {
    const briefingData = {
      selectedFiles: Array.from(selectedFiles.entries()), // Now contains file metadata
      selectedURLs: Array.from(selectedURLs.entries()),
      selectedNotes: Array.from(selectedNotes.entries()),
      selectedSpecials: Array.from(selectedSpecials.entries()),
      outputContents: Array.from(outputContents.entries()),
    };

    const jsonString = JSON.stringify(briefingData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const filename = `thisismy-briefing-${getFormattedDateTime()}.json`;
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

    // Merge data with existing selections
    briefingData.selectedFiles?.forEach(([key, value]) => selectedFiles.set(key, value));
    briefingData.selectedURLs?.forEach(([key, value]) => selectedURLs.set(key, value));
    briefingData.selectedNotes?.forEach(([key, value]) => selectedNotes.set(key, value));
    briefingData.selectedSpecials?.forEach(([key, value]) => selectedSpecials.set(key, value));
    briefingData.outputContents?.forEach(([key, value]) => outputContents.set(key, value));

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

function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth()+1).padStart(2,'0');
  const day = String(now.getDate()).padStart(2,'0');
  const hour = String(now.getHours()).padStart(2,'0');
  const minute = String(now.getMinutes()).padStart(2,'0');
  const second = String(now.getSeconds()).padStart(2,'0');
  return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
}
