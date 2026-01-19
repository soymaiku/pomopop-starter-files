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
      // Continue with defaults if Firebase fails
      resetSettingsToDefaults();
    }
  );
}

export function stopSettingsListener() {
  if (unsubscribeSettings) {
    unsubscribeSettings();
    unsubscribeSettings = null;
  }

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
      console.warn("⚠️ Firebase not initialized, saving to localStorage instead");
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
      timer.pomodoro = Number(settings.pomodoro) || 25;
      timer.shortBreak = Number(settings.shortBreak) || 5;
      timer.longBreak = Number(settings.longBreak) || 15;
      timer.longBreakInterval = Number(settings.longBreakInterval) || 4;

      // Update UI inputs
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
      JSON.stringify(settingsData)
    );
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
