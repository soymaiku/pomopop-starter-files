import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, googleProvider } from "./firebase-config-loader.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "./firebase-config-loader.js";
import { initializeLeaderboard, destroyLeaderboard } from "./leaderboard.js";

// Track which tasks have already had their session count incremented
const completedTaskSessions = new Set();
// Also track timestamp for duplicate prevention (backward compatibility)
let lastPomodoroIncrement = null;

// ==================== AUTH LOGIC ====================

export function getCurrentUser() {
  const userStr = localStorage.getItem("pomopop-user");
  return userStr ? JSON.parse(userStr) : null;
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // IMPORTANT: Google-only authentication
    // Only use displayName and photoURL from Google
    if (!user.displayName || !user.photoURL) {
      throw new Error(
        "Google account must have a display name and profile photo",
      );
    }

    const appUser = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isGuest: false,
    };
    localStorage.setItem("pomopop-user", JSON.stringify(appUser));

    // Initialize user stats in Firestore if they don't exist
    await initializeUserStats(appUser);

    return appUser;
  } catch (error) {
    console.error("❌ Google login failed:", error);
    alert("Google Login Error: " + error.message);
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
  localStorage.removeItem("pomopop-user");
  destroyLeaderboard(); // Stop real-time listener
  await signOut(auth);
}


async function initializeUserStats(appUser) {
  try {
    if (!db) {
      console.warn(
        "⚠️ Firebase not initialized, skipping user stats initialization",
      );
      return;
    }

    const userRef = doc(db, "users", appUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // New user - create their stats document
      const today = new Date().toISOString().split("T")[0];
      const weekStartDate = getWeekStartDate().toISOString().split("T")[0];

      await setDoc(userRef, {
        displayName: appUser.displayName,
        photoURL: appUser.photoURL,
        todayPomodoros: 0,
        weeklyPomodoros: 0,
        totalPomodoros: 0,
        todayDate: today,
        weekStartDate: weekStartDate,
        lastUpdated: serverTimestamp(),
      });

      console.log("✅ Created new user stats for:", appUser.uid);
    } else {
      // Existing user - update profile info in case it changed
      const userData = userSnap.data();

      // Always update displayName and photoURL from latest Google auth
      await updateDoc(userRef, {
        displayName: appUser.displayName,
        photoURL: appUser.photoURL,
        lastUpdated: serverTimestamp(),
      });

      // Check if daily/weekly resets are needed
      await checkAndResetStats(appUser.uid, userData);
    }
  } catch (error) {
    console.error("❌ Error initializing user stats:", error);
    // Continue anyway - guest mode will still work
  }
}

/**
 * Get the start date of the current week (Monday)
 */
function getWeekStartDate() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(today.setDate(diff));
}

/**
 * Check and reset daily/weekly pomodoro counts if needed
 */
async function checkAndResetStats(uid, userData) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekStartDate = getWeekStartDate().toISOString().split("T")[0];
    const updates = {};

    // Check if day changed - reset todayPomodoros
    if (userData.todayDate !== today) {
      updates.todayPomodoros = 0;
      updates.todayDate = today;
    }

    // Check if week changed - reset weeklyPomodoros
    if (userData.weekStartDate !== weekStartDate) {
      updates.weeklyPomodoros = 0;
      updates.weekStartDate = weekStartDate;
    }

    // Apply updates if any resets are needed
    if (Object.keys(updates).length > 0) {
      updates.lastUpdated = serverTimestamp();
      await updateDoc(doc(db, "users", uid), updates);
      console.log("✅ Stats reset applied for user:", uid);
    }
  } catch (error) {
    console.error("❌ Error checking/resetting stats:", error);
  }
}

/**
 * Re-evaluate task completion after editing estimated pomodoros.
 * Allows counting when the new estimate is reached, and resets eligibility if increased.
 * @param {Object} task - The edited task object
 */
export function handleTaskEstimateEdit(task) {
  const user = getCurrentUser();
  if (!user || user.isGuest || !task) {
    return;
  }

  const taskKey = `${user.uid}-${task.id}`;

  if (task.completedPomodoros >= task.pomodoros) {
    // Count once if the edited estimate is already satisfied
    recordPomodoroCompletion(task, 0);
  } else if (completedTaskSessions.has(taskKey)) {
    // Allow recounting if the estimate was increased
    completedTaskSessions.delete(taskKey);
  }
}

/**
 * Record pomodoro completion and increment session count when task is finished
 * IMPORTANT: Only increments session count when completedPomodoros equals estimated pomodoros
 * @param {Object} task - The current task object
 * @param {number} pomodoroDuration - Duration of the pomodoro session
 */
export async function recordPomodoroCompletion(task, pomodoroDuration) {
  const user = getCurrentUser();
  if (!user || user.isGuest) {
    console.log("⚠️ Stats not saved: guest or no user");
    return;
  }

  try {
    // Check if task is complete (all estimated pomodoros are done)
    if (task && task.completedPomodoros >= task.pomodoros) {
      // Only increment session count once per completed task
      const taskKey = `${user.uid}-${task.id}`;
      if (!completedTaskSessions.has(taskKey)) {
        completedTaskSessions.add(taskKey);

        const userRef = doc(db, "users", user.uid);

        // Only increment session count when task is fully completed
        await updateDoc(userRef, {
          todayPomodoros: increment(1),
          weeklyPomodoros: increment(1),
          totalPomodoros: increment(1),
          lastUpdated: serverTimestamp(),
        });

        console.log(
          "✅ Task completed! Session count incremented for:",
          user.uid,
          "Task:",
          task.name
        );
        updateStatsDisplay(user);
      }
    } else {
      console.log(
        "⏱️ Task not yet complete:",
        task?.completedPomodoros,
        "/",
        task?.pomodoros,
        "pomodoros"
      );
    }
  } catch (error) {
    console.error("❌ Error recording pomodoro completion:", error);
  }
}

/**
 * Increment pomodoro counts when session completes
 * IMPORTANT: Only called on successful session completion
 * Do NOT count partial or cancelled sessions
 */
export async function incrementPomodoroCount(pomodoroDuration) {
  const user = getCurrentUser();
  if (!user || user.isGuest) {
    console.log("⚠️ Stats not saved: guest or no user");
    return;
  }

  try {
    // Prevent duplicate counting on page refresh
    // Only increment once per session completion
    const now = Date.now();
    if (lastPomodoroIncrement && now - lastPomodoroIncrement < 5000) {
      console.log("⏱️ Duplicate increment blocked (too soon)");
      return;
    }
    lastPomodoroIncrement = now;

    const userRef = doc(db, "users", user.uid);

    // Atomically increment all three counters
    await updateDoc(userRef, {
      todayPomodoros: increment(1),
      weeklyPomodoros: increment(1),
      totalPomodoros: increment(1),
      lastUpdated: serverTimestamp(),
    });

    console.log("✅ Pomodoro count incremented for:", user.uid);
    updateStatsDisplay(user);
  } catch (error) {
    console.error("❌ Error incrementing pomodoro:", error);
  }
}

/**
 * Get user's current stats from Firestore
 */
async function getUserStats(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error("❌ Error getting user stats:", error);
    return null;
  }
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

  // Fetch latest stats from Firestore
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

  // Initialize real-time leaderboard when stats modal opens
  initializeLeaderboard();

  // Initialize tab switching
  initializeStatsTabs();
}

export function closeStatsModal() {
  const statsModal = document.getElementById("js-stats-modal");
  statsModal.classList.remove("open");

  // Stop real-time listener to save resources
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
