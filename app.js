const WebSocket = require('ws');
const http = require('http');
const arduino = require('./arduino.js');
const strikeLoop = require('./strikeLoop.js');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('[APP] Client connected');
  clients.add(ws);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      //console.log('[APP] Received from client:', data);
      
      if (data.type === 'start' && data.teamName) {
        console.log('[APP] Received start request for team:', data.teamName);
        strikeLoop.emitter.emit('start', data);
      } else if (data.type === 'circleClick' && data.circleId) {
        strikeLoop.emitter.emit('circleClick', data);
      }
    } catch (error) {
      console.error('[APP] Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('[APP] Client disconnected');
    clients.delete(ws);
  });
});

// Listen for Arduino events and forward to strikeLoop
arduino.emitter.on('EventInput', (message, value) => {
  console.log('[APP] Arduino input received:', message, 'Value:', value);
  strikeLoop.emitter.emit('EventInput', message, value);
});

// Listen for strikeLoop events
strikeLoop.emitter.on('gameStarted', () => {
  console.log('[APP] Game started event received from strikeLoop');
  
  // Send game started message to all clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'gameStarted'
      }));
    }
  });
});

// Listen for LED control events from strikeLoop
strikeLoop.emitter.on('ledControl', (data) => {
  //console.log('[APP] LED control event received:', data);
  
  // Send LED control message to all clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'ledControl',
        elementId: data.elementId,
        colorCode: data.colorCode,
        colorValue: data.colorValue,
        timestamp: data.timestamp
      }));
    }
  });
});

strikeLoop.emitter.on('gameFinished', () => {
  console.log('[APP] Game finished, resetting frontend');
  
  // Send reset message to all clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'reset'
      }));
    }
  });
});

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
  console.log('[APP] WebSocket server running on port', PORT);
});
