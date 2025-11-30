const timer = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  sessions: 0,
};

let interval;
let currentTaskId = null;

// ==================== TASK SYSTEM ====================
const tasks = [];
let nextTaskId = 1;

function loadTasks() {
  const saved = localStorage.getItem("pomodoroTasks");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      tasks.length = 0;
      tasks.push(...parsed.tasks);
      nextTaskId = parsed.nextTaskId || 1;
      renderTasks();
    } catch (e) {
      console.error("Error loading tasks:", e);
    }
  }
}

function saveTasks() {
  localStorage.setItem("pomodoroTasks", JSON.stringify({ tasks, nextTaskId }));
}

function addTask() {
  const nameInput = document.getElementById("js-task-name");
  const pomodorosInput = document.getElementById("js-task-pomodoros");

  const name = nameInput.value.trim();
  const pomodoros = parseInt(pomodorosInput.value) || 1;

  if (!name) {
    alert("Please enter a task name");
    return;
  }

  if (pomodoros < 1) {
    alert("Please enter at least 1 pomodoro");
    return;
  }

  const task = {
    id: nextTaskId++,
    name,
    estimatedPomodoros: pomodoros,
    completedPomodoros: 0,
    completed: false,
  };

  tasks.push(task);
  saveTasks();
  renderTasks();

  nameInput.value = "";
  pomodorosInput.value = "1";
}

function deleteTask(taskId) {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index > -1) {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }
}

function completeTask(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
    // If completing a task, deselect it
    if (task.completed && currentTaskId === taskId) {
      setCurrentTask(null);
    }
  }
}

// ==================== CURRENT TASK SELECTION ====================
function setCurrentTask(taskId) {
  currentTaskId = taskId;
  updateTaskNameDisplay();
  saveTasks();
  renderTasks();
}

function getCurrentTask() {
  if (currentTaskId === null) return null;
  return tasks.find((t) => t.id === currentTaskId);
}

function updateTaskNameDisplay() {
  const display = document.getElementById("js-task-name-display");
  const task = getCurrentTask();
  if (task && !task.completed) {
    display.textContent = `📌 ${escapeHtml(task.name)}`;
    display.style.color = "rgba(255, 255, 255, 0.9)";
  } else {
    display.textContent = "No task selected";
    display.style.color = "rgba(255, 255, 255, 0.6)";
  }
}

function clearCurrentTask() {
  currentTaskId = null;
  updateTaskNameDisplay();
}

function editTask(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const newName = prompt("Edit task name:", task.name);
  if (newName === null) return;

  const newPomodoros = prompt(
    "Edit estimated pomodoros:",
    task.estimatedPomodoros
  );
  if (newPomodoros === null) return;

  const pomodoros = parseInt(newPomodoros);
  if (pomodoros < 1) {
    alert("Please enter at least 1 pomodoro");
    return;
  }

  task.name = newName.trim();
  task.estimatedPomodoros = pomodoros;
  saveTasks();
  renderTasks();
}

function updateTaskProgress() {
  const task = getCurrentTask();
  if (task && !task.completed) {
    task.completedPomodoros++;
    if (task.completedPomodoros >= task.estimatedPomodoros) {
      task.completed = true;
      setCurrentTask(null);
    }
    saveTasks();
    renderTasks();
  }
}

function renderTasks() {
  const tasksList = document.getElementById("js-tasks-list");
  const taskSection = document.getElementById("js-tasks-list").parentElement;
  tasksList.innerHTML = "";

  tasks.forEach((task) => {
    const taskItem = document.createElement("div");
    const isSelected = currentTaskId === task.id && !task.completed;
    taskItem.className = `task-item ${task.completed ? "completed" : ""} ${
      isSelected ? "selected" : ""
    }`;
    taskItem.innerHTML = `
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-progress">${task.completedPomodoros}/${
      task.estimatedPomodoros
    }</div>
      </div>
      <div class="task-controls">
        <button class="task-button task-complete" data-id="${
          task.id
        }">✓</button>
        <button class="task-button task-edit" data-id="${task.id}">Edit</button>
        <button class="task-button task-delete" data-id="${task.id}">×</button>
      </div>
    `;

    const completeBtn = taskItem.querySelector(".task-complete");
    const editBtn = taskItem.querySelector(".task-edit");
    const deleteBtn = taskItem.querySelector(".task-delete");
    const taskInfo = taskItem.querySelector(".task-info");

    completeBtn.addEventListener("click", () => completeTask(task.id));
    editBtn.addEventListener("click", () => editTask(task.id));
    deleteBtn.addEventListener("click", () => deleteTask(task.id));
    taskInfo.addEventListener("click", () => {
      if (!task.completed) {
        setCurrentTask(currentTaskId === task.id ? null : task.id);
      }
    });

    tasksList.appendChild(taskItem);
  });

  // Update task name display
  updateTaskNameDisplay();

  // Scroll to bottom of task list when tasks are rendered
  setTimeout(() => {
    taskSection.scrollTop = taskSection.scrollHeight;
  }, 0);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== SETTINGS ====================
function loadSettings() {
  const saved = localStorage.getItem("pomodoroSettings");
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      timer.pomodoro = settings.pomodoro || 25;
      timer.shortBreak = settings.shortBreak || 5;
      timer.longBreak = settings.longBreak || 15;
      timer.longBreakInterval = settings.longBreakInterval || 4;

      document.getElementById("js-pomodoro-duration").value = timer.pomodoro;
      document.getElementById("js-short-break-duration").value =
        timer.shortBreak;
      document.getElementById("js-long-break-duration").value = timer.longBreak;
      document.getElementById("js-long-break-interval").value =
        timer.longBreakInterval;
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }
}

