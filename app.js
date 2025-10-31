const WebSocket = require('ws');
const http = require('http');
const arduino = require('./arduino.js');
const HAL = require('./hardwareAbstraction.js');
const strikeLoop = require('./strikeloop.js');
const logger = require('./logger.js');

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
  logger.info('STAFF-WS', `Client connected: ${clientId} (Total: ${staffClients.size})`);

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
            logger.info('STAFF-WS', `Game start: ${data.teamName}`);
            // Broadcast team name to display clients immediately
            broadcastToDisplay({
              type: 'teamName',
              name: data.teamName
            });
            strikeLoop.emitter.emit('start', data);
          }
          break;

        case 'circleClick':
          if (data.circleId) {
            logger.trace('STAFF-WS', `Circle ${data.circleId} clicked`); // Move to TRACE level - too frequent
            strikeLoop.emitter.emit('circleClick', data);
          }
          break;

        case 'hardReset':
          logger.warn('STAFF-WS', `Hard reset requested`);
          strikeLoop.emitter.emit('hardReset');
          break;

        case 'skipLevel':
          logger.warn('STAFF-WS', `Skip level requested (testing mode)`);
          strikeLoop.emitter.emit('skipLevel');
          break;

        default:
          logger.warn('STAFF-WS', `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('STAFF-WS', 'Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    const client = [...staffClients.values()].find(c => c.ws === ws);
    if (client) {
      logger.debug('STAFF-WS', `${client.id} disconnected (Remaining: ${staffClients.size - 1})`);
      staffClients.delete(client.id);
    }
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
  logger.info('DISPLAY-WS', `Client connected: ${clientId} (Total: ${displayClients.size})`);

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

      logger.trace('DISPLAY-WS', `Message from ${clientId}:`, data);

      // Display clients are mainly read-only, but can acknowledge messages
      switch (data.type) {
        case 'acknowledge':
          logger.trace('DISPLAY-WS', `Acknowledgment: ${data.messageType}`);
          break;

        default:
          logger.warn('DISPLAY-WS', `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('DISPLAY-WS', 'Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    const client = [...displayClients.values()].find(c => c.ws === ws);
    if (client) {
      logger.debug('DISPLAY-WS', `${client.id} disconnected (Remaining: ${displayClients.size - 1})`);
      displayClients.delete(client.id);
    }
  });
});

// Listen for Arduino events and forward to strikeLoop
arduino.emitter.on('EventInput', (message, value) => {
  logger.debug('APP', `Arduino input: ${message} = ${value}`);

  // CRITICAL FIX: Translate hardware ID to logical ID before forwarding to game
  // Hardware wiring doesn't match logical positions, so we need to reverse-map inputs
  const logicalId = HAL.translateHardwareToLogical(message);

  strikeLoop.emitter.emit('EventInput', logicalId, value);
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
      logger.debug('STAFF-WS', `Removing disconnected client: ${clientId}`);
      staffClients.delete(clientId);
    }
  });

  // Only log important broadcasts - suppress high-frequency messages
  const suppressedTypes = ['ledControl', 'timeUpdate', 'scoreUpdate'];
  if (!suppressedTypes.includes(message.type)) {
    logger.debug('STAFF-WS', `Broadcast '${message.type}' → ${sentCount} clients`);
  }
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
      logger.debug('DISPLAY-WS', `Removing disconnected client: ${clientId}`);
      displayClients.delete(clientId);
    }
  });

  // Only log important broadcasts - suppress high-frequency messages
  const suppressedTypes = ['ledControl', 'timeUpdate', 'scoreUpdate'];
  if (!suppressedTypes.includes(message.type)) {
    logger.debug('DISPLAY-WS', `Broadcast '${message.type}' → ${sentCount} clients`);
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
  logger.info('APP', 'Game started');

  // Send to staff clients
  broadcastToStaff({
    type: 'gameStarted'
  });

  // Send to display clients
  broadcastToDisplay({
    type: 'gameStarted'
  });
});

// Listen for LED control events from HAL (Hardware Abstraction Layer)
addTrackedListener(HAL.emitter, 'ledControl', (data) => {
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
  logger.info('APP', 'Game finished, resetting frontend');

  // Send reset message to both client types
  broadcastToStaff({
    type: 'reset'
  });

  broadcastToDisplay({
    type: 'reset'
  });
});

addTrackedListener(strikeLoop.emitter, 'reset', () => {
  logger.warn('APP', 'Hard reset triggered');

  // Send reset message to both client types
  broadcastToStaff({
    type: 'reset'
  });

  broadcastToDisplay({
    type: 'reset'
  });
});

