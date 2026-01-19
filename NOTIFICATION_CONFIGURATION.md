# Pomopop Notification System Configuration Guide

## Overview

Pomopop uses a custom in-app notification system instead of browser notifications. All notifications are displayed beautifully within the app using:

- **Toast** - Bottom pop-out notifications that auto-dismiss
- **Warning Alert** - Top slide-down alerts with optional action buttons
- **Demo Modal** - Centered modal for testing

---

## Notification Types & Usage

### 1. Toast Notifications

Toast notifications appear at the bottom center of the screen and automatically dismiss after 3 seconds.

**Basic Usage:**

```javascript
showToast("Your message here", "success");
```

**Supported Types & Colors:**
| Type | Color | Use Case |
|------|-------|----------|
| `"success"` | Green (bg-green-600) | Successful operations, profile updates |
| `"error"` | Red (bg-red-600) | Errors, failed operations |
| `"warning"` | Yellow (bg-yellow-600) | Validation messages, invalid input |
| `"info"` | Blue (bg-blue-600) | General information, welcome messages |

**Examples:**

```javascript
showToast("✓ Profile updated successfully!", "success");
showToast("Task added to your list", "success");
showToast("Failed to save settings", "error");
showToast("Please enter a valid number", "warning");
showToast("Welcome! Notifications are enabled.", "info");
```

---

### 2. Warning Alerts

Warning alerts appear at the top center and slide down with a gradient yellow background. They can include action buttons and auto-dismiss after 5 seconds.

**Basic Usage (No Buttons):**

```javascript
showWarningAlert("Timer finished!", "Time's Up");
```

**With Action Buttons:**

```javascript
showWarningAlert("Are you ready to start a break?", "Break Time", [
  {
    label: "Take a Break",
    type: "primary",
    action: () => switchMode("shortBreak"),
  },
  { label: "Skip", type: "secondary", action: () => console.log("Skipped") },
]);
```

**Parameters:**

- `message` (string) - Main alert message
- `title` (string) - Alert title/header
- `actionButtons` (array, optional) - Array of button objects

**Button Object Structure:**

```javascript
{
  label: "Button Text",           // Display text
  type: "primary" | "secondary",  // Button style (primary = darker, secondary = lighter)
  action: () => { /* handler */ } // Callback function when clicked
}
```

**Examples:**

```javascript
// Pomodoro completion alert
showWarningAlert(
  "Excellent work! You've completed a pomodoro session.",
  "Great work!",
  [
    {
      label: "Start Break",
      type: "primary",
      action: () => switchMode("shortBreak"),
    },
  ],
);

// Break completion alert
showWarningAlert("Break is over. Time to get back to work!", "Break Over", [
  {
    label: "Start Pomodoro",
    type: "primary",
    action: () => switchMode("pomodoro"),
  },
]);
```

---

### 3. Demo Modal

Testing notifications using the demo modal in the notification section of the account menu.

**Test Buttons Available:**

- 🟢 Show Success Toast
- 🔴 Show Error Toast
- 🟡 Show Warning Toast
- 🔵 Show Info Toast

Click the notification bell icon in the account section to access the demo modal.

---

## Configuration Options

### Toast Configuration

Edit the `notificationConfig` object in `utils.js`:

```javascript
export const notificationConfig = {
  toast: {
    duration: 3000, // Duration in milliseconds (default: 3000)
    autoClose: true, // Auto-dismiss toast (default: true)
    position: "bottom-center", // Position (default: "bottom-center")
  },
  alert: {
    duration: 5000, // Warning alert duration (default: 5000)
    autoClose: true, // Auto-dismiss alert (default: true)
  },
};
```

### Customizing Toast Duration

To change how long a toast appears:

```javascript
// In utils.js, modify:
toast: {
  duration: 5000, // 5 seconds instead of 3
}
```

### Customizing Alert Duration

To change how long warning alerts appear:

```javascript
// In utils.js, modify:
alert: {
  duration: 8000, // 8 seconds instead of 5
}
```

---

## Integration Points in Code

### Where Toasts Are Used

1. **Profile Updates** (`app.js`)

   ```javascript
   showToast("✓ Profile updated successfully!", "success");
   showToast("Failed to update profile. Please try again.", "error");
   showToast("Please enter a name", "warning");
   ```

2. **Login Errors** (`stats.js`)

   ```javascript
   showToast("Google Login Error: " + error.message, "error");
   ```

3. **Task Management** (`tasks.js`)

   ```javascript
   showToast("Please enter a task name", "warning");
   ```

4. **Settings Validation** (`settings.js`)

   ```javascript
   showToast("Please enter valid numbers.", "warning");
   ```

5. **App Initialization** (`app.js`)
   ```javascript
   showToast("Welcome! Notifications are enabled.", "info");
   ```

