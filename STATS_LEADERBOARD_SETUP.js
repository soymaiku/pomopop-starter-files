// =========================================================================
// SETUP GUIDE: Pomodoro Stats & Real-Time Leaderboard System
// =========================================================================

/**
 * 🔧 STEP 1: FIRESTORE SETUP
 *
 * In Firebase Console:
 * 1. Go to Firestore Database
 * 2. Create a new collection called "users"
 * 3. Add the following security rules:
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /users/{uid} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth.uid == uid;
 *     }
 *   }
 * }
 *
 * This allows:
 * - All authenticated users to see the leaderboard
 * - Users to only modify their own stats
 */

/**
 * 🔧 STEP 2: USER DOCUMENT STRUCTURE
 *
 * Each user document in the "users" collection has:
 *
 * Document ID: user.uid (Firebase Auth UID)
 *
 * Fields:
 * {
 *   displayName: "John Doe",                    // From Google account
 *   photoURL: "https://...",                    // From Google account
 *   todayPomodoros: 5,                         // Resets daily
 *   weeklyPomodoros: 23,                       // Resets weekly
 *   totalPomodoros: 342,                       // Lifetime (never resets)
 *   todayDate: "2026-01-16",                   // ISO format for daily reset
 *   weekStartDate: "2026-01-13",               // ISO format for weekly reset
 *   lastUpdated: Timestamp(2026-01-16T10:30)   // Server timestamp
 * }
 */

/**
 * 🔧 STEP 3: FIRESTORE QUERIES USED
 *
 * LEADERBOARD QUERY (Top 10 users):
 *
 * query(
 *   collection(db, "users"),
 *   where("weeklyPomodoros", ">=", 0),         // Ensure valid users
 *   orderBy("weeklyPomodoros", "desc"),        // Sort by weekly (most relevant)
 *   orderBy("totalPomodoros", "desc"),         // Tiebreak with lifetime
 *   orderBy("displayName", "asc"),             // Alphabetical for final tiebreak
 *   limit(10)                                  // Top 10 only
 * )
 *
 * REAL-TIME LISTENER:
 *
 * onSnapshot(leaderboardQuery, (snapshot) => {
 *   leaderboardData = snapshot.docs.map((doc, index) => ({
 *     rank: index + 1,
 *     uid: doc.id,
 *     ...doc.data()
 *   }));
 *   renderLeaderboard(leaderboardData);
 * });
 *
 * This listener:
 * - Automatically fires whenever any user's stats change
 * - Sends only the changed documents (efficient)
 * - Updates all connected users instantly
 */

/**
 * 🔧 STEP 4: POMODORO INCREMENT LOGIC
 *
 * Location: timer.js (no changes needed, already calls incrementPomodoroCount)
 *
 * When timer expires:
 * 1. timer.js calls: incrementPomodoroCount(timer.pomodoro)
 * 2. stats.js checks: is user authenticated? is not guest?
 * 3. stats.js checks: 5-second cooldown to prevent duplicates
 * 4. Firestore atomically increments:
 *    - todayPomodoros: +1
 *    - weeklyPomodoros: +1
 *    - totalPomodoros: +1
 * 5. All connected users' leaderboards update in real-time
 *
 * IMPORTANT: Does NOT increment if:
 * - User is guest
 * - User refreshes page within 5 seconds
 * - User manually stops timer (only on natural expiration)
 */

/**
 * 🔧 STEP 5: DAILY/WEEKLY RESET LOGIC
 *
 * WHEN IT RUNS:
 * - On user login
 * - When stats modal opens
 *
 * DAILY RESET (at midnight):
 * - Compare: userData.todayDate vs new Date().toISOString().split("T")[0]
 * - If different: reset todayPomodoros to 0
 * - Update todayDate to today
 *
 * WEEKLY RESET (every Monday):
 * - Calculate: getWeekStartDate() → Monday of current week
 * - Compare: userData.weekStartDate vs this Monday
 * - If different: reset weeklyPomodoros to 0
 * - Update weekStartDate to this Monday
 *
 * EXAMPLE:
 * if (userData.todayDate !== "2026-01-16") {
 *   update todayPomodoros = 0
 *   update todayDate = "2026-01-16"
 * }
 */

/**
 * ✨ FEATURE: REAL-TIME UPDATES
 *
 * How it works:
 * 1. User A completes pomodoro → Firestore updates user A's doc
 * 2. Leaderboard listener in User B's browser detects the change
 * 3. onSnapshot callback fires with updated data
 * 4. renderLeaderboard() rebuilds the HTML
 * 5. User B sees ranking change instantly (NO REFRESH NEEDED)
 *
 * Benefits:
 * - Competitive experience (see others' progress live)
 * - Motivating (instant feedback on global rankings)
 * - No stale data
 */

