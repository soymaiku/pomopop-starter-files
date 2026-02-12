// app.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { auth, db, waitForFirebase } from "./firebase-config-loader.js";
import {
  loadSettings,
  openSettingsModal,
  closeSettingsModal,
  saveSettings,
  fetchUserSettings,
  stopSettingsListener,
  setupDurationValidation,
} from "./settings.js";
import {
  loadTasks,
  fetchUserTasks,
  clearTasks,
  updateTaskNameDisplay,
  addTask,
  openTaskModal,
  closeTaskModal,
  stopTasksListener,
  setupTaskInputValidation,
} from "./tasks.js";
import {
  switchMode,
  handleMode,
  handleMainButtonClick,
  resetTimer,
  skipBreak,
  initModeSlider,
} from "./timer.js";
import {
  openMusicModal,
  closeMusicModal,
  playMusic,
  stopMusic,
  handleVolumeChange,
  playYouTubeVideo,
} from "./music.js";
import { timer } from "./config.js";
import {
  openStatsModal,
  closeStatsModal,
  getCurrentUser,
  loginWithGoogle,
  loginAsGuest,
  logout,
} from "./stats.js";

// ==================== FONT LOGIC ====================
function applyCustomFont() {
  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Jersey+25&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.textContent = `
    body, button, input, textarea, select {
      font-family: 'Jersey 25', sans-serif !important;
    }

    /* Fix chopped focus ring in settings inputs */
    #js-settings-modal input {
      margin: 4px;
    }

    /* Fix font size for large screens (3440x1440) */
    @media (min-width: 2600px) {
      html {
        font-size: 24px;
      }
    }
  `;
  document.head.appendChild(style);
}

// ==================== BURGER MENU LOGIC ====================

const menuToggleBtn = document.getElementById("js-menu-toggle-btn");
const menuDropdown = document.getElementById("js-menu-dropdown");

function toggleBurgerMenu() {
  menuDropdown.classList.toggle("open");
}

function closeBurgerMenu() {
  menuDropdown.classList.remove("open");
}

// ==================== MODAL STATE TRACKING ====================
// Track modal open state to hide buttons on mobile
function updateModalState() {
  const modals = document.querySelectorAll(".modal");
  const hasOpenModal = Array.from(modals).some((modal) =>
    modal.classList.contains("open"),
  );
  if (hasOpenModal) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
  }
}

// Watch for modal state changes
const modalObserver = new MutationObserver(() => {
  updateModalState();
});

// ==================== AUTH & LOGIN LOGIC ====================

const loginModal = document.getElementById("js-login-modal");
const googleLoginBtn = document.getElementById("js-google-login-btn");
const guestLoginBtn = document.getElementById("js-guest-login-btn");
const logoutBtn = document.getElementById("js-logout-btn");
const loginBtn = document.getElementById("js-login-btn");
const userProfile = document.getElementById("js-user-profile");
const profilePic = document.getElementById("js-profile-pic");
const profileName = document.getElementById("js-profile-name");
const accountIconBtn = document.getElementById("js-account-icon-btn");
const accountAvatarDisplay = document.getElementById("js-account-avatar");

function checkAuth() {
  const user = getCurrentUser();
  if (user) {
    // User is logged in
    loginModal.classList.remove("open");
    updateProfileUI(user);
  } else {
    // No user, show login
    loginModal.classList.add("open");
  }
}

function updateProfileUI(user) {
  if (user.isGuest) {
    userProfile.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    loginBtn.classList.remove("hidden");
    accountIconBtn.style.display = "none";
  } else {
    userProfile.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    accountIconBtn.style.display = "flex";
    profilePic.src = user.photoURL;
    profileName.textContent = user.displayName;
    accountAvatarDisplay.src = user.photoURL;
  }
}

async function handleLogin(type) {
  if (type === "google") {
    await loginWithGoogle();
  } else {
    loginAsGuest();
    document.dispatchEvent(new CustomEvent("pomopop-guest-login"));
  }
  checkAuth();
}

