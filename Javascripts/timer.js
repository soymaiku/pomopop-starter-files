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

  mainButton.dataset.action = "pause";
  mainButton.textContent = "pause";
  mainButton.classList.add("active");


  const newInterval = setInterval(function () {
    timer.remainingTime = getRemainingTime(endTime);
    updateClock();

    total = timer.remainingTime.total;
    if (total <= 0) {
      stopTimer(false); // Stop the current interval, but don't reset button state yet

      // Only increment and check for long break if Pomodoro was fully completed (not paused)
      let nextMode = "pomodoro";
      if (timer.mode === "pomodoro") {
        timer.sessions++;
        timer.pomodorosSinceLongBreak++;
        updateTaskProgress();
        incrementPomodoroCount(timer.pomodoro);

        const shouldTakeLongBreak =
          timer.pomodorosSinceLongBreak >= timer.longBreakInterval;
        if (shouldTakeLongBreak) {
          timer.pomodorosSinceLongBreak = 0;
          nextMode = "longBreak";
        } else {
          nextMode = "shortBreak";
        }
      }

      switchMode(nextMode);
      startTimer();

      if (Notification.permission === "granted") {
        const text =
          nextMode === "pomodoro" ? "Get back to work!" : "Take a break!";
        new Notification(text);
      }

      document.querySelector(`[data-sound="${nextMode}"]`).play();
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
  const clock = document.getElementById("js-clock");

  // Add elegant flip animation when time changes
  if (min.textContent !== minutes) {
    min.classList.add("tick");
    setTimeout(() => min.classList.remove("tick"), 500);
    min.textContent = minutes;

    // Add glow effect to entire clock
    if (clock) {
      clock.classList.add("tick-glow");
      setTimeout(() => clock.classList.remove("tick-glow"), 500);
    }
  }

  if (sec.textContent !== seconds) {
    sec.classList.add("tick");
    setTimeout(() => sec.classList.remove("tick"), 500);
    sec.textContent = seconds;

    // Add glow effect to entire clock
    if (clock) {
      clock.classList.add("tick-glow");
      setTimeout(() => clock.classList.remove("tick-glow"), 500);
    }
  }

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

  const currentTask = getCurrentTask();
  if (currentTask) {
    const completed = currentTask.completedPomodoros || 0;
    const estimated = currentTask.pomodoros || 1;
    intervalDisplay.textContent = `Work ${completed} / ${estimated}`;
    intervalDisplay.style.display = "inline-block";
  } else {
    // No task: hide interval display
    intervalDisplay.textContent = "";
    intervalDisplay.style.display = "none";
  }
}

export function switchMode(mode) {
  timer.mode = mode;

  // Starting a long break resets the cycle counter
  if (mode === "longBreak") {
    timer.pomodorosSinceLongBreak = 0;
  }

  timer.remainingTime = {
    total: timer[mode] * 60,
    minutes: timer[mode],
    seconds: 0,
  };

  document
    .querySelectorAll("button[data-mode]")
    .forEach((e) => e.classList.remove("active"));
  const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
  activeBtn.classList.add("active");

  // Update sliding indicator position
  updateModeSlider(activeBtn);

  document.body.style.backgroundColor = `var(--${mode})`;
  document
    .getElementById("js-progress")
    .setAttribute("max", timer.remainingTime.total);

  updateClock();
}

// Smooth sliding indicator for mode switcher
export function updateModeSlider(activeBtn) {
  const slider = document.getElementById("js-mode-slider");
  if (!slider || !activeBtn) return;

  const container = document.getElementById("js-mode-buttons");
  const containerRect = container.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();

  // Calculate position relative to container
  const left = btnRect.left - containerRect.left;
  const top = btnRect.top - containerRect.top;

  slider.style.left = `${left}px`;
  slider.style.top = `${top}px`;
  slider.style.width = `${btnRect.width}px`;
  slider.style.height = `${btnRect.height}px`;
}

// Initialize slider position on load
export function initModeSlider() {
  const activeBtn = document.querySelector("button[data-mode].active");
  if (activeBtn) {
    // Set initial position without animation
    const slider = document.getElementById("js-mode-slider");
    if (slider) {
      slider.style.transition = "none";
      updateModeSlider(activeBtn);
      // Re-enable transition after initial positioning
      requestAnimationFrame(() => {
        slider.style.transition = "";
      });
    }
  }
}

export function handleMode(event) {
  const { mode } = event.target.dataset;

  if (!mode) return;

  stopTimer(); // Stop before switching
  switchMode(mode);
}

export function resetTimer() {
  stopTimer(); // Fully stop and reset button state

  timer.sessions = 0;
  timer.pomodorosSinceLongBreak = 0;

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
    if (!getCurrentTask()) {
      showNotification("Please add or select a task to start.");
      openTaskModal();
      return;
    }
    startTimer();
  } else {
    stopTimer();
  }
}
