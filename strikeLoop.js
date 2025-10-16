const events = require('events');
const arduino = require('./arduino.js');
const readline = require('readline');
const emitter = new events.EventEmitter();

// ⚠️ TESTING FLAG: Set to true to play Round 2 first (for testing)
// Set to false for normal game flow (Round 1 → Round 2 → Round 3)
const TESTING_MODE_SWAP_ROUNDS = true;

const INPUT_IDS = {
  
  OUTER_CIRCLE_1: 1,
  OUTER_CIRCLE_2: 2,
  OUTER_CIRCLE_3: 3,
  OUTER_CIRCLE_4: 4,
  OUTER_CIRCLE_5: 5,
  OUTER_CIRCLE_6: 6,
  OUTER_CIRCLE_7: 7,
  OUTER_CIRCLE_8: 8,
  
  
  INNER_CIRCLE_1: 9,
  INNER_CIRCLE_2: 10,
  INNER_CIRCLE_3: 11,
  INNER_CIRCLE_4: 12,
  INNER_CIRCLE_5: 13,
  
  
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


const OUTPUT_IDS = {

  OUTER_CIRCLE_1: 1,
  OUTER_CIRCLE_2: 2,
  OUTER_CIRCLE_3: 3,
  OUTER_CIRCLE_4: 4,
  OUTER_CIRCLE_5: 5,
  OUTER_CIRCLE_6: 6,
  OUTER_CIRCLE_7: 7,
  OUTER_CIRCLE_8: 8,


  CENTRAL_CIRCLE: 9,
  INNER_CIRCLE_2: 10,
  INNER_CIRCLE_3: 11,
  INNER_CIRCLE_4: 12,
  INNER_CIRCLE_5: 13,


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


const OUTER_CIRCLES_RANGE = { min: 1, max: 8 };
const INNER_CIRCLES_RANGE = { min: 9, max: 13 };
const CONTROL_BUTTONS_RANGE = { min: 14, max: 22 };
const CENTRAL_CIRCLE_ID = 9;



let roundInterval;
let isRunning = false;
let keyboardListenerActive = false;
let currentLevelIndex = 0;
let gameStartTime = null;
let overallGameTimer = null; 


let gameState = {
  round: 1,
  level: 1,
  score: 0,
  missionNumber: 1,
  multiplier: 'x1',
  missionDescription: 'Waiting for mission...',
  totalGameTimeMinutes: 15
};

let localScore = 0;
let goalAchieved = false;


let gameRounds = [
  {
    round: 1, level: 1,
    mission: 'Touchez uniquement les verts et les bleus !',
    duration: 30,
    goalScore: 1000,
    arcadeMode: 'green-blue-combo',
    greenTargets: [1, 2, 3, 4],
    blueTargets: [5, 6, 7, 8],
    pointsPerGreen: 60,
    pointsPerBlue: 80
  },
  {
    round: 1, level: 2,
    mission: 'Touchez uniquement les verts. Évitez les rouges !',
    duration: 30,
    goalScore: 1200,
    arcadeMode: 'green-avoid-red',
    greenTargets: [1, 2, 3, 4],
    redTraps: [5, 6, 7, 8],
    pointsPerGreen: 50,
    penaltyRed: -100
  },
  {
    round: 1, level: 3,
    mission: 'Touchez uniquement les bleus !',
    duration: 30,
    goalScore: 1400,
    arcadeMode: 'blue-avoid-red',
    blueTargets: [5, 6, 7, 8],
    redTraps: [1, 2, 3, 4],
    pointsPerBlue: 90,
    penaltyRed: -100
  },
  {
    round: 1, level: 4,
    mission: 'Touchez uniquement les verts !',
    duration: 30,
    goalScore: 1600,
    arcadeMode: 'rotating-green',
    greenTargets: [1, 2, 3, 4],
    pointsPerGreen: 80,
    penaltyRed: -100,
    rotationDelay: 2000
  },
  {
    round: 1, level: 5,
    mission: 'Touchez uniquement les verts et les bleus !',
    duration: 30,
    goalScore: 1800,
    arcadeMode: 'rotating-green-blue',
    greenTargets: [1, 2, 3, 4],
    blueTargets: [5, 6, 7, 8],
    pointsPerGreen: 90,
    pointsPerBlue: 100,
    penaltyRed: -100,
    rotationDelay: 2000
  },
  {
    round: 1, level: 6,
    mission: 'Touchez uniquement les Bleus !',
    duration: 30,
    goalScore: 2000,
    arcadeMode: 'rotating-blue',
    blueTargets: [5, 6, 7, 8],
    pointsPerBlue: 110,
    penaltyRed: -100,
    rotationDelay: 2000
  },
  {
    round: 1, level: 7,
    mission: 'Touchez 2 fois la même cible verte. Évitez les rouges !',
    duration: 30,
    goalScore: 2200,
    arcadeMode: 'multi-hit-green',
    greenTargets: [1, 2, 3, 4],
    redTraps: [5, 6, 7, 8],
    requiredHits: 2,
    pointsPerCompletion: 120,
    penaltyRed: -100
  },
  {
    round: 1, level: 8,
    mission: 'Touchez 2 fois la même cible bleue. Évitez les rouges !',
    duration: 30,
    goalScore: 2400,
    arcadeMode: 'multi-hit-blue',
    blueTargets: [5, 6, 7, 8],
    redTraps: [1, 2, 3, 4],
    requiredHits: 2,
    pointsPerCompletion: 120,
    penaltyRed: -100
  },
  {
    round: 1, level: 9,
    mission: 'Touchez 3 fois la même cible verte. Évitez les rouges !',
    duration: 30,
    goalScore: 2600,
    arcadeMode: 'multi-hit-green',
    greenTargets: [1, 2, 3, 4],
    redTraps: [5, 6, 7, 8],
    requiredHits: 3,
    pointsPerCompletion: 130,
    penaltyRed: -100
  },
  {
    round: 1, level: 10,
    mission: 'Touchez 3 fois la même cible bleue. Évitez les rouges !',
    duration: 30,
    goalScore: 2800,
    arcadeMode: 'multi-hit-blue',
    blueTargets: [5, 6, 7, 8],
    redTraps: [1, 2, 3, 4],
    requiredHits: 3,
    pointsPerCompletion: 130,
    penaltyRed: -100
  },
  // ROUND 2 - 10 Levels
  {
    round: 2, level: 1,
    mission: 'Touchez uniquement les verts. Évitez les rouges !',
    duration: 30,
    goalScore: 3000,
    arcadeMode: 'blinking-green-bonus',
    greenTargets: [1, 2, 3, 4],
    redTraps: [5, 6, 7, 8],
    bonusTargets: [9, 10, 11, 12, 13],
    pointsPerGreen: 140,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 2,
    mission: 'Touchez uniquement les bleus. Évitez les rouges !',
    duration: 30,
    goalScore: 3100,
    arcadeMode: 'blinking-blue-bonus',
    blueTargets: [5, 6, 7, 8],
    redTraps: [1, 2, 3, 4],
    bonusTargets: [9, 10, 11, 12, 13],
    pointsPerBlue: 140,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 3,
    mission: 'Touchez les cibles vertes. Évitez les rouges !',
    duration: 30,
    goalScore: 3200,
    arcadeMode: 'snake-green-3',
    greenTargets: [1, 2, 3, 4],
    redTraps: [5, 6, 7, 8],
    bonusTargets: [9, 10, 11, 12, 13],
    snakeCount: 3,
    snakePattern: [[1,2,4], [2,4,3], [4,3,1], [3,1,2]],
    rotationDelay: 3000,
    pointsPerGreen: 150,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 4,
    mission: 'Touchez les cibles bleus. Évitez les rouges !',
    duration: 30,
    goalScore: 3400,
    arcadeMode: 'snake-blue-3',
    blueTargets: [5, 6, 7, 8],
    redTraps: [1, 2, 3, 4],
    bonusTargets: [9, 10, 11, 12, 13],
    snakeCount: 3,
    snakePattern: [[5,6,8], [6,8,7], [8,7,5], [7,5,6]],
    rotationDelay: 3000,
    pointsPerBlue: 160,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 5,
    mission: 'Touchez les cibles vertes. Évitez les rouges !',
    duration: 30,
    goalScore: 3600,
    arcadeMode: 'snake-green-2',
    greenTargets: [1, 2, 3, 4],
    redTraps: [5, 6, 7, 8],
    bonusTargets: [9, 10, 11, 12, 13],
    snakeCount: 2,
    snakePattern: [[1,2], [2,4], [4,3], [3,1]],
    rotationDelay: 3000,
    pointsPerGreen: 160,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 6,
    mission: 'Touchez les cibles bleus. Évitez les rouges !',
    duration: 30,
    goalScore: 3800,
    arcadeMode: 'snake-blue-2',
    blueTargets: [5, 6, 7, 8],
    redTraps: [1, 2, 3, 4],
    bonusTargets: [9, 10, 11, 12, 13],
    snakeCount: 2,
    snakePattern: [[5,6], [6,8], [8,7], [7,5]],
    rotationDelay: 3000,
    pointsPerBlue: 170,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 7,
    mission: 'Reconstituez la séquence. Évitez les rouges !',
    duration: 30,
    goalScore: 4000,
    arcadeMode: 'memory-sequence-4-green',
    sequenceTargets: [1, 2, 3, 4],
    sequenceLength: 4,
    sequenceColor: 'g',
    redTraps: [5, 6, 7, 8],
    bonusTargets: [9, 10, 11, 12, 13],
    displayDuration: 8,
    pointsForComplete: 3900,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 8,
    mission: 'Reconstituez la séquence. Évitez les rouges !',
    duration: 30,
    goalScore: 4200,
    arcadeMode: 'memory-sequence-4-blue',
    sequenceTargets: [5, 6, 7, 8],
    sequenceLength: 4,
    sequenceColor: 'b',
    redTraps: [1, 2, 3, 4],
    bonusTargets: [9, 10, 11, 12, 13],
    displayDuration: 8,
    pointsForComplete: 4100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 2, level: 9,
    mission: 'Reconstituez la séquence. Évitez les rouges !',
    duration: 30,
    goalScore: 4400,
    arcadeMode: 'memory-sequence-6-mixed',
    sequenceTargets: [1, 2, 3, 4, 5, 6, 7, 8],
    sequenceLength: 6,
    bonusTargets: [9, 10, 11, 12, 13],
    displayDuration: 12,
    pointsForComplete: 4300,
    pointsPerBonus: 50
  },
  {
    round: 2, level: 10,
    mission: 'Reconstituez la séquence. Évitez les rouges !',
    duration: 30,
    goalScore: 4600,
    arcadeMode: 'memory-sequence-7-mixed',
    sequenceTargets: [1, 2, 3, 4, 5, 6, 7, 8],
    sequenceLength: 7,
    bonusTargets: [9, 10, 11, 12, 13],
    displayDuration: 14,
    pointsForComplete: 4400,
    pointsPerBonus: 50
  }
];


const totalDuration = gameRounds.reduce((sum, round) => sum + round.duration, 0);
console.log(`[STRIKELOOP] Total game duration: ${totalDuration} seconds (${Math.floor(totalDuration/60)} minutes ${totalDuration%60} seconds)`);


let currentRoundTimeLeft = 0;
let timeUpdateInterval;


let activeMission = null;
let activeTargets = []; 
let missionTargetsHit = 0;


let currentSequence = [];
let sequenceProgress = 0;
let lastHitTime = 0;


let consecutiveValidHits = 0; 
let currentMultiplier = 1; 
let multiplierTimer = null; 
let multiplierActive = false; 
let trapPositions = []; 
let cumulativeHitCounts = {}; 
let comboProgress = 0; 
let activationHits = 0; 
let sequenceStep = 0; 


let ledRefreshInterval;


const COLORS = {
  'r': '#e74c3c', 
  'g': '#27ae60', 
  'b': '#3498db', 
  'y': '#f1c40f', 
  'o': '#ffffff'  
};


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


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});