function saveSettings() {
  const pomodoro =
    parseInt(document.getElementById("js-pomodoro-duration").value) || 25;
  const shortBreak =
    parseInt(document.getElementById("js-short-break-duration").value) || 5;
  const longBreak =
    parseInt(document.getElementById("js-long-break-duration").value) || 15;
  const longBreakInterval =
    parseInt(document.getElementById("js-long-break-interval").value) || 4;

  timer.pomodoro = pomodoro;
  timer.shortBreak = shortBreak;
  timer.longBreak = longBreak;
  timer.longBreakInterval = longBreakInterval;

  localStorage.setItem(
    "pomodoroSettings",
    JSON.stringify({
      pomodoro,
      shortBreak,
      longBreak,
      longBreakInterval,
    })
  );

  closeSettingsModal();
  switchMode("pomodoro");
}

function openSettingsModal() {
  const modal = document.getElementById("js-settings-modal");
  modal.classList.add("open");
}

function closeSettingsModal() {
  const modal = document.getElementById("js-settings-modal");
  modal.classList.remove("open");
}

// ==================== MUSIC SYSTEM ====================
const musicPlayer = document.getElementById("js-music-player");
const musicTracks = {
  lofi: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  ambient: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  classical: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  jazz: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  nature: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
};

function playMusic() {
  const select = document.getElementById("js-music-select");
  const trackId = select.value;

  if (!trackId) {
    musicPlayer.pause();
    return;
  }

  const trackUrl = musicTracks[trackId];
  if (trackUrl) {
    musicPlayer.src = trackUrl;
    musicPlayer.play();
  }
}

function pauseMusic() {
  musicPlayer.pause();
}

function stopMusic() {
  musicPlayer.pause();
  musicPlayer.currentTime = 0;
}

function openMusicModal() {
  const modal = document.getElementById("js-music-modal");
  modal.classList.add("open");
}

function closeMusicModal() {
  const modal = document.getElementById("js-music-modal");
  modal.classList.remove("open");
}

// ==================== TIMER ====================
const buttonSound = new Audio("button-sound.mp3");
const mainButton = document.getElementById("js-btn");
mainButton.addEventListener("click", () => {
  buttonSound.play();
  const { action } = mainButton.dataset;
  if (action === "start") {
    startTimer();
  } else {
    stopTimer();
  }
});

const modeButtons = document.querySelector("#js-mode-buttons");
modeButtons.addEventListener("click", handleMode);

function getRemainingTime(endTime) {
  const currentTime = Date.parse(new Date());
  const difference = endTime - currentTime;

  const total = Number.parseInt(difference / 1000, 10);
  const minutes = Number.parseInt((total / 60) % 60, 10);
  const seconds = Number.parseInt(total % 60, 10);

  return {
    total,
    minutes,
    seconds,
  };
}

