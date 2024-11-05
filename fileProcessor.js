// fileProcessor.js

import { processingIndicator, removeWhitespacesCheckbox, outputArea } from './uiElements.js';
import { showNotification } from './notifications.js';
import { addLogEntry } from './logger.js';
import { outputContents, updateOutputArea } from './main.js';

export const readFile = async (file) => {
  let content = '';
  const header = `This is my current ${file.name}\n\n`;
  const footer = `\n\nThis is the end of ${file.name}`;

  if (file.type === 'application/pdf') {
    const pdfContent = await readPDFFile(file);
    if (pdfContent !== null) {
      content = header + pdfContent + footer;
    } else {
      return null;
    }
  } else if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const wordContent = await readWordFile(file);
    if (wordContent !== null) {
      content = header + wordContent + footer;
    } else {
      return null;
    }
  } else if (file.type.startsWith('text/')) {
    const textContent = await readTextFile(file);
    if (textContent !== null) {
      content = header + textContent + footer;
    } else {
      return null;
    }
  } else {
    return null; // Unsupported file type
  }

  return content;
};

const readTextFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsText(file);
  });
};

const readPDFFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let pdfText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      pdfText += pageText + '\n';
    }

    return pdfText;
  } catch (error) {
    console.error('Error reading PDF file:', error);
    return null;
  }
};

const readWordFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error reading Word file:', error);
    return null;
  }
};