const gameEventListeners = [];


function addTrackedGameListener(emitter, event, handler) {
  emitter.on(event, handler);
  gameEventListeners.push({ emitter, event, handler });
}


// Permanent event listeners - these should NEVER be removed
emitter.on('start', (teamData) => {
  console.log('[STRIKELOOP] Game start received for team:', teamData.teamName);
  startRoundBasedGame();
  setupKeyboardListener();
});

// Handle reset command from staff interface
emitter.on('hardReset', () => {
  console.log('[STRIKELOOP] Hard reset received from staff interface');
  resetGameToInitialState();
});

emitter.on('EventInput', (message, value) => {
  if (isRunning) {
    console.log('[STRIKELOOP] Arduino input received during game:', message, 'Value:', value);

    processGameInput(message, 'arduino');
  } else {
    console.log('[STRIKELOOP] Arduino input received but no game running');
  }
});

emitter.on('circleClick', (data) => {
  if (isRunning) {
    console.log('[STRIKELOOP] Circle clicked - ID:', data.circleId);

    processGameInput(data.circleId, 'simulator');
  } else {
    console.log('[STRIKELOOP] Circle clicked but no game running');
  }
});

function startOverallGameTimer() {
  if (overallGameTimer) {
    clearInterval(overallGameTimer);
  }

  gameStartTime = Date.now();
  const maxGameTimeMs = gameState.totalGameTimeMinutes * 60 * 1000; // 15 minutes in milliseconds

  console.log(`[STRIKELOOP] Overall game timer started - Maximum game time: ${gameState.totalGameTimeMinutes} minutes`);

  overallGameTimer = setInterval(() => {
    const elapsedTime = Date.now() - gameStartTime;

    if (elapsedTime >= maxGameTimeMs) {
      console.log(`[STRIKELOOP] 15 minutes elapsed - resetting game to initial state`);
      stopOverallGameTimer();
      resetGameToInitialState();
    }
  }, 1000); // Check every second
}

function stopOverallGameTimer() {
  if (overallGameTimer) {
    clearInterval(overallGameTimer);
    overallGameTimer = null;
  }
  gameStartTime = null;
}

function resetGameToInitialState() {
  console.log('[STRIKELOOP] Resetting game to initial state...');

  // Stop everything
  isRunning = false;
  disableKeyboardListener();
  stopLevelTimer();
  stopLEDRefresh();
  stopOverallGameTimer();
  activeMission = null;
  currentLevelIndex = 0;
  localScore = 0;
  goalAchieved = false;

  // Cleanup
  cleanupArcadeGame();
  cleanupGameEventListeners();
  isGameCleanedUp = false;

  // Reset game state
  initializeGameState();

  // Notify displays
  emitter.emit('reset');

  console.log('[STRIKELOOP] Game reset complete - ready to start new game');
}

function startRoundBasedGame() {
  if (isRunning) return;

  isRunning = true;
  currentLevelIndex = 0;

  // ⚠️ TESTING MODE: Swap rounds if flag is enabled
  if (TESTING_MODE_SWAP_ROUNDS) {
    console.log('[STRIKELOOP] ⚠️  TESTING MODE: Swapping rounds - Round 2 will play first!');
    const round1Levels = gameRounds.filter(level => level.round === 1);
    const round2Levels = gameRounds.filter(level => level.round === 2);
    const otherLevels = gameRounds.filter(level => level.round !== 1 && level.round !== 2);
    gameRounds = [...round2Levels, ...round1Levels, ...otherLevels];
  } else {
    console.log('[STRIKELOOP] Starting game: 3 rounds, 10 levels each');
  }


  initializeGameState();

  // Start overall 15-minute game timer
  startOverallGameTimer();

  emitter.emit('gameStarted');


  startNextLevel();
}

function startNextLevel(isRetry = false) {
  if (currentLevelIndex >= gameRounds.length) {

    finishGame();
    return;
  }

  const currentLevel = gameRounds[currentLevelIndex];
  currentRoundTimeLeft = currentLevel.duration;

  console.log(`[STRIKELOOP] Starting Round ${currentLevel.round} - Level ${currentLevel.level}${isRetry ? ' (RETRY)' : ''}`);
  console.log(`[STRIKELOOP] Mission: ${currentLevel.mission}`);
  console.log(`[STRIKELOOP] Duration: ${currentLevel.duration} seconds`);
  console.log(`[STRIKELOOP] Goal: ${currentLevel.goalScore} points`);


  if (!isRetry) {
    localScore = 0;
    goalAchieved = false;
    console.log(`[STRIKELOOP] New level - Local score reset to 0`);
  } else {
    console.log(`[STRIKELOOP] Retry - Keeping local score: ${localScore}`);
  }


  gameState.round = currentLevel.round;
  gameState.level = currentLevel.level;
  gameState.missionNumber = currentLevel.level;
  gameState.missionDescription = currentLevel.mission;
  gameState.score = localScore;


  initializeMission(currentLevel);


  emitter.emit('roundUpdate', {
    round: currentLevel.round,
    level: currentLevel.level,
    duration: currentLevel.duration,
    goalScore: currentLevel.goalScore
  });

  emitter.emit('missionUpdate', {
    number: currentLevel.level,
    description: currentLevel.mission
  });

  emitter.emit('timeUpdate', {
    timeLeft: currentRoundTimeLeft,
    timeString: formatTime(currentRoundTimeLeft)
  });

  emitter.emit('scoreUpdate', localScore);

  emitter.emit('multiplierUpdate', gameState.multiplier);


  startLevelTimer();
}


function initializeMission(levelConfig) {
  // Clear any blinking intervals from PREVIOUS level BEFORE overwriting activeMission
  if (activeMission?.blinkIntervals) {
    console.log(`[STRIKELOOP] Clearing ${activeMission.blinkIntervals.length} blink intervals from previous level`);
    activeMission.blinkIntervals.forEach(interval => clearInterval(interval));
    activeMission.blinkIntervals = [];
  }

  // Clear rotation interval
  if (rotationInterval) {
    clearInterval(rotationInterval);
    rotationInterval = null;
  }

  // Clear multiplier timer
  if (multiplierTimer) {
    clearTimeout(multiplierTimer);
    multiplierTimer = null;
  }

  // Now set the new mission
  activeMission = levelConfig;
  activeTargets = [];
  missionTargetsHit = 0;
  sequenceProgress = 0;
  currentSequence = levelConfig.sequence || [];


  consecutiveValidHits = 0;
  currentMultiplier = 1;
  multiplierActive = false;
  trapPositions = [];
  cumulativeHitCounts = {};
  comboProgress = 0;
  activationHits = 0;
  sequenceStep = 0;
  multiHitTracker = {};

  // Clear memory sequence state
  memorySequence = [];
  memorySequenceIndex = 0;
  memorySequenceDisplayed = false;

  // Clear blink states
  blinkStates = {};

  // Deactivate bonus indicator
  emitter.emit('bonusActive', false);

  // Turn off all LEDs before starting new level
  for (let i = 1; i <= 13; i++) {
    controlLED(i, 'o');
  }

  console.log(`[STRIKELOOP] Mission initialized:`, {
    arcadeMode: levelConfig.arcadeMode,
    goalScore: levelConfig.goalScore,
    duration: levelConfig.duration
  });


  startArcadeLEDs();


  startLEDRefresh();
}


function startLEDRefresh() {

  if (ledRefreshInterval) {
    clearInterval(ledRefreshInterval);
  }


  const noRefreshModes = [
    'sequence',
    'green-only',
    'green-blue-combo',
    'green-avoid-red',
    'blue-avoid-red',
    'rotating-green',
    'rotating-green-blue',
    'rotating-blue',
    'multi-hit-green',
    'multi-hit-blue',
    'blinking-green-bonus',
    'blinking-blue-bonus',
    'snake-green-3',
    'snake-blue-3',
    'snake-green-2',
    'snake-blue-2',
    'memory-sequence-4-green',
    'memory-sequence-4-blue',
    'memory-sequence-6-mixed',
    'memory-sequence-7-mixed'
  ];

  if (activeMission && !noRefreshModes.includes(activeMission.arcadeMode)) {

    const refreshDelay = Math.floor(Math.random() * 2000) + 3000;
    ledRefreshInterval = setInterval(() => {
      if (activeMission && !noRefreshModes.includes(activeMission.arcadeMode)) {
        activateArcadeLEDs();
      }
    }, refreshDelay);

    console.log(`[STRIKELOOP] LED refresh started every ${Math.floor(refreshDelay/1000)} seconds`);
  } else {
    console.log(`[STRIKELOOP] LED refresh skipped for ${activeMission?.arcadeMode || 'unknown'} mode (static LEDs)`);
  }
}