/**
 * 🎨 UI RENDERING EXAMPLE
 *
 * Leaderboard HTML structure:
 *
 * <div class="leaderboard-header">
 *   <div class="leaderboard-rank">Rank</div>
 *   <div class="leaderboard-photo"></div>
 *   <div class="leaderboard-name">Name</div>
 *   <div class="leaderboard-pomodoros">Weekly 🍅</div>
 * </div>
 *
 * <div class="leaderboard-row">
 *   <div class="leaderboard-rank">🥇</div>
 *   <div class="leaderboard-photo">
 *     <img src="[GOOGLE_PROFILE_PHOTO]" />
 *   </div>
 *   <div class="leaderboard-name">John Doe</div>
 *   <div class="leaderboard-pomodoros">45</div>
 * </div>
 *
 * <div class="leaderboard-row">
 *   <div class="leaderboard-rank">🥈</div>
 *   <div class="leaderboard-photo">
 *     <img src="[GOOGLE_PROFILE_PHOTO]" />
 *   </div>
 *   <div class="leaderboard-name">Jane Smith</div>
 *   <div class="leaderboard-pomodoros">42</div>
 * </div>
 *
 * Rank badges:
 * - 1st: 🥇
 * - 2nd: 🥈
 * - 3rd: 🥉
 * - 4+: #4, #5, etc.
 */

/**
 * 📊 USER STATS CARDS (Same Modal)
 *
 * Your personal stats show:
 *
 * [Total]      [Today]      [This Week]
 *   342          5            23
 *
 * - Total: Lifetime pomodoros (never resets)
 * - Today: Pomodoros completed today (resets at midnight)
 * - This Week: Pomodoros this week (resets on Monday)
 */

/**
 * 🔐 AUTHENTICATION FLOW
 *
 * 1. User clicks "Google Login"
 * 2. Firebase OAuth popup opens
 * 3. User authenticates with Google account
 * 4. Firebase returns: uid, displayName, photoURL
 * 5. stats.js stores in localStorage:
 *    {
 *      uid: "abc123...",
 *      displayName: "John Doe",
 *      photoURL: "https://...",
 *      isGuest: false
 *    }
 * 6. initializeUserStats() creates or loads Firestore doc
 * 7. UI updates with user's photo and name in header
 *
 * IMPORTANT:
 * - Only Google accounts with displayName + photoURL allowed
 * - No email fallback
 * - No anonymous/guest stats saving
 * - No GitHub authentication
 */

/**
 * ⚡ OPTIMIZATION: REAL-TIME LISTENER LIFECYCLE
 *
 * When stats modal OPENS:
 * - initializeLeaderboard() called
 * - onSnapshot listener started
 * - Listener watches Firestore for changes
 * - Instant updates displayed
 *
 * When stats modal CLOSES:
 * - destroyLeaderboard() called
 * - unsubscribe() stops the listener
 * - Saves bandwidth and resources
 * - Listener can be restarted when modal opens again
 *
 * This ensures:
 * - No wasted listeners when user isn't viewing stats
 * - Clean memory management
 * - Multiple users can have listeners simultaneously
 */

/**
 * 🛡️ DUPLICATE PREVENTION DETAILS
 *
 * PROBLEM: What if page refreshes while completing pomodoro?
 *
 * SOLUTION 1: Cooldown (5 seconds)
 * - lastPomodoroIncrement tracks timestamp
 * - If increment called again within 5 seconds, skip it
 * - Prevents accidental double-counting from user clicks
 *
 * SOLUTION 2: Only on natural expiration
 * - timer.js only calls incrementPomodoroCount() when timer naturally expires
 * - Manual stop/reset doesn't trigger increment
 * - Cancelled sessions not counted
 *
 * SOLUTION 3: Firestore atomicity
 * - All 3 counters increment in single transaction
 * - Network failure won't cause partial updates
 */

/**
 * 📱 RESPONSIVE DESIGN
 *
 * Leaderboard grid on mobile:
 * - Rank | Photo | Name | Pomodoros
 *
 * Leaderboard grid on desktop:
 * - Same layout (responsive)
 * - Hover effect on rows
 * - Scrollable if >10 results
 */

/**
 * 🐛 COMMON ISSUES & FIXES
 *
 * Issue: Leaderboard shows "Loading..." forever
 * Fix: Check Firestore security rules, enable read for authenticated users
 *
 * Issue: Stats don't save when user completes pomodoro
 * Fix: Verify user is not guest, check Firestore write rules
 *
 * Issue: Same user appearing multiple times on leaderboard
 * Fix: Ensure document IDs are user.uid (should be unique)
 *
 * Issue: Leaderboard doesn't update when user completes pomodoro
 * Fix: Verify Firestore write succeeded, check listener is active
 *
 * Issue: todayPomodoros not resetting at midnight
 * Fix: Check device time is correct, logs should show reset on next login
 */

/**
 * ✅ IMPLEMENTATION COMPLETE
 *
 * You now have:
 * ✓ Google-only authentication
 * ✓ Real-time leaderboard with live updates
 * ✓ Pomodoro counting (today/weekly/total)
 * ✓ Automatic daily/weekly resets
 * ✓ Duplicate prevention
 * ✓ Profile photos + names from Google
 * ✓ Responsive UI matching screenshot
 *
 * Files created/modified:
 * - Javascripts/leaderboard.js (new)
 * - Javascripts/stats.js (updated)
 * - index.html (updated with leaderboard section)
 * - css/styles.css (updated with leaderboard styles)
 */
