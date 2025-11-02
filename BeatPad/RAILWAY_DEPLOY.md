# Railway Deployment Guide for BeatPad WebSocket Server

## Step-by-Step Instructions

### Step 1: Prepare Your Repository

Make sure your code is pushed to GitHub/GitLab/Bitbucket:
- ✅ `server.js` exists
- ✅ `package.json` exists with `"start": "node server.js"`
- ✅ Code is committed and pushed to your repository

### Step 2: Create New Project on Railway

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"** button
3. Select **"Deploy from GitHub repo"** (or GitLab/Bitbucket if you prefer)
4. **Authorize Railway** to access your GitHub account (if first time)
5. Select your repository from the list
6. Click **"Add Service"** or **"Deploy"**

### Step 3: Configure the Service

Railway should auto-detect your Node.js project. Verify:

1. **Service Name**: You can rename it to "beatpad-websocket" (optional)
2. **Root Directory**: Should be `/BeatPad` (or leave blank if repo root)
   - If your repo has BeatPad as a subfolder, set Root Directory to `/BeatPad`
   - If BeatPad is the repo root, leave blank
3. **Build Command**: Railway auto-detects - should be `npm install` (or blank)
4. **Start Command**: Should be `npm start` (which runs `node server.js`)

### Step 4: Deploy

1. Railway will automatically start deploying
2. Watch the **Deploy Logs** - you should see:
   ```
   Installing dependencies...
   Running npm install
   Starting server...
   BeatPad WebSocket server running on port [PORT]
   ```

### Step 5: Get Your WebSocket URL

After deployment succeeds:

1. Go to your service dashboard
2. Click on the **"Settings"** tab
3. Scroll down to **"Networking"** section
4. You'll see your **Public Domain** - something like:
   - `your-app.up.railway.app`
   - Or a custom domain if you set one up

5. **Your WebSocket URL will be:**
   - `wss://your-app.up.railway.app` (use `wss://` for HTTPS, Railway uses HTTPS automatically)
   - **Important**: Don't include a port number - Railway handles that

### Step 6: Configure Frontend (Vercel)

Now update your Vercel frontend to connect to this Railway WebSocket server:

1. Open `index.html` in your editor
2. Find the `WEBSOCKET CONFIGURATION` section (around line 1158)
3. Uncomment and set your Railway URL:
   ```javascript
   window.WS_URL = 'wss://your-app.up.railway.app';  // Replace with your actual Railway URL
   ```
4. Save and commit
5. Redeploy to Vercel:
   ```bash
   cd BeatPad
   vercel --prod
   ```

### Step 7: Test

1. Open your Vercel URL in **two browser windows**
2. Open browser console (F12) in both windows
3. You should see: `Connected to server: wss://your-app.up.railway.app`
4. Try typing in one window - it should sync to the other!

## Troubleshooting

### WebSocket Connection Fails

**Check Railway Logs:**
1. Go to Railway dashboard → Your service → **"Deployments"** tab
2. Click on the latest deployment → **"View Logs"**
3. Look for errors

**Common Issues:**

1. **"Connection refused"**
   - Check that Railway service is running (not paused)
   - Verify the URL uses `wss://` (not `ws://`)

2. **"Failed to connect"**
   - Make sure you're using the Railway public domain (not localhost)
   - Check Railway logs for server errors

3. **"Service not found"**
   - Verify Root Directory is set correctly if BeatPad is a subfolder
   - Check that `package.json` and `server.js` are in the correct location

### Service Goes to Sleep (Free Tier)

Railway free tier pauses services after inactivity. To prevent this:
- Railway Pro plan ($5/month) - services stay awake
- Or use a service like UptimeRobot to ping your service periodically

### Port Issues

Railway automatically sets `PORT` environment variable - your server.js already handles this correctly. No changes needed!

## Verify Deployment

In Railway dashboard, check:
- ✅ Deployment shows "Active" status
- ✅ Logs show "BeatPad WebSocket server running on port..."
- ✅ No error messages in logs
- ✅ Public domain is accessible

## Next Steps

Once deployed and working:
1. Test with multiple browser windows
2. Check that rounds sync across all clients
3. Verify bets and messages sync properly

Your WebSocket server is now live! 🎉

