// leaderboard.js
// Offline leaderboard system using localStorage data

// Store current leaderboard data
let leaderboardData = [];
let refreshTimer = null;

const OFFLINE_USERS_KEY = "pomopop-offline-users";

const TEST_PROFILES = [
  {
    uid: "test-ava",
    displayName: "Ava Santos",
    photoURL: "https://ui-avatars.com/api/?name=Ava+Santos&background=3b82f6&color=fff",
    totalPomodoros: 12,
  },
  {
    uid: "test-miguel",
    displayName: "Miguel Dizon",
    photoURL: "https://ui-avatars.com/api/?name=Miguel+Dizon&background=10b981&color=fff",
    totalPomodoros: 19,
  },
  {
    uid: "test-lia",
    displayName: "Lia Cruz",
    photoURL: "https://ui-avatars.com/api/?name=Lia+Cruz&background=f59e0b&color=fff",
    totalPomodoros: 26,
  },
  {
    uid: "test-noah",
    displayName: "Noah Reyes",
    photoURL: "https://ui-avatars.com/api/?name=Noah+Reyes&background=ef4444&color=fff",
    totalPomodoros: 33,
  },
];

function seedOfflineUsers() {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStartDate().toISOString().split("T")[0];
  const users = {};
  TEST_PROFILES.forEach((profile) => {
    users[profile.uid] = {
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      todayPomodoros: 0,
      weeklyPomodoros: 0,
      totalPomodoros: profile.totalPomodoros,
      todayDate: today,
      weekStartDate: weekStart,
    };
  });
  localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));
  return users;
}

function getWeekStartDate() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
}

function loadOfflineUsers() {
  const raw = localStorage.getItem(OFFLINE_USERS_KEY);
  if (!raw) return seedOfflineUsers();
  try {
    const parsed = JSON.parse(raw) || {};
    if (!Object.keys(parsed).length) return seedOfflineUsers();
    return parsed;
  } catch (error) {
    console.warn("⚠️ Failed to parse offline users for leaderboard", error);
    return seedOfflineUsers();
  }
}

function buildOfflineLeaderboard() {
  const users = loadOfflineUsers();
  return Object.entries(users)
    .map(([uid, data]) => ({
      uid,
      displayName: data.displayName || "Offline User",
      photoURL: data.photoURL || "https://via.placeholder.com/48",
      totalPomodoros: Number(data.totalPomodoros || 0),
    }))
    .sort((a, b) => b.totalPomodoros - a.totalPomodoros)
    .map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
}

/**
 * Start real-time listener for leaderboard
 * Automatically updates UI whenever data changes in Firestore
 */
export function initializeLeaderboard() {
  const leaderboardContainer = document.getElementById("js-leaderboard");

  if (!leaderboardContainer) {
    console.warn("⚠️ Leaderboard container not found in DOM");
    return;
  }

  leaderboardData = buildOfflineLeaderboard();
  renderLeaderboard(leaderboardData);

  // Refresh occasionally in case stats change during the session
  refreshTimer = setInterval(() => {
    leaderboardData = buildOfflineLeaderboard();
    renderLeaderboard(leaderboardData);
  }, 5000);
}

/**
 * Render leaderboard HTML - matches screenshot layout
 * Shows: Rank | Photo | Name | Weekly Pomodoros
 */
function renderLeaderboard(users) {
  const container = document.getElementById("js-leaderboard");

  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = `
      <div class="leaderboard-empty">
        <p>No users on the leaderboard yet. Complete your first pomodoro!</p>
      </div>
    `;
    return;
  }

  // Build leaderboard rows - Pomofocus style: simple, text-first
  let html = `
    <div class="leaderboard-header">
      <div class="leaderboard-header-rank"></div>
      <div class="leaderboard-header-user">USER</div>
      <div class="leaderboard-header-total">🍅 TOTAL</div>
    </div>
    <div class="leaderboard-body">
  `;

  users.forEach((user) => {
    const photoUrl = user.photoURL || "https://via.placeholder.com/48";

    html += `
      <div class="leaderboard-row" data-uid="${user.uid}">
        <div class="leaderboard-rank-cell">
          <span class="rank-number">${user.rank}</span>
        </div>
        <div class="leaderboard-user-cell">
          <img 
            src="${photoUrl}" 
            alt="${user.displayName}" 
            class="leaderboard-avatar"
            onerror="this.src='https://via.placeholder.com/48'"
          />
          <span class="user-name" title="${escapeHtml(user.displayName)}" aria-label="${escapeHtml(user.displayName)}">${escapeHtml(user.displayName)}</span>
        </div>
        <div class="leaderboard-total-cell">
          <span class="total-count">${user.totalPomodoros}</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  container.innerHTML = html;
}

/**
 * Display styled rank badge (1st 🥇, 2nd 🥈, 3rd 🥉, etc.)
 */
function getRankBadge(rank) {
  const badges = ["🥇", "🥈", "🥉"];
  return rank <= 3 ? badges[rank - 1] : `#${rank}`;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Display error message in leaderboard
 */
function displayLeaderboardError() {
  const container = document.getElementById("js-leaderboard");
  if (container) {
    container.innerHTML = `
      <div class="leaderboard-error">
        <p>⚠️ Failed to load leaderboard.</p>
        <p style="font-size: 12px; margin-top: 5px;">Check console for details. Verify Firestore security rules allow 'read' for authenticated users.</p>
      </div>
    `;
  }
}

/**
 * Stop listening to real-time updates
 * Call this when closing stats modal to save resources
 */
export function destroyLeaderboard() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Get current leaderboard data (cached from listener)
 */
export function getLeaderboardData() {
  return [...leaderboardData];
}

/**
 * Find user's current rank on leaderboard
 */
export function getUserRank(uid) {
  const user = leaderboardData.find((u) => u.uid === uid);
  return user ? user.rank : null;
}