### Where Warning Alerts Are Used

1. **Timer Completion** (`timer.js`)

   ```javascript
   showWarningAlert("Break over. Time to focus!", "Break Complete");
   showWarningAlert("Great work! Take a short break.", "Pomodoro Complete");
   ```

2. **Timer Reset** (`timer.js`)
   ```javascript
   showNotification(`Timer reset to ${timer[mode]} minutes`);
   ```

---

## Adding New Notifications

### Adding a Toast in Your Code

```javascript
// Import at the top of your file
import { showToast } from "./utils.js";

// Use anywhere in your code
showToast("Operation completed", "success");
```

### Adding a Warning Alert in Your Code

```javascript
// Import at the top of your file
import { showWarningAlert } from "./utils.js";

// Use anywhere in your code
showWarningAlert("This action cannot be undone", "Confirm Action", [
  { label: "Proceed", type: "primary", action: () => deleteItem() },
  { label: "Cancel", type: "secondary", action: () => {} },
]);
```

---

## Styling

### Toast Styling

Toasts use Tailwind CSS with these classes:

- Container: `fixed bottom-8 left-1/2 -translate-x-1/2 z-[3500]`
- Animation on entry: `animate-toast-in` (pop-in with bounce)
- Animation on exit: `animate-toast-out` (pop-out)

**CSS Animations in `styles.css`:**

```css
@keyframes toast-pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes toast-pop-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}
```

### Warning Alert Styling

Warning alerts use:

- Container: `fixed top-20 left-1/2 -translate-x-1/2 z-[3600]`
- Background: `bg-gradient-to-r from-yellow-100 to-yellow-50`
- Animation on entry: `animate-alert-slide-down`
- Animation on exit: `animate-alert-slide-up`

---

## Programmatic Configuration

### Change Notification Config at Runtime

```javascript
// In app.js or any module
import { configureNotifications, notificationConfig } from "./utils.js";

// Method 1: Direct modification
notificationConfig.toast.duration = 5000;

// Method 2: Use config function
configureNotifications({
  toast: { duration: 5000, autoClose: true },
  alert: { duration: 8000, autoClose: true },
});
```

---

## Browser Console Testing

Test notifications directly in browser console:

```javascript
// Test success toast
window.showToast("This is a success message", "success");

// Test error toast
window.showToast("This is an error message", "error");

// Test warning alert
window.showWarningAlert("This is a warning alert", "Warning Title", [
  { label: "OK", type: "primary", action: () => console.log("OK clicked") },
]);
```

---

## Removed Features

❌ **Browser Notifications** - No longer used

- Removed `Notification` API calls
- Removed permission requests
- Replaced all `alert()` calls with toasts

✅ **In-App Notifications** - Now standard

- All notifications display within the app
- No system notifications
- Consistent design and animations
- Works offline and online

---

## Best Practices

### When to Use Toast vs Warning Alert

| Situation                              | Use             |
| -------------------------------------- | --------------- |
| Quick feedback (1-3 seconds)           | Toast ✓         |
| Important action requiring attention   | Warning Alert ✓ |
| Requires user interaction/confirmation | Warning Alert ✓ |
| Non-intrusive status updates           | Toast ✓         |
| Form validation errors                 | Toast ✓         |
| Timer/mode completion                  | Warning Alert ✓ |

### Notification Message Guidelines

- **Keep it short**: 40-60 characters max for toasts
- **Be specific**: "Profile updated" not "Success"
- **Use icons**: ✓, ✕, ⚠️ for visual clarity
- **Be friendly**: "Great work!" not "Action completed"
- **Action-oriented**: "Please enter a name" not "Invalid input"

---

## Troubleshooting

### Notifications Not Appearing

1. Check console for errors
2. Verify containers exist in HTML:
   ```html
   <div id="js-toast-container"></div>
   <div id="js-warning-alert-container"></div>
   ```
3. Ensure `showToast` or `showWarningAlert` is imported

### Notifications Disappearing Too Fast

Increase duration in `utils.js`:

```javascript
toast: {
  duration: 5000;
} // Increase from 3000
alert: {
  duration: 8000;
} // Increase from 5000
```

### Buttons Not Working on Alert

Ensure action function is defined:

```javascript
// ✓ Correct
action: () => switchMode("break");

// ✗ Incorrect
action: switchMode("break"); // Missing arrow function
```

---

## Summary

The Pomopop notification system provides:

- ✅ Beautiful in-app notifications
- ✅ No browser permissions needed
- ✅ Customizable timing and styles
- ✅ Interactive action buttons (alerts)
- ✅ Multiple notification types
- ✅ Consistent Tailwind CSS design
- ✅ Smooth CSS animations

For any questions or issues, check the code in `utils.js` where all notification functions are defined.
