const events = require('events');
const arduino = require('./arduino.js');
const readline = require('readline');
const emitter = new events.EventEmitter();

/* INPUT ID MAPPINGS (Click Events) */
const INPUT_IDS = {
  // Outer circles (1-8)
  OUTER_CIRCLE_1: 1,
  OUTER_CIRCLE_2: 2,
  OUTER_CIRCLE_3: 3,
  OUTER_CIRCLE_4: 4,
  OUTER_CIRCLE_5: 5,
  OUTER_CIRCLE_6: 6,
  OUTER_CIRCLE_7: 7,
  OUTER_CIRCLE_8: 8,
  
  // Inner circles (9-13) - clickable only
  INNER_CIRCLE_1: 9,
  INNER_CIRCLE_2: 10,
  INNER_CIRCLE_3: 11,
  INNER_CIRCLE_4: 12,
  INNER_CIRCLE_5: 13,
  
  // Control buttons (14-22)
  CONTROL_BUTTON_1: 14,
  CONTROL_BUTTON_2: 15,
  CONTROL_BUTTON_3: 16,
  CONTROL_BUTTON_4: 17,
  CONTROL_BUTTON_5: 18,
  CONTROL_BUTTON_6: 19,
  CONTROL_BUTTON_7: 20,
  CONTROL_BUTTON_8: 21,
  CONTROL_BUTTON_9: 22
};

/* OUTPUT ID MAPPINGS (LED Control) */
const OUTPUT_IDS = {
  // Outer circles (1-8)
  OUTER_CIRCLE_1: 1,
  OUTER_CIRCLE_2: 2,
  OUTER_CIRCLE_3: 3,
  OUTER_CIRCLE_4: 4,
  OUTER_CIRCLE_5: 5,
  OUTER_CIRCLE_6: 6,
  OUTER_CIRCLE_7: 7,
  OUTER_CIRCLE_8: 8,
  
  // Central circle (9)
  CENTRAL_CIRCLE: 9,
  
  // Control buttons (14-22)
  CONTROL_BUTTON_1: 14,
  CONTROL_BUTTON_2: 15,
  CONTROL_BUTTON_3: 16,
  CONTROL_BUTTON_4: 17,
  CONTROL_BUTTON_5: 18,
  CONTROL_BUTTON_6: 19,
  CONTROL_BUTTON_7: 20,
  CONTROL_BUTTON_8: 21,
  CONTROL_BUTTON_9: 22
};

/* RANGES FOR VALIDATION */
const OUTER_CIRCLES_RANGE = { min: 1, max: 8 };
const INNER_CIRCLES_RANGE = { min: 9, max: 13 };
const CONTROL_BUTTONS_RANGE = { min: 14, max: 22 };
const CENTRAL_CIRCLE_ID = 9;



let roundInterval;
let isRunning = false;
let keyboardListenerActive = false;
let currentRoundIndex = 0;

// Game state variables for dynamic data transfer
let gameState = {
  manche: 1,
  niveau: 1,
  score: 0,
  missionNumber: 1,
  multiplier: 'x1',
  missionDescription: 'Waiting for mission...',
  totalGameTimeMinutes: 15 // Total game time in minutes
};

// Round-based game configuration
let gameRounds = [
  {
    round: 1,
    level: 1,
    mission: 'Warm-up: Touch any GREEN circles!',
    duration: 60 // 1 minute
  },
  {
    round: 2,
    level: 1,
    mission: 'Speed round: Touch BLUE circles quickly!',
    duration: 45 // 45 seconds
  },
  {
    round: 3,
    level: 2,
    mission: 'Precision: Only YELLOW circles, avoid RED!',
    duration: 90 // 1.5 minutes
  },
  {
    round: 4,
    level: 2,
    mission: 'Memory test: Follow the pattern sequence!',
    duration: 120 // 2 minutes
  },
  {
    round: 5,
    level: 3,
    mission: 'Challenge: Mix of all colors, bonus points!',
    duration: 75 // 1.25 minutes
  },
  {
    round: 6,
    level: 3,
    mission: 'Final sprint: Maximum speed and accuracy!',
    duration: 60 // 1 minute
  },
  {
    round: 7,
    level: 4,
    mission: 'Ultimate challenge: Master all techniques!',
    duration: 150 // 2.5 minutes
  },
  {
    round: 8,
    level: 4,
    mission: 'Finale: Show your mastery for maximum score!',
    duration: 210 // 3.5 minutes
  }
];

