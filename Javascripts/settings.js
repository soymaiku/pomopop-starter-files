// settings.js
import { timer } from "./config.js";
import { switchMode, stopTimer } from "./timer.js";
import { getCurrentUser } from "./stats.js";
import { showNotification } from "./utils.js";

// Clear old shared storage key to prevent sync conflicts between accounts
localStorage.removeItem("pomodoroSettings");

/**
 * Applies custom hex colors to CSS variables
 */
function applyTheme(colors) {
  const root = document.documentElement;

  if (colors.pomodoro) root.style.setProperty("--pomodoro", colors.pomodoro);
  if (colors.shortBreak)
    root.style.setProperty("--shortBreak", colors.shortBreak);
  if (colors.longBreak) root.style.setProperty("--longBreak", colors.longBreak);
}

function resetSessionCounters() {
  timer.sessions = 0;
  timer.pomodorosSinceLongBreak = 0;
}

// ==================== SETTINGS MODAL AND LOGIC ====================

function resetSettingsToDefaults() {
  timer.pomodoro = 25;
  timer.shortBreak = 5;
  timer.longBreak = 15;
  timer.longBreakInterval = 4;
  resetSessionCounters();

  document.getElementById("js-pomodoro-duration").value = 25;
  document.getElementById("js-short-break-duration").value = 5;
  document.getElementById("js-long-break-duration").value = 15;
  document.getElementById("js-long-break-interval").value = 4;

  const defaultColors = {
    pomodoro: "#ba4949",
    shortBreak: "#38858a",
    longBreak: "#397097",
  };

  document.getElementById("js-color-pomodoro").value = defaultColors.pomodoro;
  document.getElementById("js-color-short").value = defaultColors.shortBreak;
  document.getElementById("js-color-long").value = defaultColors.longBreak;

  applyTheme(defaultColors);
  switchMode(timer.mode);
}

let unsubscribeSettings = null;
let lastAppliedSettings = null;

function getSettingsStorageKey(userOverride) {
  const user = userOverride || getCurrentUser();
  const suffix = user && user.uid ? user.uid : "guest";
  return `pomopop-settings:${suffix}`;
}

function getDefaultSettings() {
  return {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    colors: {
      pomodoro: "#ba4949",
      shortBreak: "#38858a",
      longBreak: "#397097",
    },
  };
}

function safeNumber(value, fallback) {
  const num = Number(value);
  if (Number.isNaN(num) || value === undefined || value === null) return fallback;
  return num;
}

function extractSettingsFromDoc(data) {
  if (!data) return null;

  const hasAnySetting =
    data.pomodoro !== undefined ||
    data.shortBreak !== undefined ||
    data.longBreak !== undefined ||
    data.longBreakInterval !== undefined ||
    data.colors !== undefined;

  if (!hasAnySetting) return null;

  return {
    pomodoro: safeNumber(data.pomodoro, 25),
    shortBreak: safeNumber(data.shortBreak, 5),
    longBreak: safeNumber(data.longBreak, 15),
    longBreakInterval: safeNumber(data.longBreakInterval, 4),
    colors: {
      pomodoro: data.colors?.pomodoro || "#ba4949",
      shortBreak: data.colors?.shortBreak || "#38858a",
      longBreak: data.colors?.longBreak || "#397097",
    },
  };
}

function haveSettingsChanged(newSettings) {
  if (!lastAppliedSettings) return true;
  return (
    newSettings.pomodoro !== lastAppliedSettings.pomodoro ||
    newSettings.shortBreak !== lastAppliedSettings.shortBreak ||
    newSettings.longBreak !== lastAppliedSettings.longBreak ||
    newSettings.longBreakInterval !== lastAppliedSettings.longBreakInterval ||
    newSettings.colors.pomodoro !== lastAppliedSettings.colors.pomodoro ||
    newSettings.colors.shortBreak !== lastAppliedSettings.colors.shortBreak ||
    newSettings.colors.longBreak !== lastAppliedSettings.colors.longBreak
  );
}

function applySettingsToState(settings) {
  timer.pomodoro = settings.pomodoro;
  timer.shortBreak = settings.shortBreak;
  timer.longBreak = settings.longBreak;
  timer.longBreakInterval = settings.longBreakInterval;
  resetSessionCounters();

  document.getElementById("js-pomodoro-duration").value = timer.pomodoro;
  document.getElementById("js-short-break-duration").value = timer.shortBreak;
  document.getElementById("js-long-break-duration").value = timer.longBreak;
  document.getElementById("js-long-break-interval").value =
    timer.longBreakInterval;

  document.getElementById("js-color-pomodoro").value =
    settings.colors.pomodoro;
  document.getElementById("js-color-short").value = settings.colors.shortBreak;
  document.getElementById("js-color-long").value = settings.colors.longBreak;

  applyTheme(settings.colors);
  switchMode(timer.mode);
  lastAppliedSettings = settings;
}

