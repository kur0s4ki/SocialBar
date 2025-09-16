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
let currentLevelIndex = 0; // Index into gameRounds array (0-29 for 30 levels total)

// Game state variables for dynamic data transfer
let gameState = {
  round: 1,
  level: 1,
  score: 0,
  missionNumber: 1,
  multiplier: 'x1',
  missionDescription: 'Waiting for mission...',
  totalGameTimeMinutes: 15 // Total game time in minutes
};

// Round-based game configuration: 3 rounds, each with 10 levels
let gameRounds = [
  // ROUND 1: Basic Training (5 minutes = 300 seconds)
  { round: 1, level: 1, mission: 'Warm-up: Touch GREEN circles!', duration: 30 },
  { round: 1, level: 2, mission: 'Get familiar with BLUE circles!', duration: 30 },
  { round: 1, level: 3, mission: 'Try YELLOW circles now!', duration: 30 },
  { round: 1, level: 4, mission: 'Practice with RED circles!', duration: 30 },
  { round: 1, level: 5, mission: 'Mix of GREEN and BLUE!', duration: 30 },
  { round: 1, level: 6, mission: 'YELLOW and RED combination!', duration: 30 },
  { round: 1, level: 7, mission: 'Speed up: Any GREEN circles!', duration: 30 },
  { round: 1, level: 8, mission: 'Quick BLUE circles only!', duration: 30 },
  { round: 1, level: 9, mission: 'Fast YELLOW targets!', duration: 30 },
  { round: 1, level: 10, mission: 'Round 1 finale: All colors!', duration: 30 },

  // ROUND 2: Intermediate Challenge (5 minutes = 300 seconds)
  { round: 2, level: 1, mission: 'Precision: Only BLUE circles!', duration: 30 },
  { round: 2, level: 2, mission: 'Avoid RED, hit GREEN!', duration: 30 },
  { round: 2, level: 3, mission: 'YELLOW only, ignore others!', duration: 30 },
  { round: 2, level: 4, mission: 'Memory: Follow the pattern!', duration: 30 },
  { round: 2, level: 5, mission: 'Speed round: Quick hits!', duration: 30 },
  { round: 2, level: 6, mission: 'Accuracy test: No mistakes!', duration: 30 },
  { round: 2, level: 7, mission: 'Multi-color challenge!', duration: 30 },
  { round: 2, level: 8, mission: 'Sequence memory test!', duration: 30 },
  { round: 2, level: 9, mission: 'Rapid fire challenge!', duration: 30 },
  { round: 2, level: 10, mission: 'Round 2 boss level!', duration: 30 },

  // ROUND 3: Master Level (5 minutes = 300 seconds)
  { round: 3, level: 1, mission: 'Master warm-up!', duration: 30 },
  { round: 3, level: 2, mission: 'Advanced patterns!', duration: 30 },
  { round: 3, level: 3, mission: 'Speed and precision!', duration: 30 },
  { round: 3, level: 4, mission: 'Complex sequences!', duration: 30 },
  { round: 3, level: 5, mission: 'Maximum difficulty!', duration: 30 },
  { round: 3, level: 6, mission: 'Elite challenge!', duration: 30 },
  { round: 3, level: 7, mission: 'Ultimate speed test!', duration: 30 },
  { round: 3, level: 8, mission: 'Master precision!', duration: 30 },
  { round: 3, level: 9, mission: 'Final challenge!', duration: 30 },
  { round: 3, level: 10, mission: 'GRAND FINALE!', duration: 30 }
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
  currentLevelIndex = 0;
  console.log('[STRIKELOOP] Starting game: 3 rounds, 10 levels each');

  // Initialize game state
  initializeGameState();

  emitter.emit('gameStarted');

  // Start the first level
  startNextLevel();
}

function startNextLevel() {
  if (currentLevelIndex >= gameRounds.length) {
    // All levels completed
    finishGame();
    return;
  }

  const currentLevel = gameRounds[currentLevelIndex];
  currentRoundTimeLeft = currentLevel.duration;

  console.log(`[STRIKELOOP] Starting Round ${currentLevel.round} - Level ${currentLevel.level}`);
  console.log(`[STRIKELOOP] Mission: ${currentLevel.mission}`);
  console.log(`[STRIKELOOP] Duration: ${currentLevel.duration} seconds`);

  // Update game state
  gameState.round = currentLevel.round;
  gameState.level = currentLevel.level;
  gameState.missionNumber = currentLevel.level; // Mission number is the level number
  gameState.missionDescription = currentLevel.mission;

  // Emit individual events for each aspect of the game
  emitter.emit('roundUpdate', {
    round: currentLevel.round,
    level: currentLevel.level,
    duration: currentLevel.duration
  });

  emitter.emit('missionUpdate', {
    number: currentLevel.level,
    description: currentLevel.mission
  });

  emitter.emit('timeUpdate', {
    timeLeft: currentRoundTimeLeft,
    timeString: formatTime(currentRoundTimeLeft)
  });

  emitter.emit('scoreUpdate', gameState.score);

  emitter.emit('multiplierUpdate', gameState.multiplier);

  // Start level timer
  startLevelTimer();
}

