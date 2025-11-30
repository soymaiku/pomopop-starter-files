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
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
    if (e.target === musicModal) {
      closeMusicModal();
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
