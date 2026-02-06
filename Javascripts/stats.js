import { initializeLeaderboard, destroyLeaderboard } from "./leaderboard.js";

const OFFLINE_USERS_KEY = "pomopop-offline-users";
const OFFLINE_LOGIN_INDEX_KEY = "pomopop-offline-login-index";
const LOCAL_USER_KEY = "pomopop-user";

const TEST_PROFILES = [
  {
    uid: "test-ava",
    displayName: "Ava Santos",
    photoURL: "https://ui-avatars.com/api/?name=Ava+Santos&background=3b82f6&color=fff",
  },
  {
    uid: "test-miguel",
    displayName: "Miguel Dizon",
    photoURL: "https://ui-avatars.com/api/?name=Miguel+Dizon&background=10b981&color=fff",
  },
  {
    uid: "test-lia",
    displayName: "Lia Cruz",
    photoURL: "https://ui-avatars.com/api/?name=Lia+Cruz&background=f59e0b&color=fff",
  },
  {
    uid: "test-noah",
    displayName: "Noah Reyes",
    photoURL: "https://ui-avatars.com/api/?name=Noah+Reyes&background=ef4444&color=fff",
  },
];

const authListeners = new Set();
let lastPomodoroIncrement = null;

function getWeekStartDate() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
}

function loadOfflineUsers() {
  const raw = localStorage.getItem(OFFLINE_USERS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("⚠️ Failed to parse offline users, reseeding", error);
    }
  }
  return null;
}

function saveOfflineUsers(users) {
  localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));
}

function ensureOfflineUsers() {
  let users = loadOfflineUsers();
  if (!users) {
    const today = new Date().toISOString().split("T")[0];
    const weekStartDate = getWeekStartDate().toISOString().split("T")[0];
    users = {};
    TEST_PROFILES.forEach((profile, index) => {
      users[profile.uid] = {
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        todayPomodoros: 0,
        weeklyPomodoros: 0,
        totalPomodoros: 12 + index * 7,
        todayDate: today,
        weekStartDate: weekStartDate,
      };
    });
    saveOfflineUsers(users);
  }
  return users;
}

function ensureUserStats(uid, profile) {
  const users = ensureOfflineUsers();
  const today = new Date().toISOString().split("T")[0];
  const weekStartDate = getWeekStartDate().toISOString().split("T")[0];

  if (!users[uid]) {
    users[uid] = {
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      todayPomodoros: 0,
      weeklyPomodoros: 0,
      totalPomodoros: 0,
      todayDate: today,
      weekStartDate: weekStartDate,
    };
  }

  if (users[uid].todayDate !== today) {
    users[uid].todayPomodoros = 0;
    users[uid].todayDate = today;
  }

  if (users[uid].weekStartDate !== weekStartDate) {
    users[uid].weeklyPomodoros = 0;
    users[uid].weekStartDate = weekStartDate;
  }

  saveOfflineUsers(users);
  return users[uid];
}

function notifyAuthListeners(user) {
  authListeners.forEach((listener) => listener(user));
}

export function onAuthStateChangedLocal(callback) {
  authListeners.add(callback);
  callback(getCurrentUser());
  return () => authListeners.delete(callback);
}

// ==================== AUTH LOGIC ====================

export function getCurrentUser() {
  const userStr = localStorage.getItem(LOCAL_USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export async function loginWithGoogle() {
  const index = Number(localStorage.getItem(OFFLINE_LOGIN_INDEX_KEY) || 0);
  const profile = TEST_PROFILES[index % TEST_PROFILES.length];
  localStorage.setItem(
    OFFLINE_LOGIN_INDEX_KEY,
    String((index + 1) % TEST_PROFILES.length),
  );

  const appUser = {
    uid: profile.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    isGuest: false,
  };

  ensureUserStats(appUser.uid, appUser);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appUser));
  notifyAuthListeners(appUser);
  return appUser;
}

