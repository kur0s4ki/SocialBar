const WebSocket = require('ws');
const http = require('http');
const arduino = require('./arduino.js');
const strikeLoop = require('./strikeLoop.js');

// Create HTTP servers for both staff and display clients
const staffServer = http.createServer();
const displayServer = http.createServer();

// Create separate WebSocket servers
const staffWss = new WebSocket.Server({ server: staffServer });
const displayWss = new WebSocket.Server({ server: displayServer });

// Store connected clients with metadata
const staffClients = new Map();
const displayClients = new Map();
let staffClientIdCounter = 1;
let displayClientIdCounter = 1;

// Staff WebSocket connection handling
staffWss.on('connection', (ws) => {
  const clientId = `staff-${staffClientIdCounter++}`;
  const clientData = {
    id: clientId,
    ws: ws,
    type: 'staff',
    connectedAt: new Date().toISOString(),
    ip: ws._socket.remoteAddress
  };

  staffClients.set(clientId, clientData);
  console.log(`[STAFF-WS] New staff client connected: ${clientId} from ${clientData.ip} (Total staff clients: ${staffClients.size})`);

  // Send client ID to the new client
  ws.send(JSON.stringify({
    type: 'clientId',
    clientId: clientId
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const client = [...staffClients.values()].find(c => c.ws === ws);
      const clientId = client ? client.id : 'unknown';

      // Handle different message types
      switch (data.type) {
        case 'start':
          if (data.teamName) {
            console.log(`[STAFF-WS] Game start request from ${clientId} for team: ${data.teamName}`);
            strikeLoop.emitter.emit('start', data);
          }
          break;

        case 'circleClick':
          if (data.circleId) {
            console.log(`[STAFF-WS] Circle click from ${clientId}: circle ${data.circleId}`);
            strikeLoop.emitter.emit('circleClick', data);
          }
          break;

        default:
          console.log(`[STAFF-WS] Unknown message type from ${clientId}: ${data.type}`);
      }
    } catch (error) {
      console.error(`[STAFF-WS] Error parsing message from client:`, error);
    }
  });

  ws.on('close', () => {
    const client = [...staffClients.values()].find(c => c.ws === ws);
    if (client) {
      console.log(`[STAFF-WS] Client disconnected: ${client.id} - was connected since ${client.connectedAt}`);
      staffClients.delete(client.id);
    } else {
      console.log('[STAFF-WS] Unknown client disconnected');
    }
    console.log(`[STAFF-WS] Total staff clients remaining: ${staffClients.size}`);
  });
});

// Display WebSocket connection handling
displayWss.on('connection', (ws) => {
  const clientId = `display-${displayClientIdCounter++}`;
  const clientData = {
    id: clientId,
    ws: ws,
    type: 'display',
    connectedAt: new Date().toISOString(),
    ip: ws._socket.remoteAddress
  };

  displayClients.set(clientId, clientData);
  console.log(`[DISPLAY-WS] New display client connected: ${clientId} from ${clientData.ip} (Total display clients: ${displayClients.size})`);

  // Send client ID to the new client
  ws.send(JSON.stringify({
    type: 'clientId',
    clientId: clientId
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const client = [...displayClients.values()].find(c => c.ws === ws);
      const clientId = client ? client.id : 'unknown';

      console.log(`[DISPLAY-WS] Message from ${clientId}:`, data);

      // Display clients are mainly read-only, but can acknowledge messages
      switch (data.type) {
        case 'acknowledge':
          console.log(`[DISPLAY-WS] Acknowledgment from ${clientId}:`, data.messageType);
          break;

        default:
          console.log(`[DISPLAY-WS] Unknown message type from ${clientId}: ${data.type}`);
      }
    } catch (error) {
      console.error(`[DISPLAY-WS] Error parsing message from client:`, error);
    }
  });

  ws.on('close', () => {
    const client = [...displayClients.values()].find(c => c.ws === ws);
    if (client) {
      console.log(`[DISPLAY-WS] Client disconnected: ${client.id} - was connected since ${client.connectedAt}`);
      displayClients.delete(client.id);
    } else {
      console.log('[DISPLAY-WS] Unknown client disconnected');
    }
    console.log(`[DISPLAY-WS] Total display clients remaining: ${displayClients.size}`);
  });
});

// Listen for Arduino events and forward to strikeLoop
arduino.emitter.on('EventInput', (message, value) => {
  console.log('[APP] Arduino input received:', message, 'Value:', value);
  strikeLoop.emitter.emit('EventInput', message, value);
});