function stopLEDRefresh() {
  if (ledRefreshInterval) {
    clearInterval(ledRefreshInterval);
    ledRefreshInterval = null;
  }


  if (rotationInterval) {
    clearInterval(rotationInterval);
    rotationInterval = null;
  }


  for (let i = 1; i <= 8; i++) {
    controlLED(i, 'o');
  }


  controlLED(CENTRAL_CIRCLE_ID, 'o');

  activeTargets = [];
  console.log('[STRIKELOOP] LED refresh stopped, all LEDs cleared');
}


function startArcadeLEDs() {
  if (!activeMission || !activeMission.arcadeMode) return;

  console.log(`[STRIKELOOP] Starting arcade LEDs for mode: ${activeMission.arcadeMode}`);

  
  if (activeMission.arcadeMode === 'sequence') {
    console.log('[STRIKELOOP] Sequence mode detected - using static colored targets');
    activateArcadeLEDs();
  } else {
    
    activateArcadeLEDs();
  }
}


function showSequenceTarget() {
  if (!activeMission.sequence || sequenceStep >= activeMission.sequence.length) return;

  const targetColor = activeMission.sequence[sequenceStep];
  const allColors = ['r', 'g', 'b', 'y'];

  
  activeTargets = [];

  
  const targetCircle = Math.floor(Math.random() * 8) + 1;

  console.log(`[STRIKELOOP] Sequence ${sequenceStep + 1}/${activeMission.sequence.length}: Circle ${targetCircle} -> ${targetColor.toUpperCase()}`);

  
  for (let circleId = 1; circleId <= 8; circleId++) {
    let color;

    if (circleId === targetCircle) {
      
      color = targetColor;
    } else {
      
      
      if (Math.random() < 0.6) {
        
        const sequenceColors = [...new Set(activeMission.sequence)];
        const wrongColors = sequenceColors.filter(c => c !== targetColor);
        if (wrongColors.length > 0) {
          color = wrongColors[Math.floor(Math.random() * wrongColors.length)];
        } else {
          
          color = allColors.filter(c => c !== targetColor)[Math.floor(Math.random() * 3)];
        }
      } else {
        
        const distractorColors = allColors.filter(c => c !== targetColor);
        color = distractorColors[Math.floor(Math.random() * distractorColors.length)];
      }
    }

    controlLED(circleId, color);
    activeTargets.push({elementId: circleId, colorCode: color});
  }

  
  const targetIndex = activeTargets.findIndex(t => t.elementId === targetCircle);
  activeTargets[targetIndex].isSequenceTarget = true;

  console.log(`[STRIKELOOP] Sequence LED Pattern:`, activeTargets.map(t =>
    `${t.elementId}:${t.colorCode ? t.colorCode.toUpperCase() : 'UNDEFINED'}${t.isSequenceTarget ? '*' : ''}`
  ).join(' '));
}


function activateRandomLEDs() {
  if (!activeMission.targetColors) return;

  
  activeTargets = [];

  const allColors = ['r', 'g', 'b', 'y'];

  
  for (let circleId = 1; circleId <= 8; circleId++) {
    let color;

    
    if (activeMission.targetColors && activeMission.avoidColors) {
      
      const shouldBeTarget = Math.random() < 0.4; 
      if (shouldBeTarget) {
        color = activeMission.targetColors[Math.floor(Math.random() * activeMission.targetColors.length)];
      } else {
        
        const distractors = [...activeMission.avoidColors];
        
        allColors.forEach(c => {
          if (!activeMission.targetColors.includes(c) && !activeMission.avoidColors.includes(c)) {
            distractors.push(c);
          }
        });
        color = distractors[Math.floor(Math.random() * distractors.length)];
      }
    }
    else if (activeMission.targetColors) {
      
      const shouldBeTarget = Math.random() < 0.3; 
      if (shouldBeTarget) {
        color = activeMission.targetColors[Math.floor(Math.random() * activeMission.targetColors.length)];
      } else {
        
        const distractors = allColors.filter(c => !activeMission.targetColors.includes(c));
        if (distractors.length > 0) {
          color = distractors[Math.floor(Math.random() * distractors.length)];
        } else {
          
          color = activeMission.targetColors[Math.floor(Math.random() * activeMission.targetColors.length)];
        }
      }
    }
    else {
      
      color = allColors[Math.floor(Math.random() * 4)];
    }

    
    if (!color) {
      color = allColors[Math.floor(Math.random() * 4)];
      console.warn(`[STRIKELOOP] Color was undefined, using fallback: ${color}`);
    }

    controlLED(circleId, color);
    activeTargets.push({elementId: circleId, colorCode: color});
  }

  
  const targetCircles = activeTargets.filter(t => activeMission.targetColors && activeMission.targetColors.includes(t.colorCode));
  const avoidCircles = activeTargets.filter(t => activeMission.avoidColors && activeMission.avoidColors.includes(t.colorCode));

  console.log(`[STRIKELOOP] All 8 LEDs activated! Targets: ${targetCircles.length}, Avoid: ${avoidCircles.length}, Neutral: ${8 - targetCircles.length - avoidCircles.length}`);
  console.log(`[STRIKELOOP] LED Pattern:`, activeTargets.map(t => `${t.elementId}:${t.colorCode ? t.colorCode.toUpperCase() : 'UNDEFINED'}`).join(' '));
}


function processGameInput(inputId, source) {
  if (!activeMission || !activeTargets.length) return;

  const currentTime = Date.now();
  lastHitTime = currentTime;

  
  const clickedTarget = activeTargets.find(target => target.elementId == inputId);

  if (!clickedTarget) {
    console.log(`[STRIKELOOP] Input ${inputId} not found in active targets`);
    return;
  }

  console.log(`[STRIKELOOP] Input detected: Circle ${inputId} (${clickedTarget.colorCode.toUpperCase()}) from ${source}`);

  
  if (activeMission.arcadeMode) {
    console.log(`[STRIKELOOP] Using ARCADE validation for ${activeMission.arcadeMode} mode`);
    validateArcadeInput(clickedTarget, currentTime);
  } else {
    console.log(`[STRIKELOOP] Using ORIGINAL validation (no arcade mode)`);
    validateInput(clickedTarget, currentTime);
  }
}


function validateInput(target, timestamp) {
  if (!activeMission) return;

  const { elementId, colorCode } = target;
  let pointsAwarded = 0;
  let valid = false;

  
  if (activeMission.sequence) {
    const expectedColor = activeMission.sequence[sequenceProgress];

    
    if (colorCode === expectedColor && target.isSequenceTarget) {
      valid = true;
      sequenceProgress++;

      console.log(`[STRIKELOOP] ✓ Sequence progress: ${sequenceProgress}/${activeMission.sequence.length}`);

      if (sequenceProgress >= activeMission.sequence.length) {
        
        pointsAwarded = activeMission.pointsPerSequence || 100;
        console.log(`[STRIKELOOP] 🎉 SEQUENCE COMPLETED! +${pointsAwarded} points`);

        
        sequenceProgress = 0;
        setTimeout(() => showSequenceTarget(), 1000);
      } else {
        
        setTimeout(() => showSequenceTarget(), 500);
        pointsAwarded = Math.floor((activeMission.pointsPerSequence || 100) / activeMission.sequence.length);
      }
    } else {
      
      if (target.isSequenceTarget) {
        console.log(`[STRIKELOOP] ❌ Wrong color! Expected ${expectedColor.toUpperCase()}, got ${colorCode.toUpperCase()}`);
      } else {
        console.log(`[STRIKELOOP] ❌ Wrong circle! Need to click the ${expectedColor.toUpperCase()} circle`);
      }

      
      if (activeMission.penaltyPerMiss) {
        pointsAwarded = activeMission.penaltyPerMiss;
      }
      
      sequenceProgress = 0;
      setTimeout(() => showSequenceTarget(), 1000);
    }
  }
  
  else {
    
    if (activeMission.targetColors && activeMission.targetColors.includes(colorCode)) {
      valid = true;
      pointsAwarded = activeMission.pointsPerHit || 10;

      
      if (activeMission.speedBonus) {
        const timeSinceLastHit = timestamp - (lastHitTime - 1000); 
        if (timeSinceLastHit < 2000) { 
          const speedMultiplier = activeMission.speedMultiplier || 1.5;
          pointsAwarded = Math.floor(pointsAwarded * speedMultiplier);
          console.log(`[STRIKELOOP] SPEED BONUS! x${speedMultiplier}`);
        }
      }

      console.log(`[STRIKELOOP] ✅ TARGET HIT! ${colorCode.toUpperCase()} circle +${pointsAwarded} points`);
      missionTargetsHit++;
    }
    
    else if (activeMission.avoidColors && activeMission.avoidColors.includes(colorCode)) {
      valid = false;
      pointsAwarded = activeMission.penaltyPerMiss || -10;
      console.log(`[STRIKELOOP] ❌ PENALTY! ${colorCode.toUpperCase()} circle ${pointsAwarded} points`);
    }
    
    else {
      console.log(`[STRIKELOOP] ⚪ Neutral: ${colorCode.toUpperCase()} circle (no points)`);
    }

    
    setTimeout(() => activateRandomLEDs(), 500);
  }

  
  if (pointsAwarded !== 0) {
    const newScore = gameState.score + pointsAwarded;
    updateScore(newScore);
  }

  
  controlLED(elementId, 'o');
}

