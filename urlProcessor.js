// urlProcessor.js


import { addLogEntry } from './logger.js';
import { getFormattedDateTime } from './utils.js';


export const fetchURLContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const content = parseHTMLContent(html, url);
    if (content !== null) {
      return content;
    } else {
      throw new Error('Failed to parse content');
    }
  } catch (error) {
    console.warn('Fetch failed, trying alternative method:', error);
    addLogEntry(`Fetch failed for URL: ${url}. Error: ${error.message}`, 'error');
    return fetchURLContentAlternative(url);
  }
};

const parseHTMLContent = (html, url) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const article = new Readability(doc).parse();
  if (article && article.textContent) {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const header = `Fetched content from ${url} on ${formattedDate}\n\n`;
    const footer = `\n\nEnd of content from ${url}`;
    const content = header + article.textContent + footer;
    return content;
  } else {
    return null;
  }
};

const fetchURLContentAlternative = async (url) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FETCH_URL_CONTENT_TAB", url }, (response) => {
      if (response && response.content) {
        const header = `Content from ${url}\n\n`;
        const footer = `\n\nEnd of content from ${url}`;
        resolve(header + response.content + footer);
      } else {
        addLogEntry(`Failed to fetch content via alternative method for URL: ${url}`, 'error');
        resolve(null);
      }
    });
  });
};
