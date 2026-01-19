// app.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
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
  }
  checkAuth();
}

// ==================== EVENT LISTENERS ====================
document.addEventListener("DOMContentLoaded", async () => {
  applyCustomFont();
  // Wait for Firebase to initialize before proceeding
  await waitForFirebase();
  // Load settings and tasks
  loadSettings();
  updateTaskNameDisplay();
  setupDurationValidation(); // Setup Pomodoro duration validation
  setupTaskInputValidation(); // Setup task pomodoro input validation

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
  onAuthStateChanged(auth, (user) => {
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
    }
  });

  // --- BURGER MENU HANDLERS ---
  menuToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent document click listener from immediately closing it
    toggleBurgerMenu();
  });

  // Header Buttons are now dropdown buttons
  document.getElementById("js-settings-btn").addEventListener("click", () => {
    openSettingsModal();
    closeBurgerMenu();
  });
  document.getElementById("js-music-btn").addEventListener("click", () => {
    openMusicModal();
    closeBurgerMenu();
  });
  document
    .getElementById("js-tasks-toggle-btn")
    .addEventListener("click", () => {
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
    .addEventListener("click", closeSettingsModal);
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
    .addEventListener("click", closeMusicModal);
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
    .addEventListener("click", closeTaskModal);
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
  const aboutModal = document.getElementById("js-about-modal");
  const closeAboutBtn = document.getElementById("js-close-about");

  function openAboutModal() {
    aboutModal.classList.add("open");
  }

  function closeAboutModal() {
    aboutModal.classList.remove("open");
  }

  // Open About Modal
  infoBtn.addEventListener("click", openAboutModal);
  closeAboutBtn.addEventListener("click", closeAboutModal);

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

  // Open Modal
  videoBtn.addEventListener("click", () => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      guestWarningModal.classList.add("open");
      return;
    }
    videoModal.classList.add("open");
  });

  // Close Modal
  closeVideoBtn.addEventListener("click", () => {
    videoModal.classList.remove("open");
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

  // Close modals AND BURGER MENU on outside click
  window.addEventListener("click", (e) => {
    const settingsModal = document.getElementById("js-settings-modal");
    const musicModal = document.getElementById("js-music-modal");
    const taskModal = document.getElementById("js-task-modal");
    const videoModal = document.getElementById("js-video-modal");
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
    }
    if (e.target === musicModal) {
      closeMusicModal();
    }
    if (e.target === taskModal) {
      closeTaskModal();
    }
    if (e.target === videoModal) {
      videoModal.classList.remove("open");
    }
    if (e.target === aboutModal) {
      closeAboutModal();
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
});