function startLevelTimer() {

  emitter.emit('timeUpdate', {
    timeLeft: currentRoundTimeLeft,
    timeString: formatTime(currentRoundTimeLeft)
  });


  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }


  timeUpdateInterval = setInterval(() => {
    if (currentRoundTimeLeft > 0) {
      currentRoundTimeLeft--;
      const timeString = formatTime(currentRoundTimeLeft);

      emitter.emit('timeUpdate', {
        timeLeft: currentRoundTimeLeft,
        timeString: timeString
      });


      if (currentRoundTimeLeft % 10 === 0) {
        console.log(`[STRIKELOOP] Round ${gameRounds[currentLevelIndex].round} Level ${gameRounds[currentLevelIndex].level} time remaining: ${timeString}`);
      }
    } else {

      stopLevelTimer();
      const currentLevel = gameRounds[currentLevelIndex];

      if (goalAchieved) {

        console.log(`[STRIKELOOP] ✅ Level ${currentLevel.level} COMPLETED! Goal: ${currentLevel.goalScore}, Score: ${localScore}`);


        stopLEDRefresh();

        currentLevelIndex++;

        if (currentLevelIndex < gameRounds.length) {

          startNextLevel(false);
        } else {

          console.log(`[STRIKELOOP] 🎉 ALL 10 LEVELS COMPLETED! Final score: ${localScore}`);
          finishGame();
        }
      } else {

        console.log(`[STRIKELOOP] ⏱️ Time expired! Goal NOT achieved (${localScore}/${currentLevel.goalScore}). Retrying level...`);


        stopLEDRefresh();


        startNextLevel(true);
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
  stopLEDRefresh();
  stopOverallGameTimer(); // Stop the 15-minute timer
  activeMission = null;
  console.log('[STRIKELOOP] All 30 levels (3 rounds × 10 levels) completed - game finished');
  emitter.emit('gameFinished');


  cleanupArcadeGame();


  cleanupGameEventListeners();
}


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


function updateScore(newScore) {
  localScore = Math.max(0, newScore);
  gameState.score = localScore;
  console.log('[STRIKELOOP] Local score updated to:', localScore);
  emitter.emit('scoreUpdate', localScore);

  const currentLevel = gameRounds[currentLevelIndex];
  if (currentLevel && !goalAchieved && localScore >= currentLevel.goalScore) {
    goalAchieved = true;
    console.log(`[STRIKELOOP] 🎉 GOAL ACHIEVED! ${localScore}/${currentLevel.goalScore} - Level can be completed`);
  }
}


function updateMission(missionNumber, description) {
  gameState.missionNumber = missionNumber;
  gameState.missionDescription = description;
  console.log('[STRIKELOOP] Mission updated:', { number: missionNumber, description });
  emitter.emit('missionUpdate', {
    number: missionNumber,
    description: description
  });
}


function updateRound(round, level) {
  gameState.round = round;
  gameState.level = level;
  console.log('[STRIKELOOP] Round updated:', { round, level });
  emitter.emit('roundUpdate', { round, level });
}


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
    stopLEDRefresh(); 
    cleanupArcadeGame(); 
    activeMission = null; 
    console.log('[STRIKELOOP] Game stopped - Keyboard controls disabled');
    emitter.emit('gameStopped');
    cleanupGameEventListeners();
  }
}


function getCurrentLevel() {
  if (currentLevelIndex < gameRounds.length) {
    return gameRounds[currentLevelIndex];
  }
  return null;
}


function getTotalRemainingTime() {
  let totalRemaining = currentRoundTimeLeft;

  
  for (let i = currentLevelIndex + 1; i < gameRounds.length; i++) {
    totalRemaining += gameRounds[i].duration;
  }

  return totalRemaining;
}


function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}


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


function controlLED(elementId, colorCode) {
  
  

  
  let colorValue;
  if (colorCode === '1') {
    
    colorValue = getControlButtonColor(elementId);
  } else {
    colorValue = COLORS[colorCode] || '#ffffff';
  }

  
  emitter.emit('ledControl', {
    elementId: elementId,
    colorCode: colorCode,
    colorValue: colorValue,
    timestamp: Date.now()
  });
}


function getControlButtonColor(elementId) {
  
  const buttonColors = {
    14: '#27ae60', 
    15: '#f1c40f', 
    16: '#3498db', 
    17: '#f1c40f', 
    18: '#3498db', 
    19: '#27ae60', 
    20: '#3498db', 
    21: '#27ae60', 
    22: '#f1c40f'  
  };
  return buttonColors[elementId] || '#ffffff';
}


function setupKeyboardListener() {
  keyboardListenerActive = true;
  console.log('[STRIKELOOP] Keyboard listener active! Type commands and press Enter');
  console.log('[STRIKELOOP] Examples: 1b (circle 1 blue), 9r (central circle red), 15 (button 15 on), 15o (button 15 off)');
  console.log('[STRIKELOOP] Outer Circles (1-8): [id][color] - Colors: b=blue, g=green, r=red, y=yellow, o=off');
  console.log('[STRIKELOOP] Central Circle: 9[color] - Colors: b=blue, g=green, r=red, y=yellow, o=off');
  console.log('[STRIKELOOP] Control Buttons (14-22): [id] (on) or [id]o (off)');
  console.log('[STRIKELOOP] Inner Circles (10-13): Clickable only, no LED control');
  
  rl.on('line', (input) => {
    
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
    
    
    if (command.endsWith('o') && command.length >= 3) {
      
      const twoDigitId = parseInt(command.substring(0, 2));
      if (twoDigitId >= CONTROL_BUTTONS_RANGE.min && twoDigitId <= CONTROL_BUTTONS_RANGE.max) {
        console.log(`[STRIKELOOP] Control button ${twoDigitId} -> OFF`);
        controlLED(twoDigitId, 'o');
        return;
      }
    } else if (command.length >= 2) {
      
      const twoDigitId = parseInt(command.substring(0, 2));
      if (twoDigitId >= CONTROL_BUTTONS_RANGE.min && twoDigitId <= CONTROL_BUTTONS_RANGE.max) {
        
        console.log(`[STRIKELOOP] Control button ${twoDigitId} -> ON`);
        controlLED(twoDigitId, '1');
        return;
      } else if (twoDigitId >= 10 && twoDigitId <= 13) {
        
        circleId = twoDigitId;
        colorCode = command[2] ? command[2].toLowerCase() : 'o';
      }
    }
    
    
    if (!circleId && command.length >= 1) {
      circleId = parseInt(command[0]);
      if (circleId >= OUTER_CIRCLES_RANGE.min && circleId <= OUTER_CIRCLES_RANGE.max) {
        colorCode = command[1] ? command[1].toLowerCase() : 'o';
      } else if (circleId === CENTRAL_CIRCLE_ID) {
        colorCode = command[1] ? command[1].toLowerCase() : 'o';
      }
      console.log(`[STRIKELOOP] Single digit parsing: circleId=${circleId}, colorCode=${colorCode}, command=${command}`);
    }
    
    
    if (circleId >= OUTER_CIRCLES_RANGE.min && circleId <= OUTER_CIRCLES_RANGE.max) {
      
      if (COLORS[colorCode]) {
        console.log(`[STRIKELOOP] Circle ${circleId} -> ${colorCode.toUpperCase()}`);
        controlLED(circleId, colorCode);
      } else {
        console.log(`[STRIKELOOP] Invalid color for circle ${circleId}. Use: b/g/r/y/o`);
      }
    } else if (circleId === CENTRAL_CIRCLE_ID) {
      
      console.log(`[STRIKELOOP] Processing central circle: circleId=${circleId}, colorCode=${colorCode}, COLORS[colorCode]=${COLORS[colorCode]}`);
      if (COLORS[colorCode]) {
        console.log(`[STRIKELOOP] Central circle -> ${colorCode.toUpperCase()}`);
        controlLED(CENTRAL_CIRCLE_ID, colorCode);
      } else {
        console.log(`[STRIKELOOP] Invalid color for central circle. Use: b/g/r/y/o`);
      }
    } else if (circleId >= INNER_CIRCLES_RANGE.min && circleId <= INNER_CIRCLES_RANGE.max) {
      
      console.log(`[STRIKELOOP] Inner circle ${circleId} is clickable only. Use ${CENTRAL_CIRCLE_ID}[color] for central circle LED control.`);
    } else if (circleId >= CONTROL_BUTTONS_RANGE.min && circleId <= CONTROL_BUTTONS_RANGE.max) {
      console.log(`[STRIKELOOP] Control button ${circleId} commands should use simple format: ${circleId} or ${circleId}o`);
    } else {
      console.log(`[STRIKELOOP] Invalid command. Use: [${OUTER_CIRCLES_RANGE.min}-${OUTER_CIRCLES_RANGE.max}][color] or ${CENTRAL_CIRCLE_ID}[color] or [${CONTROL_BUTTONS_RANGE.min}-${CONTROL_BUTTONS_RANGE.max}] or [${CONTROL_BUTTONS_RANGE.min}-${CONTROL_BUTTONS_RANGE.max}]o`);
    }
  });
}


function activateArcadeLEDs() {
  if (!activeMission) return;

  if (activeMission.blinkIntervals) {
    activeMission.blinkIntervals.forEach(interval => clearInterval(interval));
    activeMission.blinkIntervals = [];
  }

  activeTargets = [];
  trapPositions = [];

  const mode = activeMission.arcadeMode;

  switch (mode) {
    case 'green-blue-combo':
      activateModeGreenBlueCombo();
      break;
    case 'green-avoid-red':
      activateModeGreenAvoidRed();
      break;
    case 'blue-avoid-red':
      activateModeBlueAvoidRed();
      break;
    case 'rotating-green':
      activateModeRotatingGreen();
      break;
    case 'rotating-green-blue':
      activateModeRotatingGreenBlue();
      break;
    case 'rotating-blue':
      activateModeRotatingBlue();
      break;
    case 'multi-hit-green':
      activateModeMultiHitGreen();
      break;
    case 'multi-hit-blue':
      activateModeMultiHitBlue();
      break;
    case 'blinking-green-bonus':
      activateModeBlinkingGreenBonus();
      break;
    case 'blinking-blue-bonus':
      activateModeBlinkingBlueBonus();
      break;
    case 'snake-green-3':
      activateModeSnakeGreen3();
      break;
    case 'snake-blue-3':
      activateModeSnakeBlue3();
      break;
    case 'snake-green-2':
      activateModeSnakeGreen2();
      break;
    case 'snake-blue-2':
      activateModeSnakeBlue2();
      break;
    case 'memory-sequence-4-green':
    case 'memory-sequence-4-blue':
    case 'memory-sequence-6-mixed':
    case 'memory-sequence-7-mixed':
      activateModeMemorySequence();
      break;
    default:
      activateLegacyArcadeMode();
      break;
  }

  const validTargets = activeTargets.filter(t => t.isValid || t.isActive).length;
  const trapCount = trapPositions.length;
  const ledPattern = activeTargets.map(t => `${t.elementId}:${t.colorCode?.toUpperCase()}${t.isTrap ? '(trap)' : ''}${t.isActive ? '*' : ''}`).join(' ');
  console.log(`[STRIKELOOP] Arcade LEDs (${mode}): ${validTargets} targets, ${trapCount} traps | Pattern: ${ledPattern}`);
}

function activateModeGreenBlueCombo() {
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });
}

function activateModeGreenAvoidRed() {
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r');
  });
}

function activateModeBlueAvoidRed() {
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r');
  });
}

let rotationInterval;
let currentRotatingTargets = { green: null, blue: null };

