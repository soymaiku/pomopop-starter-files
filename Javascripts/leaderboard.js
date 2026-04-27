// leaderboard.js
// Real-time leaderboard system using Firebase Firestore
// Shows top users ranked by weekly pomodoros with live updates

import { db } from "./firebase-config-loader.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Store current leaderboard data
let leaderboardData = [];
let displayedUsers = [];
let unsubscribe = null;
const BATCH_SIZE = 50; // Load 50 users at a time for performance

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

  if (!db) {
    console.warn("⚠️ Firebase not initialized, cannot load leaderboard");
    displayLeaderboardError();
    return;
  }

  // Query all users by total pomodoros (descending)
  // Using limit to manage Firestore performance with large user bases
  const leaderboardQuery = query(
    collection(db, "users"),
    orderBy("totalPomodoros", "desc"),
  );

  // Set up real-time listener
  unsubscribe = onSnapshot(
    leaderboardQuery,
    (snapshot) => {
      if (snapshot.empty) {
        console.log("ℹ️ No users in leaderboard yet");
      }
      // Get all users and map with rank (including those with 0 pomodoros)
      const allUsers = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      
      leaderboardData = allUsers
        .sort((a, b) => (b.totalPomodoros || 0) - (a.totalPomodoros || 0))
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));
      
      // Debug info for user
      console.log(`✅ Leaderboard Loaded:`);
      console.log(`   - Total users (all): ${leaderboardData.length}`);
      console.log(`   - Users with pomodoros: ${leaderboardData.filter(u => (u.totalPomodoros || 0) > 0).length}`);
      console.log(`   - Users with 0 pomodoros: ${leaderboardData.filter(u => (u.totalPomodoros || 0) === 0).length}`);
      console.log(`📊 Leaderboard Data (first 20):`, leaderboardData.slice(0, 20));
      
      // Reset displayed users and show first batch
      displayedUsers = [];
      loadMoreUsers();
    },
    (error) => {
      console.error("❌ Leaderboard listener error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      if (error.code === "permission-denied") {
        console.error(
          "⚠️ Firestore 'Read' permission denied - update security rules",
        );
      } else if (error.code === "failed-precondition") {
        console.error("⚠️ Firestore index missing or collection needs index");
      }
      displayLeaderboardError();
    },
  );

  console.log("✅ Leaderboard listener started");
}

/**
 * Load next batch of users (pagination)
 */
export function loadMoreUsers() {
  const nextBatch = leaderboardData.slice(
    displayedUsers.length,
    displayedUsers.length + BATCH_SIZE
  );
  
  if (nextBatch.length > 0) {
    displayedUsers = [...displayedUsers, ...nextBatch];
    renderLeaderboard(displayedUsers);
  }
  
  const stats = {
    displayed: displayedUsers.length,
    total: leaderboardData.length,
    remaining: leaderboardData.length - displayedUsers.length,
    batchSize: BATCH_SIZE
  };
  
  console.log(`📊 Leaderboard Stats:`, stats);
  console.log(`Displaying ${stats.displayed} / ${stats.total} users (${stats.remaining} remaining)`);
}

/**
 * Render leaderboard HTML - matches screenshot layout
 * Shows: Rank | Photo | Name | Total Pomodoros
 * Now includes ALL users (active + inactive)
 */
function renderLeaderboard(users) {
  const container = document.getElementById("js-leaderboard");

  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = `
      <div class="leaderboard-empty">
        <p>No users found. Be the first to join the Pomopop community!</p>
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
    const isInactive = (user.totalPomodoros || 0) === 0;
    const inactiveClass = isInactive ? 'inactive' : '';

    html += `
      <div class="leaderboard-row ${inactiveClass}" data-uid="${user.uid}">
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
          <span class="total-count">${user.totalPomodoros || 0}</span>
        </div>
      </div>
    `;
  });

  // Add "Load More" button if there are more users to display
  if (displayedUsers.length < leaderboardData.length) {
    html += `
      <div class="leaderboard-load-more">
        <button id="js-load-more-btn" class="load-more-btn">
          Load More (${leaderboardData.length - displayedUsers.length} more)
        </button>
      </div>
    `;
  }

  html += `</div>`;

  container.innerHTML = html;
  
  // Attach event listener to load more button if it exists
  const loadMoreBtn = document.getElementById("js-load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreUsers);
  }
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
        <p style="font-size: 12px; margin-top: 5px;">This could be due to:</p>
        <ul style="font-size: 11px; margin-top: 5px; padding-left: 15px;">
          <li>Firebase not configured properly</li>
          <li>Firestore security rules blocking reads</li>
          <li>No users have completed pomodoros yet</li>
          <li>Network connectivity issues</li>
        </ul>
        <p style="font-size: 12px; margin-top: 5px;">Check browser console for detailed error messages.</p>
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