// Ensure total duration equals 15 minutes (900 seconds)
const totalDuration = gameRounds.reduce((sum, round) => sum + round.duration, 0);
console.log(`[STRIKELOOP] Total game duration: ${totalDuration} seconds (${Math.floor(totalDuration/60)} minutes ${totalDuration%60} seconds)`);

// Timer variables for round-based time management
let currentRoundTimeLeft = 0;
let timeUpdateInterval;

// Color mapping for LED control
const COLORS = {
  'r': '#e74c3c', // red
  'g': '#27ae60', // green  
  'b': '#3498db', // blue
  'y': '#f1c40f', // yellow
  'o': '#ffffff'  // off (white)
};

// Control buttons (14-22) only support on/off
const CONTROL_BUTTONS = [
  OUTPUT_IDS.CONTROL_BUTTON_1,
  OUTPUT_IDS.CONTROL_BUTTON_2,
  OUTPUT_IDS.CONTROL_BUTTON_3,
  OUTPUT_IDS.CONTROL_BUTTON_4,
  OUTPUT_IDS.CONTROL_BUTTON_5,
  OUTPUT_IDS.CONTROL_BUTTON_6,
  OUTPUT_IDS.CONTROL_BUTTON_7,
  OUTPUT_IDS.CONTROL_BUTTON_8,
  OUTPUT_IDS.CONTROL_BUTTON_9
];

// Setup keyboard listener
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Readline will handle input properly

// Event listener cleanup tracking
const gameEventListeners = [];

// Helper function to add tracked game event listeners
function addTrackedGameListener(emitter, event, handler) {
  emitter.on(event, handler);
  gameEventListeners.push({ emitter, event, handler });
}

// Listen for game start events
addTrackedGameListener(emitter, 'start', (teamData) => {
  console.log('[STRIKELOOP] Game start received for team:', teamData.teamName);
  startRoundBasedGame();
  setupKeyboardListener();
});



// Listen for Arduino input events during game
addTrackedGameListener(emitter, 'EventInput', (message, value) => {
  if (isRunning) {
    console.log('[STRIKELOOP] Arduino input received during game:', message, 'Value:', value);
  } else {
    console.log('[STRIKELOOP] Arduino input received but no game running');
  }
});

// Listen for circle click events from simulator
addTrackedGameListener(emitter, 'circleClick', (data) => {
  if (isRunning) {
    console.log('[STRIKELOOP] Circle clicked - ID:', data.circleId);
  } else {
    console.log('[STRIKELOOP] Circle clicked but no game running');
  }
});

function startRoundBasedGame() {
  if (isRunning) return;

  isRunning = true;
  currentRoundIndex = 0;
  console.log('[STRIKELOOP] Starting round-based game');

  // Initialize game state
  initializeGameState();

  emitter.emit('gameStarted');

  // Start the first round
  startNextRound();
}

function startNextRound() {
  if (currentRoundIndex >= gameRounds.length) {
    // All rounds completed
    finishGame();
    return;
  }

  const currentRound = gameRounds[currentRoundIndex];
  currentRoundTimeLeft = currentRound.duration;

  console.log(`[STRIKELOOP] Starting Round ${currentRound.round} - Level ${currentRound.level}`);
  console.log(`[STRIKELOOP] Mission: ${currentRound.mission}`);
  console.log(`[STRIKELOOP] Duration: ${currentRound.duration} seconds`);

  // Update game state
  gameState.manche = currentRound.round;
  gameState.niveau = currentRound.level;
  gameState.missionNumber = currentRound.round;
  gameState.missionDescription = currentRound.mission;

  // Emit round update to clients
  emitter.emit('roundUpdate', {
    round: currentRound.round,
    level: currentRound.level,
    mission: currentRound.mission,
    duration: currentRound.duration,
    timeLeft: currentRoundTimeLeft,
    timeString: formatTime(currentRoundTimeLeft)
  });

  // Emit game data update
  emitter.emit('gameDataUpdate', gameState);
  emitter.emit('missionUpdate', {
    number: currentRound.round,
    description: currentRound.mission
  });

  // Start round timer
  startRoundTimer();
}

