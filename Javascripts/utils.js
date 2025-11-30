// utils.js
// The escapeHtml function prevents XSS attacks when rendering task names
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Function to display a temporary notification
export function showNotification(message) {
  // Create temporary notification
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(46, 46, 46, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 2000;
    animation: slideDown 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Remove after 2 seconds
  setTimeout(() => {
    notification.style.animation = "slideUp 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}
