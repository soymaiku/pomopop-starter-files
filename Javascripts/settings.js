// settings.js
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db, auth } from "./firebase-config-loader.js";
import { timer } from "./config.js";
import { switchMode } from "./timer.js";
import { getCurrentUser } from "./stats.js";

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

// ==================== SETTINGS MODAL AND LOGIC ====================

function resetSettingsToDefaults() {
  timer.pomodoro = 25;
  timer.shortBreak = 5;
  timer.longBreak = 15;
  timer.longBreakInterval = 4;

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

export function fetchUserSettings(userId) {
  if (unsubscribeSettings) unsubscribeSettings();

  const docRef = doc(db, "users", userId);
  unsubscribeSettings = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // Only update if settings exist in the cloud data
        if (data.pomodoro) {
          timer.pomodoro = Number(data.pomodoro) || 25;
          timer.shortBreak = Number(data.shortBreak) || 5;
          timer.longBreak = Number(data.longBreak) || 15;
          timer.longBreakInterval = Number(data.longBreakInterval) || 4;

          document.getElementById("js-pomodoro-duration").value =
            timer.pomodoro;
          document.getElementById("js-short-break-duration").value =
            timer.shortBreak;
          document.getElementById("js-long-break-duration").value =
            timer.longBreak;
          document.getElementById("js-long-break-interval").value =
            timer.longBreakInterval;

          const colors = {
            pomodoro: data.colors?.pomodoro || "#ba4949",
            shortBreak: data.colors?.shortBreak || "#38858a",
            longBreak: data.colors?.longBreak || "#397097",
          };

          document.getElementById("js-color-pomodoro").value = colors.pomodoro;
          document.getElementById("js-color-short").value = colors.shortBreak;
          document.getElementById("js-color-long").value = colors.longBreak;

          applyTheme(colors);
          switchMode(timer.mode); // Refresh UI with new settings
          return;
        }
      }

      // If no settings found in cloud, reset to defaults (don't use guest settings)
      resetSettingsToDefaults();
    },
    (error) => {
      console.error("Error listening to user settings:", error);
    }
  );
}

export function stopSettingsListener() {
  if (unsubscribeSettings) {
    unsubscribeSettings();
    unsubscribeSettings = null;
  }
}

export async function saveUserSettings(userId, data) {
  try {
    await setDoc(doc(db, "users", userId), data, { merge: true });
  } catch (error) {
    console.error("Error saving user settings:", error);
  }
}

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
      console.error("Error loading settings:", e);
    }
  } else {
    // Apply defaults if no storage found
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
    document.getElementById("js-pomodoro-duration").value
  );
  const shortBreak = Number(
    document.getElementById("js-short-break-duration").value
  );
  const longBreak = Number(
    document.getElementById("js-long-break-duration").value
  );
  const longBreakInterval = Number(
    document.getElementById("js-long-break-interval").value
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

  // Update State
  timer.pomodoro = pomodoro;
  timer.shortBreak = shortBreak;
  timer.longBreak = longBreak;
  timer.longBreakInterval = longBreakInterval;

  const settingsData = {
    pomodoro,
    shortBreak,
    longBreak,
    longBreakInterval,
    colors,
  };

  // Check Auth: Save to Cloud if logged in, otherwise LocalStorage
  const user = auth.currentUser;
  const localUser = getCurrentUser();

  if (user || (localUser && !localUser.isGuest)) {
    saveUserSettings(user ? user.uid : localUser.uid, settingsData);
  } else {
    localStorage.setItem("pomodoroSettings", JSON.stringify(settingsData));
  }

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
