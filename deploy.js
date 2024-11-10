// deploy.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to increment version numbers
function incrementVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error('Invalid version number format. Expected x.y.z');
  }
  parts[2] += 1; // Increment patch version
  return parts.join('.');
}

// Update manifest.json version number
function updateManifestVersion() {
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const oldVersion = manifest.version || '0.0.0';
  const newVersion = incrementVersion(oldVersion);
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Updated manifest.json from version ${oldVersion} to ${newVersion}`);
  return newVersion;
}

// Update package.json version number
function updatePackageVersion(version) {
  const packagePath = path.join(__dirname, 'package.json');
  let pkg = {};
  if (fs.existsSync(packagePath)) {
    pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
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
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  console.log(`Updated package.json to version ${version}`);
}

// Update CHANGE_DATE_PLACEHOLDER in LICENSE
function updateLicenseDate() {
  const licensePath = path.join(__dirname, 'LICENSE');
  if (fs.existsSync(licensePath)) {
    let content = fs.readFileSync(licensePath, 'utf8');
    const currentDate = new Date().toISOString().split('T')[0];
    if (content.includes('CHANGE_DATE_PLACEHOLDER')) {
      content = content.replace(/CHANGE_DATE_PLACEHOLDER/g, currentDate);
      fs.writeFileSync(licensePath, content);
      console.log(`Updated LICENSE with date ${currentDate}`);
    } else {
      console.log('CHANGE_DATE_PLACEHOLDER not found in LICENSE.');
    }
  } else {
    console.log('LICENSE file not found.');
  }
}

// Automatically deploy to GitHub
function deployToGitHub(version) {
  try {
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "Release version ${version}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('Successfully deployed to GitHub');
  } catch (error) {
    console.error(`Error deploying to GitHub: ${error.message}`);
  }
}

// Main function
function main() {
  try {
    const newVersion = updateManifestVersion();
    updatePackageVersion(newVersion);
    updateLicenseDate();
    deployToGitHub(newVersion);
  } catch (error) {
    console.error(`Deployment failed: ${error.message}`);
  }
}

main();