function startTimer() {
  let { total } = timer.remainingTime;
  const endTime = Date.parse(new Date()) + total * 1000;

  if (timer.mode === "pomodoro") timer.sessions++;

  mainButton.dataset.action = "pause";
  mainButton.textContent = "pause";
  mainButton.classList.add("active");

  interval = setInterval(function () {
    timer.remainingTime = getRemainingTime(endTime);
    updateClock();

    total = timer.remainingTime.total;
    if (total <= 0) {
      clearInterval(interval);

      // Update task progress when pomodoro completes
      if (timer.mode === "pomodoro") {
        updateTaskProgress();
      }

      switch (timer.mode) {
        case "pomodoro":
          if (timer.sessions % timer.longBreakInterval === 0) {
            switchMode("longBreak");
          } else {
            switchMode("shortBreak");
          }
          break;
        default:
          switchMode("pomodoro");
      }

      if (Notification.permission === "granted") {
        const text =
          timer.mode === "pomodoro" ? "Get back to work!" : "Take a break!";
        new Notification(text);
      }

      document.querySelector(`[data-sound="${timer.mode}"]`).play();

      startTimer();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(interval);

  mainButton.dataset.action = "start";
  mainButton.textContent = "start";
  mainButton.classList.remove("active");
}

function updateClock() {
  const { remainingTime } = timer;
  const minutes = `${remainingTime.minutes}`.padStart(2, "0");
  const seconds = `${remainingTime.seconds}`.padStart(2, "0");

  const min = document.getElementById("js-minutes");
  const sec = document.getElementById("js-seconds");
  min.textContent = minutes;
  sec.textContent = seconds;

  const text =
    timer.mode === "pomodoro" ? "Get back to work!" : "Take a break!";
  document.title = `${minutes}:${seconds} — ${text}`;

  const progress = document.getElementById("js-progress");
  progress.value = timer[timer.mode] * 60 - timer.remainingTime.total;
}

function switchMode(mode) {
  timer.mode = mode;
  timer.remainingTime = {
    total: timer[mode] * 60,
    minutes: timer[mode],
    seconds: 0,
  };

  document
    .querySelectorAll("button[data-mode]")
    .forEach((e) => e.classList.remove("active"));
  document.querySelector(`[data-mode="${mode}"]`).classList.add("active");
  document.body.style.backgroundColor = `var(--${mode})`;
  document
    .getElementById("js-progress")
    .setAttribute("max", timer.remainingTime.total);

  updateClock();
}

function handleMode(event) {
  const { mode } = event.target.dataset;

  if (!mode) return;

  switchMode(mode);
  stopTimer();
}

// ==================== TASK SIDEBAR TOGGLE ====================
function toggleTaskSection() {
  const taskSection = document.getElementById("js-task-section");
  taskSection.classList.toggle("hidden");
}

function showTaskSection() {
  const taskSection = document.getElementById("js-task-section");
  taskSection.classList.remove("hidden");
}

function hideTaskSection() {
  const taskSection = document.getElementById("js-task-section");
  taskSection.classList.add("hidden");
}

// ==================== TIMER CONTROL BUTTONS ====================
function resetTimer() {
  const btn = document.getElementById("js-btn");

  // Stop timer if running
  if (btn.textContent.toUpperCase() === "STOP") {
    stopTimer();
  }

  // Reset to current mode's full duration
  const mode = timer.mode;
  switchMode(mode);

  // Show notification
  showNotification("Timer reset to " + timer[mode] + " minutes");
}

function showNotification(message) {
  // Create temporary notification
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 2000;
    animation: slideDown 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Remove after 2 seconds
  setTimeout(() => {
    notification.style.animation = "slideUp 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// ==================== EVENT LISTENERS ====================
document.addEventListener("DOMContentLoaded", () => {
  // Load settings and tasks
  loadSettings();
  loadTasks();
  updateTaskNameDisplay();
  document
    .getElementById("js-music-btn")
    .addEventListener("click", openMusicModal);
  document
    .getElementById("js-close-music")
    .addEventListener("click", closeMusicModal);
  document.getElementById("js-music-play").addEventListener("click", playMusic);
  document.getElementById("js-music-stop").addEventListener("click", stopMusic);

  // Volume control
  document.getElementById("js-volume").addEventListener("input", (e) => {
    musicPlayer.volume = e.target.value / 100;
  });

  // Task toggle button
  document
    .getElementById("js-tasks-toggle-btn")
    .addEventListener("click", toggleTaskSection);

  // Task system
  document.getElementById("js-add-task").addEventListener("click", addTask);
  document.getElementById("js-task-name").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
  });
  document
    .getElementById("js-task-pomodoros")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTask();
    });

  // Timer control buttons
  document.getElementById("js-reset-btn").addEventListener("click", resetTimer);

  // Close modals on outside click
  window.addEventListener("click", (e) => {
    const settingsModal = document.getElementById("js-settings-modal");
    const musicModal = document.getElementById("js-music-modal");
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
    if (e.target === musicModal) {
      closeMusicModal();
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

  switchMode("pomodoro");
});
