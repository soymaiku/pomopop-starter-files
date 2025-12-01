// tasks.js
import {
  tasks,
  nextTaskId,
  currentTaskId,
  setNextTaskId,
  setCurrentTaskId,
} from "./config.js";
import { switchMode, stopTimer } from "./timer.js";
import { escapeHtml } from "./utils.js";

// ==================== LOCAL STORAGE AND CORE TASK LOGIC ====================
export function loadTasks() {
  const saved = localStorage.getItem("pomodoroTasks");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      tasks.length = 0;
      tasks.push(...parsed.tasks);
      setNextTaskId(parsed.nextTaskId || 1);
      setCurrentTaskId(parsed.currentTaskId || null); // Load current task ID
      renderTasks();
    } catch (e) {
      console.error("Error loading tasks:", e);
    }
  }
}

// FIX/IMPROVEMENT: Now saves currentTaskId to persist selected task
export function saveTasks() {
  localStorage.setItem(
    "pomodoroTasks",
    JSON.stringify({ tasks, nextTaskId, currentTaskId })
  );
}

export function addTask() {
  const nameInput = document.getElementById("js-task-name");
  const pomodorosInput = document.getElementById("js-task-pomodoros");

  const name = nameInput.value.trim();
  const pomodoros = parseInt(pomodorosInput.value) || 1;

  if (!name) {
    alert("Please enter a task name");
    return;
  }

  if (pomodoros < 1 || isNaN(pomodoros)) {
    alert("Please enter at least 1 pomodoro");
    return;
  }

  const task = {
    id: nextTaskId,
    name,
    estimatedPomodoros: pomodoros,
    completedPomodoros: 0,
    completed: false,
  };

  setNextTaskId(nextTaskId + 1);
  tasks.push(task);
  saveTasks();
  renderTasks();

  nameInput.value = "";
  pomodorosInput.value = "1";
}

export function deleteTask(taskId) {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index > -1) {
    // If the deleted task was the current one, deselect it
    if (currentTaskId === taskId) {
      setCurrentTask(null);
    }
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }
}

export function completeTask(taskId) {
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

export function editTask(taskId) {
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
  if (pomodoros < 1 || isNaN(pomodoros)) {
    alert("Please enter a valid number of at least 1 pomodoro");
    return;
  }

  task.name = newName.trim();
  task.estimatedPomodoros = pomodoros;
  saveTasks();
  renderTasks();
  updateTaskNameDisplay();
}

// ==================== TASK PROGRESS AND DISPLAY ====================
export function updateTaskProgress() {
  const task = getCurrentTask();
  if (task && !task.completed) {
    task.completedPomodoros++;
    if (task.completedPomodoros >= task.estimatedPomodoros) {
      task.completed = true;
      setCurrentTask(null); // Deselect when complete
    }
    saveTasks();
    renderTasks();
  }
}

export function setCurrentTask(taskId) {
  setCurrentTaskId(taskId);
  updateTaskNameDisplay();
  saveTasks();
  renderTasks();
}

export function getCurrentTask() {
  if (currentTaskId === null) return null;
  return tasks.find((t) => t.id === currentTaskId);
}

export function updateTaskNameDisplay() {
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

// ==================== UI RENDERING AND MODAL LOGIC ====================
export function renderTasks() {
  const tasksList = document.getElementById("js-tasks-list");
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
    // Stop propagation for edit/delete to prevent task selection
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      editTask(task.id);
    });
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });
    taskInfo.addEventListener("click", () => {
      if (!task.completed) {
        // Toggle selection
        setCurrentTask(currentTaskId === task.id ? null : task.id);
      }
    });

    tasksList.appendChild(taskItem);
  });

  updateTaskNameDisplay();
}

/**
 * Explicitly opens the task modal.
 */
export function openTaskModal() {
  const taskModal = document.getElementById("js-task-modal");
  taskModal.classList.add("open");
  renderTasks();
}

/**
 * Explicitly closes the task modal.
 */
export function closeTaskModal() {
  const taskModal = document.getElementById("js-task-modal");
  taskModal.classList.remove("open");
}

/**
 * Toggles the visibility of the task modal.
 * This is the function connected to the '📋 Tasks' button.
 */
export function toggleTaskSection() {
  const taskModal = document.getElementById("js-task-modal");
  if (taskModal.classList.contains("open")) {
    closeTaskModal();
  } else {
    openTaskModal();
  }
}
