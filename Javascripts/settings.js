// settings.js
import { timer } from "./config.js";
import { switchMode } from "./timer.js";

/**
 * Applies custom hex colors to CSS variables
 */
function applyTheme(colors) {
  const root = document.documentElement;
  
  if (colors.pomodoro) root.style.setProperty('--pomodoro', colors.pomodoro);
  if (colors.shortBreak) root.style.setProperty('--shortBreak', colors.shortBreak);
  if (colors.longBreak) root.style.setProperty('--longBreak', colors.longBreak);
}

// ==================== SETTINGS MODAL AND LOGIC ====================
export function loadSettings() {
  const saved = localStorage.getItem("pomodoroSettings");

  if (saved) {
    try {
      const settings = JSON.parse(saved);
      
      // Load Durations
      timer.pomodoro = Number(settings.pomodoro) || 25;
      timer.shortBreak = Number(settings.shortBreak) || 5;
      timer.longBreak = Number(settings.longBreak) || 15;
      timer.longBreakInterval = Number(settings.longBreakInterval) || 4;

      document.getElementById("js-pomodoro-duration").value = timer.pomodoro;
      document.getElementById("js-short-break-duration").value = timer.shortBreak;
      document.getElementById("js-long-break-duration").value = timer.longBreak;
      document.getElementById("js-long-break-interval").value = timer.longBreakInterval;

      // Load Colors if they exist, otherwise use defaults
      const colors = {
        pomodoro: settings.colors?.pomodoro || "#ba4949",
        shortBreak: settings.colors?.shortBreak || "#38858a",
        longBreak: settings.colors?.longBreak || "#397097"
      };

      document.getElementById("js-color-pomodoro").value = colors.pomodoro;
      document.getElementById("js-color-short").value = colors.shortBreak;
      document.getElementById("js-color-long").value = colors.longBreak;

      applyTheme(colors);

    } catch (e) {
      console.error("Error loading settings:", e);
    }
  } else {
    // Apply defaults if no storage found
    applyTheme({
      pomodoro: "#ba4949",
      shortBreak: "#38858a",
      longBreak: "#397097"
    });
  }
}

export function saveSettings() {
  const pomodoro = Number(document.getElementById("js-pomodoro-duration").value);
  const shortBreak = Number(document.getElementById("js-short-break-duration").value);
  const longBreak = Number(document.getElementById("js-long-break-duration").value);
  const longBreakInterval = Number(document.getElementById("js-long-break-interval").value);

  // Get Colors from Pickers
  const colors = {
    pomodoro: document.getElementById("js-color-pomodoro").value,
    shortBreak: document.getElementById("js-color-short").value,
    longBreak: document.getElementById("js-color-long").value
  };

  if (isNaN(pomodoro) || isNaN(shortBreak) || isNaN(longBreak) || isNaN(longBreakInterval)) {
    alert("Please enter valid numbers.");
    return;
  }

  // Update State
  timer.pomodoro = pomodoro;
  timer.shortBreak = shortBreak;
  timer.longBreak = longBreak;
  timer.longBreakInterval = longBreakInterval;

  // Save to Local Storage
  localStorage.setItem(
    "pomodoroSettings",
    JSON.stringify({
      pomodoro,
      shortBreak,
      longBreak,
      longBreakInterval,
      colors
    })
  );

  applyTheme(colors);
  closeSettingsModal();
  
  // Instantly update the current background and clock display
  switchMode(timer.mode);
}

export function openSettingsModal() {
  document.getElementById("js-settings-modal").classList.add("open");
}

export function closeSettingsModal() {
  document.getElementById("js-settings-modal").classList.remove("open");
}