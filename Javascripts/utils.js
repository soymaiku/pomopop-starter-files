// utils.js
// The escapeHtml function prevents XSS attacks when rendering task names
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== NOTIFICATION CONFIGURATION ====================
// Toast notification settings - Configure duration, position, etc.
export const notificationConfig = {
  toast: {
    duration: 3000, // Duration in ms (3 seconds)
    autoClose: true, // Auto dismiss after duration
    position: "bottom-center", // Position: bottom-center, top-center, etc.
  },
  alert: {
    duration: 5000, // Warning alert duration (5 seconds)
    autoClose: true,
  },
};

// Function to configure notifications
export function configureNotifications(config) {
  Object.assign(notificationConfig, config);
}

// Function to display a custom in-app notification modal (centered)
// Now uses toast instead for in-website notifications
export function showNotification(message, type = "info") {
  showToast(message, type);
}

// Function to display a toast notification (pop-out style from bottom)
export function showToast(message, type = "info") {
  const container = document.getElementById("js-toast-container");

  const toastBgColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-600",
    info: "bg-blue-600",
  };

  const toast = document.createElement("div");
  toast.className = `${
    toastBgColors[type] || toastBgColors.info
  } text-white px-5 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 animate-toast-in w-full md:w-auto min-w-[240px] max-w-xs backdrop-blur-sm border border-white/20 text-sm`;
  toast.innerHTML = `
    <span class="flex-1 font-medium">${message}</span>
    <button class="hover:opacity-70 transition-opacity flex-shrink-0 text-base font-bold">✕</button>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector("button");
  const removeToast = () => {
    toast.classList.remove("animate-toast-in");
    toast.classList.add("animate-toast-out");
    setTimeout(() => toast.remove(), 300);
  };

  closeBtn.addEventListener("click", removeToast);

  // Auto remove after 3 seconds
  setTimeout(removeToast, 3000);
}

// Function to display a warning alert notification with action buttons
export function showWarningAlert(
  message,
  title = "⚠️ Warning",
  actionButtons = null,
) {
  const container = document.getElementById("js-warning-alert-container");

  const alert = document.createElement("div");
  alert.className =
    "w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-lg shadow-lg overflow-hidden animate-alert-slide-down border-l-4 border-yellow-300";

  let buttonsHTML = "";
  if (actionButtons && Array.isArray(actionButtons)) {
    buttonsHTML = actionButtons
      .map(
        (btn, index) =>
          `<button class="px-3 py-1.5 rounded text-sm font-semibold transition-all ${
            btn.type === "primary"
              ? "bg-white text-yellow-600 hover:bg-yellow-50"
              : "bg-yellow-700 text-white hover:bg-yellow-800"
          }" onclick="window.alertButtonAction_${Date.now()}_${index}()">${btn.label}</button>`,
      )
      .join("");
  } else {
    buttonsHTML =
      '<button class="px-3 py-1.5 bg-white text-yellow-600 rounded text-sm font-semibold hover:bg-yellow-50 transition-all" onclick="this.closest(\'[data-alert-id]\').remove()">Dismiss</button>';
  }

  alert.innerHTML = `
    <div class="p-4">
      <div class="flex items-start gap-3">
        <div class="text-2xl flex-shrink-0">⚠️</div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-bold mb-0.5">${title}</h3>
          <p class="text-xs text-white/90 leading-relaxed">${message}</p>
        </div>
        <button onclick="this.closest('[data-alert-id]').remove()" class="flex-shrink-0 text-xl hover:opacity-70 transition-opacity">✕</button>
      </div>
      <div class="flex gap-2 mt-3 flex-wrap justify-end">
        ${buttonsHTML}
      </div>
    </div>
  `;

  alert.setAttribute("data-alert-id", Date.now());

  // Register button action handlers
  if (actionButtons && Array.isArray(actionButtons)) {
    actionButtons.forEach((btn, index) => {
      window[`alertButtonAction_${Date.now()}_${index}`] = () => {
        if (btn.action) btn.action();
        alert.remove();
      };
    });
  }

  container.appendChild(alert);

  // Auto remove after 5 seconds (longer for warnings)
  setTimeout(() => {
    if (alert.parentElement) alert.remove();
  }, 5000);
}
