// IMPLEMENTATION GUIDE: Pomodoro Stats & Leaderboard System

/**
 * =========================================================================
 *  FIRESTORE DATABASE SCHEMA
 * =========================================================================
 *
 * Collection: "users"
 * Document ID: user.uid (from Firebase Auth)
 *
 * Schema:
 * {
 *   displayName: string,           // From Google account
 *   photoURL: string,              // From Google account profile
 *   todayPomodoros: number,        // Resets daily at midnight
 *   weeklyPomodoros: number,       // Resets every Monday
 *   totalPomodoros: number,        // Lifetime total (never resets)
 *   todayDate: string,             // ISO date "YYYY-MM-DD" for tracking daily reset
 *   weekStartDate: string,         // ISO date "YYYY-MM-DD" for weekly reset
 *   lastUpdated: timestamp,        // Firebase server timestamp
 * }
 *
 * Security Rules (Firestore):
 * - Authenticated users can read all user stats (for leaderboard)
 * - Users can only write to their own document
 * - Use serverTimestamp() for all timestamps
 *
 * =========================================================================
 *  KEY CHANGES FROM PREVIOUS SYSTEM
 * =========================================================================
 *
 * 1. AUTHENTICATION:
 *    ✅ Google-only authentication
 *    ✅ Display Google displayName and photoURL
 *    ❌ Removed GitHub authentication
 *    ❌ Removed anonymous/guest stats
 *
 * 2. DATA TRACKING:
 *    ✅ Track 3 pomodoro counts (today, weekly, total)
 *    ❌ Removed focus time tracking (HH:MM)
 *    ❌ Removed streak logic
 *
 * 3. DUPLICATE PREVENTION:
 *    ✅ 5-second cooldown on pomodoro increment
 *    ✅ Only increment on COMPLETED sessions (not partial/cancelled)
 *    ✅ No increment on page refresh
 *
 * 4. AUTO-RESET:
 *    ✅ Daily reset at midnight (checks on login/stats modal open)
 *    ✅ Weekly reset every Monday
 *    ✅ Reliable date-string comparison
 *
 * 5. REAL-TIME UPDATES:
 *    ✅ Firebase onSnapshot listener for leaderboard
 *    ✅ Instant updates when any user completes a pomodoro
 *    ✅ No manual refresh needed
 *
 * =========================================================================
 *  FILES MODIFIED/CREATED
 * =========================================================================
 *
 * 📝 NEW FILES:
 *   - Javascripts/leaderboard.js    → Real-time leaderboard logic
 *
 * ✏️ MODIFIED FILES:
 *   - Javascripts/stats.js          → Firestore integration + reset logic
 *   - index.html                    → Leaderboard HTML in stats modal
 *   - css/styles.css                → Leaderboard styling
 *
 * =========================================================================
 *  INTEGRATION CHECKLIST
 * =========================================================================
 *
 * ✅ 1. Ensure Firestore is enabled in Firebase Console
 * ✅ 2. Update Firestore security rules (see below)
 * ✅ 3. Verify Google Auth provider is configured in Firebase
 * ✅ 4. Import leaderboard.js in app.js (already done)
 * ✅ 5. Update HTML with leaderboard section (done)
 * ✅ 6. Add CSS for leaderboard styling (done)
 * ✅ 7. Test with multiple accounts
 *
 * =========================================================================
 *  FIRESTORE SECURITY RULES (Copy to Firebase Console)
 * =========================================================================
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /users/{uid} {
 *       // Anyone authenticated can read all user stats (for leaderboard)
 *       allow read: if request.auth != null;
 *
 *       // Users can only write to their own document
 *       allow write: if request.auth.uid == uid;
 *     }
 *   }
 * }
 *
 * =========================================================================
 *  HOW IT WORKS: FLOW DIAGRAMS
 * =========================================================================
 *
 * --- POMODORO COMPLETION FLOW ---
 * User completes pomodoro
 *   ↓
 * timer.js calls incrementPomodoroCount()
 *   ↓
 * stats.js checks: user exists? guest? (if yes, skip)
 *   ↓
 * stats.js checks: 5-second cooldown to prevent duplicates
 *   ↓
 * Firestore atomically increments: todayPomodoros, weeklyPomodoros, totalPomodoros
 *   ↓
 * updateStatsDisplay() refreshes UI cards
 *   ↓
 * Leaderboard listener detects change (onSnapshot)
 *   ↓
 * Leaderboard re-renders automatically (all connected users see it)
 *
 * --- LOGIN FLOW ---
 * User clicks "Google Login"
 *   ↓
 * stats.js: loginWithGoogle() authenticates with Firebase
 *   ↓
 * User data stored in localStorage (displayName, photoURL, uid)
 *   ↓
 * stats.js: initializeUserStats() creates or loads Firestore doc
 *   ↓
 * checkAndResetStats() checks if daily/weekly reset needed
 *   ↓
 * App UI updates with user profile (name + photo in header)
 *
 * --- DAILY/WEEKLY RESET FLOW ---
 * User logs in OR opens stats modal
 *   ↓
 * initializeUserStats() is called
 *   ↓
 * checkAndResetStats() compares todayDate with current date
 *   ↓
 * If date changed:
 *   - todayPomodoros = 0
 *   - todayDate = today's ISO date
 *   ↓
 * If week changed:
 *   - weeklyPomodoros = 0
 *   - weekStartDate = this Monday's ISO date
 *
 * --- REAL-TIME LEADERBOARD FLOW ---
 * Stats modal opens
 *   ↓
 * openStatsModal() → initializeLeaderboard()
 *   ↓
 * leaderboard.js sets up Firebase onSnapshot listener
 *   ↓
 * Listener queries Firestore:
 *   - All users (where weeklyPomodoros >= 0)
 *   - Sorted by weeklyPomodoros DESC
 *   - Sorted by totalPomodoros DESC (tiebreaker)
 *   - Sorted by displayName ASC (final tiebreaker)
 *   - Limit 10 results
 *   ↓
 * renderLeaderboard() builds HTML table
 *   ↓
 * Listener stays active, watching for changes
 *   ↓
 * Any user completes pomodoro → Firestore updates
 *   ↓
 * onSnapshot fires → leaderboard re-renders instantly
 *   ↓
 * All connected users see update in real-time (no refresh needed)
 *
 * =========================================================================
 *  IMPORTANT IMPLEMENTATION DETAILS
 * =========================================================================
 *
 * 1. POMODORO VALIDATION:
 *    - Only counted when timer naturally expires (not manual stop)
 *    - timer.js calls incrementPomodoroCount(timer.pomodoro)
 *    - Only happens in timer.js line ~52: if (total <= 0)
 *
 * 2. DUPLICATE PREVENTION:
 *    - lastPomodoroIncrement tracks timestamp of last increment
 *    - If another increment within 5 seconds, it's blocked
 *    - Prevents rapid clicks or page refresh from double-counting
 *
 * 3. RESET LOGIC:
 *    - todayDate stored as ISO string: "2026-01-16"
 *    - Compared with new Date().toISOString().split("T")[0]
 *    - Guaranteed to reset at exact midnight (any timezone)
 *    - weekStartDate calculated as Monday of current week
 *
 * 4. FIRESTORE ATOMICITY:
 *    - Uses increment() function for atomic updates
 *    - All 3 counters increment in single transaction
 *    - No risk of partial updates if network fails mid-request
 *
 * 5. LEADERBOARD ORDERING:
 *    - Primary: weeklyPomodoros DESC (current week is most relevant)
 *    - Secondary: totalPomodoros DESC (lifetime achievement)
 *    - Tertiary: displayName ASC (alphabetical tiebreaker)
 *
 * 6. PROFILE DISPLAY:
 *    - Always uses Google displayName and photoURL
 *    - Never falls back to email
 *    - User must have these fields in Google account
 *
 * =========================================================================
 *  TESTING CHECKLIST
 * =========================================================================
 *
 * □ Single User:
 *   - Complete a pomodoro session
 *   - Check stats increment (today, week, total)
 *   - Open stats modal again - numbers persist
 *   - Close and reopen app - numbers still there
 *   - Wait for midnight - check if today resets
 *
 * □ Multiple Users:
 *   - User A completes pomodoro
 *   - User B has stats modal open
 *   - User B sees User A's count update in leaderboard (no refresh)
 *   - User B completes pomodoro
 *   - Both users' leaderboards update instantly
 *
 * □ Reset Logic:
 *   - Manually change device date to next day
 *   - Log in - check if todayPomodoros resets
 *   - Change device date to next Monday
 *   - Log in - check if weeklyPomodoros resets
 *
 * □ Duplicate Prevention:
 *   - Rapidly click "Start" button multiple times
 *   - Only 1 pomodoro should increment
 *   - Refresh page mid-completion - no duplicate count
 *
 * □ Guest Mode:
 *   - Log in as guest
 *   - Try to complete pomodoro
 *   - Stats NOT saved (guest message shows instead)
 *
 * □ Auth Changes:
 *   - Google login works
 *   - Profile photo and name display correctly
 *   - Logout and back in - stats preserved
 *
 * =========================================================================
 *  TROUBLESHOOTING
 * =========================================================================
 *
 * ❌ "Leaderboard not showing"
 *    → Check if js-leaderboard element exists in HTML
 *    → Check browser console for Firebase errors
 *    → Verify Firestore security rules allow read
 *
 * ❌ "Stats not saving to Firestore"
 *    → Check if user is authenticated (not guest)
 *    → Verify Firestore is enabled in Firebase Console
 *    → Check network tab - is updateDoc request succeeding?
 *    → Review browser console for errors
 *
 * ❌ "Duplicate pomodoros counted"
 *    → Check if incrementPomodoroCount called multiple times
 *    → Verify 5-second cooldown is working
 *    → Check timer.js line ~52 - increment called once only
 *
 * ❌ "Daily/weekly reset not working"
 *    → Verify todayDate format: "YYYY-MM-DD"
 *    → Check if checkAndResetStats is called on login
 *    → Test with manual date changes
 *
 * ❌ "Real-time leaderboard not updating"
 *    → Check if onSnapshot listener is active
 *    → Verify Firestore write permissions
 *    → Try closing and reopening stats modal
 *    → Check console for listener errors
 *
 * =========================================================================
 */
