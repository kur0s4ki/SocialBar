const WebSocket = require('ws');
const http = require('http');
const arduino = require('./arduino.js');
const strikeLoop = require('./strikeLoop.js');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients with metadata
const clients = new Map();
let clientIdCounter = 1;

// WebSocket connection handling
wss.on('connection', (ws) => {
  const clientId = `client-${clientIdCounter++}`;
  const clientData = {
    id: clientId,
    ws: ws,
    type: 'unknown',
    connectedAt: new Date().toISOString(),
    ip: ws._socket.remoteAddress
  };
  
  clients.set(clientId, clientData);
  console.log(`[APP] New client connected: ${clientId} from ${clientData.ip} (Total clients: ${clients.size})`);
  
  // Send client ID to the new client
  ws.send(JSON.stringify({
    type: 'clientId',
    clientId: clientId
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const client = [...clients.values()].find(c => c.ws === ws);
      const clientId = client ? client.id : 'unknown';
      
      console.log(`[APP] Message from ${clientId}:`, data);
      
      // Handle different message types
      switch (data.type) {
        case 'clientConnect':
          if (client) {
            client.type = data.clientType || 'unknown';
            console.log(`[APP] Client ${clientId} identified as: ${client.type}`);
          }
          break;
          
        case 'start':
          if (data.teamName) {
            console.log(`[APP] Game start request from ${clientId} for team: ${data.teamName}`);
            strikeLoop.emitter.emit('start', data);
          }
          break;
          
        case 'circleClick':
          if (data.circleId) {
            console.log(`[APP] Circle click from ${clientId}: circle ${data.circleId}`);
            strikeLoop.emitter.emit('circleClick', data);
          }
          break;
          
        default:
          console.log(`[APP] Unknown message type from ${clientId}: ${data.type}`);
      }
    } catch (error) {
      console.error(`[APP] Error parsing message from client:`, error);
    }
  });

  ws.on('close', () => {
    const client = [...clients.values()].find(c => c.ws === ws);
    if (client) {
      console.log(`[APP] Client disconnected: ${client.id} (${client.type}) - was connected since ${client.connectedAt}`);
      clients.delete(client.id);
    } else {
      console.log('[APP] Unknown client disconnected');
    }
    console.log(`[APP] Total clients remaining: ${clients.size}`);
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
  broadcastToClients({
    type: 'gameStarted'
  });
});

// Listen for LED control events from strikeLoop
strikeLoop.emitter.on('ledControl', (data) => {
  //console.log('[APP] LED control event received:', data);
  
  // Send LED control message to all clients
  broadcastToClients({
    type: 'ledControl',
    elementId: data.elementId,
    colorCode: data.colorCode,
    colorValue: data.colorValue,
    timestamp: data.timestamp
  });
});

strikeLoop.emitter.on('gameFinished', () => {
  console.log('[APP] Game finished, resetting frontend');
  
  // Send reset message to all clients
  broadcastToClients({
    type: 'reset'
  });
});

// Broadcast function to send messages to all connected clients
function broadcastToClients(message, excludeTypes = []) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  clients.forEach((client, clientId) => {
    if (excludeTypes.includes(client.type)) {
      return; // Skip excluded client types
    }
    
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
      sentCount++;
    } else {
      console.log(`[APP] Removing disconnected client: ${clientId}`);
      clients.delete(clientId);
    }
  });
  
  console.log(`[APP] Broadcasted message type '${message.type}' to ${sentCount} clients`);
}

// Function to send message to specific client types
function sendToClientTypes(message, targetTypes = []) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  clients.forEach((client, clientId) => {
    if (targetTypes.length === 0 || targetTypes.includes(client.type)) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
        sentCount++;
      }
    }
  });
  
  console.log(`[APP] Sent message type '${message.type}' to ${sentCount} clients of types: ${targetTypes.join(', ')}`);
}

// Add new event listeners for dynamic game data
strikeLoop.emitter.on('gameDataUpdate', (gameData) => {
  console.log('[APP] Game data update received:', gameData);
  sendToClientTypes({
    type: 'gameData',
    gameData: gameData
  }, ['gameInProgress']);
});

strikeLoop.emitter.on('scoreUpdate', (score) => {
  console.log('[APP] Score update received:', score);
  sendToClientTypes({
    type: 'scoreUpdate',
    score: score
  }, ['gameInProgress']);
});

strikeLoop.emitter.on('missionUpdate', (mission) => {
  console.log('[APP] Mission update received:', mission);
  sendToClientTypes({
    type: 'missionUpdate',
    mission: mission
  }, ['gameInProgress']);
});

strikeLoop.emitter.on('timeUpdate', (timeData) => {
  // Send time updates to all clients (both main app and gameInProgress)
  broadcastToClients({
    type: 'timeUpdate',
    timeLeft: timeData.timeLeft,
    timeString: timeData.timeString
  });
});

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
  console.log('[APP] WebSocket server running on port', PORT);
});
