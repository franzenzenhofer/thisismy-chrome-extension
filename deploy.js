// deploy.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to increment version numbers
function incrementVersion(version) {
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/;
  const match = semverRegex.exec(version);
  if (match) {
    let [_, major, minor, patch, preRelease] = match;
    patch = parseInt(patch) + 1; // Increment patch version
    return `${major}.${minor}.${patch}${preRelease || ''}`;
  } else {
    // If version doesn't match x.y.z format, append .1
    return `${version}.1`;
  }
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

// Update dates in LICENSE file
function updateLicenseDates() {
  const licensePath = path.join(__dirname, 'LICENSE');
  if (fs.existsSync(licensePath)) {
    let content = fs.readFileSync(licensePath, 'utf8');
    const dateRegex = /(\*\*Change Date\*\*:\s*)(.*)/;
    const currentDate = new Date().toISOString().split('T')[0];
    if (content.match(dateRegex)) {
      content = content.replace(dateRegex, `$1${currentDate}`);
      fs.writeFileSync(licensePath, content, 'utf8');
      console.log(`Updated Change Date in LICENSE to ${currentDate}`);
    } else {
      console.log('Change Date not found in LICENSE.');
    }
  } else {
    console.log('LICENSE file not found.');
  }
}

// Update year in footer of sidepanel.html
function updateFooterYear() {
  const footerPath = path.join(__dirname, 'sidepanel.html');
  if (fs.existsSync(footerPath)) {
    let content = fs.readFileSync(footerPath, 'utf8');
    const yearRegex = /(&copy;\s*Franz Enzenhofer\s*)(\d{4})(\s*-\s*)/;
    const currentYear = new Date().getFullYear();
    if (content.match(yearRegex)) {
      content = content.replace(yearRegex, `$1${currentYear}$3`);
      fs.writeFileSync(footerPath, content, 'utf8');
      console.log(`Updated footer year in sidepanel.html to ${currentYear}`);
    } else {
      console.log('Footer year not found in sidepanel.html.');
    }
  } else {
    console.log('sidepanel.html file not found.');
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
    updateLicenseDates();
    updateFooterYear();
    deployToGitHub(newVersion);
  } catch (error) {
    console.error(`Deployment failed: ${error.message}`);
  }
}

main();