export function fetchUserSettings(userId) {
  if (unsubscribeSettings) unsubscribeSettings();
  unsubscribeSettings = null;

  const saved = localStorage.getItem(getSettingsStorageKey({ uid: userId }));
  if (!saved) {
    if (!lastAppliedSettings) {
      resetSettingsToDefaults();
      lastAppliedSettings = getDefaultSettings();
    }
    return;
  }

  try {
    const settings = JSON.parse(saved);
    const extracted = extractSettingsFromDoc(settings);
    if (extracted && haveSettingsChanged(extracted)) {
      applySettingsToState(extracted);
    }
  } catch (error) {
    console.error("Error loading offline settings:", error);
    resetSettingsToDefaults();
  }
}

export function stopSettingsListener() {
  if (unsubscribeSettings) {
    unsubscribeSettings();
    unsubscribeSettings = null;
  }

  lastAppliedSettings = null;

  // Completely reset UI and memory to prevent account data persisting
  // This will be followed by loadSettings() to restore guest data
  timer.pomodoro = 25;
  timer.shortBreak = 5;
  timer.longBreak = 15;
  timer.longBreakInterval = 4;

  // Reset all UI inputs to defaults temporarily
  document.getElementById("js-pomodoro-duration").value = 25;
  document.getElementById("js-short-break-duration").value = 5;
  document.getElementById("js-long-break-duration").value = 15;
  document.getElementById("js-long-break-interval").value = 4;
  document.getElementById("js-color-pomodoro").value = "#ba4949";
  document.getElementById("js-color-short").value = "#38858a";
  document.getElementById("js-color-long").value = "#397097";

  // Reset theme to defaults
  applyTheme({
    pomodoro: "#ba4949",
    shortBreak: "#38858a",
    longBreak: "#397097",
  });
}

export async function saveUserSettings(userId, data) {
  localStorage.setItem(getSettingsStorageKey({ uid: userId }), JSON.stringify(data));
}

export function loadSettings() {
  const saved = localStorage.getItem(getSettingsStorageKey());

  if (saved) {
    try {
      const settings = JSON.parse(saved);

      // Load Durations - explicitly set timer object
      timer.pomodoro = safeNumber(settings.pomodoro, 25);
      timer.shortBreak = safeNumber(settings.shortBreak, 5);
      timer.longBreak = safeNumber(settings.longBreak, 15);
      timer.longBreakInterval = safeNumber(settings.longBreakInterval, 4);
      resetSessionCounters();

      // Update UI inputs
      document.getElementById("js-pomodoro-duration").value = timer.pomodoro;
      document.getElementById("js-short-break-duration").value =
        timer.shortBreak;
      document.getElementById("js-long-break-duration").value = timer.longBreak;
      document.getElementById("js-pomodoro-duration").value = timer.pomodoro;
      document.getElementById("js-short-break-duration").value =
        timer.shortBreak;
      document.getElementById("js-long-break-duration").value = timer.longBreak;
      document.getElementById("js-long-break-interval").value =
        timer.longBreakInterval;

      // Load Colors if they exist, otherwise use defaults
      const colors = {
        pomodoro: settings.colors?.pomodoro || "#ba4949",
        shortBreak: settings.colors?.shortBreak || "#38858a",
        longBreak: settings.colors?.longBreak || "#397097",
      };

      document.getElementById("js-color-pomodoro").value = colors.pomodoro;
      document.getElementById("js-color-short").value = colors.shortBreak;
      document.getElementById("js-color-long").value = colors.longBreak;

      applyTheme(colors);
    } catch (e) {
      console.error("Error loading guest settings:", e);
      // If there's an error, reset to defaults
      resetSettingsToDefaults();
      return;
    }
  } else {
    // No guest settings found - apply defaults and keep defaults in memory
    timer.pomodoro = 25;
    timer.shortBreak = 5;
    timer.longBreak = 15;
    timer.longBreakInterval = 4;
    resetSessionCounters();

    document.getElementById("js-pomodoro-duration").value = 25;
    document.getElementById("js-short-break-duration").value = 5;
    document.getElementById("js-long-break-duration").value = 15;
    document.getElementById("js-long-break-interval").value = 4;

    applyTheme({
      pomodoro: "#ba4949",
      shortBreak: "#38858a",
      longBreak: "#397097",
    });
  }
  switchMode(timer.mode);
}

