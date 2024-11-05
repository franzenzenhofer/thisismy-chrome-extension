// notifications.js

const durations = {
  'success': 5000,
  'info': 5000,
  'error': 8000
};

export const notification = document.getElementById('notification');

export const showNotification = (message, type = 'info') => {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, durations[type] || 5000);
};
