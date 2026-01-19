#!/usr/bin/env node

/**
 * Local development server that serves Firebase config
 * This allows local development to work the same as Netlify
 *
 * Usage: node local-dev-server.js
 * Then open http://localhost:3000/ in your browser
 */

require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;

// Get Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
  measurementId:
    process.env.FIREBASE_MEASUREMENT_ID ||
    process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if all required vars are set
const missingVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn(
    `⚠️  Warning: Missing Firebase environment variables: ${missingVars.join(", ")}`,
  );
  console.warn(
    "The app will not function without these. Please set them in your .env file.",
  );
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Handle Firebase config endpoint (mimics Netlify function)
  if (
    pathname === "/.netlify/functions/firebase-config" ||
    pathname === "/api/firebase-config"
  ) {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    // Return Firebase config
    if (req.method === "GET") {
      res.writeHead(200, headers);
      res.end(JSON.stringify(firebaseConfig));
      return;
    }
  }

  // Serve static files
  let filePath = path.join(
    __dirname,
    pathname === "/" ? "index.html" : pathname,
  );

  // Prevent directory traversal
  const realPath = path.resolve(filePath);
  if (!realPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Try to serve index.html for client-side routing
        fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
          if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found");
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(content);
          }
        });
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server Error");
      }
    } else {
      const ext = path.extname(filePath);
      const mimeTypes = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
      };

      const contentType = mimeTypes[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║   Pomopop Local Development Server                ║
╚════════════════════════════════════════════════════╝

🚀 Server running at http://localhost:${PORT}/

✅ Firebase config endpoint available at:
   /.netlify/functions/firebase-config

📝 Environment variables loaded from: .env

${missingVars.length > 0 ? `⚠️  Missing variables: ${missingVars.join(", ")}\n` : "✅ All Firebase variables are set\n"}
Press Ctrl+C to stop the server.
  `);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Try: npm start`);
  } else {
    console.error("Server error:", err);
  }
});