function activateModeRotatingGreen() {
  if (rotationInterval) clearInterval(rotationInterval);

  const activateOne = () => {
    activeTargets = [];
    trapPositions = [];

    // Pick one random green from 1-4
    const greenPos = activeMission.greenTargets[Math.floor(Math.random() * activeMission.greenTargets.length)];
    const target = { elementId: greenPos, colorCode: 'g', isValid: true, isActive: true };
    activeTargets.push(target);
    controlLED(greenPos, 'g');
    currentRotatingTargets.green = greenPos;

    // All OTHER positions (1-4 that aren't green, and all of 5-8) become RED
    const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
    allPositions.forEach(pos => {
      if (pos !== greenPos) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
        controlLED(pos, 'r');
      }
    });

    console.log(`[STRIKELOOP] Rotating green: position ${greenPos} active, all others RED`);
  };

  activateOne();
  rotationInterval = setInterval(activateOne, activeMission.rotationDelay || 2000);
}

function activateModeRotatingGreenBlue() {
  if (rotationInterval) clearInterval(rotationInterval);

  const activateTwo = () => {
    activeTargets = [];
    trapPositions = [];

    const greenPos = activeMission.greenTargets[Math.floor(Math.random() * activeMission.greenTargets.length)];
    const bluePos = activeMission.blueTargets[Math.floor(Math.random() * activeMission.blueTargets.length)];

    const greenTarget = { elementId: greenPos, colorCode: 'g', isValid: true, isActive: true };
    const blueTarget = { elementId: bluePos, colorCode: 'b', isValid: true, isActive: true };

    activeTargets.push(greenTarget, blueTarget);
    controlLED(greenPos, 'g');
    controlLED(bluePos, 'b');

    currentRotatingTargets.green = greenPos;
    currentRotatingTargets.blue = bluePos;

    const otherPositions = [1, 2, 3, 4, 5, 6, 7, 8].filter(p => p !== greenPos && p !== bluePos);
    otherPositions.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r');
    });

    console.log(`[STRIKELOOP] Rotating green-blue: green ${greenPos}, blue ${bluePos} active`);
  };

  activateTwo();
  rotationInterval = setInterval(activateTwo, activeMission.rotationDelay || 2000);
}

function activateModeRotatingBlue() {
  if (rotationInterval) clearInterval(rotationInterval);

  const activateOne = () => {
    activeTargets = [];
    trapPositions = [];

    // Pick one random blue from 5-8
    const bluePos = activeMission.blueTargets[Math.floor(Math.random() * activeMission.blueTargets.length)];
    const target = { elementId: bluePos, colorCode: 'b', isValid: true, isActive: true };
    activeTargets.push(target);
    controlLED(bluePos, 'b');
    currentRotatingTargets.blue = bluePos;

    // All OTHER positions (all of 1-4, and 5-8 that aren't blue) become RED
    const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
    allPositions.forEach(pos => {
      if (pos !== bluePos) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
        controlLED(pos, 'r');
      }
    });

    console.log(`[STRIKELOOP] Rotating blue: position ${bluePos} active, all others RED`);
  };

  activateOne();
  rotationInterval = setInterval(activateOne, activeMission.rotationDelay || 2000);
}

function activateModeMultiHitGreen() {
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r');
  });
}

function activateModeMultiHitBlue() {
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r');
  });
}

// ROUND 2 MODE IMPLEMENTATIONS

function activateModeBlinkingGreenBonus() {
  // Green targets (1-4) blink at 1 sec on/off
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true };
    activeTargets.push(target);
  });
  startBlinkingTargets(activeMission.greenTargets, 'g', 1000);

  // Red traps (5-8) solid
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r');
  });

  // Bonus section (9-13) solid yellow
  activateBonusSection();
}

function activateModeBlinkingBlueBonus() {
  console.log('[STRIKELOOP] Activating Blinking Blue Bonus mode');

  // Red traps (1-4) solid
  console.log('[STRIKELOOP] Setting red traps (1-4) to SOLID RED');
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r');
  });

  // Blue targets (5-8) blink at 1 sec on/off
  console.log('[STRIKELOOP] Setting blue targets (5-8) to BLINKING BLUE');
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true };
    activeTargets.push(target);
  });
  startBlinkingTargets(activeMission.blueTargets, 'b', 1000);

  // Bonus section (9-13) solid yellow
  console.log('[STRIKELOOP] Setting bonus section (9-13) to SOLID YELLOW');
  activateBonusSection();
}

function activateModeSnakeGreen3() {
  if (rotationInterval) clearInterval(rotationInterval);

  let patternIndex = 0;
  const pattern = activeMission.snakePattern;

  const rotateSnake = () => {
    activeTargets = [];
    trapPositions = [];

    const activePositions = pattern[patternIndex];

    // Set active green positions
    activePositions.forEach(pos => {
      const target = { elementId: pos, colorCode: 'g', isValid: true, isActive: true };
      activeTargets.push(target);
      controlLED(pos, 'g');
    });

    // Set inactive positions from greenTargets as red
    activeMission.greenTargets.forEach(pos => {
      if (!activePositions.includes(pos)) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
        controlLED(pos, 'r');
      }
    });

    // Red traps (5-8) solid
    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r');
    });

    // Bonus section
    activateBonusSection();

    console.log(`[STRIKELOOP] Snake green-3: pattern ${patternIndex}: ${activePositions.join(',')}`);
    patternIndex = (patternIndex + 1) % pattern.length;
  };

  rotateSnake();
  rotationInterval = setInterval(rotateSnake, activeMission.rotationDelay || 3000);
}

function activateModeSnakeBlue3() {
  if (rotationInterval) clearInterval(rotationInterval);

  let patternIndex = 0;
  const pattern = activeMission.snakePattern;

  const rotateSnake = () => {
    activeTargets = [];
    trapPositions = [];

    // Red traps (1-4) solid
    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r');
    });

    const activePositions = pattern[patternIndex];

    // Set active blue positions
    activePositions.forEach(pos => {
      const target = { elementId: pos, colorCode: 'b', isValid: true, isActive: true };
      activeTargets.push(target);
      controlLED(pos, 'b');
    });

    // Set inactive positions from blueTargets as red
    activeMission.blueTargets.forEach(pos => {
      if (!activePositions.includes(pos)) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
        controlLED(pos, 'r');
      }
    });

    // Bonus section
    activateBonusSection();

    console.log(`[STRIKELOOP] Snake blue-3: pattern ${patternIndex}: ${activePositions.join(',')}`);
    patternIndex = (patternIndex + 1) % pattern.length;
  };

  rotateSnake();
  rotationInterval = setInterval(rotateSnake, activeMission.rotationDelay || 3000);
}

function activateModeSnakeGreen2() {
  if (rotationInterval) clearInterval(rotationInterval);

  let patternIndex = 0;
  const pattern = activeMission.snakePattern;

  const rotateSnake = () => {
    activeTargets = [];
    trapPositions = [];

    const activePositions = pattern[patternIndex];

    // Set active green positions
    activePositions.forEach(pos => {
      const target = { elementId: pos, colorCode: 'g', isValid: true, isActive: true };
      activeTargets.push(target);
      controlLED(pos, 'g');
    });

    // Set inactive positions from greenTargets as red
    activeMission.greenTargets.forEach(pos => {
      if (!activePositions.includes(pos)) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
        controlLED(pos, 'r');
      }
    });

    // Red traps (5-8) solid
    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r');
    });

    // Bonus section
    activateBonusSection();

    console.log(`[STRIKELOOP] Snake green-2: pattern ${patternIndex}: ${activePositions.join(',')}`);
    patternIndex = (patternIndex + 1) % pattern.length;
  };

  rotateSnake();
  rotationInterval = setInterval(rotateSnake, activeMission.rotationDelay || 3000);
}

function activateModeSnakeBlue2() {
  if (rotationInterval) clearInterval(rotationInterval);

  let patternIndex = 0;
  const pattern = activeMission.snakePattern;

  const rotateSnake = () => {
    activeTargets = [];
    trapPositions = [];

    // Red traps (1-4) solid
    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r');
    });

    const activePositions = pattern[patternIndex];

    // Set active blue positions
    activePositions.forEach(pos => {
      const target = { elementId: pos, colorCode: 'b', isValid: true, isActive: true };
      activeTargets.push(target);
      controlLED(pos, 'b');
    });

    // Set inactive positions from blueTargets as red
    activeMission.blueTargets.forEach(pos => {
      if (!activePositions.includes(pos)) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
        controlLED(pos, 'r');
      }
    });

    // Bonus section
    activateBonusSection();

    console.log(`[STRIKELOOP] Snake blue-2: pattern ${patternIndex}: ${activePositions.join(',')}`);
    patternIndex = (patternIndex + 1) % pattern.length;
  };

  rotateSnake();
  rotationInterval = setInterval(rotateSnake, activeMission.rotationDelay || 3000);
}

// Memory sequence state
let memorySequence = [];
let memorySequenceDisplayed = false;
let memoryReproductionStep = 0;

// Track which targets are currently "on" in blinking modes
let blinkStates = {}; // { elementId: true/false }

function activateModeMemorySequence() {
  if (!memorySequenceDisplayed) {
    // Generate random sequence
    memorySequence = generateRandomSequence();
    console.log(`[STRIKELOOP] Generated memory sequence:`, memorySequence);

    // Display sequence
    displayMemorySequence();
  } else {
    // During reproduction phase - all targets are off, user must remember
    // Turn all LEDs off (for targets)
    for (let i = 1; i <= 8; i++) {
      controlLED(i, 'o');
      // Add targets as available but not lit
      const color = i <= 4 ? 'g' : 'b';
      const target = { elementId: i, colorCode: color, isValid: true, isReproducing: true };
      activeTargets.push(target);
    }

    // Bonus section still active
    activateBonusSection();

    console.log(`[STRIKELOOP] Memory sequence reproduction phase - waiting for user input`);
  }
}

function generateRandomSequence() {
  const targets = [...activeMission.sequenceTargets];
  const sequenceLength = activeMission.sequenceLength;
  const sequence = [];

  for (let i = 0; i < sequenceLength; i++) {
    const randomIndex = Math.floor(Math.random() * targets.length);
    sequence.push(targets[randomIndex]);
  }

  return sequence;
}

