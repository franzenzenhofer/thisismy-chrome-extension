// materialcssdownload.js

const fs = require('fs');
const https = require('https');
const path = require('path');

// URLs
const materializeCSSUrl = 'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css';
const materializeJSUrl = 'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js';
const materialIconsUrl = 'https://fonts.googleapis.com/icon?family=Material+Icons';

// Destinations
const cssDir = path.join(__dirname, 'css');
const libsDir = path.join(__dirname, 'libs');

const files = [
  { url: materializeCSSUrl, dest: path.join(cssDir, 'materialize.min.css') },
  { url: materializeJSUrl, dest: path.join(libsDir, 'materialize.min.js') },
  { url: materialIconsUrl, dest: path.join(cssDir, 'material-icons.css') },
];

// Ensure directories exist
[cssDir, libsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Download function
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) return reject(`Failed ${url}`);
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err.message);
    });
  });
};

// Download all files
(async () => {
  try {
    for (const file of files) {
      await downloadFile(file.url, file.dest);
      console.log(`Downloaded: ${file.dest}`);
    }
    console.log('All Materialize files downloaded.');
  } catch (error) {
    console.error('Download error:', error);
  }
})();