// Broadcast function to send messages to staff clients
function broadcastToStaff(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;

  staffClients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
      sentCount++;
    } else {
      console.log(`[STAFF-WS] Removing disconnected client: ${clientId}`);
      staffClients.delete(clientId);
    }
  });

  console.log(`[STAFF-WS] Broadcasted message type '${message.type}' to ${sentCount} staff clients`);
}

// Broadcast function to send messages to display clients
function broadcastToDisplay(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;

  displayClients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
      sentCount++;
    } else {
      console.log(`[DISPLAY-WS] Removing disconnected client: ${clientId}`);
      displayClients.delete(clientId);
    }
  });

  // Don't log timeUpdate broadcasts to reduce spam
  if (message.type !== 'timeUpdate') {
    console.log(`[DISPLAY-WS] Broadcasted message type '${message.type}' to ${sentCount} display clients`);
  }
}

// Event listener cleanup tracking
const eventListeners = [];

// Helper function to add tracked event listeners
function addTrackedListener(emitter, event, handler) {
  emitter.on(event, handler);
  eventListeners.push({ emitter, event, handler });
}

// Listen for strikeLoop events with proper scoping
addTrackedListener(strikeLoop.emitter, 'gameStarted', () => {
  console.log('[APP] Game started event received from strikeLoop');

  // Send to staff clients
  broadcastToStaff({
    type: 'gameStarted'
  });

  // Send to display clients
  broadcastToDisplay({
    type: 'gameStarted'
  });
});

// Listen for LED control events from strikeLoop
addTrackedListener(strikeLoop.emitter, 'ledControl', (data) => {
  // LED control is primarily for staff clients
  broadcastToStaff({
    type: 'ledControl',
    elementId: data.elementId,
    colorCode: data.colorCode,
    colorValue: data.colorValue,
    timestamp: data.timestamp
  });
});

addTrackedListener(strikeLoop.emitter, 'gameFinished', () => {
  console.log('[APP] Game finished, resetting frontend');

  // Send reset message to both client types
  broadcastToStaff({
    type: 'reset'
  });

  broadcastToDisplay({
    type: 'reset'
  });
});

// Unified game update listener - handles all game data in one event
addTrackedListener(strikeLoop.emitter, 'gameUpdate', (gameUpdateData) => {
  console.log('[APP] Game update received:', gameUpdateData);
  broadcastToDisplay({
    type: 'gameUpdate',
    ...gameUpdateData
  });
});

// Keep separate score update listener for mid-round score changes
addTrackedListener(strikeLoop.emitter, 'scoreUpdate', (score) => {
  console.log('[APP] Score update received:', score);
  broadcastToDisplay({
    type: 'scoreUpdate',
    score: score
  });
});

addTrackedListener(strikeLoop.emitter, 'timeUpdate', (timeData) => {
  // Send time updates only to display clients (not to staff) - no logging
  const message = {
    type: 'timeUpdate',
    timeLeft: timeData.timeLeft,
    timeString: timeData.timeString
  };

  broadcastToDisplay(message);
});

// Start the servers
const STAFF_PORT = 8080;
const DISPLAY_PORT = 8081;

staffServer.listen(STAFF_PORT, () => {
  console.log(`[STAFF-WS] Staff WebSocket server running on port ${STAFF_PORT}`);
});

displayServer.listen(DISPLAY_PORT, () => {
  console.log(`[DISPLAY-WS] Display WebSocket server running on port ${DISPLAY_PORT}`);
});

// Cleanup function to remove all event listeners
let isAppCleanedUp = false;

function cleanup() {
  if (isAppCleanedUp) return;
  isAppCleanedUp = true;

  console.log('[APP] Cleaning up event listeners...');
  eventListeners.forEach(({ emitter, event, handler }) => {
    emitter.removeListener(event, handler);
  });
  eventListeners.length = 0;
}

// Handle graceful shutdown
let isShuttingDown = false;

function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[APP] Shutting down servers...');
  cleanup();

  // Close servers
  staffServer.close(() => {
    console.log('[STAFF-WS] Server closed');
  });

  displayServer.close(() => {
    console.log('[DISPLAY-WS] Server closed');
  });

  // Force exit after 2 seconds if cleanup doesn't complete
  setTimeout(() => {
    console.log('[APP] Force exit');
    process.exit(0);
  }, 2000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
