// settings.js
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db, auth } from "./firebase-config-loader.js";
import { timer } from "./config.js";
import { switchMode, stopTimer } from "./timer.js";
import { getCurrentUser } from "./stats.js";
import { showNotification } from "./utils.js";

// Clear old shared storage key to prevent sync conflicts between Google and Guest
// This ensures complete separation between logged-in and guest modes
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
  if (!db) {
    console.warn("⚠️ Firebase not initialized, skipping settings sync");
    return;
  }

  if (unsubscribeSettings) unsubscribeSettings();

  // First, clear any guest settings from memory to prevent sync
  // Reset timer and colors to defaults before loading user settings
  timer.pomodoro = 25;
  timer.shortBreak = 5;
  timer.longBreak = 15;
  timer.longBreakInterval = 4;
  resetSessionCounters();

  // Reset UI inputs to defaults before loading account settings
  document.getElementById("js-pomodoro-duration").value = 25;
  document.getElementById("js-short-break-duration").value = 5;
  document.getElementById("js-long-break-duration").value = 15;
  document.getElementById("js-long-break-interval").value = 4;
  document.getElementById("js-color-pomodoro").value = "#ba4949";
  document.getElementById("js-color-short").value = "#38858a";
  document.getElementById("js-color-long").value = "#397097";

  // Apply default theme
  applyTheme({
    pomodoro: "#ba4949",
    shortBreak: "#38858a",
    longBreak: "#397097",
  });

  const docRef = doc(db, "users", userId);
  unsubscribeSettings = onSnapshot(
    docRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        if (!lastAppliedSettings) {
          resetSettingsToDefaults();
          lastAppliedSettings = getDefaultSettings();
        }
        return;
      }

      const cloudSettings = extractSettingsFromDoc(docSnap.data());

      // Ignore Firestore updates that touch stats only to avoid resetting the timer mid-cycle
      if (cloudSettings && haveSettingsChanged(cloudSettings)) {
        applySettingsToState(cloudSettings);
        return;
      }

      // No settings saved in the account yet; apply defaults once
      if (!cloudSettings && !lastAppliedSettings) {
        resetSettingsToDefaults();
        lastAppliedSettings = getDefaultSettings();
      }
    },
    (error) => {
      console.error("Error listening to user settings:", error);
      // Continue with defaults if Firebase fails
      resetSettingsToDefaults();
    },
  );
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
  try {
    if (!db) {
      console.warn(
        "⚠️ Firebase not initialized, saving to localStorage instead",
      );
      localStorage.setItem("pomopop-guest-settings", JSON.stringify(data));
      return;
    }

    await setDoc(doc(db, "users", userId), data, { merge: true });
  } catch (error) {
    console.error("Error saving user settings:", error);
    // Fallback to localStorage
    localStorage.setItem("pomopop-guest-settings", JSON.stringify(data));
  }
}

export function loadSettings() {
  // Only load from guest localStorage if actually in guest mode
  const user = getCurrentUser();
  const guestSettingsKey = "pomopop-guest-settings";

  // If user is logged in (not guest), don't load from localStorage
  if (user && !user.isGuest) {
    // Apply defaults and let fetchUserSettings load from Firestore
    applyTheme({
      pomodoro: "#ba4949",
      shortBreak: "#38858a",
      longBreak: "#397097",
    });
    switchMode(timer.mode);
    return;
  }

  // For guest mode, fully clear and reload from guest settings storage
  const saved = localStorage.getItem(guestSettingsKey);

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

  if (pomodoro < 5) {
    showNotification("⚠️ Pomodoro duration must be at least 5 minutes", "warning");
    document.getElementById("js-pomodoro-duration").value = 5;
    return;
  }

  if (shortBreak < 5) {
    showNotification("⚠️ Short break duration must be at least 5 minutes", "warning");
    document.getElementById("js-short-break-duration").value = 5;
    return;
  }

  if (longBreak < 5) {
    showNotification("⚠️ Long break duration must be at least 5 minutes", "warning");
    document.getElementById("js-long-break-duration").value = 5;
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

  // Check Auth: Save to Cloud if logged in (not guest), otherwise save to guest localStorage
  const user = auth.currentUser;
  const localUser = getCurrentUser();

  // If user is logged in via Firebase (Google, etc.), save to Firestore
  if (user) {
    saveUserSettings(user.uid, settingsData);
  }
  // If user is guest, save to guest-specific localStorage (don't use auth.currentUser)
  else if (localUser && localUser.isGuest) {
    localStorage.setItem(
      "pomopop-guest-settings",
      JSON.stringify(settingsData),
    );
  }

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

  const minimumDurationTimers = new WeakMap();

  const scheduleMinimumDurationCheck = (input, minValue, label) => {
    if (!input) return;
    const existingTimer = minimumDurationTimers.get(input);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      if (input.value === "") return;
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < minValue) {
        input.value = minValue;
        showNotification(
          `⚠️ ${label} duration must be at least ${minValue} minutes`,
          "warning",
        );
      }
    }, 300);

    minimumDurationTimers.set(input, timer);
  };

  // ========== POMODORO DURATION ==========
  pomodoroInput.addEventListener("change", (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value) || value < 5) {
      e.target.value = 5;
      showNotification(
        "⚠️ Pomodoro duration must be at least 5 minutes",
        "warning",
      );
      return;
    }
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
    scheduleMinimumDurationCheck(pomodoroInput, 5, "Pomodoro");
  });

  // ========== SHORT BREAK DURATION ==========
  shortBreakInput.addEventListener("change", (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value) || value < 5) {
      e.target.value = 5;
      showNotification(
        "⚠️ Short break duration must be at least 5 minutes",
        "warning",
      );
      return;
    }
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
    scheduleMinimumDurationCheck(shortBreakInput, 5, "Short break");
  });

  // ========== LONG BREAK DURATION ==========
  longBreakInput.addEventListener("change", (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value) || value < 5) {
      e.target.value = 5;
      showNotification(
        "⚠️ Long break duration must be at least 5 minutes",
        "warning",
      );
      return;
    }
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
    scheduleMinimumDurationCheck(longBreakInput, 5, "Long break");
  });
}

export function openSettingsModal() {
  document.getElementById("js-settings-modal").classList.add("open");
}

export function closeSettingsModal() {
  document.getElementById("js-settings-modal").classList.remove("open");
}
