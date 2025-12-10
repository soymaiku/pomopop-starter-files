// settings.js
import { timer } from "./config.js";
import { switchMode } from "./timer.js";

// ==================== SETTINGS MODAL AND LOGIC ====================
export function loadSettings() {
  const saved = localStorage.getItem("pomodoroSettings");
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      timer.pomodoro = settings.pomodoro || 25;
      timer.shortBreak = settings.shortBreak || 5;
      timer.longBreak = settings.longBreak || 15;
      timer.longBreakInterval = settings.longBreakInterval || 4;

      document.getElementById("js-pomodoro-duration").value = timer.pomodoro;
      document.getElementById("js-short-break-duration").value =
        timer.shortBreak;
      document.getElementById("js-long-break-duration").value = timer.longBreak;
      document.getElementById("js-long-break-interval").value =
        timer.longBreakInterval;
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }
}

export function saveSettings() {
  const pomodoro =
    parseInt(document.getElementById("js-pomodoro-duration").value) || 25;
  const shortBreak =
    parseInt(document.getElementById("js-short-break-duration").value) || 5;
  const longBreak =
    parseInt(document.getElementById("js-long-break-duration").value) || 15;
  const longBreakInterval =
    parseInt(document.getElementById("js-long-break-interval").value) || 4;

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
