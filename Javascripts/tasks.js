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
  taskAwaitingCompletion,
  setTaskAwaitingCompletion,
  inFinalPomodoro,
  setInFinalPomodoro,
} from "./config.js";
import { switchMode, stopTimer, updateIntervalDisplay } from "./timer.js";
import { escapeHtml, showNotification } from "./utils.js";
import { getCurrentUser, handleTaskEstimateEdit, recordPomodoroCompletion } from "./stats.js";

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
  if (!db) {
    console.warn("⚠️ Firebase not initialized, skipping task sync");
    return;
  }

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
      // Continue with local tasks if Firebase fails
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
    if (!db) {
      console.warn(
        "⚠️ Firebase not initialized, saving to localStorage instead",
      );
      localStorage.setItem("pomodoroTasks", JSON.stringify(data));
      return;
    }

    await setDoc(doc(db, "users", userId), data, { merge: true });
  } catch (error) {
    console.error("Error saving user tasks:", error);
    // Fallback to localStorage
    localStorage.setItem("pomodoroTasks", JSON.stringify(data));
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

const minimumPomodoroTimers = new WeakMap();

function enforceMinimumPomodoros(input) {
  if (!input) return 2;
  if (input.value === "") return 2;

  const rawPomodoros = Number(input.value);
  if (!Number.isFinite(rawPomodoros) || rawPomodoros < 2) {
    showNotification("⚠️ Est. Pomodoros must be 2 or more");
    input.value = 2;
    return 2;
  }

  return rawPomodoros;
}

function scheduleMinimumPomodorosCheck(input) {
  if (!input) return;
  const existingTimer = minimumPomodoroTimers.get(input);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    if (input.value === "") return;
    if (Number(input.value) < 2) {
      enforceMinimumPomodoros(input);
    }
  }, 300);

  minimumPomodoroTimers.set(input, timer);
}

/* ==================== TASK ACTIONS ==================== */

export function addTask() {
  const nameInput = document.getElementById("js-task-name");
  const pomosInput = document.getElementById("js-task-pomodoros");

  const name = nameInput.value.trim();
  const rawPomodoros = Number(pomosInput.value);
  if (!Number.isFinite(rawPomodoros) || rawPomodoros < 2) {
    showNotification("⚠️ Est. Pomodoros must be 2 or more");
    pomosInput.value = 2;
    return;
  }
  const pomodoros = Math.max(2, enforceMinimumPomodoros(pomosInput));

  if (!name) {
    alert("Please enter a task name");
    return;
  }

  const newTaskId = nextTaskId;
  tasks.push({
    id: newTaskId,
    name,
    pomodoros,
    completedPomodoros: 0,
    completed: false,
    editing: false,
  });

  setNextTaskId(nextTaskId + 1);
  nameInput.value = "";
  pomosInput.value = 2;

  // Reset timer sessions and intervals when adding a new task
  timer.sessions = 0;
  timer.pomodorosSinceLongBreak = 0;
  setInFinalPomodoro(false);

  setCurrentTask(newTaskId);
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
  if (!task) return false;

  task.completedPomodoros++;
  
  // Check if task has reached its estimated pomodoros
  if (task.completedPomodoros >= task.pomodoros) {
    // Record completion for stats
    recordPomodoroCompletion(task, timer.pomodoro);
    
    // Mark task as awaiting completion after break
    setTaskAwaitingCompletion(task.id);
    showNotification(`🎉 One more Session for "${task.name}" before completing! Take your break.`);
    
    updateIntervalDisplay();
    saveTasks();
    renderTasks();
    return false; // Continue to break
  }
  
  updateIntervalDisplay();
  saveTasks();
  renderTasks();
  return false; // Task not completed, continue timer cycle
}

/* ==================== TASK COMPLETION ==================== */

export function completeTaskAfterBreak() {
  if (!taskAwaitingCompletion) return;
  
  const task = tasks.find((t) => t.id === taskAwaitingCompletion);
  if (!task) {
    setTaskAwaitingCompletion(null);
    setInFinalPomodoro(false);
    return;
  }
  
  // Mark task as complete
  task.completed = true;
  showNotification(`✅ Task "${task.name}" finished! Select a new task to continue.`);
  
  // Deselect current task (don't auto-switch)
  setCurrentTaskId(null);
  setTaskAwaitingCompletion(null);
  setInFinalPomodoro(false);
  
  saveTasks();
  renderTasks();
  updateTaskNameDisplay();
  
  // Switch to pomodoro mode for next task
  switchMode("pomodoro");
}

/* ==================== CURRENT TASK ==================== */

export function setCurrentTask(id) {
  stopTimer();
  setCurrentTaskId(id);
  setInFinalPomodoro(false); // Clear final pomodoro state when switching tasks
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
          <input class="task-edit-pomos" type="number" inputmode="numeric" pattern="[0-9]*" min="2" value="${
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
            ? `<button class="task-btn save">Save</button>
        <button class="task-btn cancel">Cancel</button>`
            : `<button class="task-btn edit">Edit</button>
        <button class="task-btn done hidden">${
          task.completed ? "Undo" : "Done"
        }</button>
        <button class="task-btn delete">Delete</button>`
        }
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
      if (!task.completed) {
        task.editing = true;
        renderTasks();
      }
    });

    if (task.editing) {
      const editPomosInput = el.querySelector(".task-edit-pomos");
      editPomosInput?.addEventListener("input", () => {
        scheduleMinimumPomodorosCheck(editPomosInput);
      });
      editPomosInput?.addEventListener("change", () => {
        enforceMinimumPomodoros(editPomosInput);
      });
    }

    el.querySelector(".save")?.addEventListener("click", () => {
      task.name = el.querySelector(".task-edit-name").value.trim() || task.name;
      const pomosInput = el.querySelector(".task-edit-pomos");
      const rawPomodoros = Number(pomosInput.value);
      if (!Number.isFinite(rawPomodoros) || rawPomodoros < 2) {
        showNotification("⚠️ Est. Pomodoros must be 2 or more");
        pomosInput.value = 2;
        return;
      }
      task.pomodoros = Math.max(2, enforceMinimumPomodoros(pomosInput));
      task.editing = false;
      if (currentTaskId === task.id) {
        updateIntervalDisplay();
      }
      handleTaskEstimateEdit(task);
      saveTasks();
      renderTasks();
    });

    el.querySelector(".done")?.addEventListener("click", (e) => {
      e.stopPropagation();
      completeTask(task.id);
    });

    el.querySelector(".cancel")?.addEventListener("click", () => {
      task.editing = false;
      renderTasks();
    });

    el.querySelector(".delete")?.addEventListener("click", (e) => {
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

/**
 * Setup task pomodoro input validation to only allow numbers
 */
export function setupTaskInputValidation() {
  const pomosInput = document.getElementById("js-task-pomodoros");

  if (!pomosInput) return;

  // Block non-numeric characters (e, E, ., +, -) from number input
  pomosInput.addEventListener("keydown", (e) => {
    if (["e", "E", ".", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  });

  pomosInput.addEventListener("input", () => {
    scheduleMinimumPomodorosCheck(pomosInput);
  });

  pomosInput.addEventListener("change", () => {
    enforceMinimumPomodoros(pomosInput);
  });

  // Prevent paste of invalid characters
  pomosInput.addEventListener("paste", (e) => {
    const pastedData = e.clipboardData.getData("text");
    if (!/^\d+$/.test(pastedData)) {
      e.preventDefault();
    }
  });
}