function displayMemorySequence() {
  console.log(`[STRIKELOOP] Displaying memory sequence: ${memorySequence.join(' -> ')}`);

  let currentIndex = 0;

  const showNext = () => {
    if (currentIndex < memorySequence.length) {
      const targetId = memorySequence[currentIndex];
      const color = activeMission.sequenceColor || (targetId <= 4 ? 'g' : 'b');

      // Flash target
      controlLED(targetId, color);
      console.log(`[STRIKELOOP] Showing sequence step ${currentIndex + 1}/${memorySequence.length}: Target ${targetId} (${color.toUpperCase()})`);

      // Turn off after 1 sec
      setTimeout(() => {
        controlLED(targetId, 'o');

        // Wait 1 sec before next
        setTimeout(() => {
          currentIndex++;
          showNext();
        }, 1000);
      }, 1000);
    } else {
      // Sequence display complete - start reproduction phase
      console.log(`[STRIKELOOP] Sequence display complete - starting reproduction phase`);
      memorySequenceDisplayed = true;
      memoryReproductionStep = 0;

      // Re-activate LEDs for reproduction
      activateArcadeLEDs();
    }
  };

  showNext();
}

function startBlinkingTargets(positions, color, interval) {
  let isOn = true;

  // Initialize blink states to "on" and turn on LEDs immediately
  positions.forEach(pos => {
    blinkStates[pos] = true;
    controlLED(pos, color);
  });

  const blinkInterval = setInterval(() => {
    isOn = !isOn;
    positions.forEach(pos => {
      blinkStates[pos] = isOn; // Track blink state
      if (isOn) {
        controlLED(pos, color);
      } else {
        controlLED(pos, 'o');
      }
    });
  }, interval);

  if (!activeMission.blinkIntervals) activeMission.blinkIntervals = [];
  activeMission.blinkIntervals.push(blinkInterval);
}

function activateBonusSection() {
  if (activeMission.bonusTargets) {
    activeMission.bonusTargets.forEach(pos => {
      const bonus = { elementId: pos, colorCode: 'y', isBonus: true, isValid: true };
      activeTargets.push(bonus);
      controlLED(pos, 'y');
    });

    // Emit bonus active event to frontend
    console.log('[STRIKELOOP] Bonus section activated');
    emitter.emit('bonusActive', true);
  }
}

function activateLegacyArcadeMode() {
  const config = activeMission;
  const largePositions = [1, 2, 3, 4];
  const mediumPositions = [5, 6, 7, 8];

  if (config.largeHoles && config.largeHoles.active > 0) {
    const activeLargeCount = Math.min(config.largeHoles.active, largePositions.length);
    const selectedPositions = largePositions.slice(0, activeLargeCount);

    selectedPositions.forEach(pos => {
      if (config.largeHoles.color === 'trap') {
        setupTrapPosition(pos);
      } else {
        const target = { elementId: pos, colorCode: config.largeHoles.color, size: 'large', isValid: true };
        activeTargets.push(target);
        controlLED(pos, config.largeHoles.color);
      }
    });
  }

  if (config.mediumHoles && config.mediumHoles.active > 0) {
    const activeMediumCount = Math.min(config.mediumHoles.active, mediumPositions.length);
    const selectedPositions = mediumPositions.slice(0, activeMediumCount);

    selectedPositions.forEach(pos => {
      if (config.mediumHoles.color === 'trap') {
        setupTrapPosition(pos);
      } else {
        const target = { elementId: pos, colorCode: config.mediumHoles.color, size: 'medium', isValid: true };
        activeTargets.push(target);
        controlLED(pos, config.mediumHoles.color);
      }
    });
  }

  if (config.traps && config.traps.count > 0) {
    setupAdditionalTraps(config.traps);
  }
}


function setupTrapPosition(position) {
  const trap = {
    elementId: position,
    colorCode: 'r',
    size: position <= 4 ? 'large' : 'medium',
    isTrap: true,
    isActive: true
  };

  activeTargets.push(trap);
  trapPositions.push(trap);

  
  if (activeMission.arcadeMode === 'green-only' || activeMission.arcadeMode === 'sequence') {
    console.log(`[STRIKELOOP] Setting up solid red trap at position ${position} (${activeMission.arcadeMode} mode)`);
    controlLED(position, 'r');
  } else {
    
    startBlinkingLED(position, 'r');
  }
}


function setupAdditionalTraps(trapConfig) {
  const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
  const existingTraps = trapPositions.map(t => t.elementId);
  const existingTargets = activeTargets.filter(t => t.isValid).map(t => t.elementId);

  
  const availablePositions = allPositions.filter(pos =>
    !existingTraps.includes(pos) && !existingTargets.includes(pos)
  );

  const neededTraps = trapConfig.count - trapPositions.length;
  const trapsToAdd = Math.min(neededTraps, availablePositions.length);

  console.log(`[STRIKELOOP] Setting up additional traps: need ${neededTraps}, available positions: [${availablePositions.join(',')}], adding ${trapsToAdd}`);

  for (let i = 0; i < trapsToAdd; i++) {
    const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const index = availablePositions.indexOf(position);
    if (index > -1) availablePositions.splice(index, 1);

    setupTrapPosition(position);
  }
}


function startBlinkingLED(position, color) {
  let isOn = true;
  const blinkInterval = setInterval(() => {
    if (isOn) {
      controlLED(position, color);
    } else {
      controlLED(position, 'o');
    }
    isOn = !isOn;
  }, 400); 

  
  if (!activeMission.blinkIntervals) activeMission.blinkIntervals = [];
  activeMission.blinkIntervals.push(blinkInterval);
}


function activateMultiplier(level) {
  if (!activeMission?.multiplier) return;

  const multiplierConfig = activeMission.multiplier;
  let newMultiplier = 1;
  let duration = 0;

  if (level === 2 && consecutiveValidHits >= multiplierConfig.x2After) {
    newMultiplier = 2;
    duration = multiplierConfig.x2Duration * 1000; 
  } else if (level === 3 && consecutiveValidHits >= multiplierConfig.x3After) {
    newMultiplier = 3;
    duration = multiplierConfig.x3Duration * 1000;
  }

  if (newMultiplier > currentMultiplier) {
    currentMultiplier = newMultiplier;
    multiplierActive = true;

    
    if (multiplierTimer) {
      clearTimeout(multiplierTimer);
    }

    
    multiplierTimer = setTimeout(() => {
      console.log(`[STRIKELOOP] Multiplier x${currentMultiplier} expired`);
      currentMultiplier = 1;
      multiplierActive = false;
      consecutiveValidHits = 0; 

      
      gameState.multiplier = 'x1';
      emitter.emit('multiplierUpdate', gameState.multiplier);
    }, duration);

    console.log(`[STRIKELOOP] Multiplier ACTIVATED: x${currentMultiplier} for ${duration/1000}s`);

    
    gameState.multiplier = `x${currentMultiplier}`;
    emitter.emit('multiplierUpdate', gameState.multiplier);
  }
}


function cancelMultiplier() {
  if (multiplierActive) {
    console.log(`[STRIKELOOP] Multiplier x${currentMultiplier} CANCELLED by trap hit!`);

    if (multiplierTimer) {
      clearTimeout(multiplierTimer);
      multiplierTimer = null;
    }

    currentMultiplier = 1;
    multiplierActive = false;
    consecutiveValidHits = 0;

    
    gameState.multiplier = 'x1';
    emitter.emit('multiplierUpdate', gameState.multiplier);
  }
}


function validateArcadeInput(target, timestamp) {
  if (!activeMission) return;

  const { elementId, colorCode, isTrap, isValid, size } = target;
  let pointsAwarded = 0;
  let wasValidHit = false;

  console.log(`[STRIKELOOP] Arcade validation - Circle ${elementId}: color=${colorCode}, isTrap=${isTrap}, isValid=${isValid}`);


  if (isTrap === true || colorCode === 'r') {
    const penalty = activeMission.penaltyRed || activeMission.traps?.penalty || -100;
    console.log(`[STRIKELOOP] ❌ TRAP HIT! Circle ${elementId} - Penalty: ${penalty}`);
    pointsAwarded = penalty;


    cancelMultiplier();


    if (activeMission.traps?.reactivateDelay > 0) {
      setTimeout(() => {
        console.log(`[STRIKELOOP] Trap ${elementId} reactivated`);
        startBlinkingLED(elementId, 'r');
      }, activeMission.traps.reactivateDelay * 1000);
    }
  }

  else {
    wasValidHit = processArcadeMode(target, timestamp);
    if (wasValidHit) {
      pointsAwarded = calculatePoints(target);
      consecutiveValidHits++;


      if (activeMission.multiplier && consecutiveValidHits >= (activeMission.multiplier.x2After || 2)) {
        activateMultiplier(2);
      }
      if (activeMission.multiplier && consecutiveValidHits >= (activeMission.multiplier.x3After || 3)) {
        activateMultiplier(3);
      }
    }
  }


  if (wasValidHit && multiplierActive && pointsAwarded > 0) {
    pointsAwarded = Math.floor(pointsAwarded * currentMultiplier);
    console.log(`[STRIKELOOP] Multiplier x${currentMultiplier} applied: ${pointsAwarded} points`);
  }


  if (pointsAwarded !== 0) {
    const newScore = localScore + pointsAwarded;
    updateScore(newScore);
    console.log(`[STRIKELOOP] Score: ${localScore - pointsAwarded} -> ${localScore} (${pointsAwarded > 0 ? '+' : ''}${pointsAwarded})`);
  }


  const noRefreshModes = ['sequence', 'green-only', 'rotating-green', 'rotating-green-blue', 'rotating-blue'];
  if (!noRefreshModes.includes(activeMission.arcadeMode)) {
    setTimeout(() => {
      activateArcadeLEDs();
    }, 300);
  }
}


