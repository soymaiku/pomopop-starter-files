// tasks.js
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db, auth } from "./firebase-config-loader.js";
import {
  tasks,
  nextTaskId,
  currentTaskId,
  setNextTaskId,
  setCurrentTaskId,
  interval,
  timer,
} from "./config.js";
import { switchMode, stopTimer, updateIntervalDisplay } from "./timer.js";
import { escapeHtml, showNotification, showToast } from "./utils.js";
import { getCurrentUser } from "./stats.js";

/* ==================== LOAD & SAVE ==================== */

export function loadTasks() {
  const saved = localStorage.getItem("pomodoroTasks");
  if (saved) {
    const parsed = JSON.parse(saved);
    tasks.length = 0;
    tasks.push(...parsed.tasks);
    setNextTaskId(parsed.nextTaskId || 1);
    setCurrentTaskId(parsed.currentTaskId ?? null);
    renderTasks();
  }
}

let unsubscribeTasks = null;

export function fetchUserTasks(userId) {
  if (unsubscribeTasks) unsubscribeTasks(); // Stop any previous listener

  const docRef = doc(db, "users", userId);
  unsubscribeTasks = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        tasks.length = 0;
        if (data.tasks) tasks.push(...data.tasks);
        setNextTaskId(data.nextTaskId || 1);
        setCurrentTaskId(data.currentTaskId ?? null);
      } else {
        // New user or no data found, clear state
        clearTasks();
      }
      renderTasks();
    },
    (error) => {
      console.error("Error listening to user tasks:", error);
    },
  );
}

export function stopTasksListener() {
  if (unsubscribeTasks) {
    unsubscribeTasks();
    unsubscribeTasks = null;
  }
}

export async function saveUserTasks(userId, data) {
  try {
    await setDoc(doc(db, "users", userId), data, { merge: true });
  } catch (error) {
    console.error("Error saving user tasks:", error);
  }
}

export function clearTasks() {
  tasks.length = 0;
  setNextTaskId(1);
  setCurrentTaskId(null);
  renderTasks();
}

export function saveTasks() {
  const user = auth.currentUser;
  const localUser = getCurrentUser();

  if (user || (localUser && !localUser.isGuest)) {
    saveUserTasks(user ? user.uid : localUser.uid, {
      tasks,
      nextTaskId,
      currentTaskId,
    });
  } else {
    localStorage.setItem(
      "pomodoroTasks",
      JSON.stringify({ tasks, nextTaskId, currentTaskId }),
    );
  }
}

/* ==================== TASK ACTIONS ==================== */

export function addTask() {
  const nameInput = document.getElementById("js-task-name");
  const pomosInput = document.getElementById("js-task-pomodoros");

  const name = nameInput.value.trim();
  const pomodoros = Math.max(1, Number(pomosInput.value) || 1);

  if (!name) {
    showToast("Please enter a task name", "warning");
    return;
  }

  tasks.push({
    id: nextTaskId,
    name,
    pomodoros,
    completedPomodoros: 0,
    completed: false,
    editing: false,
  });

  setNextTaskId(nextTaskId + 1);
  nameInput.value = "";
  pomosInput.value = 1;

  saveTasks();
  renderTasks();
}

export function deleteTask(id) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    if (currentTaskId === id) setCurrentTask(null);
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }
}

export function completeTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  if (task.completed && currentTaskId === id) {
    setCurrentTask(null);
  }

  saveTasks();
  renderTasks();
}

export function updateTaskProgress() {
  const task = tasks.find((t) => t.id === currentTaskId);
  if (!task) return;

  task.completedPomodoros++;
  updateIntervalDisplay();
  saveTasks();
  renderTasks();
}

/* ==================== CURRENT TASK ==================== */

export function setCurrentTask(id) {
  stopTimer();
  setCurrentTaskId(id);
  switchMode("pomodoro");
  updateIntervalDisplay();
  saveTasks();
  renderTasks();
}

export function getCurrentTask() {
  return tasks.find((t) => t.id === currentTaskId) || null;
}

export function updateTaskNameDisplay() {
  const el = document.getElementById("js-task-name-display");
  const task = getCurrentTask();
  el.textContent = task ? `Current: ${task.name}` : "No task selected";
}

/* ==================== RENDER ==================== */

function getTaskHtml(task) {
  return `
    <div class="task-item ${currentTaskId === task.id ? "selected" : ""} ${
      task.completed ? "completed" : ""
    }">
      <div class="task-info">
        ${
          task.editing
            ? `
          <input class="task-edit-name" value="${escapeHtml(task.name)}">
          <input class="task-edit-pomos" type="number" min="1" value="${
            task.pomodoros
          }">
        `
            : `
          <div class="task-name">${escapeHtml(task.name)}</div>
          <div class="task-progress">${task.completedPomodoros} / ${
            task.pomodoros
          } Pomodoros</div>
        `
        }
      </div>

      <div class="task-controls">
        ${
          task.editing
            ? `<button class="task-btn save">Save</button>`
            : `<button class="task-btn edit">Edit</button>
        <button class="task-btn done">${
          task.completed ? "Undo" : "Done"
        }</button>`
        }
        <button class="task-btn delete">✕</button>
      </div>
    </div>
  `;
}

export function renderTasks() {
  const list = document.getElementById("js-tasks-list");
  list.innerHTML = "";

  tasks.forEach((task) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = getTaskHtml(task);
    const el = wrapper.firstElementChild;

    el.querySelector(".task-info")?.addEventListener("click", () => {
      if (!task.completed && !task.editing) {
        setCurrentTask(currentTaskId === task.id ? null : task.id);
      }
    });

    el.querySelector(".edit")?.addEventListener("click", () => {
      task.editing = true;
      renderTasks();
    });

    el.querySelector(".save")?.addEventListener("click", () => {
      task.name = el.querySelector(".task-edit-name").value.trim() || task.name;
      task.pomodoros = Math.max(
        1,
        Number(el.querySelector(".task-edit-pomos").value) || task.pomodoros,
      );
      task.editing = false;
      saveTasks();
      renderTasks();
    });

    el.querySelector(".done")?.addEventListener("click", (e) => {
      e.stopPropagation();
      completeTask(task.id);
    });

    el.querySelector(".delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });

    list.appendChild(el);
  });

  updateTaskNameDisplay();
}

/* ==================== MODAL ==================== */

export function openTaskModal() {
  document.getElementById("js-task-modal").classList.add("open");
  renderTasks();
}

export function closeTaskModal() {
  document.getElementById("js-task-modal").classList.remove("open");
}
