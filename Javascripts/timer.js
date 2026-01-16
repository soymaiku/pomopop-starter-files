// timer.js
import { timer, interval, setIntervalId } from "./config.js";
import { updateTaskProgress, getCurrentTask } from "./tasks.js";
import { showNotification } from "./utils.js";
import { incrementPomodoroCount } from "./stats.js";

const buttonSound = new Audio("./Audio/button-sound.mp3");
const mainButton = document.getElementById("js-btn");

export function getRemainingTime(endTime) {
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

export function startTimer() {
  let { total } = timer.remainingTime;
  const endTime = Date.parse(new Date()) + total * 1000;

  if (timer.mode === "pomodoro") timer.sessions++;

  mainButton.dataset.action = "pause";
  mainButton.textContent = "pause";
  mainButton.classList.add("active");

  const newInterval = setInterval(function () {
    timer.remainingTime = getRemainingTime(endTime);
    updateClock();

    total = timer.remainingTime.total;
    if (total <= 0) {
      stopTimer(false); // Stop the current interval, but don't reset button state yet

      // Update task progress when pomodoro completes
      if (timer.mode === "pomodoro") {
        updateTaskProgress();
        incrementPomodoroCount(timer.pomodoro);
      }

      switch (timer.mode) {
        case "pomodoro":
          const currentTask = getCurrentTask();
          if (currentTask && currentTask.completed) {
            // Task completed, switch to pomodoro but don't auto-start
            switchMode("pomodoro");
            // Don't auto-start, wait for user action
          } else if (timer.sessions % timer.longBreakInterval === 0) {
            switchMode("longBreak");
            startTimer();
          } else {
            switchMode("shortBreak");
            startTimer();
          }
          break;
        default:
          switchMode("pomodoro");
          // If switching back to pomodoro, check if a task is selected
          if (getCurrentTask() !== null) {
            startTimer();
          } else {
            // Stop the timer fully and reset button if no task is selected for the new pomodoro
            stopTimer(true);
            showNotification("Break over. Time to focus!");
          }
      }

      if (Notification.permission === "granted") {
        const text =
          timer.mode === "pomodoro" ? "Get back to work!" : "Take a break!";
        new Notification(text);
      }

      document.querySelector(`[data-sound="${timer.mode}"]`).play();
    }
  }, 1000);

  setIntervalId(newInterval);
}

// Added optional parameter to control if the button state should be fully reset
export function stopTimer(resetButton = true) {
  if (interval !== null) {
    clearInterval(interval);
    setIntervalId(null);
  }

  if (resetButton) {
    mainButton.dataset.action = "start";
    mainButton.textContent = "start";
    mainButton.classList.remove("active");
  }
}

export function updateClock() {
  const { remainingTime } = timer;
  const minutes = `${remainingTime.minutes}`.padStart(2, "0");
  const seconds = `${remainingTime.seconds}`.padStart(2, "0");

  const min = document.getElementById("js-minutes");
  const sec = document.getElementById("js-seconds");
  min.textContent = minutes;
  sec.textContent = seconds;

  // Update interval display for pomodoro mode
  updateIntervalDisplay();

  // Title update for better context
  let text;
  if (timer.mode === "pomodoro") {
    text = "Time to Focus!";
  } else if (timer.mode === "shortBreak") {
    text = "Short Break!";
  } else {
    text = "Long Break!";
  }
  document.title = `${minutes}:${seconds} — ${text}`;

  const progress = document.getElementById("js-progress");
  progress.value = timer[timer.mode] * 60 - timer.remainingTime.total;
}

export function updateIntervalDisplay() {
  const intervalDisplay = document.getElementById("js-interval-display");
  if (!intervalDisplay) return;

  if (timer.mode === "pomodoro") {
    const currentTask = getCurrentTask();
    if (currentTask) {
      const completed = currentTask.completedPomodoros || 0;
      const estimated = currentTask.pomodoros || 1;
      intervalDisplay.textContent = `Work ${completed} / ${estimated}`;
    } else {
      intervalDisplay.textContent = "";
    }
  } else if (timer.mode === "shortBreak") {
    intervalDisplay.textContent = "Short Break";
  } else {
    intervalDisplay.textContent = "Long Break";
  }
}

export function switchMode(mode) {
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

export function handleMode(event) {
  const { mode } = event.target.dataset;

  if (!mode) return;

  stopTimer(); // Stop before switching
  switchMode(mode);
}

export function resetTimer() {
  stopTimer(); // Fully stop and reset button state

  // Reset to current mode's full duration
  const mode = timer.mode;
  switchMode(mode);

  // Show notification
  showNotification(`Timer reset to ${timer[mode]} minutes`);
}

export function handleMainButtonClick() {
  buttonSound.play();
  const { action } = mainButton.dataset;
  if (action === "start") {
    startTimer();
  } else {
    stopTimer();
  }
}
