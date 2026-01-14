// This module loads Firebase config from the Netlify function
// It replaces the hardcoded config with one fetched from the server

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let auth, googleProvider, githubProvider, analytics, db;

async function initializeFirebase() {
  try {
    // Try to fetch from Netlify function (production/deployed)
    const configResponse = await fetch("/.netlify/functions/firebase-config");

    if (!configResponse.ok) {
      throw new Error(`Failed to load config: ${configResponse.statusText}`);
    }

    const firebaseConfig = await configResponse.json();

    if (firebaseConfig.error) {
      throw new Error(firebaseConfig.error);
    }

    // Initialize Firebase with the fetched config
    const app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();

    console.log("✅ Firebase initialized successfully from secure config");
    return { auth, googleProvider, githubProvider, analytics, db };
  } catch (error) {
    console.warn(
      "⚠️ Could not load config from function, attempting fallback...",
      error.message
    );
    // Fallback for local development - loads from hardcoded config
    return loadFallbackConfig();
  }
}

function loadFallbackConfig() {
  // This is used only for local development
  // Make sure .env is in .gitignore before pushing to Git
  const firebaseConfig = {
    apiKey: "AIzaSyDKMAuZRVGcInVsmvMbjmuiehR4rcBzsC8",
    authDomain: "pomopop-1f51b.firebaseapp.com",
    projectId: "pomopop-1f51b",
    storageBucket: "pomopop-1f51b.firebasestorage.app",
    messagingSenderId: "954235877516",
    appId: "1:954235877516:web:082ba58ec5c0829da1e3a9",
    measurementId: "G-SGW375DYCG",
  };

  const app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  githubProvider = new GithubAuthProvider();

  console.log("⚠️ Using fallback config (local development)");
  return { auth, googleProvider, githubProvider, analytics, db };
}

// Initialize on import
await initializeFirebase();

export { auth, googleProvider, githubProvider, analytics, db };
