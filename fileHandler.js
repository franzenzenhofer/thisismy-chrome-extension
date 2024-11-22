import { addLogEntry } from './logger.js';
import { parseIgnoreFile, matchIgnore } from './utils.js';
import { addFile } from './main.js';

export const traverseFileTree = async (entry, path = '', ignorePatterns = [], insertIndex = undefined) => {
  addLogEntry(`Traversing ${entry.isDirectory ? 'directory' : 'file'}: ${entry.name}`, 'info');

  if (entry.isFile) {
    entry.file((file) => {
      file.filePath = '/' + path + file.name;
      if (!matchIgnore(file.filePath, ignorePatterns)) {
        addLogEntry(`Adding file at index ${insertIndex}: ${file.filePath}`, 'info');
        addFile(file, insertIndex);
      } else {
        addLogEntry(`Ignored file: ${file.filePath}`, 'info');
      }
    });
  } else if (entry.isDirectory) {
    try {
      const dirReader = entry.createReader();
      const entries = await readAllEntries(dirReader);
      await handleDirectoryEntries(entries, entry, path, ignorePatterns, insertIndex);
    } catch (error) {
      addLogEntry(`Error processing directory ${entry.name}: ${error.message}`, 'error');
    }
  }
};

const readAllEntries = (dirReader) => {
  return new Promise((resolve) => {
    let entries = [];
    const readEntries = () => {
      dirReader.readEntries((results) => {
        if (!results.length) {
          resolve(entries);
        } else {
          entries = entries.concat(Array.from(results));
          readEntries();
        }
      });
    };
    readEntries();
  });
};

const handleDirectoryEntries = async (entries, entry, path, ignorePatterns, insertIndex) => {
  // Initialize ignore patterns for this directory
  let currentIgnorePatterns = [...ignorePatterns];

  // Look for .thisismyignore or .gitignore
  const ignoreFileEntry = entries.find((e) => e.name === '.thisismyignore' || e.name === '.gitignore');

  if (ignoreFileEntry) {
    const newPatterns = await readIgnoreFile(ignoreFileEntry);
    if (ignoreFileEntry.name === '.thisismyignore') {
      currentIgnorePatterns = newPatterns;
      addLogEntry(`Parsed .thisismyignore in ${'/' + path + entry.name}`, 'info');
    } else if (!entries.some((e) => e.name === '.thisismyignore')) {
      currentIgnorePatterns = currentIgnorePatterns.concat(newPatterns);
      addLogEntry(`Parsed .gitignore in ${'/' + path + entry.name}`, 'info');
    }
  }

  for (let childEntry of entries) {
    if (childEntry.name.startsWith('.')) continue;
    const childPath = path + entry.name + '/';
    const relativePath = '/' + childPath + childEntry.name;
    if (!matchIgnore(relativePath, currentIgnorePatterns)) {
      await traverseFileTree(childEntry, childPath, currentIgnorePatterns, insertIndex);
    } else {
      addLogEntry(`Ignored ${childEntry.isDirectory ? 'directory' : 'file'}: ${relativePath}`, 'info');
    }
  }
};

const readIgnoreFile = (entry) => {
  return new Promise((resolve) => {
    entry.file((file) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(parseIgnoreFile(e.target.result));
      reader.onerror = () => resolve([]);
      reader.readAsText(file);
    });
  });
};