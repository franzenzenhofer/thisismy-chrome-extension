// logger.js

export const logContainer = document.getElementById('log-container');
export const logContent = document.getElementById('log-content');
export const toggleLogBtn = document.getElementById('toggle-log-btn');

let isLogVisible = false;

toggleLogBtn.addEventListener('click', () => {
  isLogVisible = !isLogVisible;
  logContent.style.display = isLogVisible ? 'block' : 'none';
  toggleLogBtn.textContent = isLogVisible ? 'Hide Log' : 'Show Log';
});

export const addLogEntry = (message, type = 'info') => {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.innerHTML = `<time>[${timestamp}]</time> ${message}`;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
};