function processArcadeMode(target, timestamp) {
  const mode = activeMission.arcadeMode;
  const { elementId, colorCode } = target;

  switch (mode) {
    case 'green-blue-combo':
      return processGreenBlueComboMode(target);
    case 'green-avoid-red':
      return processGreenAvoidRedMode(target);
    case 'blue-avoid-red':
      return processBlueAvoidRedMode(target);
    case 'rotating-green':
      return processRotatingGreenMode(target);
    case 'rotating-green-blue':
      return processRotatingGreenBlueMode(target);
    case 'rotating-blue':
      return processRotatingBlueMode(target);
    case 'multi-hit-green':
      return processMultiHitGreenMode(target);
    case 'multi-hit-blue':
      return processMultiHitBlueMode(target);
    case 'green-only':
      return processGreenOnlyMode(target);
    case 'sequence':
      return processSequenceMode(target);
    case 'chain-activation':
      return processChainActivationMode(target);
    case 'cumulative-bonus':
      return processCumulativeBonusMode(target);
    case 'combo-system':
      return processComboSystemMode(target);
    case 'blinking-green-bonus':
      return processBlinkingGreenBonusMode(target);
    case 'blinking-blue-bonus':
      return processBlinkingBlueBonusMode(target);
    case 'snake-green-3':
      return processSnakeGreen3Mode(target);
    case 'snake-blue-3':
      return processSnakeBlue3Mode(target);
    case 'snake-green-2':
      return processSnakeGreen2Mode(target);
    case 'snake-blue-2':
      return processSnakeBlue2Mode(target);
    case 'memory-sequence-4-green':
    case 'memory-sequence-4-blue':
    case 'memory-sequence-6-mixed':
    case 'memory-sequence-7-mixed':
      return processMemorySequenceMode(target);
    default:
      console.log(`[STRIKELOOP] Unknown arcade mode: ${mode}`);
      return false;
  }
}


function processGreenBlueComboMode(target) {
  if (target.colorCode === 'g') {
    console.log(`[STRIKELOOP] ✅ GREEN HIT! Circle ${target.elementId} +${activeMission.pointsPerGreen} points`);
    return true;
  } else if (target.colorCode === 'b') {
    console.log(`[STRIKELOOP] ✅ BLUE HIT! Circle ${target.elementId} +${activeMission.pointsPerBlue} points`);
    return true;
  }
  return false;
}

function processGreenAvoidRedMode(target) {
  if (target.colorCode === 'g') {
    console.log(`[STRIKELOOP] ✅ GREEN HIT! Circle ${target.elementId} +${activeMission.pointsPerGreen} points`);
    return true;
  }
  return false;
}

function processBlueAvoidRedMode(target) {
  if (target.colorCode === 'b') {
    console.log(`[STRIKELOOP] ✅ BLUE HIT! Circle ${target.elementId} +${activeMission.pointsPerBlue} points`);
    return true;
  }
  return false;
}

function processRotatingGreenMode(target) {
  if (target.colorCode === 'g' && target.isActive) {
    console.log(`[STRIKELOOP] ✅ GREEN HIT! Circle ${target.elementId} +${activeMission.pointsPerGreen} points`);
    return true;
  }
  return false;
}

function processRotatingGreenBlueMode(target) {
  if ((target.colorCode === 'g' || target.colorCode === 'b') && target.isActive) {
    const points = target.colorCode === 'g' ? activeMission.pointsPerGreen : activeMission.pointsPerBlue;
    console.log(`[STRIKELOOP] ✅ ${target.colorCode.toUpperCase()} HIT! Circle ${target.elementId} +${points} points`);
    return true;
  }
  return false;
}

function processRotatingBlueMode(target) {
  if (target.colorCode === 'b' && target.isActive) {
    console.log(`[STRIKELOOP] ✅ BLUE HIT! Circle ${target.elementId} +${activeMission.pointsPerBlue} points`);
    return true;
  }
  return false;
}

let multiHitTracker = {};

function processMultiHitGreenMode(target) {
  if (target.colorCode === 'g') {
    const targetId = target.elementId;

    if (!multiHitTracker[targetId]) {
      multiHitTracker[targetId] = 0;
    }
    multiHitTracker[targetId]++;

    console.log(`[STRIKELOOP] GREEN HIT ${multiHitTracker[targetId]}/${activeMission.requiredHits}! Circle ${targetId}`);

    if (multiHitTracker[targetId] >= activeMission.requiredHits) {
      console.log(`[STRIKELOOP] ✅ TARGET COMPLETED! ${activeMission.requiredHits}x hits on green ${targetId} +${activeMission.pointsPerCompletion} points`);
      multiHitTracker[targetId] = 0;
      return true;
    }

    Object.keys(multiHitTracker).forEach(id => {
      if (id != targetId) {
        multiHitTracker[id] = 0;
      }
    });

    return false;
  }
  return false;
}

function processMultiHitBlueMode(target) {
  if (target.colorCode === 'b') {
    const targetId = target.elementId;

    if (!multiHitTracker[targetId]) {
      multiHitTracker[targetId] = 0;
    }
    multiHitTracker[targetId]++;

    console.log(`[STRIKELOOP] BLUE HIT ${multiHitTracker[targetId]}/${activeMission.requiredHits}! Circle ${targetId}`);

    if (multiHitTracker[targetId] >= activeMission.requiredHits) {
      console.log(`[STRIKELOOP] ✅ TARGET COMPLETED! ${activeMission.requiredHits}x hits on blue ${targetId} +${activeMission.pointsPerCompletion} points`);
      multiHitTracker[targetId] = 0;
      return true;
    }

    Object.keys(multiHitTracker).forEach(id => {
      if (id != targetId) {
        multiHitTracker[id] = 0;
      }
    });

    return false;
  }
  return false;
}

function processGreenOnlyMode(target) {
  if (target.colorCode === 'g') {
    console.log(`[STRIKELOOP] ✅ GREEN HIT! Circle ${target.elementId}`);
    return true;
  } else {
    console.log(`[STRIKELOOP] ⚪ NEUTRAL HIT: ${target.colorCode?.toUpperCase()} (ignored, no penalty)`);

    return false;
  }
}


function processSequenceMode(target) {
  const sequence = activeMission.sequence || ['g', 'b', 'g'];
  const expectedColor = sequence[sequenceStep % sequence.length];

  
  if (target.isTrap || target.colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ TRAP HIT in sequence! Resetting sequence progress.`);
    sequenceStep = 0;
    consecutiveValidHits = 0; 
    return false;
  }

  
  if (target.colorCode === expectedColor) {
    console.log(`[STRIKELOOP] ✅ SEQUENCE ${sequenceStep + 1}/${sequence.length}: ${expectedColor.toUpperCase()} HIT!`);
    sequenceStep++;

    if (sequenceStep >= sequence.length) {
      console.log(`[STRIKELOOP] 🎉 SEQUENCE COMPLETED! Restarting...`);
      sequenceStep = 0;
      consecutiveValidHits++; 
      console.log(`[STRIKELOOP] Consecutive complete sequences: ${consecutiveValidHits}`);
      return true; 
    }
    return false; 
  } else {
    console.log(`[STRIKELOOP] ❌ Wrong sequence! Expected ${expectedColor.toUpperCase()}, got ${target.colorCode?.toUpperCase()}`);
    sequenceStep = 0; 
    consecutiveValidHits = 0; 
    return false;
  }
}


function processChainActivationMode(target) {
  if (target.isValid && (target.colorCode === 'g' || target.colorCode === 'b')) {
    activationHits++;
    console.log(`[STRIKELOOP] ✅ CHAIN HIT ${activationHits}! (${target.colorCode?.toUpperCase()})`);

    if (activationHits >= (activeMission.activationRequirement || 3)) {
      console.log(`[STRIKELOOP] 🎉 CHAIN ACTIVATION ACHIEVED!`);
    }
    return true;
  }
  return false;
}


function processCumulativeBonusMode(target) {
  if (target.isValid && (target.colorCode === 'g' || target.colorCode === 'b')) {
    const targetId = target.elementId;

    if (!cumulativeHitCounts[targetId]) {
      cumulativeHitCounts[targetId] = 0;
    }
    cumulativeHitCounts[targetId]++;

    console.log(`[STRIKELOOP] ✅ CUMULATIVE HIT! Circle ${targetId} - Count: ${cumulativeHitCounts[targetId]}`);

    if (cumulativeHitCounts[targetId] >= 3) {
      console.log(`[STRIKELOOP] 🎉 CUMULATIVE BONUS! +10 points for 3x hits on circle ${targetId}`);
      const bonusScore = gameState.score + 10;
      updateScore(bonusScore);
      cumulativeHitCounts[targetId] = 0; 
    }

    
    Object.keys(cumulativeHitCounts).forEach(id => {
      if (id != targetId) {
        cumulativeHitCounts[id] = 0;
      }
    });

    return true;
  }
  return false;
}


function processComboSystemMode(target) {
  if (target.isValid && (target.colorCode === 'g' || target.colorCode === 'b')) {
    comboProgress++;
    console.log(`[STRIKELOOP] ✅ COMBO HIT ${comboProgress}! (${target.colorCode?.toUpperCase()})`);

    if (comboProgress >= 3) {
      console.log(`[STRIKELOOP] 🎉 COMBO COMPLETED! Clean 3-hit streak!`);
      comboProgress = 0;
    }
    return true;
  } else {
    console.log(`[STRIKELOOP] ❌ COMBO BROKEN!`);
    comboProgress = 0;
    consecutiveValidHits = 0;
    return false;
  }
}

// ============================================
// ROUND 2 PROCESSOR FUNCTIONS
// ============================================

function processBlinkingGreenBonusMode(target) {
  // Green targets: valid hits only if currently lit (blinking)
  if (target.colorCode === 'g' && target.isValid) {
    // Check if the LED is currently "on" in the blink cycle
    if (blinkStates[target.elementId]) {
      console.log(`[STRIKELOOP] ✅ GREEN HIT! Circle ${target.elementId} +${activeMission.pointsPerGreen} points`);
      return true;
    } else {
      console.log(`[STRIKELOOP] ⚪ GREEN MISS! Circle ${target.elementId} was off (no points)`);
      return false;
    }
  }
  // Yellow bonus: valid hits (always on, not blinking)
  if (target.isBonus && target.colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${target.elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }
  // Red traps: penalty (always on, not blinking)
  if (target.colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ RED TRAP! Circle ${target.elementId} ${activeMission.penaltyRed} points`);
  }
  return false;
}

