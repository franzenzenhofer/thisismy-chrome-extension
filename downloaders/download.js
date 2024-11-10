// download.js

const fs = require('fs');
const https = require('https');
const path = require('path');

// Libraries with their jsDelivr paths for the latest versions
const libraries = [
  {
    url: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.min.js',
    filename: 'pdf.js',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js',
    filename: 'pdf.worker.js',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/mammoth@latest/mammoth.browser.min.js',
    filename: 'mammoth.browser.min.js',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@mozilla/readability@latest/Readability.js',
    filename: 'Readability.js',
  },
];

// Ensure the 'libs' folder exists
const libsDir = path.join(__dirname, 'libs');
if (!fs.existsSync(libsDir)) {
  fs.mkdirSync(libsDir, { recursive: true });
  console.log(`Created directory: ${libsDir}`);
}

// Function to download a file
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded: ${dest}`);
          resolve();
        });
      })
      .on('error', (error) => {
        fs.unlink(dest, () => {}); // Delete the file if an error occurred
        console.error(`Error downloading ${url}: ${error.message}`);
        reject(error);
      });
  });
};

// Download each library
(async () => {
  for (const lib of libraries) {
    const destPath = path.join(libsDir, lib.filename);
    try {
      await downloadFile(lib.url, destPath);
    } catch (error) {
      console.error(`Failed to download ${lib.filename}`);
    }
  }
})();
