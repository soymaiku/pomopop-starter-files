// settings.js
import { timer } from "./config.js";
import { switchMode } from "./timer.js";

// ==================== SETTINGS MODAL AND LOGIC ====================
export function loadSettings() {
  const saved = localStorage.getItem("pomodoroSettings");
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      // Ensure loaded values are numbers, defaulting if not
      timer.pomodoro =
        settings.pomodoro && !isNaN(settings.pomodoro)
          ? Number(settings.pomodoro)
          : 25;
      timer.shortBreak =
        settings.shortBreak && !isNaN(settings.shortBreak)
          ? Number(settings.shortBreak)
          : 5;
      timer.longBreak =
        settings.longBreak && !isNaN(settings.longBreak)
          ? Number(settings.longBreak)
          : 15;
      timer.longBreakInterval =
        settings.longBreakInterval && !isNaN(settings.longBreakInterval)
          ? Number(settings.longBreakInterval)
          : 4;

      document.getElementById("js-pomodoro-duration").value = timer.pomodoro;
      document.getElementById("js-short-break-duration").value =
        timer.shortBreak;
      document.getElementById("js-long-break-duration").value = timer.longBreak;
      document.getElementById("js-long-break-interval").value =
        timer.longBreakInterval;
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  } else {
    // Set default values in the UI if nothing is saved
    document.getElementById("js-pomodoro-duration").value =
      timer.pomodoro || 25;
    document.getElementById("js-short-break-duration").value =
      timer.shortBreak || 5;
    document.getElementById("js-long-break-duration").value =
      timer.longBreak || 15;
    document.getElementById("js-long-break-interval").value =
      timer.longBreakInterval || 4;
  }
}

export function saveSettings() {
  // Get values from input fields
  const pomodoroInput = document.getElementById("js-pomodoro-duration").value;
  const shortBreakInput = document.getElementById(
    "js-short-break-duration"
  ).value;
  const longBreakInput = document.getElementById(
    "js-long-break-duration"
  ).value;
  const longBreakIntervalInput = document.getElementById(
    "js-long-break-interval"
  ).value;

  // Use Number() for strict conversion and isNaN check for non-numeric input
  const pomodoro = Number(pomodoroInput);
  const shortBreak = Number(shortBreakInput);
  const longBreak = Number(longBreakInput);
  const longBreakInterval = Number(longBreakIntervalInput);

  // Validation: Check if values are not NaN (meaning they are valid numbers) and meet the minimum requirement
  if (
    isNaN(pomodoro) ||
    isNaN(shortBreak) ||
    isNaN(longBreak) ||
    isNaN(longBreakInterval)
  ) {
    alert("Please enter only numbers for all settings.");
    return;
  }

  if (
    pomodoro < 1 ||
    shortBreak < 1 ||
    longBreak < 1 ||
    longBreakInterval < 1
  ) {
    alert("All settings must be a minimum of 1.");
    return;
  }

  // Update in-memory state
  timer.pomodoro = pomodoro;
  timer.shortBreak = shortBreak;
  timer.longBreak = longBreak;
  timer.longBreakInterval = longBreakInterval;

  // Save to local storage
  localStorage.setItem(
    "pomodoroSettings",
    JSON.stringify({
      pomodoro,
      shortBreak,
      longBreak,
      longBreakInterval,
    })
  );

  closeSettingsModal();
  // Reset the timer to the current mode (which now uses the new duration)
  switchMode(timer.mode);
}

export function openSettingsModal() {
  const modal = document.getElementById("js-settings-modal");
  modal.classList.add("open");
}

export function closeSettingsModal() {
  const modal = document.getElementById("js-settings-modal");
  modal.classList.remove("open");
}