export function saveSettings() {
  const pomodoro = Number(
    document.getElementById("js-pomodoro-duration").value,
  );
  const shortBreak = Number(
    document.getElementById("js-short-break-duration").value,
  );
  const longBreak = Number(
    document.getElementById("js-long-break-duration").value,
  );
  const longBreakInterval = Number(
    document.getElementById("js-long-break-interval").value,
  );

  // Get Colors from Pickers
  const colors = {
    pomodoro: document.getElementById("js-color-pomodoro").value,
    shortBreak: document.getElementById("js-color-short").value,
    longBreak: document.getElementById("js-color-long").value,
  };

  if (
    isNaN(pomodoro) ||
    isNaN(shortBreak) ||
    isNaN(longBreak) ||
    isNaN(longBreakInterval)
  ) {
    alert("Please enter valid numbers.");
    return;
  }

  // Enforce max limits
  if (pomodoro > 60) {
    showNotification(
      "⚠️ Pomodoro duration cannot exceed 60 minutes",
      "warning",
    );
    document.getElementById("js-pomodoro-duration").value = 60;
    return;
  }

  if (shortBreak > 30) {
    showNotification(
      "⚠️ Short break duration cannot exceed 30 minutes",
      "warning",
    );
    document.getElementById("js-short-break-duration").value = 30;
    return;
  }

  if (longBreak > 60) {
    showNotification(
      "⚠️ Long break duration cannot exceed 60 minutes",
      "warning",
    );
    document.getElementById("js-long-break-duration").value = 60;
    return;
  }

  if (longBreakInterval < 1) {
    showNotification(
      "⚠️ Long break interval must be at least 1 pomodoro",
      "warning",
    );
    document.getElementById("js-long-break-interval").value = 1;
    return;
  }

  // Update State
  timer.pomodoro = pomodoro;
  timer.shortBreak = shortBreak;
  timer.longBreak = longBreak;
  timer.longBreakInterval = longBreakInterval;
  resetSessionCounters();

  const settingsData = {
    pomodoro,
    shortBreak,
    longBreak,
    longBreakInterval,
    colors,
  };

  const localUser = getCurrentUser();
  const targetUid = localUser && !localUser.isGuest ? localUser.uid : "guest";
  saveUserSettings(targetUid, settingsData);

  applyTheme(colors);
  closeSettingsModal();

  // Stop the timer and reset to new duration
  stopTimer();
  switchMode(timer.mode);
  showNotification("Settings saved! Timer reset to new duration.");
}

/**
 * Setup duration input validation
 */
/**
 * Setup duration input validation for all duration fields
 */
export function setupDurationValidation() {
  const pomodoroInput = document.getElementById("js-pomodoro-duration");
  const shortBreakInput = document.getElementById("js-short-break-duration");
  const longBreakInput = document.getElementById("js-long-break-duration");
  const intervalInput = document.getElementById("js-long-break-interval");

  if (!pomodoroInput || !shortBreakInput || !longBreakInput) return;

  // Block non-numeric characters (e, E, ., +, -) from all number inputs
  const blockInvalidChars = (e) => {
    if (["e", "E", ".", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Also prevent paste of invalid characters
  const blockInvalidPaste = (e) => {
    const pastedData = e.clipboardData.getData("text");
    if (!/^\\d+$/.test(pastedData)) {
      e.preventDefault();
    }
  };

  [pomodoroInput, shortBreakInput, longBreakInput, intervalInput].forEach(
    (input) => {
      if (input) {
        input.addEventListener("keydown", blockInvalidChars);
        input.addEventListener("paste", blockInvalidPaste);
      }
    },
  );

  // ========== POMODORO DURATION ==========
  pomodoroInput.addEventListener("change", (e) => {
    const value = Number(e.target.value);
    if (value > 60) {
      e.target.value = 60;
      showNotification(
        "⚠️ 60 minutes is the maximum for Pomodoro Duration",
        "warning",
      );
    }
  });

  pomodoroInput.addEventListener("input", (e) => {
    const value = Number(e.target.value);
    if (value > 60) {
      e.target.value = 60;
    }
  });

  // ========== SHORT BREAK DURATION ==========
  shortBreakInput.addEventListener("change", (e) => {
    const value = Number(e.target.value);
    if (value > 30) {
      e.target.value = 30;
      showNotification(
        "⚠️ 30 minutes is the maximum for Short Break Duration",
        "warning",
      );
    }
  });

  shortBreakInput.addEventListener("input", (e) => {
    const value = Number(e.target.value);
    if (value > 30) {
      e.target.value = 30;
    }
  });

  // ========== LONG BREAK DURATION ==========
  longBreakInput.addEventListener("change", (e) => {
    const value = Number(e.target.value);
    if (value > 60) {
      e.target.value = 60;
      showNotification(
        "⚠️ 60 minutes is the maximum for Long Break Duration",
        "warning",
      );
    }
  });

  longBreakInput.addEventListener("input", (e) => {
    const value = Number(e.target.value);
    if (value > 60) {
      e.target.value = 60;
    }
  });
}

export function openSettingsModal() {
  document.getElementById("js-settings-modal").classList.add("open");
}

export function closeSettingsModal() {
  document.getElementById("js-settings-modal").classList.remove("open");
}
