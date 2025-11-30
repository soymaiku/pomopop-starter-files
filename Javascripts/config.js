// config.js
// Global timer state and configuration
export const timer = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  sessions: 0,
  mode: "pomodoro", // Initial mode
  remainingTime: {
    // Initial remaining time for 'pomodoro' mode
    total: 25 * 60,
    minutes: 25,
    seconds: 0,
  },
};

// Global task state
export const tasks = [];
export let nextTaskId = 1;
export let interval = null;
export let currentTaskId = null;

// Setter functions for 'let' variables to allow modules to update them
export function setNextTaskId(id) {
  nextTaskId = id;
}

export function setIntervalId(id) {
  interval = id;
}

export function setCurrentTaskId(id) {
  currentTaskId = id;
}
