import {
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, googleProvider, githubProvider } from "./firebase-config.js";

const initialStats = {
  totalPomodoros: 0,
  totalWorkTime: 0, // in minutes
  sessionsToday: 0,
  sessionsThisWeek: 0,
  lastWeekCheck: null,
  longestStreak: 0,
  currentStreak: 0,
  lastPomodoroDate: null,
};

// ==================== AUTH LOGIC ====================

export function getCurrentUser() {
  const userStr = localStorage.getItem("pomopop-user");
  return userStr ? JSON.parse(userStr) : null;
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const appUser = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isGuest: false,
    };
    localStorage.setItem("pomopop-user", JSON.stringify(appUser));
    return appUser;
  } catch (error) {
    console.error("Google login failed:", error);
    alert("Google Login Error: " + error.message);
    return null;
  }
}

export async function loginWithGithub() {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    const user = result.user;

    const appUser = {
      uid: user.uid,
      displayName: user.displayName || "GitHub User",
      photoURL: user.photoURL,
      isGuest: false,
    };
    localStorage.setItem("pomopop-user", JSON.stringify(appUser));
    return appUser;
  } catch (error) {
    console.error("GitHub login failed:", error);
    alert("GitHub Login Error: " + error.message);
    return null;
  }
}

export function loginAsGuest() {
  const guestUser = {
    uid: "guest",
    displayName: "Guest",
    photoURL: "https://ui-avatars.com/api/?name=Guest&background=999&color=fff",
    isGuest: true,
  };
  localStorage.setItem("pomopop-user", JSON.stringify(guestUser));
  return guestUser;
}

export async function logout() {
  localStorage.removeItem("pomopop-user"); // Clear local state immediately for UI
  await signOut(auth); // Sign out from Firebase
}

// ==================== STATS LOGIC ====================

function getStats(uid) {
  const storedStats = localStorage.getItem(`pomopop-stats-${uid}`);
  return storedStats ? JSON.parse(storedStats) : { ...initialStats };
}

function saveStats(uid, stats) {
  localStorage.setItem(`pomopop-stats-${uid}`, JSON.stringify(stats));
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getWeekNumber(d) {
  // Simple week number calculation
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function updateStatsDisplay(user) {
  const statsGrid = document.querySelector(".stats-grid");
  const guestMsg = document.getElementById("js-guest-message");

  if (user.isGuest) {
    // Hide stats, show message
    if (statsGrid) statsGrid.classList.add("hidden");
    if (guestMsg) guestMsg.classList.remove("hidden");
    return;
  }

  // Show stats, hide message
  if (statsGrid) statsGrid.classList.remove("hidden");
  if (guestMsg) guestMsg.classList.add("hidden");

  const stats = getStats(user.uid);

  // Update the new modal elements if they exist
  const sessionsEl = document.getElementById("js-stat-sessions");
  const todayEl = document.getElementById("js-stat-today");
  const weekEl = document.getElementById("js-stat-week");

  if (sessionsEl) sessionsEl.textContent = stats.totalPomodoros;
  if (todayEl) todayEl.textContent = stats.sessionsToday || 0;
  if (weekEl) weekEl.textContent = stats.sessionsThisWeek || 0;
}

export function loadStats() {
  const user = getCurrentUser();
  if (user) {
    updateStatsDisplay(user);
  }
}

export function incrementPomodoroCount(pomodoroDuration) {
  const user = getCurrentUser();
  if (!user || user.isGuest) return; // Don't save stats for guests

  let stats = getStats(user.uid);

  stats.totalPomodoros += 1;
  stats.totalWorkTime += pomodoroDuration;

  const today = new Date().toDateString();
  const currentWeek = getWeekNumber(new Date());

  // Weekly Reset Logic
  if (stats.lastWeekCheck !== currentWeek) {
    stats.sessionsThisWeek = 0;
    stats.lastWeekCheck = currentWeek;
  }
  stats.sessionsThisWeek += 1;

  // Daily & Streak Logic
  if (stats.lastPomodoroDate === today) {
    stats.currentStreak += 1;
    stats.sessionsToday += 1;
  } else if (
    stats.lastPomodoroDate &&
    new Date(stats.lastPomodoroDate).toDateString() ===
      new Date(Date.now() - 86400000).toDateString()
  ) {
    // Yesterday
    stats.currentStreak = stats.currentStreak + 1;
    stats.sessionsToday = 1; // Reset for new day
  } else {
    // Streak broken
    stats.currentStreak = 1;
    stats.sessionsToday = 1;
  }
  stats.lastPomodoroDate = today;

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  saveStats(user.uid, stats);
  updateStatsDisplay(user);
}

export function openStatsModal() {
  const statsModal = document.getElementById("js-stats-modal");
  statsModal.classList.add("open");
  loadStats();
}

export function closeStatsModal() {
  const statsModal = document.getElementById("js-stats-modal");
  statsModal.classList.remove("open");
}
