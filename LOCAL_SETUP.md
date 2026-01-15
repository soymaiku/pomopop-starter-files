# Local Development Setup Guide

## Problem Explanation

Your Pomopop app works on Netlify but not locally at `http://localhost:3000/` because:

### **Why it works on Netlify:**
- Netlify provides a serverless functions runtime (`.netlify/functions/`)
- Your app fetches Firebase config from `/.netlify/functions/firebase-config` endpoint
- Environment variables are securely stored in Netlify's dashboard
- The Netlify function returns the config as JSON

### **Why it didn't work locally:**
- Browser-sync doesn't provide a serverless runtime
- No `/.netlify/functions/firebase-config` endpoint available
- No built-in way to access environment variables
- The app couldn't initialize Firebase properly

## Solution

I've created a **local development server** that mimics Netlify's behavior:

### **What I've Added:**

1. **`local-dev-server.js`** - A custom Node.js server that:
   - Serves your static files (HTML, CSS, JavaScript)
   - Provides Firebase config via `/.netlify/functions/firebase-config` endpoint
   - Reads environment variables from `.env` file (via dotenv)
   - Handles CORS properly
   - Works exactly like Netlify locally

2. **`.env`** - Local environment variables file (already exists in your project)

3. **`.env.example`** - Template showing what variables you need

4. **Updated `package.json`** - New npm scripts

## How to Use

### **Step 1: Get Your Firebase Credentials**

Go to your Firebase Console and copy these 7 values:
- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID
- Measurement ID

### **Step 2: Fill in Your .env File**

Edit the `.env` file in your project root and add your Firebase credentials:

```env
FIREBASE_API_KEY=AIzaSyD...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123def456
FIREBASE_MEASUREMENT_ID=G-ABC123DEF
```

### **Step 3: Start the Local Server**

```bash
npm start
```

You'll see:
```
╔════════════════════════════════════════════════════╗
║   Pomopop Local Development Server                ║
╚════════════════════════════════════════════════════╝

🚀 Server running at http://localhost:3000/

✅ Firebase config endpoint available at:
   /.netlify/functions/firebase-config

📝 Environment variables loaded from: .env

✅ All Firebase variables are set

Press Ctrl+C to stop the server.
```

### **Step 4: Open Your App**

Visit **http://localhost:3000/** in your browser and your app should work!

## How It Works

```
Your Browser
    ↓
http://localhost:3000/
    ↓
local-dev-server.js
    ├→ Requests for /.netlify/functions/firebase-config → Returns config from .env
    ├→ Requests for *.js, *.css, *.html → Serves static files
    └→ All other paths → Serves index.html (for client-side routing)
```

## Running Both Locally AND on Netlify

### **Local Development (http://localhost:3000/):**
```bash
npm start
```
Uses `local-dev-server.js` which reads from `.env`

### **Netlify Development (simulates production):**
```bash
npm run dev
```
Uses `netlify dev` which also reads from `.env` + Netlify environment

### **Netlify Production:**
Your Firebase credentials are stored in Netlify's environment variables dashboard (secure)

## Troubleshooting

### **Port 3000 already in use:**
Change the port in the server:
```bash
PORT=3001 npm start
```

### **"Missing Firebase environment variables":**
Make sure you've filled in all 7 values in `.env`

### **Still not working:**
1. Check browser console for errors (F12)
2. Check server terminal output
3. Verify Firebase credentials are correct
4. Make sure `.env` file is in the project root

## Security Note

- **NEVER** commit `.env` to Git - it's already in `.gitignore`
- On Netlify, set environment variables in Dashboard (not in `.env`)
- On local dev, use `.env` for testing only
- Never share your Firebase credentials with anyone

## Comparison

| Feature | Before | Now |
|---------|--------|-----|
| Local server | ❌ Browser-sync only | ✅ Full Node.js server |
| Firebase config endpoint | ❌ Not available | ✅ Available at `/.netlify/functions/firebase-config` |
| Environment variables | ❌ Not available | ✅ Read from `.env` file |
| Works locally | ❌ No | ✅ Yes |
| Works on Netlify | ✅ Yes | ✅ Yes (unchanged) |

---

**You now have a fully functional development environment that works identically to Netlify!** 🎉
