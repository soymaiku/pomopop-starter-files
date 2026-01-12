const fs = require("fs");
const path = require("path");

// Only generate the file if the API key is present in the environment
if (!process.env.FIREBASE_API_KEY) {
  console.log("No FIREBASE_API_KEY found. Skipping config generation.");
  // We exit gracefully so local development isn't affected if you don't use env vars locally
  process.exit(0);
}

const content = `import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.FIREBASE_APP_ID}",
  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { auth, googleProvider, githubProvider, analytics };
`;

const filePath = path.join(__dirname, "Javascripts", "firebase-config.js");

fs.writeFileSync(filePath, content);
console.log("Successfully generated Javascripts/firebase-config.js");
