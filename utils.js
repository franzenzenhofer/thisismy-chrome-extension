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
 '.ppt', '.pptx',

  // Others
  '.rtf', '.odt', '.ods', '.odp',
];

// utils.js

export const parseIgnoreFile = (content) => {
  const lines = content.split('\n');
  const patterns = [];
  
  for (let line of lines) {
    // Remove whitespace
    line = line.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }
    
    // Normalize directory separators
    line = line.replace(/\\/g, '/');
    
    // Remove trailing slashes
    line = line.replace(/\/+$/, '');
    
    // Handle negation
    if (line.startsWith('!')) {
      // Negation patterns are not supported yet
      continue;
    }
    
    patterns.push(line);
  }
  
  return patterns;
};

const gitignorePatternToRegExp = (pattern) => {
  // Escape special regex characters except *, ?, [, ], and /
  let escaped = pattern.replace(/[.+^${}()|\\]/g, '\\$&');
  
  // Handle special folder pattern for both root and nested folders
  if (pattern.startsWith('/')) {
    escaped = escaped.substring(1); // Remove leading slash
  }
  
  // Convert gitignore pattern tokens to regex
  escaped = escaped
    // Handle '**' (matches zero or more directories)
    .replace(/\*\*/g, '.*')
    // Handle '*' (matches anything except /)
    .replace(/\*/g, '[^/]*')
    // Handle '?' (matches any single character except /)
    .replace(/\?/g, '[^/]')
    // Handle [...]
    .replace(/\[([^\]]+)\]/g, '[$1]');
    
  // Build final regex pattern
  let regexString;
  if (pattern.includes('/')) {
    // If pattern contains /, match exactly
    regexString = `^(.*/${escaped}.*|${escaped}.*)$`;
  } else {
    // If pattern is simple filename, match anywhere in path
    regexString = `(^|/)(${escaped})($|/.*)`;
  }
  
  return new RegExp(regexString);
};

export const matchIgnore = (filePath, patterns) => {
  // Normalize path separators
  filePath = filePath.replace(/\\/g, '/');
  // Remove leading slash
  filePath = filePath.replace(/^\//, '');
  
  for (const pattern of patterns) {
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


export function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
}

// Include getFileIcon function
export const getFileIcon = (fileInfo) => {
  const name = fileInfo.name.toLowerCase();
  const type = fileInfo.type;

  if (type.includes('pdf')) {
    return '📄'; // PDF file
  } else if (type.includes('wordprocessingml') || name.endsWith('.doc') || name.endsWith('.docx')) {
    return '📄'; // Word document
  } else if (type.includes('json') || name.endsWith('.json')) {
    return '🔧'; // JSON file
  } else if (type.includes('xml') || name.endsWith('.xml')) {
    return '🔖'; // XML file
  } else if (type.includes('csv') || name.endsWith('.csv')) {
    return '📊'; // CSV file
  } else if (type.includes('text') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.log')) {
    return '📄'; // Plain text file
  } else {
    return '❓'; // Unknown file type
  }
};