function processBlinkingBlueBonusMode(target) {
  // Blue targets: valid hits only if currently lit (blinking)
  if (target.colorCode === 'b' && target.isValid) {
    // Check if the LED is currently "on" in the blink cycle
    if (blinkStates[target.elementId]) {
      console.log(`[STRIKELOOP] ✅ BLUE HIT! Circle ${target.elementId} +${activeMission.pointsPerBlue} points`);
      return true;
    } else {
      console.log(`[STRIKELOOP] ⚪ BLUE MISS! Circle ${target.elementId} was off (no points)`);
      return false;
    }
  }
  // Yellow bonus: valid hits (always on, not blinking)
  if (target.isBonus && target.colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${target.elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }
  // Red traps: penalty (always on, not blinking)
  if (target.colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ RED TRAP! Circle ${target.elementId} ${activeMission.penaltyRed} points`);
  }
  return false;
}

function processSnakeGreen3Mode(target) {
  // Yellow bonus: valid hits
  if (target.isBonus && target.colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${target.elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }

  // Check if target is one of the currently active snake positions (green and isActive)
  if (target.colorCode === 'g' && target.isActive) {
    console.log(`[STRIKELOOP] ✅ SNAKE GREEN HIT! Circle ${target.elementId} +${activeMission.pointsPerGreen} points`);
    return true;
  }

  // Red traps (fixed or inactive positions): penalty
  if (target.colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ RED TRAP HIT! Circle ${target.elementId} ${activeMission.penaltyRed} points`);
    return false; // Still return false to apply penalty through calculatePoints
  }

  console.log(`[STRIKELOOP] ⚪ Target ${target.elementId} ignored`);
  return false;
}

function processSnakeBlue3Mode(target) {
  // Yellow bonus: valid hits
  if (target.isBonus && target.colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${target.elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }

  // Check if target is one of the currently active snake positions (blue and isActive)
  if (target.colorCode === 'b' && target.isActive) {
    console.log(`[STRIKELOOP] ✅ SNAKE BLUE HIT! Circle ${target.elementId} +${activeMission.pointsPerBlue} points`);
    return true;
  }

  // Red traps (fixed or inactive positions): penalty
  if (target.colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ RED TRAP HIT! Circle ${target.elementId} ${activeMission.penaltyRed} points`);
    return false; // Still return false to apply penalty through calculatePoints
  }

  console.log(`[STRIKELOOP] ⚪ Target ${target.elementId} ignored`);
  return false;
}

function processSnakeGreen2Mode(target) {
  // Yellow bonus: valid hits
  if (target.isBonus && target.colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${target.elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }

  // Check if target is one of the currently active snake positions (green and isActive)
  if (target.colorCode === 'g' && target.isActive) {
    console.log(`[STRIKELOOP] ✅ SNAKE GREEN HIT! Circle ${target.elementId} +${activeMission.pointsPerGreen} points`);
    return true;
  }

  // Red traps (fixed or inactive positions): penalty
  if (target.colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ RED TRAP HIT! Circle ${target.elementId} ${activeMission.penaltyRed} points`);
    return false; // Still return false to apply penalty through calculatePoints
  }

  console.log(`[STRIKELOOP] ⚪ Target ${target.elementId} ignored`);
  return false;
}

function processSnakeBlue2Mode(target) {
  // Yellow bonus: valid hits
  if (target.isBonus && target.colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${target.elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }

  // Check if target is one of the currently active snake positions (blue and isActive)
  if (target.colorCode === 'b' && target.isActive) {
    console.log(`[STRIKELOOP] ✅ SNAKE BLUE HIT! Circle ${target.elementId} +${activeMission.pointsPerBlue} points`);
    return true;
  }

  // Red traps (fixed or inactive positions): penalty
  if (target.colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ RED TRAP HIT! Circle ${target.elementId} ${activeMission.penaltyRed} points`);
    return false; // Still return false to apply penalty through calculatePoints
  }

  console.log(`[STRIKELOOP] ⚪ Target ${target.elementId} ignored`);
  return false;
}

function processMemorySequenceMode(target) {
  // During display phase, ignore all hits
  if (!memorySequenceDisplayed) {
    console.log(`[STRIKELOOP] ⏸️ Sequence display in progress - hit ignored`);
    return false;
  }

  const elementId = target.elementId;

  // Check if it's a bonus target (yellow) - always valid during reproduction
  if (target.isBonus && target.colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }

  // Check if it's part of the sequence (not a red trap)
  const isSequenceTarget = memorySequence.includes(elementId);

  // If it's not in the sequence at all, ignore it (no penalty)
  if (!isSequenceTarget) {
    console.log(`[STRIKELOOP] ⚪ Non-sequence target hit - ignored`);
    return false;
  }

  // Check if this is the next expected hit in the sequence
  const expectedId = memorySequence[memorySequenceIndex];

  if (elementId === expectedId) {
    // Correct hit!
    memorySequenceIndex++;
    console.log(`[STRIKELOOP] ✅ CORRECT! Position ${memorySequenceIndex}/${memorySequence.length}`);

    // Check if sequence is complete
    if (memorySequenceIndex >= memorySequence.length) {
      console.log(`[STRIKELOOP] 🎉 SEQUENCE COMPLETED! +${activeMission.goalScore} points`);
      // Mark completion for scoring
      target.sequenceCompleted = true;
      // Reset for potential next sequence
      memorySequenceIndex = 0;
      memorySequenceDisplayed = false;
      return true; // Full points awarded
    }
    return false; // Partial completion, no points yet
  } else {
    // Wrong hit! Penalty and reset
    console.log(`[STRIKELOOP] ❌ WRONG! Expected ${expectedId}, got ${elementId}. ${activeMission.penaltyRed} points. Sequence reset.`);
    // Mark as wrong for penalty scoring
    target.sequenceWrong = true;
    memorySequenceIndex = 0;
    return true; // Return true so penalty is calculated
  }
}


function calculatePoints(target) {
  const mode = activeMission.arcadeMode;

  switch (mode) {
    case 'green-blue-combo':
      return target.colorCode === 'g' ? activeMission.pointsPerGreen : activeMission.pointsPerBlue;
    case 'green-avoid-red':
      return activeMission.pointsPerGreen;
    case 'blue-avoid-red':
      return activeMission.pointsPerBlue;
    case 'rotating-green':
      return activeMission.pointsPerGreen;
    case 'rotating-green-blue':
      return target.colorCode === 'g' ? activeMission.pointsPerGreen : activeMission.pointsPerBlue;
    case 'rotating-blue':
      return activeMission.pointsPerBlue;
    case 'multi-hit-green':
    case 'multi-hit-blue':
      return activeMission.pointsPerCompletion;
    case 'sequence':
      let basePoints = activeMission.pointsPerHit || 60;
      if (consecutiveValidHits >= 2) {
        basePoints *= 2;
        console.log(`[STRIKELOOP] Sequence x2 multiplier applied! (${consecutiveValidHits} consecutive sequences)`);
      }
      if (consecutiveValidHits >= 3) {
        basePoints = (activeMission.pointsPerHit || 60) * 3;
        console.log(`[STRIKELOOP] Sequence x3 multiplier applied! (${consecutiveValidHits} consecutive sequences)`);
      }
      return basePoints;
    case 'blinking-green-bonus':
      // Bonus targets give pointsPerBonus, green targets give pointsPerGreen, red traps give penalty
      if (target.isBonus && target.colorCode === 'y') {
        return activeMission.pointsPerBonus;
      }
      if (target.colorCode === 'g') {
        return activeMission.pointsPerGreen;
      }
      if (target.colorCode === 'r') {
        return activeMission.penaltyRed;
      }
      return 0;
    case 'blinking-blue-bonus':
      // Bonus targets give pointsPerBonus, blue targets give pointsPerBlue, red traps give penalty
      if (target.isBonus && target.colorCode === 'y') {
        return activeMission.pointsPerBonus;
      }
      if (target.colorCode === 'b') {
        return activeMission.pointsPerBlue;
      }
      if (target.colorCode === 'r') {
        return activeMission.penaltyRed;
      }
      return 0;
    case 'snake-green-3':
    case 'snake-green-2':
      // Bonus targets give pointsPerBonus, active green targets give pointsPerGreen, others give penalty
      if (target.isBonus && target.colorCode === 'y') {
        return activeMission.pointsPerBonus;
      }
      if (target.colorCode === 'g' && target.isActive) {
        return activeMission.pointsPerGreen;
      }
      // Inactive or red trap
      return activeMission.penaltyRed;
    case 'snake-blue-3':
    case 'snake-blue-2':
      // Bonus targets give pointsPerBonus, active blue targets give pointsPerBlue, others give penalty
      if (target.isBonus && target.colorCode === 'y') {
        return activeMission.pointsPerBonus;
      }
      if (target.colorCode === 'b' && target.isActive) {
        return activeMission.pointsPerBlue;
      }
      // Inactive or red trap
      return activeMission.penaltyRed;
    case 'memory-sequence-4-green':
    case 'memory-sequence-4-blue':
    case 'memory-sequence-6-mixed':
    case 'memory-sequence-7-mixed':
      // Bonus targets give pointsPerBonus
      if (target.isBonus && target.colorCode === 'y') {
        return activeMission.pointsPerBonus;
      }
      // Full sequence completion gives goalScore
      if (target.sequenceCompleted) {
        return activeMission.goalScore;
      }
      // Wrong sequence hit gives penalty
      if (target.sequenceWrong) {
        return activeMission.penaltyRed;
      }
      return 0;
    default:
      let defaultPoints = activeMission.pointsPerHit || 50;
      if (target.size === 'large') {
        defaultPoints += 10;
      }
      return defaultPoints;
  }
}


function cleanupArcadeGame() {

  if (multiplierTimer) {
    clearTimeout(multiplierTimer);
    multiplierTimer = null;
  }


  if (activeMission?.blinkIntervals) {
    activeMission.blinkIntervals.forEach(interval => clearInterval(interval));
    activeMission.blinkIntervals = [];
  }


  if (rotationInterval) {
    clearInterval(rotationInterval);
    rotationInterval = null;
  }


  consecutiveValidHits = 0;
  currentMultiplier = 1;
  multiplierActive = false;
  trapPositions = [];
  cumulativeHitCounts = {};
  comboProgress = 0;
  activationHits = 0;
  sequenceStep = 0;
  multiHitTracker = {};

  // Round 2: Clear memory sequence state
  memorySequence = [];
  memorySequenceIndex = 0;
  memorySequenceDisplayed = false;

  // Clear blink states
  blinkStates = {};
}

module.exports = {
  emitter,
  startRoundBasedGame,
  stopGame,
  resetGameToInitialState,
  controlOutput,
  isRunning: () => isRunning,

  updateScore,
  updateMission,
  updateRound,
  updateMultiplier,
  gameState: () => gameState,

  setGameRounds,
  getCurrentLevel,
  getTotalRemainingTime,
  formatTime,

  gameRounds: () => gameRounds,
  currentLevelIndex: () => currentLevelIndex
};


let isCleaningUp = false;

function handleShutdown() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  console.log('[STRIKELOOP] Shutting down...');
  stopGame();

  
  process.exit(0);
}

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
