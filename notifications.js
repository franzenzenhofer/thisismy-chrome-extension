// notifications.js

export const notification = document.getElementById('notification');

export const showNotification = (message, type = 'info') => {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
};
