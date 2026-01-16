// leaderboard.js
// Real-time leaderboard system using Firebase Firestore
// Shows top users ranked by weekly pomodoros with live updates

import { db } from "./firebase-config-loader.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Store current leaderboard data
let leaderboardData = [];
let unsubscribe = null;

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

  // Query top 10 users by total pomodoros (descending)
  const leaderboardQuery = query(
    collection(db, "users"),
    orderBy("totalPomodoros", "desc"),
    limit(10)
  );

  // Set up real-time listener
  unsubscribe = onSnapshot(
    leaderboardQuery,
    (snapshot) => {
      if (snapshot.empty) {
        console.log("ℹ️ No users in leaderboard yet");
      }
      leaderboardData = snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        uid: doc.id,
        ...doc.data(),
      }));
      renderLeaderboard(leaderboardData);
    },
    (error) => {
      console.error("❌ Leaderboard listener error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      if (error.code === "permission-denied") {
        console.error(
          "⚠️ Firestore 'Read' permission denied - update security rules"
        );
      } else if (error.code === "failed-precondition") {
        console.error("⚠️ Firestore index missing or collection needs index");
      }
      displayLeaderboardError();
    }
  );

  console.log("✅ Leaderboard listener started");
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

  // Build leaderboard rows
  let html = `
    <div class="leaderboard-header">
      <div class="leaderboard-rank">Rank</div>
      <div class="leaderboard-photo"></div>
      <div class="leaderboard-name">Name</div>
      <div class="leaderboard-pomodoros">Total 🍅</div>
    </div>
  `;

  users.forEach((user) => {
    const rankBadge = getRankBadge(user.rank);
    const photoUrl = user.photoURL || "https://via.placeholder.com/40";

    html += `
      <div class="leaderboard-row" data-uid="${user.uid}">
        <div class="leaderboard-rank">${rankBadge}</div>
        <div class="leaderboard-photo">
          <img 
            src="${photoUrl}" 
            alt="${user.displayName}" 
            class="user-avatar"
            onerror="this.src='https://via.placeholder.com/40'"
          />
        </div>
        <div class="leaderboard-name">${escapeHtml(user.displayName)}</div>
        <div class="leaderboard-pomodoros">${user.totalPomodoros}</div>
      </div>
    `;
  });

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
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    console.log("🛑 Leaderboard listener stopped");
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