// ==================== EVENT LISTENERS ====================
document.addEventListener("DOMContentLoaded", async () => {
  applyCustomFont();
  const localUser = getCurrentUser();
  if (!localUser) {
    loginModal.classList.add("open");
  }
  // Wait for Firebase to initialize before proceeding
  await waitForFirebase();
  // Load settings and tasks
  loadSettings();
  updateTaskNameDisplay();
  setupDurationValidation(); // Setup Pomodoro duration validation
  setupTaskInputValidation(); // Setup task pomodoro input validation

  // Initialize mode slider position
  setTimeout(() => initModeSlider(), 100);
  window.addEventListener("resize", () => initModeSlider());

  checkAuth(); // Check if user is logged in

  // Observe all modals for class changes
  document.querySelectorAll(".modal").forEach((modal) => {
    modalObserver.observe(modal, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });
  updateModalState(); // Initial check

  // --- AUTH STATE LISTENER ---
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      clearTasks(); // Clear guest tasks from view immediately
      fetchUserTasks(user.uid);
      fetchUserSettings(user.uid);
    } else {
      // User logged out: Clear memory and load guest data from localStorage
      stopTasksListener();
      stopSettingsListener();
      clearTasks();
      loadTasks();
      loadSettings(); // Restore guest settings

      const localUser = getCurrentUser();
      if (localUser && localUser.isGuest) {
        await loadOnboardingPreference(localUser);
        maybeOpenOnboardingModal();
      } else {
        onboardingPreferenceReady = false;
        onboardingDismissedCache = false;
        if (onboardingDismiss) onboardingDismiss.checked = false;
      }
      return;
    }

    await loadOnboardingPreference({ uid: user.uid, isGuest: false });
    maybeOpenOnboardingModal();
  });

  // --- BURGER MENU HANDLERS ---
  menuToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent document click listener from immediately closing it
    toggleBurgerMenu();
  });

  // Header Buttons are now dropdown buttons
  document.getElementById("js-settings-btn").addEventListener("click", () => {
    clearOnboardingShortcutContext();
    openSettingsModal();
    closeBurgerMenu();
  });
  document.getElementById("js-music-btn").addEventListener("click", () => {
    clearOnboardingShortcutContext();
    openMusicModal();
    closeBurgerMenu();
  });
  document
    .getElementById("js-tasks-toggle-btn")
    .addEventListener("click", () => {
      clearOnboardingShortcutContext();
      openTaskModal();
      closeBurgerMenu();
    });
  document.getElementById("js-stats-btn").addEventListener("click", () => {
    openStatsModal();
    closeBurgerMenu();
  });

  // Auth Event Listeners
  googleLoginBtn.addEventListener("click", () => handleLogin("google"));
  guestLoginBtn.addEventListener("click", () => handleLogin("guest"));

  loginBtn.addEventListener("click", () => {
    loginModal.classList.add("open");
    closeBurgerMenu();
  });

  logoutBtn.addEventListener("click", () => {
    logout();
    closeBurgerMenu();
    checkAuth(); // Will reopen login modal
  });

  // -----------------------------

  // Settings Modal Handlers
  document
    .getElementById("js-close-settings")
    .addEventListener("click", () => {
      closeSettingsModal();
      clearOnboardingShortcutContext();
    });
  document
    .getElementById("js-save-settings")
    .addEventListener("click", saveSettings);
  // Also save settings on Enter keypress inside inputs
  document
    .getElementById("js-settings-modal")
    .querySelectorAll("input")
    .forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveSettings();
      });
    });

  // Music Modal Handlers
  document
    .getElementById("js-close-music")
    .addEventListener("click", () => {
      closeMusicModal();
      clearOnboardingShortcutContext();
    });
  document.getElementById("js-music-stop").addEventListener("click", stopMusic);
  document
    .getElementById("js-music-select")
    .addEventListener("change", playMusic); // Auto-play when a new track is selected
  document
    .getElementById("js-volume")
    .addEventListener("input", handleVolumeChange);

  // YouTube Player Handlers
  document
    .getElementById("js-youtube-play-btn")
    .addEventListener("click", playYouTubeVideo);

  // Allow Enter key to play YouTube video
  document
    .getElementById("js-youtube-url")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        playYouTubeVideo();
      }
    });

  // Tasks Modal Handlers
  // Task open is now handled by the dropdown button above
  document
    .getElementById("js-close-tasks")
    .addEventListener("click", () => {
      closeTaskModal();
      clearOnboardingShortcutContext();
    });
  // Stats Modal Handlers
  document
    .getElementById("js-close-stats")
    .addEventListener("click", closeStatsModal);
  document.getElementById("js-add-task").addEventListener("click", addTask);
  // Add task on Enter keypress
  document.getElementById("js-task-name").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
  });
  document
    .getElementById("js-task-pomodoros")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTask();
    });

  // ==================== ONBOARDING MODAL LOGIC ====================
  const onboardingModal = document.getElementById("js-onboarding-modal");
  const closeOnboardingBtn = document.getElementById("js-close-onboarding");
  const onboardingDoneBtn = document.getElementById("js-onboarding-done");
  const onboardingDismiss = document.getElementById("js-onboarding-dismiss");
  const quickTutorialBtn = document.getElementById("js-quick-tutorial-btn");
  const onboardingBackSettings = document.getElementById(
    "js-onboarding-back-settings",
  );
  const onboardingBackTasks = document.getElementById(
    "js-onboarding-back-tasks",
  );
  const onboardingBackMusic = document.getElementById(
    "js-onboarding-back-music",
  );
  const onboardingBackVideo = document.getElementById(
    "js-onboarding-back-video",
  );
  const onboardingOpenSettings = document.getElementById(
    "js-onboarding-open-settings",
  );
  const onboardingOpenTasks = document.getElementById(
    "js-onboarding-open-tasks",
  );
  const onboardingOpenMusic = document.getElementById(
    "js-onboarding-open-music",
  );
  const onboardingOpenVideo = document.getElementById(
    "js-onboarding-open-video",
  );
  let onboardingDismissedCache = false;
  let onboardingPreferenceReady = false;

  function getOnboardingStorageKey(userOverride) {
    const user = userOverride || getCurrentUser();
    const suffix = user && user.uid ? user.uid : "guest";
    return `pomopop-onboarding-dismissed:${suffix}`;
  }
  let onboardingShortcutContext = null;

  function getLocalOnboardingPreference(userOverride) {
    const key = getOnboardingStorageKey(userOverride);
    return localStorage.getItem(key) === "true";
  }

  function setLocalOnboardingPreference(value, userOverride) {
    const key = getOnboardingStorageKey(userOverride);
    if (value) {
      localStorage.setItem(key, "true");
    } else {
      localStorage.removeItem(key);
    }
  }

  function applyOnboardingPreference(value) {
    onboardingDismissedCache = value;
    onboardingPreferenceReady = true;
    if (onboardingDismiss) onboardingDismiss.checked = value;
  }

  async function loadOnboardingPreference(userOverride) {
    const user = userOverride || getCurrentUser();
    const localPref = getLocalOnboardingPreference(userOverride);
    applyOnboardingPreference(localPref);

    if (!db || !user || user.isGuest) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (typeof data.onboardingDismissed === "boolean") {
          applyOnboardingPreference(data.onboardingDismissed);
          setLocalOnboardingPreference(data.onboardingDismissed, userOverride);
          return;
        }
      }

      // Migrate local preference to Firestore on first login
      applyOnboardingPreference(localPref);
      await setDoc(
        userRef,
        { onboardingDismissed: localPref },
        { merge: true },
      );
      setLocalOnboardingPreference(localPref, userOverride);
    } catch (error) {
      console.error("Error loading onboarding preference:", error);
    }
  }

  async function persistOnboardingPreference(value) {
    setLocalOnboardingPreference(value);

    const user = getCurrentUser();
    if (!db || !user || user.isGuest) return;

    try {
      await setDoc(
        doc(db, "users", user.uid),
        { onboardingDismissed: value },
        { merge: true },
      );
    } catch (error) {
      console.error("Error saving onboarding preference:", error);
    }
  }

  function openOnboardingModal() {
    if (onboardingDismiss) onboardingDismiss.checked = onboardingDismissedCache;
    if (onboardingModal) onboardingModal.classList.add("open");
  }

  function closeOnboardingModal() {
    if (!onboardingModal) return;
    onboardingModal.classList.remove("open");

    if (onboardingDismiss) {
      applyOnboardingPreference(onboardingDismiss.checked);
      persistOnboardingPreference(onboardingDismiss.checked);
    }
  }

  function maybeOpenOnboardingModal() {
    if (!onboardingPreferenceReady || onboardingDismissedCache) return;

    const openModal = document.querySelector(".modal.open");
    if (openModal) {
      setTimeout(maybeOpenOnboardingModal, 400);
      return;
    }

    openOnboardingModal();
  }

  function updateOnboardingBackButtons() {
    const mapping = [
      ["settings", onboardingBackSettings],
      ["tasks", onboardingBackTasks],
      ["music", onboardingBackMusic],
      ["video", onboardingBackVideo],
    ];

    mapping.forEach(([key, btn]) => {
      if (!btn) return;
      if (onboardingShortcutContext === key) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
      }
    });
  }

  function setOnboardingShortcutContext(context) {
    onboardingShortcutContext = context;
    updateOnboardingBackButtons();
  }

  function clearOnboardingShortcutContext() {
    onboardingShortcutContext = null;
    updateOnboardingBackButtons();
  }

  if (closeOnboardingBtn) {
    closeOnboardingBtn.addEventListener("click", closeOnboardingModal);
  }
  if (onboardingDoneBtn) {
    onboardingDoneBtn.addEventListener("click", closeOnboardingModal);
  }
  if (onboardingOpenSettings) {
    onboardingOpenSettings.addEventListener("click", () => {
      setOnboardingShortcutContext("settings");
      closeOnboardingModal();
      openSettingsModal();
    });
  }
  if (onboardingOpenTasks) {
    onboardingOpenTasks.addEventListener("click", () => {
      setOnboardingShortcutContext("tasks");
      closeOnboardingModal();
      openTaskModal();
    });
  }
  if (onboardingOpenMusic) {
    onboardingOpenMusic.addEventListener("click", () => {
      setOnboardingShortcutContext("music");
      closeOnboardingModal();
      openMusicModal();
    });
  }
  if (onboardingDismiss) {
    onboardingDismiss.addEventListener("change", () => {
      applyOnboardingPreference(onboardingDismiss.checked);
      persistOnboardingPreference(onboardingDismiss.checked);
    });
  }
  if (onboardingBackSettings) {
    onboardingBackSettings.addEventListener("click", () => {
      closeSettingsModal();
      clearOnboardingShortcutContext();
      openOnboardingModal();
    });
  }
  if (onboardingBackTasks) {
    onboardingBackTasks.addEventListener("click", () => {
      closeTaskModal();
      clearOnboardingShortcutContext();
      openOnboardingModal();
    });
  }
  if (onboardingBackMusic) {
    onboardingBackMusic.addEventListener("click", () => {
      closeMusicModal();
      clearOnboardingShortcutContext();
      openOnboardingModal();
    });
  }

  if (quickTutorialBtn) {
    quickTutorialBtn.addEventListener("click", () => {
      clearOnboardingShortcutContext();
      closeSettingsModal();
      loadOnboardingPreference().then(openOnboardingModal);
    });
  }

  document.addEventListener("pomopop-guest-login", async () => {
    await loadOnboardingPreference({ uid: "guest", isGuest: true });
    maybeOpenOnboardingModal();
  });

  // ==================== ACCOUNT MODAL LOGIC ====================
  const accountModal = document.getElementById("js-account-modal");
  const closeAccountBtn = document.getElementById("js-close-account");
  const saveAccountBtn = document.getElementById("js-save-account");
  const cancelAccountBtn = document.getElementById("js-cancel-account");
  const accountEditPic = document.getElementById("js-account-edit-pic");
  const accountEditName = document.getElementById("js-account-edit-name");

  // Hide the photo upload button/input since functionality is removed
  const picUploadInput = document.getElementById("js-pic-upload");
  if (picUploadInput) picUploadInput.style.display = "none";

  const picUploadLabel = document.querySelector('label[for="js-pic-upload"]');
  if (picUploadLabel) picUploadLabel.style.display = "none";

  function openAccountModal() {
    const user = getCurrentUser();
    if (user && !user.isGuest) {
      // Populate modal with current user data
      accountEditPic.src = user.photoURL || "";
      accountEditName.value = user.displayName || "";
      accountModal.classList.add("open");
    }
  }

  function closeAccountModal() {
    accountModal.classList.remove("open");
  }

  // Save account changes
  saveAccountBtn.addEventListener("click", async () => {
    const user = getCurrentUser();
    if (user && !user.isGuest) {
      const newName = accountEditName.value.trim();

      if (!newName) {
        alert("Please enter a name");
        return;
      }

      try {
        // Update user profile in Firebase
        const { updateProfile } =
          await import("https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js");

        const updates = {
          displayName: newName,
        };

        await updateProfile(auth.currentUser, updates);

        // Update Firestore to sync name across database (Leaderboard, etc.)
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          displayName: newName,
        });

        // Update local storage to reflect changes immediately
        user.displayName = newName;
        localStorage.setItem("pomopop-user", JSON.stringify(user));

        // Update UI
        updateProfileUI(user);
        profileName.textContent = newName;

        closeAccountModal();
        alert("Profile updated successfully!");
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
      }
    }
  });

  // Account Icon and Modal Event Listeners
  accountIconBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openAccountModal();
  });

  closeAccountBtn.addEventListener("click", closeAccountModal);
  cancelAccountBtn.addEventListener("click", closeAccountModal);

  // ==================== ABOUT MODAL LOGIC ====================
  const infoBtn = document.getElementById("js-info-btn");
  const aboutBtn = document.getElementById("js-about-btn");
  const aboutModal = document.getElementById("js-about-modal");
  const aboutPomopopModal = document.getElementById(
    "js-about-pomopop-modal",
  );
  const closeAboutBtn = document.getElementById("js-close-about");
  const closeAboutPomopopBtn = document.getElementById(
    "js-close-about-pomopop",
  );

  function openAboutModal() {
    aboutModal.classList.add("open");
  }

  function openAboutPomopopModal() {
    aboutPomopopModal.classList.add("open");
  }

  function closeAboutModal() {
    aboutModal.classList.remove("open");
  }

  function closeAboutPomopopModal() {
    aboutPomopopModal.classList.remove("open");
  }

  // Open About Modal
  infoBtn.addEventListener("click", openAboutModal);
  closeAboutBtn.addEventListener("click", closeAboutModal);
  if (aboutBtn) {
    aboutBtn.addEventListener("click", openAboutPomopopModal);
  }
  if (closeAboutPomopopBtn) {
    closeAboutPomopopBtn.addEventListener("click", closeAboutPomopopModal);
  }

  // ==================== GUEST WARNING MODAL LOGIC ====================
  const guestWarningModal = document.getElementById("js-guest-warning-modal");
  const closeGuestWarningBtn = document.getElementById(
    "js-close-guest-warning",
  );
  const warningLoginBtn = document.getElementById("js-warning-login-btn");
  const statsLoginBtn = document.getElementById("js-stats-login-btn");

  function closeGuestWarning() {
    guestWarningModal.classList.remove("open");
  }

  if (closeGuestWarningBtn) {
    closeGuestWarningBtn.addEventListener("click", closeGuestWarning);
  }

  if (warningLoginBtn) {
    warningLoginBtn.addEventListener("click", () => {
      closeGuestWarning();
      loginModal.classList.add("open");
    });
  }

  // Handle login button in stats modal
  if (statsLoginBtn) {
    statsLoginBtn.addEventListener("click", () => {
      closeStatsModal();
      loginModal.classList.add("open");
    });
  }

  // ==================== VIDEO BACKGROUND LOGIC ====================
  const videoBtn = document.getElementById("js-video-bg-btn");
  const videoModal = document.getElementById("js-video-modal");
  const closeVideoBtn = document.getElementById("js-close-video");
  const bgVideo = document.getElementById("bg-video");
  const videoOptions = document.querySelectorAll(".video-option");

  function openVideoModal() {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      guestWarningModal.classList.add("open");
      return;
    }
    if (onboardingShortcutContext !== "video") {
      clearOnboardingShortcutContext();
    }
    videoModal.classList.add("open");
  }

  // Open Modal
  videoBtn.addEventListener("click", openVideoModal);

  if (onboardingOpenVideo) {
    onboardingOpenVideo.addEventListener("click", () => {
      setOnboardingShortcutContext("video");
      closeOnboardingModal();
      openVideoModal();
    });
  }

  if (onboardingBackVideo) {
    onboardingBackVideo.addEventListener("click", () => {
      videoModal.classList.remove("open");
      clearOnboardingShortcutContext();
      openOnboardingModal();
    });
  }

  // Close Modal
  closeVideoBtn.addEventListener("click", () => {
    videoModal.classList.remove("open");
    clearOnboardingShortcutContext();
  });

  // Handle Video Selection
  videoOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const videoSrc = option.getAttribute("data-video");

      // Remove active class from all options
      videoOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      if (videoSrc === "off") {
        bgVideo.onloadeddata = null; // Cancel any pending load callbacks
        bgVideo.style.display = "none";
        bgVideo.pause();
        document.body.classList.remove("video-active");
      } else {
        // Temporarily show theme color to prevent white flash while loading
        document.body.classList.remove("video-active");

        bgVideo.src = videoSrc;
        bgVideo.style.display = "block";

        // Only make body transparent and play when video is actually ready
        bgVideo.onloadeddata = () => {
          document.body.classList.add("video-active");
          bgVideo.play().catch((e) => console.log("Video play failed:", e));
        };
      }

      // Close modal after selection
      videoModal.classList.remove("open");
    });
  });

  // Timer mode buttons
  document
    .querySelector("#js-mode-buttons")
    .addEventListener("click", handleMode);

  // Main timer button and reset
  document
    .getElementById("js-btn")
    .addEventListener("click", handleMainButtonClick);
  document.getElementById("js-reset-btn").addEventListener("click", resetTimer);
  document.getElementById("js-skip-btn").addEventListener("click", skipBreak);
  document.getElementById("js-skip-btn").addEventListener("click", skipBreak);

  // Close modals AND BURGER MENU on outside click
  window.addEventListener("click", (e) => {
    const settingsModal = document.getElementById("js-settings-modal");
    const musicModal = document.getElementById("js-music-modal");
    const taskModal = document.getElementById("js-task-modal");
    const videoModal = document.getElementById("js-video-modal");
    const onboardingModal = document.getElementById("js-onboarding-modal");
    const aboutPomopopModal = document.getElementById(
      "js-about-pomopop-modal",
    );
    const statsModal = document.getElementById("js-stats-modal");
    const accountModalElem = document.getElementById("js-account-modal");
    // Note: Login modal is NOT closed by outside click

    // Close Burger Menu if click is outside of the menu area
    if (
      !menuDropdown.contains(e.target) &&
      e.target !== menuToggleBtn &&
      !menuToggleBtn.contains(e.target) &&
      e.target !== accountIconBtn &&
      !accountIconBtn.contains(e.target)
    ) {
      closeBurgerMenu();
    }

    // Close Modals
    if (e.target === settingsModal) {
      closeSettingsModal();
      clearOnboardingShortcutContext();
    }
    if (e.target === musicModal) {
      closeMusicModal();
      clearOnboardingShortcutContext();
    }
    if (e.target === taskModal) {
      closeTaskModal();
      clearOnboardingShortcutContext();
    }
    if (e.target === videoModal) {
      videoModal.classList.remove("open");
      clearOnboardingShortcutContext();
    }
    if (e.target === onboardingModal) {
      closeOnboardingModal();
    }
    if (e.target === aboutModal) {
      closeAboutModal();
    }
    if (e.target === aboutPomopopModal) {
      closeAboutPomopopModal();
    }
    if (e.target === statsModal) {
      closeStatsModal();
    }
    if (e.target === accountModalElem) {
      closeAccountModal();
    }
    if (e.target === guestWarningModal) {
      closeGuestWarning();
    }
  });

  // Notification permission
  if ("Notification" in window) {
    if (
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission().then(function (permission) {
        if (permission === "granted") {
          new Notification(
            "Awesome! You will be notified at the start of each session",
          );
        }
      });
    }
  }

  // Initial setup: switch to pomodoro mode and update clock
  switchMode(timer.mode);
  maybeOpenOnboardingModal();
});