function startLevelTimer() {
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

      // Log time updates every 30 seconds
      if (currentRoundTimeLeft % 30 === 0) {
        console.log(`[STRIKELOOP] Round ${gameRounds[currentLevelIndex].round} Level ${gameRounds[currentLevelIndex].level} time remaining: ${timeString}`);
      }
    } else {
      // Level finished, move to next
      stopLevelTimer();
      const currentLevel = gameRounds[currentLevelIndex];
      currentLevelIndex++;

      if (currentLevelIndex < gameRounds.length) {
        console.log(`[STRIKELOOP] Round ${currentLevel.round} Level ${currentLevel.level} completed, starting next level...`);

        // Add random score at end of each level
        const randomScoreIncrease = Math.floor(Math.random() * 200) + 50; // Random between 50-250 points per level
        const newScore = gameState.score + randomScoreIncrease;
        updateScore(newScore);
        console.log(`[STRIKELOOP] Level completed! Added ${randomScoreIncrease} points. New total: ${newScore}`);

        // Check if we completed a round (every 10 levels)
        if (currentLevelIndex % 10 === 0) {
          const completedRound = Math.floor(currentLevelIndex / 10);
          const roundBonus = completedRound * 500; // Bonus for completing a round
          const bonusScore = newScore + roundBonus;
          updateScore(bonusScore);
          console.log(`[STRIKELOOP] ROUND ${completedRound} COMPLETED! Round bonus: ${roundBonus} points. Total: ${bonusScore}`);
        }

        setTimeout(() => {
          startNextLevel();
        }, 2000); // 2-second break between levels
      } else {
        // Add final score bonus when game completes
        const finalBonus = Math.floor(Math.random() * 2000) + 1000; // Random between 1000-3000 points
        const finalScore = gameState.score + finalBonus;
        updateScore(finalScore);
        console.log(`[STRIKELOOP] ALL 3 ROUNDS COMPLETED! Final bonus: ${finalBonus} points. Final score: ${finalScore}`);

        finishGame();
      }
    }
  }, 1000);
}

function stopLevelTimer() {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
}

function finishGame() {
  isRunning = false;
  disableKeyboardListener();
  stopLevelTimer();
  console.log('[STRIKELOOP] All 30 levels (3 rounds × 10 levels) completed - game finished');
  emitter.emit('gameFinished');

  // Cleanup event listeners
  cleanupGameEventListeners();
}

// Cleanup function to remove all game event listeners
let isGameCleanedUp = false;

function cleanupGameEventListeners() {
  if (isGameCleanedUp) return;
  isGameCleanedUp = true;

  console.log('[STRIKELOOP] Cleaning up game event listeners...');
  gameEventListeners.forEach(({ emitter, event, handler }) => {
    emitter.removeListener(event, handler);
  });
  gameEventListeners.length = 0;
}

// Initialize game state and send to frontend
function initializeGameState() {
  gameState = {
    round: 1,
    level: 1,
    score: 0,
    missionNumber: 1,
    multiplier: 'x1',
    missionDescription: 'Game starting... Prepare for first round!',
    totalGameTimeMinutes: 15
  };

  console.log('[STRIKELOOP] Game state initialized:', gameState);
  console.log('[STRIKELOOP] Total rounds configured:', gameRounds.length);
  console.log('[STRIKELOOP] Total game duration:', totalDuration, 'seconds');
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
function updateRound(round, level) {
  gameState.round = round;
  gameState.level = level;
  console.log('[STRIKELOOP] Round updated:', { round, level });
  emitter.emit('roundUpdate', { round, level });
}

// Function to update multiplier (to be called from game logic later)
function updateMultiplier(multiplier) {
  gameState.multiplier = multiplier;
  console.log('[STRIKELOOP] Multiplier updated to:', multiplier);
  emitter.emit('multiplierUpdate', multiplier);
}


function stopGame() {
  if (isRunning) {
    isRunning = false;
    keyboardListenerActive = false;
    stopLevelTimer();
    console.log('[STRIKELOOP] Game stopped - Keyboard controls disabled');
    emitter.emit('gameStopped');
    cleanupGameEventListeners();
  }
}

// Get current level info
function getCurrentLevel() {
  if (currentLevelIndex < gameRounds.length) {
    return gameRounds[currentLevelIndex];
  }
  return null;
}

// Get total remaining time across all levels
function getTotalRemainingTime() {
  let totalRemaining = currentRoundTimeLeft;

  // Add time from remaining levels
  for (let i = currentLevelIndex + 1; i < gameRounds.length; i++) {
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
  // Export level management functions
  setGameRounds,
  getCurrentLevel,
  getTotalRemainingTime,
  formatTime,
  // Export game rounds for inspection
  gameRounds: () => gameRounds,
  currentLevelIndex: () => currentLevelIndex
};

// Handle graceful shutdown - prevent infinite loop
let isCleaningUp = false;

function handleShutdown() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  console.log('[STRIKELOOP] Shutting down...');
  stopGame();

  // Don't call cleanupGameEventListeners here as it's already called by stopGame()
  process.exit(0);
}

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
