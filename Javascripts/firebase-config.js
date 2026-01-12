import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Get these values from the Firebase Console: https://console.firebase.google.com/
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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { auth, googleProvider, githubProvider, analytics, db };
