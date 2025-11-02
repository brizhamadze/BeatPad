# Render Deployment Guide for BeatPad WebSocket Server

## Quick Setup (Easier than Railway!)

Render is often simpler for WebSocket servers. Here's how to deploy:

### Step 1: Sign Up
1. Go to [render.com](https://render.com)
2. Sign up/login (free tier available)

### Step 2: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account
3. Select repository: `brizhamadze/BeatPad`
4. Configure:
   - **Name**: `beatpad-websocket`
   - **Root Directory**: `BeatPad` (important!)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **"Create Web Service"**

### Step 3: Get Your URL
- Render will give you a URL like: `https://beatpad-websocket.onrender.com`
- Your WebSocket URL: `wss://beatpad-websocket.onrender.com` (no port needed)

### Step 4: Update Frontend
1. Open `index.html`
2. Find line ~1167: `// window.WS_URL = 'wss://your-websocket-server-url.com';`
3. Uncomment and set:
   ```javascript
   window.WS_URL = 'wss://beatpad-websocket.onrender.com';  // Your Render URL
   ```
4. Save, commit, push, and redeploy to Vercel

## Railway Alternative Fix

If you want to try Railway again, make sure:
1. **Root Directory** is set to `/BeatPad` (with the slash!)
2. **Node Version** is set to 18+ in Railway settings
3. Try deleting and recreating the service

## Why Render Might Be Better
- ✅ Simpler WebSocket setup
- ✅ Automatic HTTPS/WSS
- ✅ Free tier available
- ✅ No complex configuration needed

## Testing
After deployment, open two browser windows and check console - should see "Connected to server"!

