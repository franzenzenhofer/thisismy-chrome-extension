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
  
    selectionOrder.forEach((key) => {
      let div = document.createElement('div');
      div.classList.add('selection-item');
      div.setAttribute('draggable', 'true');
      div.dataset.key = key;
  
      let span = document.createElement('span');
  
      if (selectedFiles.has(key)) {
        let fileInfo = selectedFiles.get(key);
        const fileIcon = getFileIcon(fileInfo);
        let displayName = fileInfo.name;
        span.innerHTML = `<span class="icon">${fileIcon}</span> ${displayName}`;
        span.title = key;
      } else if (selectedURLs.has(key)) {
        let url = selectedURLs.get(key);
        const urlIcon = '🔗';
        span.innerHTML = `<span class="icon">${urlIcon}</span> ${url}`;
        span.title = url;
      } else if (selectedNotes.has(key)) {
        let note = selectedNotes.get(key);
        const noteIcon = '📝';
        const notePreview = note.length > 30 ? note.substring(0, 30) + '...' : note;
        span.innerHTML = `<span class="icon">${noteIcon}</span> ${notePreview}`;
        span.title = note;
      } else if (selectedSpecials.has(key)) {
        let specialItem = selectedSpecials.get(key);
        const specialIcon = specialItem.icon || '❓';
        const specialName = specialItem.name;
        span.innerHTML = `<span class="icon">${specialIcon}</span> ${specialName}`;
      } else {
        return;
      }
  
      div.appendChild(span);
  
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
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
  
      div.appendChild(deleteBtn);
  
      div.addEventListener('dragstart', handleDragStart);
      div.addEventListener('dragover', handleDragOver);
      div.addEventListener('drop', handleDrop);
      div.addEventListener('dragenter', handleDragEnter);
      div.addEventListener('dragleave', handleDragLeave);
      div.addEventListener('dragend', handleDragEnd);
  
      selectionDisplay.appendChild(div);
    });
  
    if (selectionOrder.length > 1) {
      const div = document.createElement('div');
      div.classList.add('selection-item');
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
      div.appendChild(removeAllBtn);
      selectionDisplay.appendChild(div);
    }
  };
  
  // Drag and Drop Handlers
  let dragSrcEl = null;
  
  function handleDragStart(e) {
    this.style.opacity = '0.4';
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.key);
  
    this.classList.add('dragging');
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  
  function handleDragEnter(e) {
    e.preventDefault();
    if (this !== dragSrcEl) {
      this.classList.add('over');
    }
  }
  
  function handleDragLeave(e) {
    e.preventDefault();
    if (this !== dragSrcEl) {
      this.classList.remove('over');
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
    this.style.opacity = '1.0';
    this.classList.remove('dragging');
  
    const items = selectionDisplay.querySelectorAll('.selection-item');
    items.forEach((item) => {
      item.classList.remove('over');
    });
  }
  