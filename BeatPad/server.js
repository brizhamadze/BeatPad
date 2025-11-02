// WebSocket server for BeatPad multiplayer
const http = require('http');
const WebSocket = require('ws');

// Use PORT from environment variable (for Railway, Render, Fly.io) or default to 8001
const PORT = process.env.PORT || 8001;

// Create HTTP server for WebSocket upgrade handling
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: clients.size }));
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('BeatPad WebSocket Server');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

const WINNING_WORDS = [
  'HELLO', 'WORLD', 'MUSIC', 'BEATS', 'DANCE', 'PARTY', 'SMART', 'QUICK',
  'JAZZY', 'BLUES', 'ROCKS', 'SOUND', 'VOICE', 'RHYTHM', 'MELODY', 'CHORD',
  'PIANO', 'GUITAR', 'DRUMS', 'BASS', 'SONG', 'TUNE', 'NOTE', 'KEY'
];

let clients = new Map(); // userId -> WebSocket
let roundNumber = 1;
let isRoundActive = false;
let roundTimer = null;
let winningWord = null;

console.log(`BeatPad WebSocket server running on port ${PORT}`);
console.log(`Connect from client using: ws://localhost:${PORT} (or wss://your-domain for production)`);

// Start HTTP server (WebSocket server is attached to it)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    // Find and remove disconnected client
    let disconnectedUsername = 'Unknown';
    for (const [userId, client] of clients.entries()) {
      if (client === ws) {
        disconnectedUsername = client.username || 'Unknown';
        clients.delete(userId);
        // Notify other clients
        broadcast({
          type: 'userLeft',
          userId: userId,
          username: disconnectedUsername
        }, ws);
        console.log(`Client disconnected: ${userId} (${disconnectedUsername})`);
        break;
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleMessage(ws, data) {
  switch (data.type) {
    case 'join':
      // Register new client
      clients.set(data.userId, ws);
      ws.userId = data.userId;
      ws.username = data.username;
      console.log(`User joined: ${data.username} (${data.userId})`);
      
      // Notify other clients
      broadcast({
        type: 'userJoined',
        userId: data.userId,
        username: data.username
      }, ws);
      
      // Send current game state to new client
      ws.send(JSON.stringify({
        type: 'gameState',
        roundNumber: roundNumber,
        isRoundActive: isRoundActive,
        timeRemaining: isRoundActive ? 10 : 0,
        winningWord: winningWord
      }));
      
      // Start first round if no round is active
      if (!isRoundActive && clients.size > 0) {
        startRound();
      }
      break;
      
    case 'bet':
      // Broadcast bet to all other clients
      broadcast({
        type: 'bet',
        userId: data.userId,
        username: data.username,
        letter: data.letter,
        betAmount: data.betAmount,
        balance: data.balance
      }, ws);
      break;
      
    case 'message':
      // Broadcast message to all other clients
      broadcast({
        type: 'message',
        userId: data.userId,
        username: data.username,
        message: data.message
      }, ws);
      break;
      
    case 'roundStart':
      // Ignore - server controls rounds
      break;
      
    case 'roundEnd':
      // Ignore - server controls rounds
      break;
  }
}

function broadcast(message, excludeWs = null) {
  const messageStr = JSON.stringify(message);
  for (const [userId, client] of clients.entries()) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

function startRound() {
  if (isRoundActive) return;
  
  isRoundActive = true;
  roundNumber++;
  winningWord = null;
  
  console.log(`Starting round ${roundNumber}`);
  
  // Notify all clients
  broadcast({
    type: 'roundStart',
    roundNumber: roundNumber
  });
  
  // Start 10 second timer
  let timeRemaining = 10;
  
  roundTimer = setInterval(() => {
    timeRemaining--;
    
    // Send time updates every second
    broadcast({
      type: 'timerUpdate',
      timeRemaining: timeRemaining
    });
    
    if (timeRemaining <= 0) {
      endRound();
    }
  }, 1000);
}

function endRound() {
  if (!isRoundActive) return;
  
  isRoundActive = false;
  clearInterval(roundTimer);
  
  // Generate random winning word
  winningWord = WINNING_WORDS[Math.floor(Math.random() * WINNING_WORDS.length)];
  
  console.log(`Round ${roundNumber} ended. Winning word: ${winningWord}`);
  
  // Notify all clients
  broadcast({
    type: 'roundEnd',
    roundNumber: roundNumber,
    winningWord: winningWord
  });
  
  // Start next round after 3 seconds
  setTimeout(() => {
    if (clients.size > 0) {
      startRound();
    }
  }, 3000);
}

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  broadcast({
    type: 'serverShutdown'
  });
  wss.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