function startRoundTimer() {
  // Send initial time
  emitter.emit('timeUpdate', {
    timeLeft: currentRoundTimeLeft,
    timeString: formatTime(currentRoundTimeLeft)
  });

  // Clear any existing timer
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }

  // Update time every second
  timeUpdateInterval = setInterval(() => {
    if (currentRoundTimeLeft > 0) {
      currentRoundTimeLeft--;
      const timeString = formatTime(currentRoundTimeLeft);

      emitter.emit('timeUpdate', {
        timeLeft: currentRoundTimeLeft,
        timeString: timeString
      });

      // Log time updates every 15 seconds
      if (currentRoundTimeLeft % 15 === 0) {
        console.log(`[STRIKELOOP] Round ${gameRounds[currentRoundIndex].round} time remaining: ${timeString}`);
      }
    } else {
      // Round finished, move to next
      stopRoundTimer();
      currentRoundIndex++;

      if (currentRoundIndex < gameRounds.length) {
        console.log(`[STRIKELOOP] Round ${gameRounds[currentRoundIndex - 1].round} completed, starting next round...`);
        setTimeout(() => {
          startNextRound();
        }, 2000); // 2-second break between rounds
      } else {
        finishGame();
      }
    }
  }, 1000);
}

function stopRoundTimer() {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
}

function finishGame() {
  isRunning = false;
  disableKeyboardListener();
  stopRoundTimer();
  console.log('[STRIKELOOP] All rounds completed - game finished');
  emitter.emit('gameFinished');

  // Cleanup event listeners
  cleanupGameEventListeners();
}

// Cleanup function to remove all game event listeners
function cleanupGameEventListeners() {
  console.log('[STRIKELOOP] Cleaning up game event listeners...');
  gameEventListeners.forEach(({ emitter, event, handler }) => {
    emitter.removeListener(event, handler);
  });
  gameEventListeners.length = 0;
}

// Initialize game state and send to frontend
function initializeGameState() {
  gameState = {
    manche: 1,
    niveau: 1,
    score: 0,
    missionNumber: 1,
    multiplier: 'x1',
    missionDescription: 'Game starting... Prepare for first round!',
    totalGameTimeMinutes: 15
  };

  console.log('[STRIKELOOP] Game state initialized:', gameState);
  console.log('[STRIKELOOP] Total rounds configured:', gameRounds.length);
  console.log('[STRIKELOOP] Total game duration:', totalDuration, 'seconds');

  emitter.emit('gameDataUpdate', gameState);
}

// Function to update game score (to be called from game logic later)
function updateScore(newScore) {
  gameState.score = newScore;
  console.log('[STRIKELOOP] Score updated to:', newScore);
  emitter.emit('scoreUpdate', newScore);
}

// Function to update mission (to be called from game logic later)
function updateMission(missionNumber, description) {
  gameState.missionNumber = missionNumber;
  gameState.missionDescription = description;
  console.log('[STRIKELOOP] Mission updated:', { number: missionNumber, description });
  emitter.emit('missionUpdate', {
    number: missionNumber,
    description: description
  });
}

// Function to update round/level (to be called from game logic later)
function updateRound(manche, niveau) {
  gameState.manche = manche;
  gameState.niveau = niveau;
  console.log('[STRIKELOOP] Round updated:', { manche, niveau });
  emitter.emit('gameDataUpdate', { manche, niveau });
}

// Function to update multiplier (to be called from game logic later)
function updateMultiplier(multiplier) {
  gameState.multiplier = multiplier;
  console.log('[STRIKELOOP] Multiplier updated to:', multiplier);
  emitter.emit('gameDataUpdate', { multiplier });
}

function stopGame() {
  if (isRunning) {
    isRunning = false;
    keyboardListenerActive = false;
    stopRoundTimer();
    console.log('[STRIKELOOP] Game stopped - Keyboard controls disabled');
    emitter.emit('gameStopped');
    cleanupGameEventListeners();
  }
}

// Get current round info
function getCurrentRound() {
  if (currentRoundIndex < gameRounds.length) {
    return gameRounds[currentRoundIndex];
  }
  return null;
}

// Get total remaining time across all rounds
function getTotalRemainingTime() {
  let totalRemaining = currentRoundTimeLeft;

  // Add time from remaining rounds
  for (let i = currentRoundIndex + 1; i < gameRounds.length; i++) {
    totalRemaining += gameRounds[i].duration;
  }

  return totalRemaining;
}

