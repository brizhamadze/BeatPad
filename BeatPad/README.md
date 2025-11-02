# Beat Pad Grid 🎵

An interactive 5×5 beat pad grid with Web Audio synthesis, dynamic color saturation, and live chat feature.

## Features

- 27 pads (26 letters + spacebar)
- Robot-style audio synthesis with ring modulation
- Dynamic saturation that grows with usage (0-100%)
- Live chat with word staging area
- Keyboard and mouse/touch support
- Progress rings showing pad activity

## Deploy to Vercel

1. Install Vercel CLI (if not already installed):
```bash
npm install -g vercel
```

2. Deploy from the BeatPad directory:
```bash
cd /Users/brair/Documents/Cline/myRepo/BeatPad
vercel
```

3. Follow the prompts:
   - Set up and deploy: Yes
   - Scope: (choose your account)
   - Link to existing project: No
   - Project name: beat-pad (or your choice)
   - Directory: `./`
   - Override settings: No

Your site will be live at: `https://beat-pad.vercel.app` (or similar)

## Local Development

Run a local server:
```bash
python3 -m http.server 8080
```

Then open: http://localhost:8080

## How to Use

- **Type letters** using keyboard (Q-P, A-M, Z-B, N, SPACE)
- **Click pads** with mouse
- **Hold** to rapidly increase count
- **Press SPACE** to commit typed words to chat
- Watch colors evolve as you play!

