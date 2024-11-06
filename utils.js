// utils.js

// Utility Functions
export const isValidURL = (string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

// List of unsupported binary MIME types
const unsupportedMimeTypes = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  'image/x-icon',

  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/webm',

  // Video
  'video/mp4',
  'video/x-msvideo',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
  'video/ogg',

  // Executables
  'application/x-msdownload', // .exe
  'application/x-msdos-program',
  'application/vnd.apple.installer+xml', // .mpkg
  'application/x-sh',
  'application/javascript', // Depending on use-case
  'application/octet-stream', // Generic binary
  'application/x-dosexec',

  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',

  // Unsupported Office Documents
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Others
  'application/rtf',
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'application/vnd.oasis.opendocument.presentation', // .odp',
];

// List of unsupported file extensions as a fallback
const unsupportedFileExtensions = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico',

  // Audio
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.weba',

  // Video
  '.mp4', '.avi', '.mpeg', '.mov', '.webm', '.ogv',

  // Executables
  '.exe', '.dll', '.sh', '.bat', '.cmd', '.msi', '.apk',

  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz',

  // Unsupported Office Documents
  '.xls', '.xlsx', '.ppt', '.pptx',

  // Others
  '.rtf', '.odt', '.ods', '.odp',
];

// Function to parse .gitignore or .thisismyignore content into patterns
export const parseIgnoreFile = (content) => {
  const lines = content.split('\n');
  const patterns = [];
  for (let line of lines) {
    line = line.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    patterns.push(line);
  }
  return patterns;
};

// Function to convert gitignore pattern to RegExp
const gitignorePatternToRegExp = (pattern) => {
  // Escape regex special characters except for *, ?, and /.
  let escaped = pattern.replace(/([.+^=!:${}()|[\]\\])/g, '\\$1');

  // Handle '**' (matches any number of characters, including '/')
  escaped = escaped.replace(/\\\*\\\*/g, '.*');

  // Handle '*' (matches any number of characters except '/')
  escaped = escaped.replace(/\\\*/g, '[^/]*');

  // Handle '?' (matches any single character except '/')
  escaped = escaped.replace(/\\\?/g, '[^/]');

  // Now, construct the regex
  let regexString = '';

  if (pattern.startsWith('/')) {
    // For patterns starting with '/', match the pattern as a path segment anywhere in the path
    regexString = '.*' + escaped + '(/|$)';
  } else {
    // For other patterns, match as a path segment anywhere in the path
    regexString = '(^|/)' + escaped + '(/|$)';
  }

  return new RegExp(regexString);
};

// Function to check if a file or directory path matches any ignore patterns
export const matchIgnore = (filePath, patterns) => {
  for (let pattern of patterns) {
    const regex = gitignorePatternToRegExp(pattern);
    if (regex.test(filePath)) {
      return true;
    }
  }
  return false;
};

// Function to check if a file is unsupported
export const isUnsupportedFile = (file) => {
  // Check MIME type
  if (unsupportedMimeTypes.includes(file.type)) {
    return true;
  }

  // Check file extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (unsupportedFileExtensions.includes(extension)) {
    return true;
  }

  return false;
};
