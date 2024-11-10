// deploy.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to increment version numbers
function incrementVersion(version) {
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
  const match = semverRegex.exec(version);
  if (match) {
    let [_, major, minor, patch, preRelease] = match;
    major = parseInt(major);
    minor = parseInt(minor);
    patch = parseInt(patch) + 1; // Increment patch version
    return `${major}.${minor}.${patch}${preRelease ? `-${preRelease}` : ''}`;
  } else {
    // If version doesn't match x.y.z format, default to '0.1.0'
    console.warn(`Version "${version}" is not in expected format. Resetting to "0.1.0".`);
    return '0.1.0';
  }
}

// Update manifest.json version number
function updateManifestVersion() {
  const manifestPath = path.join(__dirname, 'manifest.json');
  let manifest;
  let oldVersion = '0.0.0';
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    oldVersion = manifest.version || oldVersion;
  } catch (error) {
    console.error(`Failed to read manifest.json: ${error.message}`);
    return null;
  }
  const newVersion = incrementVersion(oldVersion);
  manifest.version = newVersion;
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Updated manifest.json from version ${oldVersion} to ${newVersion}`);
    return newVersion;
  } catch (error) {
    console.error(`Failed to write manifest.json: ${error.message}`);
    return null;
  }
}

// Update package.json version number
function updatePackageVersion(version) {
  const packagePath = path.join(__dirname, 'package.json');
  let pkg = {};
  if (fs.existsSync(packagePath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    } catch (error) {
      console.error(`Failed to read package.json: ${error.message}`);
      return;
    }
    pkg.version = version;
  } else {
    // Create package.json if it doesn't exist
    pkg = {
      name: "thisismy-chrome-extension",
      version: version,
      description: "An extension that processes files and URLs",
      main: "main.js",
      scripts: {
        "deploy": "node deploy.js"
      },
      repository: {
        type: "git",
        url: "https://github.com/yourusername/yourrepo.git"
      },
      author: "Franz Enzenhofer",
      license: "Business Source License"
    };
  }
  try {
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log(`Updated package.json to version ${version}`);
  } catch (error) {
    console.error(`Failed to write package.json: ${error.message}`);
  }
}

// Update dates in LICENSE file
function updateLicenseDates() {
  const licensePath = path.join(__dirname, 'LICENSE');
  if (fs.existsSync(licensePath)) {
    let content;
    try {
      content = fs.readFileSync(licensePath, 'utf8');
    } catch (error) {
      console.error(`Failed to read LICENSE: ${error.message}`);
      return;
    }
    const dateRegex = /(\*\*Change Date\*\*:\s*)(\d{4}-\d{2}-\d{2}|CHANGE_DATE_PLACEHOLDER)/;
    const currentDate = new Date().toISOString().split('T')[0];
    if (dateRegex.test(content)) {
      content = content.replace(dateRegex, `$1${currentDate}`);
      try {
        fs.writeFileSync(licensePath, content, 'utf8');
        console.log(`Updated Change Date in LICENSE to ${currentDate}`);
      } catch (error) {
        console.error(`Failed to write LICENSE: ${error.message}`);
      }
    } else {
      console.log('Change Date not found or format is incorrect in LICENSE.');
    }
  } else {
    console.log('LICENSE file not found.');
  }
}

// Update year in footer of sidepanel.html
function updateFooterYear() {
  const footerPath = path.join(__dirname, 'sidepanel.html');
  if (fs.existsSync(footerPath)) {
    let content;
    try {
      content = fs.readFileSync(footerPath, 'utf8');
    } catch (error) {
      console.error(`Failed to read sidepanel.html: ${error.message}`);
      return;
    }
    // Match pattern: &copy; Franz Enzenhofer 2024 -
    const yearRegex = /(&copy;\s*Franz Enzenhofer\s*)(\d{4})(\s*-\s*)/;
    const currentYear = new Date().getFullYear();
    if (yearRegex.test(content)) {
      content = content.replace(yearRegex, `$1${currentYear}$3`);
      try {
        fs.writeFileSync(footerPath, content, 'utf8');
        console.log(`Updated footer year in sidepanel.html to ${currentYear}`);
      } catch (error) {
        console.error(`Failed to write sidepanel.html: ${error.message}`);
      }
    } else {
      console.log('Footer year not found or format is incorrect in sidepanel.html.');
    }
  } else {
    console.log('sidepanel.html file not found.');
  }
}

// Automatically deploy to GitHub
function deployToGitHub(version) {
  try {
    // Check if there are any changes to commit
    const status = execSync('git status --porcelain').toString();
    if (status.trim() === '') {
      console.log('No changes to commit.');
    } else {
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "Release version ${version}"`, { stdio: 'inherit' });
      execSync('git push', { stdio: 'inherit' });
      console.log('Successfully deployed to GitHub');
    }
  } catch (error) {
    console.error(`Error deploying to GitHub: ${error.message}`);
  }
}

// Main function
function main() {
  try {
    const newVersion = updateManifestVersion();
    if (!newVersion) {
      console.error('Failed to update manifest version. Aborting deployment.');
      return;
    }
    updatePackageVersion(newVersion);
    updateLicenseDates();
    updateFooterYear();
    deployToGitHub(newVersion);
  } catch (error) {
    console.error(`Deployment failed: ${error.message}`);
  }
}

main();