// Format time in MM:SS format
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Function to customize game rounds (to be called before game starts)
function setGameRounds(customRounds) {
  if (!isRunning) {
    gameRounds = customRounds;
    const totalDuration = gameRounds.reduce((sum, round) => sum + round.duration, 0);
    console.log(`[STRIKELOOP] Custom rounds set: ${gameRounds.length} rounds, ${totalDuration} seconds total`);
  } else {
    console.log('[STRIKELOOP] Cannot change rounds while game is running');
  }
}

function disableKeyboardListener() {
  keyboardListenerActive = false;
  console.log('[STRIKELOOP] Keyboard controls disabled - Game ended');
}

// Legacy function for backward compatibility
function startCountdown() {
  console.log('[STRIKELOOP] startCountdown() is deprecated, using startRoundBasedGame() instead');
  startRoundBasedGame();
}

// Legacy function for backward compatibility
function stopCountdown() {
  console.log('[STRIKELOOP] stopCountdown() is deprecated, using stopGame() instead');
  stopGame();
}


function controlOutput(outputNum, value) {
  console.log('[STRIKELOOP] Setting output', outputNum, 'to', value);
  arduino.set_output(outputNum, value);
}

// Temp function to control LEDs and send to frontend
function controlLED(elementId, colorCode) {
  console.log('[STRIKELOOP] Controlling LED - ID:', elementId, 'Color:', colorCode);
  
  // Get color value
  let colorValue;
  if (colorCode === '1') {
    // Control buttons use their original color when on
    colorValue = getControlButtonColor(elementId);
  } else {
    colorValue = COLORS[colorCode] || '#ffffff';
  }
  
  // Emit LED control event to app.js middleware
  emitter.emit('ledControl', {
    elementId: elementId,
    colorCode: colorCode,
    colorValue: colorValue,
    timestamp: Date.now()
  });
}

// Get the original color for control buttons when turned on
function getControlButtonColor(elementId) {
  // Map control button IDs to their original colors
  const buttonColors = {
    14: '#27ae60', // green
    15: '#f1c40f', // yellow
    16: '#3498db', // blue
    17: '#f1c40f', // yellow
    18: '#3498db', // blue
    19: '#27ae60', // green
    20: '#3498db', // blue
    21: '#27ae60', // green
    22: '#f1c40f'  // yellow
  };
  return buttonColors[elementId] || '#ffffff';
}

