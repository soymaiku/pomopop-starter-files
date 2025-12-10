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
    alert("Please enter a task name.");
    return;
  }
  if (pomodoros < 1) {
    alert("Estimated pomodoros must be at least 1.");
    return;
  }

  const newTask = {
    id: nextTaskId,
    name: name,
    pomodoros: pomodoros,
    completedPomodoros: 0,
    completed: false,
  };
  tasks.push(newTask);
  setNextTaskId(nextTaskId + 1);

  // Clear inputs
  nameInput.value = "";
  pomodorosInput.value = 1;

  saveTasks();
  renderTasks();

  // If no task is currently selected, select the new one automatically
  if (currentTaskId === null) {
    setCurrentTask(newTask.id);
  }
}

export function deleteTask(taskId) {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index !== -1) {
    tasks.splice(index, 1);
    // If the deleted task was the current task, deselect it
    if (currentTaskId === taskId) {
      setCurrentTask(null);
    }
    saveTasks();
    renderTasks();
  }
}

export function completeTask(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    if (task.completed && currentTaskId === taskId) {
      setCurrentTask(null);
    }
    saveTasks();
    renderTasks();
  }
}

export function updateTaskProgress() {
  const task = tasks.find((t) => t.id === currentTaskId);
  if (task) {
    task.completedPomodoros++;
    saveTasks();
    renderTasks();
  }
}

export function getCurrentTask() {
  return tasks.find((t) => t.id === currentTaskId) || null;
}

export function updateTaskNameDisplay() {
  const display = document.getElementById("js-task-name-display");
  const currentTask = getCurrentTask();
  if (currentTask) {
    display.textContent = `Current: ${currentTask.name}`;
  } else {
    display.textContent = "No task selected";
  }
}

export function setCurrentTask(taskId) {
  // If we are currently running a timer, stop it before switching tasks
  stopTimer();
  
  setCurrentTaskId(taskId);
  switchMode("pomodoro"); // Always revert to Pomodoro mode when a task is selected/deselected
  saveTasks();
  renderTasks(); // Re-render to show selection
}

// ==================== RENDERING AND MODAL CONTROL ====================

/**
 * Creates the HTML markup for a single task item.
 */
function getTaskHtml(task) {
  const taskClass = `task-item ${task.completed ? "completed" : ""} ${
    currentTaskId === task.id ? "selected" : ""
  }`;
  
  return `
    <div class="${taskClass}" data-task-id="${task.id}">
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-progress">${task.completedPomodoros} / ${task.pomodoros} Pomodoros</div>
      </div>
      <div class="task-controls">
        <button class="task-button task-complete">${task.completed ? "Unmark" : "Done"}</button>
        <button class="task-button task-delete">Delete</button>
      </div>
    </div>
  `;
}

/**
 * Renders the tasks list in the modal.
 */
export function renderTasks() {
  const tasksList = document.getElementById("js-tasks-list");
  tasksList.innerHTML = "";

  tasks.forEach((task) => {
    const taskItem = document.createElement("div");
    taskItem.innerHTML = getTaskHtml(task);
    
    // Get inner elements for event listeners
    const completeBtn = taskItem.querySelector(".task-complete");
    const deleteBtn = taskItem.querySelector(".task-delete");
    const taskInfo = taskItem.querySelector(".task-info");

    completeBtn.addEventListener("click", () => completeTask(task.id));
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
// END of file - no extra brace here.