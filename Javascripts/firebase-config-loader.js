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

async function initializeFirebase() {
  try {
    let firebaseConfig;

    try {
      // Try to fetch config from Netlify function first
      const response = await fetch("/.netlify/functions/firebase-config", {
        timeout: 5000,
      });
      if (response.ok) {
        firebaseConfig = await response.json();
        console.log("✅ Firebase config loaded from Netlify");
      } else {
        throw new Error("Netlify function not available");
      }
    } catch (netlifyError) {
      // Fallback to environment variables
      console.log("⚠️ Using environment variables for Firebase config");
      firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      };

      // Check if we have valid config
      if (!firebaseConfig.apiKey) {
        throw new Error(
          "Firebase credentials not found in environment variables",
        );
      }
    }

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();

    firebaseInitialized = true;
    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    throw error;
  }
}

// Initialize Firebase immediately
initializeFirebase();

// Wait helper for modules that need to use Firebase
export async function waitForFirebase() {
  while (!firebaseInitialized) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export { auth, googleProvider, githubProvider, analytics, db };