// Individual event listeners for separation of concerns
addTrackedListener(strikeLoop.emitter, 'roundUpdate', (roundData) => {
  logger.debug('APP', `Round ${roundData.round} Level ${roundData.level}`);
  broadcastToDisplay({
    type: 'roundUpdate',
    ...roundData
  });
});

addTrackedListener(strikeLoop.emitter, 'missionUpdate', (missionData) => {
  logger.debug('APP', `Mission ${missionData.number}: ${missionData.description.substring(0, 40)}...`);
  broadcastToDisplay({
    type: 'missionUpdate',
    ...missionData
  });
});

addTrackedListener(strikeLoop.emitter, 'multiplierUpdate', (multiplier) => {
  logger.debug('APP', `Multiplier: ${multiplier}`);
  broadcastToDisplay({
    type: 'multiplierUpdate',
    multiplier: multiplier
  });
});

// Keep separate score update listener for mid-round score changes
addTrackedListener(strikeLoop.emitter, 'scoreUpdate', (scoreData) => {
  // Score updates are very frequent, suppress logging entirely
  // Handle both old format (number) and new format (object with score and goalScore)
  const score = typeof scoreData === 'number' ? scoreData : scoreData.score;
  const goalScore = typeof scoreData === 'object' ? scoreData.goalScore : undefined;

  logger.trace('APP', `Score: ${score}${goalScore ? ` / ${goalScore}` : ''}`);
  broadcastToDisplay({
    type: 'scoreUpdate',
    score: score,
    goalScore: goalScore
  });
});

// Sound effect events
addTrackedListener(strikeLoop.emitter, 'soundEffect', (soundData) => {
  logger.trace('APP', `Sound effect: ${soundData.effect}`);
  broadcastToDisplay({
    type: 'soundEffect',
    effect: soundData.effect
  });
});

addTrackedListener(strikeLoop.emitter, 'timeUpdate', (timeData) => {
  // Send time updates only to display clients (not to staff) - no logging
  const message = {
    type: 'timeUpdate',
    timeLeft: timeData.timeLeft,
    timeString: timeData.timeString,
    totalTimeLeft: timeData.totalTimeLeft,
    totalTimeString: timeData.totalTimeString
  };

  broadcastToDisplay(message);
});

addTrackedListener(strikeLoop.emitter, 'bonusActive', (isActive) => {
  logger.debug('APP', `Bonus zone: ${isActive ? 'ACTIVE' : 'inactive'}`);
  broadcastToDisplay({
    type: 'bonusActive',
    active: isActive
  });
});

// Configure Hardware Abstraction Layer mode
// Check command line arguments first, then environment variable, default to 'simulation'
let hardwareMode = 'simulation';
const modeArg = process.argv.find(arg => arg.startsWith('--mode='));
if (modeArg) {
  hardwareMode = modeArg.split('=')[1];
} else if (process.argv.includes('--hardware')) {
  hardwareMode = 'hardware';
} else if (process.argv.includes('--both')) {
  hardwareMode = 'both';
} else if (process.env.HARDWARE_MODE) {
  hardwareMode = process.env.HARDWARE_MODE;
}

HAL.setMode(hardwareMode);
logger.info('APP', `HAL mode: ${hardwareMode}`);
logger.info('APP', `Modes: simulation (default), hardware, both`);
logger.info('APP', `Change: node app.js --mode=hardware or --hardware or --both`);

// Start the servers
const STAFF_PORT = 8080;
const DISPLAY_PORT = 8081;

staffServer.listen(STAFF_PORT, () => {
  logger.info('STAFF-WS', `Server running on port ${STAFF_PORT}`);
});

displayServer.listen(DISPLAY_PORT, () => {
  logger.info('DISPLAY-WS', `Server running on port ${DISPLAY_PORT}`);
});

// Cleanup function to remove all event listeners
let isAppCleanedUp = false;

function cleanup() {
  if (isAppCleanedUp) return;
  isAppCleanedUp = true;

  logger.info('APP', 'Cleaning up event listeners...');
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

  logger.info('APP', 'Shutting down servers...');
  cleanup();

  // Close servers
  staffServer.close(() => {
    logger.info('STAFF-WS', 'Server closed');
  });

  displayServer.close(() => {
    logger.info('DISPLAY-WS', 'Server closed');
  });

  // Force exit after 2 seconds if cleanup doesn't complete
  setTimeout(() => {
    logger.warn('APP', 'Force exit');
    process.exit(0);
  }, 2000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