// Setup keyboard listener for manual LED control
function setupKeyboardListener() {
  keyboardListenerActive = true;
  console.log('[STRIKELOOP] Keyboard listener active! Type commands and press Enter');
  console.log('[STRIKELOOP] Examples: 1b (circle 1 blue), 9r (central circle red), 15 (button 15 on), 15o (button 15 off)');
  console.log('[STRIKELOOP] Outer Circles (1-8): [id][color] - Colors: b=blue, g=green, r=red, y=yellow, o=off');
  console.log('[STRIKELOOP] Central Circle: 9[color] - Colors: b=blue, g=green, r=red, y=yellow, o=off');
  console.log('[STRIKELOOP] Control Buttons (14-22): [id] (on) or [id]o (off)');
  console.log('[STRIKELOOP] Inner Circles (10-13): Clickable only, no LED control');
  
  rl.on('line', (input) => {
    // Check if keyboard listener is still active
    if (!keyboardListenerActive) {
      console.log('[STRIKELOOP] Game not running. Keyboard commands disabled. Start a new game to enable controls.');
      return;
    }
    
    const command = input.trim();
    
    if (command.length < 1) {
      console.log('[STRIKELOOP] Invalid command. Use format: [circleId][color] or [buttonId] or [buttonId]o');
      return;
    }
    
    let circleId, colorCode;
    
    // Check if it's a control button command (14-22)
    if (command.endsWith('o') && command.length >= 3) {
      // Format: 15o, 21o, etc.
      const twoDigitId = parseInt(command.substring(0, 2));
      if (twoDigitId >= CONTROL_BUTTONS_RANGE.min && twoDigitId <= CONTROL_BUTTONS_RANGE.max) {
        console.log(`[STRIKELOOP] Control button ${twoDigitId} -> OFF`);
        controlLED(twoDigitId, 'o');
        return;
      }
    } else if (command.length >= 2) {
      // Try two-digit number
      const twoDigitId = parseInt(command.substring(0, 2));
      if (twoDigitId >= CONTROL_BUTTONS_RANGE.min && twoDigitId <= CONTROL_BUTTONS_RANGE.max) {
        // Control button on
        console.log(`[STRIKELOOP] Control button ${twoDigitId} -> ON`);
        controlLED(twoDigitId, '1');
        return;
      } else if (twoDigitId >= 10 && twoDigitId <= 13) {
        // Inner circles (10-13) with color
        circleId = twoDigitId;
        colorCode = command[2] ? command[2].toLowerCase() : 'o';
      }
    }
    
    // Single digit or circle with color
    if (!circleId && command.length >= 1) {
      circleId = parseInt(command[0]);
      if (circleId >= OUTER_CIRCLES_RANGE.min && circleId <= OUTER_CIRCLES_RANGE.max) {
        colorCode = command[1] ? command[1].toLowerCase() : 'o';
      } else if (circleId === CENTRAL_CIRCLE_ID) {
        colorCode = command[1] ? command[1].toLowerCase() : 'o';
      }
      console.log(`[STRIKELOOP] Single digit parsing: circleId=${circleId}, colorCode=${colorCode}, command=${command}`);
    }
    
    // Process circle commands using constants
    if (circleId >= OUTER_CIRCLES_RANGE.min && circleId <= OUTER_CIRCLES_RANGE.max) {
      // Outer circles (1-8) - direct LED control
      if (COLORS[colorCode]) {
        console.log(`[STRIKELOOP] Circle ${circleId} -> ${colorCode.toUpperCase()}`);
        controlLED(circleId, colorCode);
      } else {
        console.log(`[STRIKELOOP] Invalid color for circle ${circleId}. Use: b/g/r/y/o`);
      }
    } else if (circleId === CENTRAL_CIRCLE_ID) {
      // Central circle - ID 9 for LED control
      console.log(`[STRIKELOOP] Processing central circle: circleId=${circleId}, colorCode=${colorCode}, COLORS[colorCode]=${COLORS[colorCode]}`);
      if (COLORS[colorCode]) {
        console.log(`[STRIKELOOP] Central circle -> ${colorCode.toUpperCase()}`);
        controlLED(CENTRAL_CIRCLE_ID, colorCode);
      } else {
        console.log(`[STRIKELOOP] Invalid color for central circle. Use: b/g/r/y/o`);
      }
    } else if (circleId >= INNER_CIRCLES_RANGE.min && circleId <= INNER_CIRCLES_RANGE.max) {
      // Inner circles (9-13) - only clickable, no LED control
      console.log(`[STRIKELOOP] Inner circle ${circleId} is clickable only. Use ${CENTRAL_CIRCLE_ID}[color] for central circle LED control.`);
    } else if (circleId >= CONTROL_BUTTONS_RANGE.min && circleId <= CONTROL_BUTTONS_RANGE.max) {
      console.log(`[STRIKELOOP] Control button ${circleId} commands should use simple format: ${circleId} or ${circleId}o`);
    } else {
      console.log(`[STRIKELOOP] Invalid command. Use: [${OUTER_CIRCLES_RANGE.min}-${OUTER_CIRCLES_RANGE.max}][color] or ${CENTRAL_CIRCLE_ID}[color] or [${CONTROL_BUTTONS_RANGE.min}-${CONTROL_BUTTONS_RANGE.max}] or [${CONTROL_BUTTONS_RANGE.min}-${CONTROL_BUTTONS_RANGE.max}]o`);
    }
  });
}

module.exports = {
  emitter,
  startRoundBasedGame,
  stopGame,
  controlOutput,
  isRunning: () => isRunning,
  // Export functions for future game logic implementation
  updateScore,
  updateMission,
  updateRound,
  updateMultiplier,
  gameState: () => gameState,
  // Export round management functions
  setGameRounds,
  getCurrentRound,
  getTotalRemainingTime,
  formatTime,
  // Export game rounds for inspection
  gameRounds: () => gameRounds,
  currentRoundIndex: () => currentRoundIndex
};

// Handle graceful shutdown
process.on('SIGTERM', cleanupGameEventListeners);
process.on('SIGINT', cleanupGameEventListeners);
