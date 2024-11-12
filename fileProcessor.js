import { addLogEntry } from './logger.js';


export const readFile = async (file) => {
  let content = '';
  const now = new Date();
  const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
  const header = `This is my current ${file.filePath} on ${formattedDate}\n\n`;
  const footer = `\n\nThis is the end of ${file.filePath}\n\n`;

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
  } else if (
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const excelContent = await readExcelFile(file);
    if (excelContent !== null) {
      content = header + excelContent + footer;
    } else {
      return null;
    }
  } else {
    // Attempt to read any other file type as text
    const textContent = await readTextFile(file);
    if (textContent !== null) {
      content = header + textContent + footer;
    } else {
      return null;
    }
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
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error reading Word file:', error);
    return null;
  }
};

const readExcelFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    // Get sheet names and total number of sheets
    const sheetNames = workbook.SheetNames;
    const totalSheets = sheetNames.length;
    addLogEntry(`Excel file "${file.name}" contains ${totalSheets} sheets: ${sheetNames.join(', ')}`, 'info');

    let excelText = '';

    sheetNames.forEach((sheetName) => {
      addLogEntry(`Processing sheet "${sheetName}"`, 'info');

      const worksheet = workbook.Sheets[sheetName];
      const sheetJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

      // Skip empty sheets
      if (sheetJson.length === 0) {
        addLogEntry(`Sheet "${sheetName}" is empty and will be skipped`, 'warning');
        return;
      }

      // Determine number of columns and column names
      const headerRow = sheetJson[0] || [];
      let trimmedHeaderRow = [...headerRow];
      while (trimmedHeaderRow.length && trimmedHeaderRow[trimmedHeaderRow.length - 1] === '') {
        trimmedHeaderRow.pop();
      }
      const numberOfColumns = trimmedHeaderRow.length;
      const columnNames = trimmedHeaderRow.join(', ');

      // Count the number of data rows (excluding header row)
      let numberOfDataRows = 0;
      for (let i = 1; i < sheetJson.length; i++) {
        const row = sheetJson[i];
        const isEmptyRow = row.every((cell) => cell === '');
        if (!isEmptyRow) {
          numberOfDataRows += 1;
        }
      }

      // Add the preamble text to excelText
      excelText += '\n\n';
      excelText += `This is the sheet "${sheetName}" it has ${numberOfColumns} columns ${columnNames} and ${numberOfDataRows} rows\n\n`;

      // Proceed to process the data
      sheetJson.forEach((row, rowIndex) => {
        // Remove empty rows
        const isEmptyRow = row.every((cell) => cell === '');
        if (!isEmptyRow) {
          // Trim empty cells at the end of each row
          let trimmedRow = [...row];
          while (trimmedRow.length && trimmedRow[trimmedRow.length - 1] === '') {
            trimmedRow.pop();
          }
          excelText += trimmedRow.join('\t') + '\n';
        }
      });

      // After each sheet
      // Add the closing text
      excelText += `This is the end of sheet "${sheetName}"\n\n`;
    });

    // Trim multiple consecutive newlines
    excelText = excelText.replace(/\n{3,}/g, '\n\n');

    return excelText.trim();
  } catch (error) {
    console.error('Error reading Excel file:', error);
    addLogEntry(`Error reading Excel file "${file.name}": ${error.message}`, 'error');
    return null;
  }
};
