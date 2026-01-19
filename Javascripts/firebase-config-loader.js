// This module initializes Firebase with secure configuration
// Uses hardcoded config locally and fetches from Netlify Functions in production

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Initialize Firebase with secure config from Netlify function
let app, analytics, auth, db, googleProvider, githubProvider;
let firebaseInitialized = false;
let firebaseError = null;

async function initializeFirebase() {
  try {
    // Try to fetch config from secure Netlify function
    let firebaseConfig = null;

    try {
      const response = await fetch("/.netlify/functions/firebase-config", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        firebaseConfig = await response.json();
        console.log("✅ Firebase config loaded from Netlify function");
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (fetchError) {
      console.warn(
        "⚠️ Could not fetch Firebase config from server:",
        fetchError.message,
      );
      console.log("Falling back to environment variables...");

      // Fallback to environment variables (for local development)
      firebaseConfig = {
        apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env?.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID,
      };
    }

    // Validate config
    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
      throw new Error("Invalid or incomplete Firebase configuration");
    }

    // Initialize Firebase with the config
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();

    firebaseInitialized = true;
    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    firebaseError = error;
    console.error("❌ Firebase initialization failed:", error.message);
    // App can still function without Firebase (guest mode only)
    firebaseInitialized = true; // Mark as initialized to prevent infinite loop
  }
}

// Initialize Firebase immediately
initializeFirebase();

// Wait helper for modules that need to use Firebase
export async function waitForFirebase() {
  while (!firebaseInitialized) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (firebaseError) {
    console.warn(
      "⚠️ Firebase may not be fully functional. Error:",
      firebaseError.message,
    );
  }

  return { initialized: firebaseInitialized, error: firebaseError };
}

export { auth, googleProvider, githubProvider, analytics, db };
