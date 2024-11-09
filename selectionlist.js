// selectionlist.js

import {
  selectedFiles,
  selectedURLs,
  selectedNotes,
  selectedSpecials,
  outputContents,
  selectionOrder,
} from './state.js';
import { selectionDisplay } from './uiElements.js';
import { getFileIcon } from './utils.js';
import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { updateOutputArea } from './main.js';

export const updateSelectionDisplay = () => {
  selectionDisplay.innerHTML = '';

  // Create table element
  const table = document.createElement('table');
  table.classList.add('selection-table');

  // For each selection item
  selectionOrder.forEach((key) => {
    const tr = document.createElement('tr');
    tr.classList.add('selection-item');
    tr.setAttribute('draggable', 'true');
    tr.dataset.key = key;

    // Icon cell
    const iconTd = document.createElement('td');
    iconTd.classList.add('icon-cell');
    let icon = '';
    if (selectedFiles.has(key)) {
      let fileInfo = selectedFiles.get(key);
      icon = getFileIcon(fileInfo);
    } else if (selectedURLs.has(key)) {
      icon = '🔗';
    } else if (selectedNotes.has(key)) {
      icon = '📝';
    } else if (selectedSpecials.has(key)) {
      let specialItem = selectedSpecials.get(key);
      icon = specialItem.icon || '❓';
    }
    iconTd.innerHTML = `<span class="icon">${icon}</span>`;
    tr.appendChild(iconTd);

    // Text cell
    const textTd = document.createElement('td');
    textTd.classList.add('text-cell');

    let displayText = '';
    let titleText = '';
    if (selectedFiles.has(key)) {
      let fileInfo = selectedFiles.get(key);
      displayText = fileInfo.name;
      titleText = key;
    } else if (selectedURLs.has(key)) {
      let url = selectedURLs.get(key);
      displayText = url;
      titleText = url;
    } else if (selectedNotes.has(key)) {
      let note = selectedNotes.get(key);
      displayText = note.length > 30 ? note.substring(0, 30) + '...' : note;
      titleText = note;
    } else if (selectedSpecials.has(key)) {
      let specialItem = selectedSpecials.get(key);
      displayText = specialItem.name;
      titleText = specialItem.name;
    } else {
      return; // Skip if not found
    }
    textTd.textContent = displayText;
    textTd.title = titleText;
    tr.appendChild(textTd);

    // Delete button cell
    const deleteTd = document.createElement('td');
    deleteTd.classList.add('delete-cell');

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.draggable = false;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedFiles.has(key)) {
        selectedFiles.delete(key);
      } else if (selectedURLs.has(key)) {
        selectedURLs.delete(key);
      } else if (selectedNotes.has(key)) {
        selectedNotes.delete(key);
      } else if (selectedSpecials.has(key)) {
        selectedSpecials.delete(key);
      }
      outputContents.delete(key);
      selectionOrder.splice(selectionOrder.indexOf(key), 1);
      updateOutputArea();
      updateSelectionDisplay();
      showNotification(`Item removed.`, 'info');
      addLogEntry(`Item removed: ${key}`, 'info');
    });
    deleteTd.appendChild(deleteBtn);
    tr.appendChild(deleteTd);

    // Add drag and drop event listeners to the 'tr'
    tr.addEventListener('dragstart', handleDragStart);
    tr.addEventListener('dragover', handleDragOver);
    tr.addEventListener('drop', handleDrop);
    tr.addEventListener('dragenter', handleDragEnter);
    tr.addEventListener('dragleave', handleDragLeave);
    tr.addEventListener('dragend', handleDragEnd);

    table.appendChild(tr);
  });

  // If more than one item, add 'Remove All' button
  if (selectionOrder.length > 1) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.classList.add('remove-all-cell');

    const removeAllBtn = document.createElement('button');
    removeAllBtn.textContent = 'Remove All';
    removeAllBtn.classList.add('remove-all-btn', 'btn', 'waves-effect', 'waves-light');
    removeAllBtn.draggable = false;
    removeAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedFiles.clear();
      selectedURLs.clear();
      selectedNotes.clear();
      selectedSpecials.clear();
      outputContents.clear();
      selectionOrder.length = 0;
      updateOutputArea();
      updateSelectionDisplay();
      showNotification('All items removed.', 'info');
      addLogEntry('All items removed.', 'info');
    });
    td.appendChild(removeAllBtn);
    tr.appendChild(td);
    table.appendChild(tr);
  }

  selectionDisplay.appendChild(table);
};

// Drag and Drop Handlers
let dragSrcEl = null;

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.key);

  this.classList.add('dragging');
  this.style.cursor = 'grabbing';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  e.preventDefault();
  const target = e.currentTarget;
  if (target !== dragSrcEl) {
    target.classList.add('over');
  }
}

function handleDragLeave(e) {
  e.preventDefault();
  const target = e.currentTarget;
  if (target !== dragSrcEl) {
    if (!target.contains(e.relatedTarget)) {
      target.classList.remove('over');
    }
  }
}

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  if (dragSrcEl !== this) {
    const srcKey = dragSrcEl.dataset.key;
    const targetKey = this.dataset.key;

    const srcIndex = selectionOrder.indexOf(srcKey);
    const targetIndex = selectionOrder.indexOf(targetKey);

    selectionOrder.splice(srcIndex, 1);
    selectionOrder.splice(targetIndex, 0, srcKey);

    updateSelectionDisplay();
    updateOutputArea();
  }
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  this.style.cursor = 'grab';

  const items = selectionDisplay.querySelectorAll('.selection-item');
  items.forEach((item) => {
    item.classList.remove('over');
  });
}

// Add event listeners to the selection display container
selectionDisplay.addEventListener('dragover', (e) => {
  e.preventDefault();
});

selectionDisplay.addEventListener('drop', (e) => {
  e.preventDefault();
  const target = e.target.closest('.selection-item');
  if (target && dragSrcEl && dragSrcEl !== target) {
    const srcKey = dragSrcEl.dataset.key;
    const targetKey = target.dataset.key;

    const srcIndex = selectionOrder.indexOf(srcKey);
    const targetIndex = selectionOrder.indexOf(targetKey);

    selectionOrder.splice(srcIndex, 1);
    selectionOrder.splice(targetIndex, 0, srcKey);

    updateSelectionDisplay();
    updateOutputArea();
  }
});