export function loginAsGuest() {
  const guestUser = {
    uid: "guest",
    displayName: "Guest",
    photoURL: "https://ui-avatars.com/api/?name=Guest&background=999&color=fff",
    isGuest: true,
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(guestUser));
  notifyAuthListeners(guestUser);
  return guestUser;
}

export async function logout() {
  localStorage.removeItem(LOCAL_USER_KEY);
  destroyLeaderboard();
  notifyAuthListeners(null);
}

// ==================== OFFLINE STATS LOGIC ====================

export async function incrementPomodoroCount() {
  const user = getCurrentUser();
  if (!user || user.isGuest) {
    console.log("⚠️ Stats not saved: guest or no user");
    return;
  }

  const now = Date.now();
  if (lastPomodoroIncrement && now - lastPomodoroIncrement < 5000) {
    console.log("⏱️ Duplicate increment blocked (too soon)");
    return;
  }
  lastPomodoroIncrement = now;

  const users = ensureOfflineUsers();
  const stats = ensureUserStats(user.uid, user);
  stats.todayPomodoros += 1;
  stats.weeklyPomodoros += 1;
  stats.totalPomodoros += 1;
  users[user.uid] = stats;
  saveOfflineUsers(users);
  updateStatsDisplay(user);
}

async function getUserStats(uid) {
  const users = ensureOfflineUsers();
  return users[uid] || null;
}

// ==================== UI LOGIC ====================

async function updateStatsDisplay(user) {
  const statsContent = document.getElementById("js-stats-content");
  const guestOverlay = document.getElementById("js-stats-guest-overlay");

  if (user.isGuest) {
    // Show restricted access overlay for guests
    if (statsContent) statsContent.classList.add("hidden");
    if (guestOverlay) guestOverlay.classList.remove("hidden");
    return;
  }

  // Show stats content, hide guest overlay
  if (statsContent) statsContent.classList.remove("hidden");
  if (guestOverlay) guestOverlay.classList.add("hidden");

  // Fetch latest stats from local storage
  const stats = await getUserStats(user.uid);
  if (!stats) {
    console.warn("Could not load stats for user:", user.uid);
    return;
  }

  // Update only Total stat card (hide Today and This Week)
  const totalEl = document.getElementById("js-stat-sessions");
  const todayEl = document.getElementById("js-stat-today");
  const weekEl = document.getElementById("js-stat-week");

  if (totalEl) totalEl.textContent = stats.totalPomodoros || 0;

  // Show only Total, hide Today and This Week
  if (todayEl && todayEl.parentElement) {
    todayEl.parentElement.style.display = "none";
  }
  if (weekEl && weekEl.parentElement) {
    weekEl.parentElement.style.display = "none";
  }
}

export async function loadStats() {
  const user = getCurrentUser();
  if (user) {
    await updateStatsDisplay(user);
  }
}

export async function openStatsModal() {
  const statsModal = document.getElementById("js-stats-modal");
  statsModal.classList.add("open");

  await loadStats();

  // Initialize leaderboard when stats modal opens
  initializeLeaderboard();

  // Initialize tab switching
  initializeStatsTabs();
}

export function closeStatsModal() {
  const statsModal = document.getElementById("js-stats-modal");
  statsModal.classList.remove("open");

  // Stop any offline listeners/timers
  destroyLeaderboard();
}

/**
 * Initialize stats modal tab switching
 */
function initializeStatsTabs() {
  const tabs = document.querySelectorAll(".stats-tab");
  const tabContents = {
    summary: document.getElementById("js-tab-summary"),
    ranking: document.getElementById("js-tab-ranking"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;

      // Update active tab styling
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Show/hide tab content
      Object.keys(tabContents).forEach((key) => {
        if (tabContents[key]) {
          if (key === targetTab) {
            tabContents[key].classList.remove("hidden");
          } else {
            tabContents[key].classList.add("hidden");
          }
        }
      });
    });
  });
}
