# BeatPad Deployment Guide

## Frontend (Vercel)

The frontend is deployed to Vercel and works great for static hosting.

### Deploy Frontend

```bash
cd BeatPad
vercel --prod
```

## WebSocket Server Deployment

⚠️ **Important**: Vercel doesn't support WebSocket servers. You need to deploy the WebSocket server separately.

### Option 1: Railway (Recommended - Free Tier Available)

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your repository
6. Select the `BeatPad` folder
7. Railway will auto-detect `server.js` and `package.json`
8. Set environment variable (optional):
   - `PORT`: Railway will auto-assign, but you can set a custom one
9. Click "Deploy"
10. Once deployed, Railway will give you a URL like: `https://your-app.railway.app`
11. **Important**: Railway uses HTTPS, so your WebSocket URL will be: `wss://your-app.railway.app` (no port needed)

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Set:
   - **Name**: `beatpad-websocket`
   - **Start Command**: `node server.js`
   - **Environment**: `Node`
6. Click "Create Web Service"
7. Render will give you a URL like: `https://beatpad-websocket.onrender.com`
8. **Important**: Render uses HTTPS, so your WebSocket URL will be: `wss://beatpad-websocket.onrender.com` (no port needed)

### Option 3: Fly.io

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. In the BeatPad directory:
   ```bash
   fly launch
   ```
4. Follow prompts
5. Fly.io will give you a URL like: `https://your-app.fly.dev`
6. WebSocket URL: `wss://your-app.fly.dev` (no port needed)

## Configure Frontend to Use WebSocket Server

After deploying your WebSocket server, you need to tell the Vercel frontend where to find it.

### Method: Update HTML Configuration

Since Vercel doesn't support runtime environment variables for static HTML files, you need to set the WebSocket URL directly in the HTML:

1. Open `index.html` in your editor
2. Find the section at the top that says `WEBSOCKET CONFIGURATION` (around line 1158)
3. Uncomment and update this line:
   ```javascript
   window.WS_URL = 'wss://your-websocket-server-url.com';
   ```
   Replace `your-websocket-server-url.com` with your actual WebSocket server URL (e.g., `wss://your-app.railway.app`)

4. Save the file
5. Commit and push to your repository
6. Vercel will automatically redeploy, or you can manually redeploy:
   ```bash
   vercel --prod
   ```

**Important Notes:**
- Use `wss://` (not `ws://`) for HTTPS sites
- Don't include a port number for Railway/Render/Fly.io (they handle it automatically)
- For localhost development, leave `window.WS_URL` commented out - it will auto-connect to `ws://localhost:8001`

## Verify Deployment

1. Open your Vercel URL in two browser windows
2. Open browser console (F12)
3. You should see: `Connected to server: wss://your-server-url`
4. Actions in one window should sync to the other window
5. Both windows should show the same round timer and winning words

## Troubleshooting

### WebSocket Connection Fails

- Check browser console for errors
- Verify WebSocket server is running (check Railway/Render dashboard)
- Ensure WebSocket URL uses `wss://` (not `ws://`) for HTTPS sites
- Check that `WS_URL` environment variable is set correctly in Vercel

### Windows Not Syncing

- Both windows must connect to the same WebSocket server
- Check browser console in both windows - should show "Connected to server"
- Ensure WebSocket server is accessible (not blocked by firewall)

### Local Development

When running locally, the app automatically connects to `ws://localhost:8001`:

```bash
# Terminal 1: Start WebSocket server
cd BeatPad
npm install
node server.js

# Terminal 2: Start frontend
python3 -m http.server 8080
```

Open http://localhost:8080 in multiple windows - they should sync perfectly!

