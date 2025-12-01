// app.js
import {
  loadSettings,
  openSettingsModal,
  closeSettingsModal,
  saveSettings,
} from "./settings.js";
import {
  loadTasks,
  updateTaskNameDisplay,
  addTask,
  toggleTaskSection,
  closeTaskModal, // ADDED: Import the new modal close function
} from "./tasks.js";
import {
  switchMode,
  handleMode,
  handleMainButtonClick,
  resetTimer,
} from "./timer.js";
import {
  openMusicModal,
  closeMusicModal,
  playMusic,
  stopMusic,
  handleVolumeChange,
} from "./music.js";
import { timer } from "./config.js";

// ==================== EVENT LISTENERS ====================
document.addEventListener("DOMContentLoaded", () => {
  // Load settings and tasks
  loadSettings();
  loadTasks();
  updateTaskNameDisplay();

  // Header Buttons
  document
    .getElementById("js-settings-btn")
    .addEventListener("click", openSettingsModal);
  document
    .getElementById("js-music-btn")
    .addEventListener("click", openMusicModal);
  document
    .getElementById("js-tasks-toggle-btn")
    .addEventListener("click", toggleTaskSection);

  // Settings Modal Handlers
  document
    .getElementById("js-close-settings")
    .addEventListener("click", closeSettingsModal);
  document
    .getElementById("js-save-settings")
    .addEventListener("click", saveSettings);

  // Music Modal Handlers
  document
    .getElementById("js-close-music")
    .addEventListener("click", closeMusicModal);
  document.getElementById("js-music-play").addEventListener("click", playMusic);
  document.getElementById("js-music-stop").addEventListener("click", stopMusic);

  // Task Modal Handlers
  document
    .getElementById("js-close-tasks") // ADDED: Close button handler for the new task modal
    .addEventListener("click", closeTaskModal);

  // Volume control
  document
    .getElementById("js-volume")
    .addEventListener("input", handleVolumeChange);

  // Task system
  document.getElementById("js-add-task").addEventListener("click", addTask);
  document.getElementById("js-task-name").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
  });
  document
    .getElementById("js-task-pomodoros")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTask();
    });

  // Timer mode buttons
  document
    .querySelector("#js-mode-buttons")
    .addEventListener("click", handleMode);

  // Main timer button and reset
  document
    .getElementById("js-btn")
    .addEventListener("click", handleMainButtonClick);
  document.getElementById("js-reset-btn").addEventListener("click", resetTimer);

  // Close modals on outside click
  window.addEventListener("click", (e) => {
    const settingsModal = document.getElementById("js-settings-modal");
    const musicModal = document.getElementById("js-music-modal");
    const taskModal = document.getElementById("js-task-modal"); // UPDATED ID

    if (e.target === settingsModal) {
      closeSettingsModal();
    }
    if (e.target === musicModal) {
      closeMusicModal();
    }
    if (e.target === taskModal) {
      // ADDED: Handler for the task modal
      closeTaskModal();
    }
  });

  // Notification permission
  if ("Notification" in window) {
    if (
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission().then(function (permission) {
        if (permission === "granted") {
          new Notification(
            "Awesome! You will be notified at the start of each session"
          );
        }
      });
    }
  }

  // Initial state setup
  switchMode(timer.mode); // Set the initial mode based on loaded settings
});
