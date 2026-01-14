// app.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth } from "./firebase-config-loader.js";
import {
  loadSettings,
  openSettingsModal,
  closeSettingsModal,
  saveSettings,
  fetchUserSettings,
  stopSettingsListener,
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
    modal.classList.contains("open")
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
  } else {
    userProfile.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    profilePic.src = user.photoURL;
    profileName.textContent = user.displayName;
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
document.addEventListener("DOMContentLoaded", () => {
  // Load settings and tasks
  loadSettings();
  updateTaskNameDisplay();

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
  document.getElementById("js-music-play").addEventListener("click", playMusic);
  document.getElementById("js-music-stop").addEventListener("click", stopMusic);
  document
    .getElementById("js-music-select")
    .addEventListener("change", playMusic); // Auto-play when a new track is selected
  document
    .getElementById("js-volume")
    .addEventListener("input", handleVolumeChange);

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

  // ==================== ABOUT MODAL LOGIC ====================
  const infoBtn = document.getElementById("js-info-btn");
  const aboutModal = document.getElementById("js-about-modal");

  function openAboutModal() {
    aboutModal.classList.add("open");
  }

  function closeAboutModal() {
    aboutModal.classList.remove("open");
  }

  // Open About Modal
  infoBtn.addEventListener("click", openAboutModal);

  // ==================== VIDEO BACKGROUND LOGIC ====================
  const videoBtn = document.getElementById("js-video-bg-btn");
  const videoModal = document.getElementById("js-video-modal");
  const closeVideoBtn = document.getElementById("js-close-video");
  const bgVideo = document.getElementById("bg-video");
  const videoOptions = document.querySelectorAll(".video-option");

  // Open Modal
  videoBtn.addEventListener("click", () => {
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
        bgVideo.style.display = "none";
        bgVideo.pause();
        document.body.classList.remove("video-active");
      } else {
        bgVideo.src = videoSrc;
        bgVideo.style.display = "block";
        document.body.classList.add("video-active");
        bgVideo.play().catch((e) => console.log("Video play failed:", e));
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
    // Note: Login modal is NOT closed by outside click

    // Close Burger Menu if click is outside of the menu area
    if (
      !menuDropdown.contains(e.target) &&
      e.target !== menuToggleBtn &&
      !menuToggleBtn.contains(e.target)
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
            "Awesome! You will be notified at the start of each session"
          );
        }
      });
    }
  }

  // Initial setup: switch to pomodoro mode and update clock
  switchMode(timer.mode);
});
