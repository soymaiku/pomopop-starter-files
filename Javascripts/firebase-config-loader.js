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

async function initializeFirebase() {
  try {
    // Fetch config from secure Netlify function
    const response = await fetch("/.netlify/functions/firebase-config");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const firebaseConfig = await response.json();

    // Initialize Firebase with secure config
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();

    console.log("✅ Firebase initialized with secure config from server");
  } catch (error) {
    console.error("❌ Failed to load Firebase config:", error.message);
    throw error; // Prevent the app from running with invalid config
  }
}

// Initialize Firebase immediately
initializeFirebase();

export { auth, googleProvider, githubProvider, analytics, db };
