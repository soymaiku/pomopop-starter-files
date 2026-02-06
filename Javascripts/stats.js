import { initializeLeaderboard, destroyLeaderboard } from "./leaderboard.js";

const OFFLINE_USERS_KEY = "pomopop-offline-users";
const OFFLINE_LOGIN_INDEX_KEY = "pomopop-offline-login-index";
const LOCAL_USER_KEY = "pomopop-user";

const TEST_PROFILES = [
  {
    uid: "test-ava",
    displayName: "Hanni Pham",
    photoURL: "./Picture/hanni.jpg",
  },
  {
    uid: "test-miguel",
    displayName: "Miguel",
    photoURL: "./Picture/miguel.jpg",
  },
  {
    uid: "test-lia",
    displayName: "Lia Cruz",
    photoURL: "./Picture/lia.jpg",
  },
  {
    uid: "test-noah",
    displayName: "Dax Burger",
    photoURL: "./Picture/dax.jpg",
  },
];

const authListeners = new Set();
const completedTaskSessions = new Set();
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
  const today = new Date().toISOString().split("T")[0];
  const weekStartDate = getWeekStartDate().toISOString().split("T")[0];

  if (!users) {
    users = {};
  }

  TEST_PROFILES.forEach((profile, index) => {
    const existing = users[profile.uid];
    const baseStats = existing || {
      todayPomodoros: 0,
      weeklyPomodoros: 0,
      totalPomodoros: 12 + index * 7,
      todayDate: today,
      weekStartDate: weekStartDate,
    };

    users[profile.uid] = {
      ...baseStats,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
    };
  });

  saveOfflineUsers(users);
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

export function handleTaskEstimateEdit(task) {
  const user = getCurrentUser();
  if (!user || user.isGuest || !task) {
    return;
  }

  const taskKey = `${user.uid}-${task.id}`;

  if (task.completedPomodoros >= task.pomodoros) {
    recordPomodoroCompletion(task);
  } else if (completedTaskSessions.has(taskKey)) {
    completedTaskSessions.delete(taskKey);
  }
}

export async function recordPomodoroCompletion(task) {
  const user = getCurrentUser();
  if (!user || user.isGuest) {
    console.log("⚠️ Stats not saved: guest or no user");
    return;
  }

  if (!task || task.completedPomodoros < task.pomodoros) {
    return;
  }

  const taskKey = `${user.uid}-${task.id}`;
  if (completedTaskSessions.has(taskKey)) {
    return;
  }

  completedTaskSessions.add(taskKey);

  const users = ensureOfflineUsers();
  const stats = ensureUserStats(user.uid, user);
  stats.todayPomodoros += 1;
  stats.weeklyPomodoros += 1;
  stats.totalPomodoros += 1;
  users[user.uid] = stats;
  saveOfflineUsers(users);
  updateStatsDisplay(user);
}

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


    // ==================== OFFLINE STATS LOGIC ====================

    export function handleTaskEstimateEdit(task) {
      const user = getCurrentUser();
      if (!user || user.isGuest || !task) {
        return;
      }

      const taskKey = `${user.uid}-${task.id}`;

      if (task.completedPomodoros >= task.pomodoros) {
        recordPomodoroCompletion(task);
      } else if (completedTaskSessions.has(taskKey)) {
        completedTaskSessions.delete(taskKey);
      }
    }

    export async function recordPomodoroCompletion(task) {
      const user = getCurrentUser();
      if (!user || user.isGuest) {
        console.log("⚠️ Stats not saved: guest or no user");
        return;
      }

      if (!task || task.completedPomodoros < task.pomodoros) {
        return;
      }

      const taskKey = `${user.uid}-${task.id}`;
      if (completedTaskSessions.has(taskKey)) {
        return;
      }

      completedTaskSessions.add(taskKey);

      const users = ensureOfflineUsers();
      const stats = ensureUserStats(user.uid, user);
      stats.todayPomodoros += 1;
      stats.weeklyPomodoros += 1;
      stats.totalPomodoros += 1;
      users[user.uid] = stats;
      saveOfflineUsers(users);
      updateStatsDisplay(user);
    }

    export async function incrementPomodoroCount() {
export function closeStatsModal() {
