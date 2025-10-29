const events = require('events');
const HAL = require('./hardwareAbstraction.js');
const readline = require('readline');
const emitter = new events.EventEmitter();

// ⚠️ TESTING FLAG: Set to true to play Round 2 first (for testing)
// Set to false for normal game flow (Round 1 → Round 2 → Round 3)
const TESTING_MODE_SWAP_ROUNDS = true


const OUTPUT_IDS = {

  OUTER_CIRCLE_1: 1,
  OUTER_CIRCLE_2: 2,
  OUTER_CIRCLE_3: 3,
  OUTER_CIRCLE_4: 4,
  OUTER_CIRCLE_5: 5,
  OUTER_CIRCLE_6: 6,
  OUTER_CIRCLE_7: 7,
  OUTER_CIRCLE_8: 8,

  // Central circle (9) - controls the border/ring around the 5 small holes
  // Note: Holes 10-13 have NO output control (input only)
  CENTRAL_CIRCLE: 9,

  // Control buttons (14-28) - Extended hardware
  CONTROL_BUTTON_1: 14,
  CONTROL_BUTTON_2: 15,
  CONTROL_BUTTON_3: 16,
  CONTROL_BUTTON_4: 17,
  CONTROL_BUTTON_5: 18,
  CONTROL_BUTTON_6: 19,
  CONTROL_BUTTON_7: 20,
  CONTROL_BUTTON_8: 21,
  CONTROL_BUTTON_9: 22,
  CONTROL_BUTTON_10: 23,
  CONTROL_BUTTON_11: 24,
  CONTROL_BUTTON_12: 25,
  CONTROL_BUTTON_13: 26,
  CONTROL_BUTTON_14: 27,
  CONTROL_BUTTON_15: 28
};


const OUTER_CIRCLES_RANGE = { min: 1, max: 8 };
const INNER_CIRCLES_RANGE = { min: 9, max: 13 };
const CONTROL_BUTTONS_RANGE = { min: 14, max: 28 }; // Extended to 15 buttons
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


// Game rounds in normal order: Round 1 → Round 2 → Round 3
let gameRounds = [
  // ROUND 1 - 10 Levels (Original modes)
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
    pointsPerBonus: 50,
    penaltyRed: -100
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
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  // ROUND 3 (TWO-STEP VALIDATION) - 10 Levels - NEW IMPLEMENTATION
  {
    round: 3, level: 1,
    mission: 'Touchez les cibles vertes puis appuyez sur les 4 boutons VERT!',
    duration: 30,
    goalScore: 440,
    arcadeMode: 'two-step-all-buttons-green',
    greenTargets: [1, 2, 3, 4],  // Fixed green circles
    redTraps: [5, 6, 7, 8],
    bonusTargets: [9, 10, 11, 12, 13],
    buttonMode: 'all-green',  // All 4 green buttons must be pressed
    validationWindow: 3000,
    pointsPerValidated: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 3, level: 2,
    mission: 'Touchez les cibles bleues puis appuyez sur les 4 boutons BLEU!',
    duration: 30,
    goalScore: 440,
    arcadeMode: 'two-step-all-buttons-blue',
    blueTargets: [5, 6, 7, 8],  // Fixed blue circles
    redTraps: [1, 2, 3, 4],
    bonusTargets: [9, 10, 11, 12, 13],
    buttonMode: 'all-blue',  // All 4 blue buttons must be pressed
    validationWindow: 3000,
    pointsPerValidated: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 3, level: 3,
    mission: 'Touchez les cibles vertes mobiles puis appuyez sur les 4 boutons VERT!',
    duration: 30,
    goalScore: 480,
    arcadeMode: 'two-step-alternating-all-buttons-green',
    greenTargets: [1, 2, 3, 4],
    redTraps: [5, 6, 7, 8],
    bonusTargets: [9, 10, 11, 12, 13],
    alternatePattern: [[1, 3], [2, 4]],  // Alternating pattern
    alternateInterval: 3000,
    buttonMode: 'all-green',
    validationWindow: 3000,
    pointsPerValidated: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 3, level: 4,
    mission: 'Touchez les cibles bleues mobiles puis appuyez sur les 4 boutons BLEU!',
    duration: 30,
    goalScore: 480,
    arcadeMode: 'two-step-alternating-all-buttons-blue',
    blueTargets: [5, 6, 7, 8],
    redTraps: [1, 2, 3, 4],
    bonusTargets: [9, 10, 11, 12, 13],
    alternatePattern: [[5, 7], [6, 8]],  // Alternating pattern
    alternateInterval: 3000,
    buttonMode: 'all-blue',
    validationWindow: 3000,
    pointsPerValidated: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 3, level: 5,
    mission: 'Mémorisez et reproduisez la séquence VERTE!',
    duration: 30,
    goalScore: 520,
    arcadeMode: 'two-step-sequence-green',
    greenTargets: [1, 2, 3, 4],  // Fixed green circles
    redTraps: [5, 6, 7, 8],
    bonusTargets: [9, 10, 11, 12, 13],
    buttonMode: 'sequence-green',  // Sequence reproduction mode
    sequenceLength: 3,  // 3 buttons out of 4
    sequenceDisplayTime: 1000,  // 1 sec on
    sequenceOffTime: 1000,  // 1 sec off
    validationWindow: 3000,
    pointsPerValidated: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 3, level: 6,
    mission: 'Mémorisez et reproduisez la séquence BLEUE!',
    duration: 30,
    goalScore: 520,
    arcadeMode: 'two-step-sequence-blue',
    blueTargets: [5, 6, 7, 8],  // Fixed blue circles
    redTraps: [1, 2, 3, 4],
    bonusTargets: [9, 10, 11, 12, 13],
    buttonMode: 'sequence-blue',  // Sequence reproduction mode
    sequenceLength: 3,  // 3 buttons out of 4
    sequenceDisplayTime: 1000,
    sequenceOffTime: 1000,
    validationWindow: 3000,
    pointsPerValidated: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 3, level: 7,
    mission: 'Frappez 2 trous et validez dans le MÊME ORDRE!',
    duration: 30,
    goalScore: 560,
    arcadeMode: 'sequence-match-2-holes',
    greenTargets: [1, 2, 3, 4],    // 4 green holes
    blueTargets: [5, 6, 7, 8],     // 4 blue holes
    bonusTargets: [9, 10, 11, 12, 13],
    sequenceLength: 2,  // Must hit 2 holes
    buttonMode: 'sequence-match',
    pointsPerSequence: 100,
    pointsPerBonus: 50
  },
  {
    round: 3, level: 8,
    mission: 'Frappez 2 trous et validez dans le MÊME ORDRE!',
    duration: 30,
    goalScore: 580,
    arcadeMode: 'sequence-match-2-holes-hard',
    greenTargets: [1, 2],      // Only 2 green holes
    blueTargets: [5, 6],       // Only 2 blue holes
    redTraps: [3, 4, 7, 8],    // Rest are red penalties
    bonusTargets: [9, 10, 11, 12, 13],
    sequenceLength: 2,  // Must hit 2 holes
    buttonMode: 'sequence-match',
    pointsPerSequence: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
  },
  {
    round: 3, level: 9,
    mission: 'Frappez 3 trous et validez dans le MÊME ORDRE!',
    duration: 30,
    goalScore: 600,
    arcadeMode: 'sequence-match-3-holes',
    greenTargets: [1, 2],      // 2 green holes
    blueTargets: [5, 6],       // 2 blue holes
    yellowTargets: [3, 7],     // 2 yellow holes
    whiteTargets: [4, 8],      // 2 white holes
    bonusTargets: [9, 10, 11, 12, 13],
    sequenceLength: 3,  // Must hit 3 holes
    buttonMode: 'sequence-match',
    pointsPerSequence: 100,
    pointsPerBonus: 50
  },
  {
    round: 3, level: 10,
    mission: 'Frappez 3 trous et validez dans le MÊME ORDRE!',
    duration: 30,
    goalScore: 620,
    arcadeMode: 'sequence-match-3-holes-hard',
    greenTargets: [1],         // 1 green hole
    blueTargets: [5],          // 1 blue hole
    yellowTargets: [3],        // 1 yellow hole
    whiteTargets: [4],         // 1 white hole
    redTraps: [2, 6, 7, 8],    // Rest are red penalties
    bonusTargets: [9, 10, 11, 12, 13],
    sequenceLength: 3,  // Must hit 3 holes
    buttonMode: 'sequence-match',
    pointsPerSequence: 100,
    pointsPerBonus: 50,
    penaltyRed: -100
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
  'r': '#e74c3c',  // Red
  'g': '#27ae60',  // Green
  'b': '#3498db',  // Blue
  'y': '#f1c40f',  // Yellow
  'd': '#ffffff',  // White (new protocol for white ON state)
  'o': '#ffffff'   // OFF state (kept for compatibility)
};


const CONTROL_BUTTONS = [
  OUTPUT_IDS.CONTROL_BUTTON_1,   // 14
  OUTPUT_IDS.CONTROL_BUTTON_2,   // 15
  OUTPUT_IDS.CONTROL_BUTTON_3,   // 16
  OUTPUT_IDS.CONTROL_BUTTON_4,   // 17
  OUTPUT_IDS.CONTROL_BUTTON_5,   // 18
  OUTPUT_IDS.CONTROL_BUTTON_6,   // 19
  OUTPUT_IDS.CONTROL_BUTTON_7,   // 20
  OUTPUT_IDS.CONTROL_BUTTON_8,   // 21
  OUTPUT_IDS.CONTROL_BUTTON_9,   // 22
  OUTPUT_IDS.CONTROL_BUTTON_10,  // 23
  OUTPUT_IDS.CONTROL_BUTTON_11,  // 24
  OUTPUT_IDS.CONTROL_BUTTON_12,  // 25
  OUTPUT_IDS.CONTROL_BUTTON_13,  // 26
  OUTPUT_IDS.CONTROL_BUTTON_14,  // 27
  OUTPUT_IDS.CONTROL_BUTTON_15   // 28
];

// Fixed button color mapping (hardware-defined)
const BUTTON_COLORS = {
  14: 'y',  // Yellow
  15: 'g',  // Green
  16: 'b',  // Blue
  17: 'b',  // Blue
  18: 'd',  // White
  19: 'd',  // White
  20: 'y',  // Yellow
  21: 'g',  // Green
  22: 'g',  // Green
  23: 'y',  // Yellow
  24: 'b',  // Blue
  25: 'd',  // White
  26: 'g',  // Green
  27: 'b',  // Blue
  28: 'y'   // Yellow
};

// Buttons grouped by color for easy access
const BUTTONS_BY_COLOR = {
  green: [15, 21, 22, 26],      // 4 green buttons
  blue: [16, 17, 24, 27],       // 4 blue buttons (note: 5 total but we use 4)
  yellow: [14, 20, 23, 28],     // 4 yellow buttons
  white: [18, 19, 25]           // 3 white buttons
};


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
    
    // Check if it's a button click (14-22) or circle click (1-13)
    const clickedId = parseInt(data.circleId);
    if (clickedId >= CONTROL_BUTTONS_RANGE.min && clickedId <= CONTROL_BUTTONS_RANGE.max) {
      // It's a button click
      const buttonIndex = clickedId - CONTROL_BUTTONS_RANGE.min;
      console.log(`[STRIKELOOP] Control button ${clickedId} pressed (index ${buttonIndex})`);
      validateButtonPress(buttonIndex);
    } else {
      // It's a circle click
      processGameInput(data.circleId, 'simulator');
    }
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
    console.log('[STRIKELOOP] ⚠️  TESTING MODE: Swapping rounds - Round 3 will play first!');
    const round1Levels = gameRounds.filter(level => level.round === 1);
    const round3Levels = gameRounds.filter(level => level.round === 3);
    const otherLevels = gameRounds.filter(level => level.round !== 1 && level.round !== 3);
    gameRounds = [...round3Levels, ...round1Levels, ...otherLevels];
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


  initializeMission(currentLevel, isRetry);


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


function initializeMission(levelConfig, isRetry = false) {
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
  
  // Clear sequence validation state (Levels 5-6)
  sequenceToMatch = [];
  sequencePlayerInput = [];
  sequenceDisplaying = false;
  sequenceValidationActive = false;
  
  // Clear hole sequence matching state (Levels 7-10)
  holeSequenceToMatch = [];
  holeSequenceHit = [];
  holeSequenceActive = false;
  buttonSequenceToMatch = [];
  buttonSequencePressed = [];
  buttonSequenceActive = false;

  // Reset button initialization flag (only on new level, not retry)
  if (!isRetry) {
    buttonsInitialized = false;
  }

  // Clear blink states
  blinkStates = {};

  // Clear snake mode tracking
  lastSnakeMode = null;
  snakePatternIndex = 0;

  // Deactivate bonus indicator
  emitter.emit('bonusActive', false);

  // OPTIMIZATION: Only reset LEDs when starting a NEW level, not on retry
  // On retry, the same level pattern will be reactivated, so we save ~17 serial writes
  // IMPORTANT: For Round 3 hole sequence modes, also preserve sequence state on retry
  if (!isRetry) {
    console.log('[STRIKELOOP] New level - resetting all LEDs');
    // Turn off all LEDs before starting new level
    // Note: Skip 10-13 as they have no LEDs (input only)
    for (let i = 1; i <= 8; i++) {
      controlLED(i, 'o');
    }
    // Turn off central circle (9)
    controlLED(9, 'o');
  } else {
    console.log('[STRIKELOOP] Retry mode - keeping existing LED pattern and validation state');
    // SKIP calling startArcadeLEDs() on retry to prevent clearing sequence state and redundant serial writes
  }

  console.log(`[STRIKELOOP] Mission initialized:`, {
    arcadeMode: levelConfig.arcadeMode,
    goalScore: levelConfig.goalScore,
    duration: levelConfig.duration
  });

  // OPTIMIZATION: Skip arcade LED initialization on retry to save serial writes
  // The LED pattern and validation state are already set from previous attempt
  if (!isRetry) {
    startArcadeLEDs();
  } else {
    console.log('[STRIKELOOP] Retry - skipping startArcadeLEDs() to preserve state and reduce serial writes');
  }

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
    'memory-sequence-7-mixed',
    // Two-step modes manage their own patterns
    'two-step-fixed-green',
    'two-step-fixed-blue',
    'two-step-alternating-green',
    'two-step-alternating-blue',
    'two-step-random-button-green',
    'two-step-random-button-blue',
    'two-step-random-green',
    'two-step-mixed-colors',
    'two-step-rotating-green',
    'two-step-ultimate',
    // Hole sequence matching modes (Levels 7-10) - MUST NOT REFRESH
    'sequence-match-2-holes',
    'sequence-match-2-holes-hard',
    'sequence-match-3-holes',
    'sequence-match-3-holes-hard'
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
  // Logging disabled - HAL will log serial commands
  HAL.setOutput(outputNum, value, '1');
}


function controlLED(elementId, colorCode) {
  // Filter out LED control for holes 10-13 (they have no LEDs, input only)
  if (elementId >= 10 && elementId <= 13) {
    console.log(`[STRIKELOOP] Ignoring LED control for element ${elementId} (input-only hole)`);
    return;
  }

  // Logging disabled - reduces log noise, HAL will log serial commands
  HAL.controlLED(elementId, colorCode);
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

  // Clear ALL intervals before setting up new level
  if (activeMission.blinkIntervals) {
    activeMission.blinkIntervals.forEach(interval => clearInterval(interval));
    activeMission.blinkIntervals = [];
  }
  
  // Clear two-step mode intervals
  if (alternateInterval) {
    clearInterval(alternateInterval);
    alternateInterval = null;
  }
  if (randomTargetInterval) {
    clearInterval(randomTargetInterval);
    randomTargetInterval = null;
  }
  if (buttonRotationInterval) {
    clearInterval(buttonRotationInterval);
    buttonRotationInterval = null;
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
    // Two-step validation modes (Round 3) - NEW IMPLEMENTATION
    case 'two-step-all-buttons-green':
      activateModeTwoStepAllButtonsGreen();
      break;
    case 'two-step-all-buttons-blue':
      activateModeTwoStepAllButtonsBlue();
      break;
    case 'two-step-alternating-all-buttons-green':
      activateModeTwoStepAlternatingAllButtonsGreen();
      break;
    case 'two-step-alternating-all-buttons-blue':
      activateModeTwoStepAlternatingAllButtonsBlue();
      break;
    case 'two-step-sequence-green':
      activateModeTwoStepSequenceGreen();
      break;
    case 'two-step-sequence-blue':
      activateModeTwoStepSequenceBlue();
      break;
    case 'two-step-random-all-buttons-green':
      activateModeTwoStepRandomAllButtonsGreen();
      break;
    case 'two-step-mixed-all-buttons-blue':
      activateModeTwoStepMixedAllButtonsBlue();
      break;
    case 'two-step-color-rotation-1-4':
      activateModeTwoStepColorRotation1To4();
      break;
    case 'two-step-color-rotation-5-8':
      activateModeTwoStepColorRotation5To8();
      break;
    // Hole sequence matching modes (Levels 7-10)
    case 'sequence-match-2-holes':
      activateModeSequenceMatch2Holes();
      break;
    case 'sequence-match-2-holes-hard':
      activateModeSequenceMatch2HolesHard();
      break;
    case 'sequence-match-3-holes':
      activateModeSequenceMatch3Holes();
      break;
    case 'sequence-match-3-holes-hard':
      activateModeSequenceMatch3HolesHard();
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
let snakePatternIndex = 0; // Module-level variable to track snake pattern position
let lastSnakeMode = null; // Track the last snake mode to know when to reset pattern

function activateModeRotatingGreen() {
  if (rotationInterval) clearInterval(rotationInterval);

  let previousGreenPos = null;

  const activateOne = () => {
    activeTargets = [];
    trapPositions = [];

    // Pick one random green from 1-4
    const greenPos = activeMission.greenTargets[Math.floor(Math.random() * activeMission.greenTargets.length)];
    const target = { elementId: greenPos, colorCode: 'g', isValid: true, isActive: true };
    activeTargets.push(target);

    // OPTIMIZATION: Only update LEDs that changed
    if (previousGreenPos === null) {
      // FIRST TIME: Set all positions
      console.log(`[STRIKELOOP] Rotating green: Initial setup - position ${greenPos} active`);
      controlLED(greenPos, 'g');
      const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
      allPositions.forEach(pos => {
        if (pos !== greenPos) {
          controlLED(pos, 'r');
        }
      });
    } else if (greenPos !== previousGreenPos) {
      // SUBSEQUENT ROTATIONS: Only update changed positions (2 serial writes instead of 8)
      console.log(`[STRIKELOOP] Rotating green: ${previousGreenPos} → ${greenPos} (optimized: 2 writes)`);
      controlLED(previousGreenPos, 'r');  // Old green → red
      controlLED(greenPos, 'g');          // New position → green
    } else {
      console.log(`[STRIKELOOP] Rotating green: Same position ${greenPos}, no LED changes needed`);
    }

    currentRotatingTargets.green = greenPos;
    previousGreenPos = greenPos;

    // Update activeTargets array (for game logic, not LEDs)
    const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
    allPositions.forEach(pos => {
      if (pos !== greenPos) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
      }
    });
  };

  activateOne();
  rotationInterval = setInterval(activateOne, activeMission.rotationDelay || 2000);
}

function activateModeRotatingGreenBlue() {
  if (rotationInterval) clearInterval(rotationInterval);

  let previousGreenPos = null;
  let previousBluePos = null;

  const activateTwo = () => {
    activeTargets = [];
    trapPositions = [];

    const greenPos = activeMission.greenTargets[Math.floor(Math.random() * activeMission.greenTargets.length)];
    const bluePos = activeMission.blueTargets[Math.floor(Math.random() * activeMission.blueTargets.length)];

    const greenTarget = { elementId: greenPos, colorCode: 'g', isValid: true, isActive: true };
    const blueTarget = { elementId: bluePos, colorCode: 'b', isValid: true, isActive: true };

    activeTargets.push(greenTarget, blueTarget);

    // OPTIMIZATION: Only update LEDs that changed
    if (previousGreenPos === null || previousBluePos === null) {
      // FIRST TIME: Set all positions
      console.log(`[STRIKELOOP] Rotating green-blue: Initial setup - green ${greenPos}, blue ${bluePos}`);
      controlLED(greenPos, 'g');
      controlLED(bluePos, 'b');
      const otherPositions = [1, 2, 3, 4, 5, 6, 7, 8].filter(p => p !== greenPos && p !== bluePos);
      otherPositions.forEach(pos => {
        controlLED(pos, 'r');
      });
    } else {
      // SUBSEQUENT ROTATIONS: Only update changed positions
      const changes = [];

      // Track which positions need updates
      if (greenPos !== previousGreenPos) {
        controlLED(previousGreenPos, 'r');  // Old green → red
        controlLED(greenPos, 'g');          // New green
        changes.push(`green ${previousGreenPos}→${greenPos}`);
      }

      if (bluePos !== previousBluePos) {
        controlLED(previousBluePos, 'r');   // Old blue → red
        controlLED(bluePos, 'b');           // New blue
        changes.push(`blue ${previousBluePos}→${bluePos}`);
      }

      if (changes.length > 0) {
        console.log(`[STRIKELOOP] Rotating green-blue: ${changes.join(', ')} (optimized: ${changes.length * 2} writes)`);
      } else {
        console.log(`[STRIKELOOP] Rotating green-blue: Same positions, no LED changes needed`);
      }
    }

    currentRotatingTargets.green = greenPos;
    currentRotatingTargets.blue = bluePos;
    previousGreenPos = greenPos;
    previousBluePos = bluePos;

    // Update activeTargets array (for game logic, not LEDs)
    const otherPositions = [1, 2, 3, 4, 5, 6, 7, 8].filter(p => p !== greenPos && p !== bluePos);
    otherPositions.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
    });
  };

  activateTwo();
  rotationInterval = setInterval(activateTwo, activeMission.rotationDelay || 2000);
}

function activateModeRotatingBlue() {
  if (rotationInterval) clearInterval(rotationInterval);

  let previousBluePos = null;

  const activateOne = () => {
    activeTargets = [];
    trapPositions = [];

    // Pick one random blue from 5-8
    const bluePos = activeMission.blueTargets[Math.floor(Math.random() * activeMission.blueTargets.length)];
    const target = { elementId: bluePos, colorCode: 'b', isValid: true, isActive: true };
    activeTargets.push(target);

    // OPTIMIZATION: Only update LEDs that changed
    if (previousBluePos === null) {
      // FIRST TIME: Set all positions
      console.log(`[STRIKELOOP] Rotating blue: Initial setup - position ${bluePos} active`);
      controlLED(bluePos, 'b');
      const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
      allPositions.forEach(pos => {
        if (pos !== bluePos) {
          controlLED(pos, 'r');
        }
      });
    } else if (bluePos !== previousBluePos) {
      // SUBSEQUENT ROTATIONS: Only update changed positions (2 serial writes instead of 8)
      console.log(`[STRIKELOOP] Rotating blue: ${previousBluePos} → ${bluePos} (optimized: 2 writes)`);
      controlLED(previousBluePos, 'r');  // Old blue → red
      controlLED(bluePos, 'b');          // New position → blue
    } else {
      console.log(`[STRIKELOOP] Rotating blue: Same position ${bluePos}, no LED changes needed`);
    }

    currentRotatingTargets.blue = bluePos;
    previousBluePos = bluePos;

    // Update activeTargets array (for game logic, not LEDs)
    const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
    allPositions.forEach(pos => {
      if (pos !== bluePos) {
        const trap = { elementId: pos, colorCode: 'r', isTrap: true, isActive: true };
        activeTargets.push(trap);
        trapPositions.push(trap);
      }
    });
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

  // Only reset pattern index if switching from a different mode or starting fresh
  if (lastSnakeMode !== 'snake-green-3') {
    snakePatternIndex = 0;
    lastSnakeMode = 'snake-green-3';
  }

  const pattern = activeMission.snakePattern;

  const rotateSnake = () => {
    activeTargets = [];
    trapPositions = [];

    const activePositions = pattern[snakePatternIndex];

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

    console.log(`[STRIKELOOP] Snake green-3: pattern ${snakePatternIndex}: ${activePositions.join(',')}`);
    snakePatternIndex = (snakePatternIndex + 1) % pattern.length;
  };

  rotateSnake();
  rotationInterval = setInterval(rotateSnake, activeMission.rotationDelay || 3000);
}

function activateModeSnakeBlue3() {
  if (rotationInterval) clearInterval(rotationInterval);

  // Only reset pattern index if switching from a different mode or starting fresh
  if (lastSnakeMode !== 'snake-blue-3') {
    snakePatternIndex = 0;
    lastSnakeMode = 'snake-blue-3';
  }

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

    const activePositions = pattern[snakePatternIndex];

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

    console.log(`[STRIKELOOP] Snake blue-3: pattern ${snakePatternIndex}: ${activePositions.join(',')}`);
    snakePatternIndex = (snakePatternIndex + 1) % pattern.length;
  };

  rotateSnake();
  rotationInterval = setInterval(rotateSnake, activeMission.rotationDelay || 3000);
}

function activateModeSnakeGreen2() {
  if (rotationInterval) clearInterval(rotationInterval);

  // Only reset pattern index if switching from a different mode or starting fresh
  if (lastSnakeMode !== 'snake-green-2') {
    snakePatternIndex = 0;
    lastSnakeMode = 'snake-green-2';
  }

  const pattern = activeMission.snakePattern;

  const rotateSnake = () => {
    activeTargets = [];
    trapPositions = [];

    const activePositions = pattern[snakePatternIndex];

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

    console.log(`[STRIKELOOP] Snake green-2: pattern ${snakePatternIndex}: ${activePositions.join(',')}`);
    snakePatternIndex = (snakePatternIndex + 1) % pattern.length;
  };

  rotateSnake();
  rotationInterval = setInterval(rotateSnake, activeMission.rotationDelay || 3000);
}

function activateModeSnakeBlue2() {
  if (rotationInterval) clearInterval(rotationInterval);

  // Only reset pattern index if switching from a different mode or starting fresh
  if (lastSnakeMode !== 'snake-blue-2') {
    snakePatternIndex = 0;
    lastSnakeMode = 'snake-blue-2';
  }

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

    const activePositions = pattern[snakePatternIndex];

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

    console.log(`[STRIKELOOP] Snake blue-2: pattern ${snakePatternIndex}: ${activePositions.join(',')}`);
    snakePatternIndex = (snakePatternIndex + 1) % pattern.length;
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

// Two-step validation state (Round 3) - NEW IMPLEMENTATION
let validationPending = false;
let validationHitColor = null; // Color of the circle that was hit ('g', 'b', 'y', 'd')
let validationTimeout = null;
let activeButtonColors = []; // Current button colors for validation (array indexed by button position 0-14)
let alternatePatternIndex = 0; // For alternating patterns
let alternateInterval = null; // For pattern switching
let randomTargetInterval = null; // For random target changes
let buttonRotationInterval = null; // For rotating button positions
let colorRotationInterval = null; // For color rotation in levels 9-10
let currentActiveTargets = []; // Track which targets are currently active in patterns
let currentRotationIndex = 0; // For tracking rotation position in levels 9-10

// Multi-button validation state (Levels 1-4, 7-8)
let buttonsToValidate = []; // Array of button IDs that need to be pressed
let buttonsValidated = []; // Array of button IDs that have been pressed

// Sequence validation state (Levels 5-6)
let sequenceToMatch = []; // The sequence player must reproduce
let sequenceDisplaying = false; // Whether we're showing the sequence
let sequencePlayerInput = []; // Player's input so far
let sequenceValidationActive = false; // Whether player is currently entering sequence

// Hole sequence matching state (Levels 7-10)
let holeSequenceToMatch = []; // Array of {holeId, color} for holes player must hit
let holeSequenceHit = []; // Array of hole IDs player has hit so far
let holeSequenceActive = false; // Whether player is currently building hole sequence
let buttonSequenceToMatch = []; // Array of button colors player must press after hitting holes
let buttonSequencePressed = []; // Array of button IDs player has pressed
let buttonSequenceActive = false; // Whether player is validating with buttons
let buttonsInitialized = false; // Track if all 15 buttons have been lit (optimization to avoid redundant serial writes)

function activateModeMemorySequence() {
  if (!memorySequenceDisplayed) {
    // Generate random sequence only once per level
    if (memorySequence.length === 0) {
      memorySequence = generateRandomSequence();
      console.log(`[STRIKELOOP] Generated memory sequence:`, memorySequence);
    }

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

    // Bonus section still active and always valid
    activateBonusSection();

    console.log(`[STRIKELOOP] Memory sequence reproduction phase - waiting for user input`);
  }
}

function generateRandomSequence() {
  const targets = [...activeMission.sequenceTargets];
  const sequenceLength = activeMission.sequenceLength;
  const sequence = [];
  const availableTargets = [...targets];

  // Generate sequence with unique values only
  for (let i = 0; i < sequenceLength && availableTargets.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableTargets.length);
    sequence.push(availableTargets[randomIndex]);
    // Remove the selected target to prevent duplicates
    availableTargets.splice(randomIndex, 1);
  }

  return sequence;
}

function displayMemorySequence() {
  console.log(`[STRIKELOOP] Displaying memory sequence: ${memorySequence.join(' -> ')}`);

  let currentIndex = 0;

  // Ensure bonus section is active during display
  activateBonusSection();

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

      // Re-activate LEDs for reproduction (including bonus section)
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

// ========== TWO-STEP VALIDATION FUNCTIONS (ROUND 3) ==========

function clearAllButtons() {
  // Turn off all control buttons (14-22)
  for (let i = CONTROL_BUTTONS_RANGE.min; i <= CONTROL_BUTTONS_RANGE.max; i++) {
    controlLED(i, 'o');
  }
}

function setButtonColors(colors) {
  // Set button colors based on array (for fixed modes)
  // colors array has 9 elements for buttons 14-22
  activeButtonColors = colors;
  colors.forEach((color, index) => {
    const buttonId = CONTROL_BUTTONS_RANGE.min + index;
    controlLED(buttonId, color);
  });
}

function setAllButtonsRandomColors() {
  // Light all 9 buttons with exactly 3 green, 3 blue, 3 yellow
  // Ensure no adjacent buttons have the same color
  // Button layout:
  // 14 15 16
  // 17 18 19  
  // 20 21 22
  
  const adjacencyMap = {
    0: [1, 3],       // 14 -> 15, 17
    1: [0, 2, 4],    // 15 -> 14, 16, 18
    2: [1, 5],       // 16 -> 15, 19
    3: [0, 4, 6],    // 17 -> 14, 18, 20
    4: [1, 3, 5, 7], // 18 -> 15, 17, 19, 21
    5: [2, 4, 8],    // 19 -> 16, 18, 22
    6: [3, 7],       // 20 -> 17, 21
    7: [4, 6, 8],    // 21 -> 18, 20, 22
    8: [5, 7]        // 22 -> 19, 21
  };
  
  let buttonColors = [];
  let attempts = 0;
  const maxAttempts = 100;
  
  // Keep trying until we get a valid configuration
  while (attempts < maxAttempts) {
    buttonColors = [];
    const availableColors = ['g', 'g', 'g', 'b', 'b', 'b', 'y', 'y', 'y'];
    let valid = true;
    
    // Try to place colors one by one
    for (let i = 0; i < 9; i++) {
      // Shuffle available colors for randomness
      const shuffled = availableColors.sort(() => Math.random() - 0.5);
      let colorPlaced = false;
      
      for (const color of shuffled) {
        // Check if this color conflicts with adjacent buttons
        let canPlace = true;
        for (const adjacentIndex of adjacencyMap[i]) {
          if (adjacentIndex < i && buttonColors[adjacentIndex] === color) {
            canPlace = false;
            break;
          }
        }
        
        if (canPlace) {
          buttonColors.push(color);
          availableColors.splice(availableColors.indexOf(color), 1);
          colorPlaced = true;
          break;
        }
      }
      
      if (!colorPlaced) {
        valid = false;
        break;
      }
    }
    
    if (valid) {
      // Successfully placed all colors
      break;
    }
    
    attempts++;
  }
  
  // If we couldn't find a valid pattern, use a fallback pattern
  if (buttonColors.length !== 9) {
    // Guaranteed valid pattern: checkerboard-like
    buttonColors = ['g', 'b', 'y', 'b', 'y', 'g', 'y', 'g', 'b'];
  }
  
  // Apply the colors to buttons
  buttonColors.forEach((color, index) => {
    const buttonId = CONTROL_BUTTONS_RANGE.min + index;
    controlLED(buttonId, color);
  });
  
  activeButtonColors = buttonColors;
}

function lightRandomButton(color) {
  // Change one random button to the specified color (among all lit buttons)
  const randomIndex = Math.floor(Math.random() * 9);
  const buttonId = CONTROL_BUTTONS_RANGE.min + randomIndex;
  controlLED(buttonId, color);
  
  // Update the color in our tracking array
  activeButtonColors[randomIndex] = color;
}

function lightRandomAnyColorButton() {
  // Change one random button to a random color (among all lit buttons)
  const colors = ['g', 'b', 'y'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomIndex = Math.floor(Math.random() * 9);
  const buttonId = CONTROL_BUTTONS_RANGE.min + randomIndex;
  controlLED(buttonId, randomColor);
  
  // Update the color in our tracking array
  activeButtonColors[randomIndex] = randomColor;
}

// ========== NEW TWO-STEP VALIDATION HANDLER ==========
function handleTwoStepValidation(hitColor) {
  // Called when a valid target is hit in two-step modes
  if (validationPending) {
    // Ignore new hits while validation is pending
    console.log('[STRIKELOOP] Validation already pending, ignoring hit');
    return false;
  }

  validationPending = true;
  validationHitColor = hitColor;

  // Light up buttons based on button mode
  const buttonMode = activeMission.buttonMode;

  console.log(`[STRIKELOOP] Starting validation - Mode: ${buttonMode}, Hit Color: ${hitColor}`);

  switch (buttonMode) {
    case 'all-green':
      // Light up all 4 green buttons
      buttonsToValidate = [...BUTTONS_BY_COLOR.green];
      buttonsValidated = [];
      turnOnAllButtonsOfColor('green');
      console.log('[STRIKELOOP] Lit all 4 green buttons:', buttonsToValidate);
      break;

    case 'all-blue':
      // Light up all 4 blue buttons
      buttonsToValidate = [...BUTTONS_BY_COLOR.blue];
      buttonsValidated = [];
      turnOnAllButtonsOfColor('blue');
      console.log('[STRIKELOOP] Lit all 4 blue buttons:', buttonsToValidate);
      break;

    case 'sequence-green':
      // Generate random sequence of 3 green buttons
      startSequenceValidation('green');
      break;

    case 'sequence-blue':
      // Generate random sequence of 3 blue buttons
      startSequenceValidation('blue');
      break;

    case 'all-colors-match':
      // Buttons already lit (all colors), player must press matching color
      // No change needed - buttons stay lit
      console.log('[STRIKELOOP] All buttons already lit, waiting for color match');
      break;

    case 'random-one-per-color':
      // Light up one random button of each color
      lightOneRandomButtonPerColor();
      break;

    default:
      console.error('[STRIKELOOP] Unknown button mode:', buttonMode);
      validationPending = false;
      return false;
  }

  // Note: Timeout for sequence modes is set AFTER sequence display completes
  // Multi-button modes don't timeout - buttons stay lit until all are pressed

  return true;
}

// Helper: Start sequence validation (Levels 5-6)
function startSequenceValidation(colorName) {
  const buttons = BUTTONS_BY_COLOR[colorName];

  // Select 3 random buttons from the 4 available
  const shuffled = [...buttons].sort(() => Math.random() - 0.5);
  sequenceToMatch = shuffled.slice(0, 3);
  sequencePlayerInput = [];
  sequenceDisplaying = true;

  console.log('[STRIKELOOP] Starting sequence display:', sequenceToMatch);

  // Display sequence
  displayButtonSequence(sequenceToMatch, colorName);
}

// Helper: Display button sequence (1s on, 1s off)
function displayButtonSequence(sequence, colorName) {
  const colorCode = colorName === 'green' ? 'g' : 'b';
  let index = 0;

  const showNext = () => {
    if (index < sequence.length) {
      const buttonId = sequence[index];

      // Turn on button
      controlLED(buttonId, colorCode);
      console.log(`[STRIKELOOP] Sequence step ${index + 1}/${sequence.length}: Button ${buttonId} ON`);

      setTimeout(() => {
        // Turn off button
        controlLED(buttonId, 'o');
        console.log(`[STRIKELOOP] Sequence step ${index + 1}/${sequence.length}: Button ${buttonId} OFF`);

        // Wait 1 second before next
        setTimeout(() => {
          index++;
          showNext();
        }, 1000);
      }, 1000);
    } else {
      // Sequence display complete - now player must reproduce
      sequenceDisplaying = false;
      sequenceValidationActive = true;
      console.log('[STRIKELOOP] Sequence display complete - waiting for player input');
      // No timeout needed - if player fails, they just hit circle again for new sequence
    }
  };

  showNext();
}

// Helper: Light one random button of each color (Level 10)
function lightOneRandomButtonPerColor() {
  clearAllButtons();
  activeButtonColors = new Array(15).fill('o');

  buttonsToValidate = [];

  // Pick one random button from each color
  const colors = ['green', 'blue', 'yellow', 'white'];
  colors.forEach(colorName => {
    const buttons = BUTTONS_BY_COLOR[colorName];
    const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
    buttonsToValidate.push(randomButton);

    const colorCode = colorName === 'green' ? 'g' : colorName === 'blue' ? 'b' : colorName === 'yellow' ? 'y' : 'd';
    controlLED(randomButton, colorCode);

    const index = randomButton - 14;
    activeButtonColors[index] = colorCode;

    console.log(`[STRIKELOOP] Lit random ${colorName} button: ${randomButton}`);
  });

  buttonsValidated = [];
}

// Helper: Reset validation state
function resetValidationState() {
  validationPending = false;
  validationHitColor = null;
  buttonsToValidate = [];
  buttonsValidated = [];

  // Only clear sequence if not in sequence reproduction mode
  // (sequence needs to persist until player completes or fails)
  if (!sequenceValidationActive) {
    sequenceToMatch = [];
    sequencePlayerInput = [];
  }

  sequenceDisplaying = false;
  sequenceValidationActive = false;

  if (validationTimeout) {
    clearTimeout(validationTimeout);
    validationTimeout = null;
  }

  // Clear all buttons (except for modes where they stay lit)
  const keepLitModes = ['all-colors-match'];
  if (!keepLitModes.includes(activeMission.buttonMode)) {
    clearAllButtons();
  }
}

// ========== NEW BUTTON VALIDATION FUNCTION ==========
function validateButtonPress(buttonIndex) {
  // Called when a button is pressed
  const buttonId = buttonIndex + 14; // Convert index (0-14) to button ID (14-28)

  console.log(`[STRIKELOOP] Button press: Index ${buttonIndex}, ID ${buttonId}`);

  // Handle hole sequence matching (Levels 7-10) - PRIORITY CHECK
  if (buttonSequenceActive) {
    return validateHoleSequenceButtonPress(buttonId);
  }

  // Handle sequence validation (Levels 5-6)
  // Allow button presses during OR after sequence display
  if (sequenceDisplaying || sequenceValidationActive) {
    return validateSequenceButtonPress(buttonId);
  }

  // Handle multi-button validation (Levels 1-4)
  if (buttonsToValidate.length > 0) {
    return validateMultiButtonPress(buttonId);
  }

  // Handle color-matching validation (old Levels 9-10)
  if (validationPending) {
    return validateColorMatchButtonPress(buttonId);
  }

  console.log('[STRIKELOOP] No validation pending');
  return false;
}

// Validate sequence button press (Levels 5-6)
function validateSequenceButtonPress(buttonId) {
  const expectedButton = sequenceToMatch[sequencePlayerInput.length];

  console.log(`[STRIKELOOP] Sequence validation: Pressed ${buttonId}, Expected ${expectedButton}`);
  console.log(`[STRIKELOOP] Sequence state: sequenceToMatch=${JSON.stringify(sequenceToMatch)}, playerInput=${JSON.stringify(sequencePlayerInput)}`);

  if (!sequenceToMatch || sequenceToMatch.length === 0) {
    console.log(`[STRIKELOOP] ❌ No sequence to match! Player must hit circle first.`);
    return false;
  }

  if (buttonId === expectedButton) {
    // Correct button!
    sequencePlayerInput.push(buttonId);
    console.log(`[STRIKELOOP] ✅ Correct! Progress: ${sequencePlayerInput.length}/${sequenceToMatch.length}`);

    // Check if sequence complete
    if (sequencePlayerInput.length === sequenceToMatch.length) {
      // Sequence completed successfully!
      clearTimeout(validationTimeout);

      const points = activeMission.pointsPerValidated || 100;
      const newScore = localScore + points;
      updateScore(newScore);
      console.log(`[STRIKELOOP] 🎉 SEQUENCE COMPLETED! +${points} points`);

      // Clear sequence state for next round
      sequenceToMatch = [];
      sequencePlayerInput = [];
      sequenceValidationActive = false;
      validationPending = false;
      return true;
    }
    return true;
  } else {
    // Wrong button - reset and player must hit circle again
    console.log(`[STRIKELOOP] ❌ Wrong button! Resetting sequence...`);

    // Clear sequence state - player must hit circle again
    sequenceToMatch = [];
    sequencePlayerInput = [];
    sequenceValidationActive = false;
    validationPending = false;

    if (validationTimeout) {
      clearTimeout(validationTimeout);
      validationTimeout = null;
    }

    return false;
  }
}

// Validate multi-button press (Levels 1-4, 7-8)
function validateMultiButtonPress(buttonId) {
  // Check if this button is in the list to validate
  if (!buttonsToValidate.includes(buttonId)) {
    console.log(`[STRIKELOOP] ❌ Button ${buttonId} not in validation list`);
    return false;
  }

  // Check if already validated
  if (buttonsValidated.includes(buttonId)) {
    console.log(`[STRIKELOOP] Button ${buttonId} already validated`);
    return false;
  }

  // Valid button press!
  buttonsValidated.push(buttonId);

  // Turn off the button
  controlLED(buttonId, 'o');
  const index = buttonId - 14;
  activeButtonColors[index] = 'o';

  console.log(`[STRIKELOOP] ✅ Button ${buttonId} validated! Progress: ${buttonsValidated.length}/${buttonsToValidate.length}`);

  // Check if all buttons validated
  if (buttonsValidated.length === buttonsToValidate.length) {
    // All buttons pressed!
    clearTimeout(validationTimeout);

    const points = activeMission.pointsPerValidated || 100;
    const newScore = localScore + points;
    updateScore(newScore);
    console.log(`[STRIKELOOP] 🎉 ALL BUTTONS VALIDATED! +${points} points`);

    // Reset for next round
    resetValidationState();
    return true;
  }

  return true;
}

// Validate color-matching button press (Levels 9-10)
function validateColorMatchButtonPress(buttonId) {
  if (!validationPending) {
    console.log('[STRIKELOOP] No validation pending');
    return false;
  }

  // Check if button is lit
  const index = buttonId - 14;
  const buttonColor = activeButtonColors[index];

  if (buttonColor === 'o' || !buttonColor) {
    console.log(`[STRIKELOOP] ❌ Button ${buttonId} not lit`);
    return false;
  }

  // Check if button color matches the hit circle color
  if (buttonColor !== validationHitColor) {
    console.log(`[STRIKELOOP] ❌ Wrong color! Expected ${validationHitColor}, got ${buttonColor}`);
    return false;
  }

  // Correct color match!
  clearTimeout(validationTimeout);

  const points = activeMission.pointsPerValidated || 100;
  const newScore = localScore + points;
  updateScore(newScore);
  console.log(`[STRIKELOOP] ✅ COLOR MATCH! +${points} points`);

  // For Level 10 (random-one-per-color), light new random buttons
  if (activeMission.buttonMode === 'random-one-per-color') {
    lightOneRandomButtonPerColor();
  }

  resetValidationState();
  validationPending = true; // Keep validation active for next hit
  return true;
}

// Validate hole sequence button press (Levels 7-10)
function validateHoleSequenceButtonPress(buttonId) {
  if (!buttonSequenceActive || buttonSequenceToMatch.length === 0) {
    console.log('[STRIKELOOP] ❌ No button sequence active!');
    return false;
  }

  const currentStep = buttonSequencePressed.length;
  const expectedColor = buttonSequenceToMatch[currentStep];

  // Get the color of the pressed button
  const buttonColor = BUTTONS_BY_COLOR.green.includes(buttonId) ? 'g' :
                      BUTTONS_BY_COLOR.blue.includes(buttonId) ? 'b' :
                      BUTTONS_BY_COLOR.yellow.includes(buttonId) ? 'y' :
                      BUTTONS_BY_COLOR.white.includes(buttonId) ? 'd' : null;

  console.log(`[STRIKELOOP] Button ${buttonId} pressed (color: ${buttonColor?.toUpperCase()}), Expected: ${expectedColor.toUpperCase()}`);
  console.log(`[STRIKELOOP] Progress: ${currentStep + 1}/${buttonSequenceToMatch.length}`);

  if (buttonColor !== expectedColor) {
    // Wrong button! Reset everything
    console.log(`[STRIKELOOP] ❌ WRONG BUTTON! Expected ${expectedColor.toUpperCase()}, got ${buttonColor?.toUpperCase()}`);
    console.log('[STRIKELOOP] Resetting - hit holes again to retry');

    // Reset all sequence state
    holeSequenceActive = true;  // Set to true to accept new hole hits
    holeSequenceHit = [];
    buttonSequenceToMatch = [];
    buttonSequencePressed = [];
    buttonSequenceActive = false;

    return false;
  }

  // Correct button!
  buttonSequencePressed.push(buttonId);

  // Turn off the button that was just pressed
  controlLED(buttonId, 'o');
  console.log(`[STRIKELOOP] ✅ Correct! Button ${buttonId} turned OFF`);

  // Check if sequence is complete
  if (buttonSequencePressed.length >= buttonSequenceToMatch.length) {
    // Sequence completed successfully!
    const points = activeMission.pointsPerSequence || 100;
    const newScore = localScore + points;
    updateScore(newScore);

    console.log(`[STRIKELOOP] 🎉 BUTTON SEQUENCE COMPLETED! +${points} points`);
    console.log(`[STRIKELOOP] Holes hit: ${holeSequenceHit.join(', ')}`);
    console.log(`[STRIKELOOP] Buttons pressed: ${buttonSequencePressed.join(', ')}`);

    // Reset for next sequence
    holeSequenceActive = true;  // Set to true to accept new hole hits
    holeSequenceHit = [];
    buttonSequenceToMatch = [];
    buttonSequencePressed = [];
    buttonSequenceActive = false;

    // Re-light all buttons for next round
    [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].forEach(btnId => {
      const color = BUTTONS_BY_COLOR.green.includes(btnId) ? 'g' :
                    BUTTONS_BY_COLOR.blue.includes(btnId) ? 'b' :
                    BUTTONS_BY_COLOR.yellow.includes(btnId) ? 'y' : 'd';
      controlLED(btnId, color);
    });

    return true;
  }

  console.log(`[STRIKELOOP] Button sequence progress: ${buttonSequencePressed.length}/${buttonSequenceToMatch.length}`);
  return true;
}

// Two-Step Mode Activation Functions

function activateModeTwoStepFixedGreen() {
  // Level 1: Fixed green targets, fixed green buttons
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    // OPTIMIZATION: Constant red instead of blinking to reduce serial writes
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
  activateBonusSection();
}

function activateModeTwoStepFixedBlue() {
  // Level 2: Fixed blue targets, fixed blue buttons
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    // OPTIMIZATION: Constant red instead of blinking to reduce serial writes
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
  activateBonusSection();
}

function activateModeTwoStepAlternatingGreen() {
  // Level 3: Alternating green targets
  if (alternateInterval) clearInterval(alternateInterval);
  alternatePatternIndex = 0;

  const updatePattern = () => {
    activeTargets = [];
    trapPositions = [];
    
    // Get current pattern
    const currentPattern = activeMission.alternatePattern[alternatePatternIndex];
    
    // Set active green targets
    currentPattern.forEach(pos => {
      const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, 'g');
    });
    
    // Set inactive as off
    activeMission.greenTargets.forEach(pos => {
      if (!currentPattern.includes(pos)) {
        controlLED(pos, 'o');
      }
    });

    // Red traps - OPTIMIZATION: Constant red instead of blinking to reduce serial writes
    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
    });

    activateBonusSection();
    
    // Toggle pattern
    alternatePatternIndex = (alternatePatternIndex + 1) % activeMission.alternatePattern.length;
  };

  updatePattern();
  alternateInterval = setInterval(updatePattern, activeMission.alternateInterval || 3000);

  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
}

function activateModeTwoStepAlternatingBlue() {
  // Level 4: Alternating blue targets
  if (alternateInterval) clearInterval(alternateInterval);
  alternatePatternIndex = 0;

  const updatePattern = () => {
    activeTargets = [];
    trapPositions = [];
    
    const currentPattern = activeMission.alternatePattern[alternatePatternIndex];
    
    currentPattern.forEach(pos => {
      const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, 'b');
    });
    
    activeMission.blueTargets.forEach(pos => {
      if (!currentPattern.includes(pos)) {
        controlLED(pos, 'o');
      }
    });

    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r');
    });

    activateBonusSection();
    
    alternatePatternIndex = (alternatePatternIndex + 1) % activeMission.alternatePattern.length;
  };

  updatePattern();
  alternateInterval = setInterval(updatePattern, activeMission.alternateInterval || 3000);

  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
}

function activateModeTwoStepRandomButtonGreen() {
  // Level 5: Fixed green targets, buttons rotate positions every 5 seconds
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // OPTIMIZATION: Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  activateBonusSection();
  
  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
  
  // Rotate button positions every 5 seconds
  if (buttonRotationInterval) clearInterval(buttonRotationInterval);
  buttonRotationInterval = setInterval(() => {
    console.log('[STRIKELOOP] Rotating button positions...');
    setAllButtonsRandomColors();
  }, 5000);
}

function activateModeTwoStepRandomButtonBlue() {
  // Level 6: Fixed blue targets, random blue button
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // OPTIMIZATION: Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  activateBonusSection();
  
  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
  
  // Rotate button positions every 5 seconds
  if (buttonRotationInterval) clearInterval(buttonRotationInterval);
  buttonRotationInterval = setInterval(() => {
    console.log('[STRIKELOOP] Rotating button positions...');
    setAllButtonsRandomColors();
  }, 5000);
}

function activateModeTwoStepRandomGreen() {
  // Level 7: Random green targets, random green button
  if (randomTargetInterval) clearInterval(randomTargetInterval);

  const updateRandomTargets = () => {
    activeTargets = [];
    trapPositions = [];
    
    // Select random green targets
    const count = activeMission.randomTargetCount || 2;
    const availableTargets = [...activeMission.greenTargets];
    const selected = [];
    
    for (let i = 0; i < count && availableTargets.length > 0; i++) {
      const idx = Math.floor(Math.random() * availableTargets.length);
      selected.push(availableTargets[idx]);
      availableTargets.splice(idx, 1);
    }
    
    // Set active targets
    selected.forEach(pos => {
      const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, 'g');
    });
    
    // Turn off inactive
    activeMission.greenTargets.forEach(pos => {
      if (!selected.includes(pos)) {
        controlLED(pos, 'o');
      }
    });

    // Red traps - OPTIMIZATION: Constant red instead of blinking to reduce serial writes
    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
    });

    activateBonusSection();
  };

  updateRandomTargets();
  randomTargetInterval = setInterval(updateRandomTargets, activeMission.randomChangeInterval || 4000);
  
  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
}

function activateModeTwoStepMixedColors() {
  // Level 8: Mixed green and blue alternating
  if (alternateInterval) clearInterval(alternateInterval);
  alternatePatternIndex = 0;

  const updatePattern = () => {
    activeTargets = [];
    trapPositions = [];
    
    const currentPattern = activeMission.alternatePattern[alternatePatternIndex];
    
    currentPattern.forEach(pos => {
      const isGreen = pos <= 4;
      const color = isGreen ? 'g' : 'b';
      const target = { elementId: pos, colorCode: color, isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, color);
    });
    
    // Turn off inactive
    for (let i = 1; i <= 8; i++) {
      if (!currentPattern.includes(i)) {
        controlLED(i, 'o');
      }
    }

    activateBonusSection();
    
    alternatePatternIndex = (alternatePatternIndex + 1) % activeMission.alternatePattern.length;
  };

  updatePattern();
  alternateInterval = setInterval(updatePattern, activeMission.alternateInterval || 3000);
  
  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
}

function activateModeTwoStepRotatingGreen() {
  // Level 9: Rotating green pattern
  if (rotationInterval) clearInterval(rotationInterval);
  let rotationIndex = 0;

  const rotateTargets = () => {
    activeTargets = [];
    trapPositions = [];
    
    // Only one green target active at a time, rotating
    const activePos = activeMission.greenTargets[rotationIndex];
    
    const target = { elementId: activePos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(activePos, 'g');
    
    // Turn off others
    activeMission.greenTargets.forEach(pos => {
      if (pos !== activePos) {
        controlLED(pos, 'o');
      }
    });

    // Red traps - OPTIMIZATION: Constant red instead of blinking to reduce serial writes
    activeMission.redTraps.forEach(pos => {
      const trap = { elementId: pos, colorCode: 'r', isTrap: true };
      activeTargets.push(trap);
      trapPositions.push(trap);
      controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
    });

    activateBonusSection();
    
    rotationIndex = (rotationIndex + 1) % activeMission.greenTargets.length;
  };

  rotateTargets();
  rotationInterval = setInterval(rotateTargets, activeMission.rotationDelay || 2000);
  
  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
}

function activateModeTwoStepUltimate() {
  // Level 10: Ultimate chaos - rotating blue + random green bursts
  if (rotationInterval) clearInterval(rotationInterval);
  if (randomTargetInterval) clearInterval(randomTargetInterval);
  
  let rotationIndex = 0;
  let bonusHitCount = 0;

  const updateTargets = () => {
    activeTargets = [];
    trapPositions = [];
    
    // Rotating blue
    const activeBlue = activeMission.blueTargets[rotationIndex];
    const blueTarget = { elementId: activeBlue, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(blueTarget);
    controlLED(activeBlue, 'b');
    
    activeMission.blueTargets.forEach(pos => {
      if (pos !== activeBlue) {
        controlLED(pos, 'o');
      }
    });
    
    rotationIndex = (rotationIndex + 1) % activeMission.blueTargets.length;
  };

  const addRandomGreen = () => {
    // Add a random green target
    const greenPos = activeMission.greenTargets[Math.floor(Math.random() * activeMission.greenTargets.length)];
    const greenTarget = { elementId: greenPos, colorCode: 'g', isValid: true, needsValidation: true };
    
    // Check if not already active
    if (!activeTargets.find(t => t.elementId === greenPos)) {
      activeTargets.push(greenTarget);
      controlLED(greenPos, 'g');
      
      // Turn off after 2 seconds
      setTimeout(() => {
        controlLED(greenPos, 'o');
        const idx = activeTargets.findIndex(t => t.elementId === greenPos);
        if (idx !== -1) activeTargets.splice(idx, 1);
      }, 2000);
    }
  };

  updateTargets();
  rotationInterval = setInterval(updateTargets, activeMission.rotationDelay || 2000);
  
  // Random green bursts
  if (activeMission.randomBurstInterval) {
    randomTargetInterval = setInterval(addRandomGreen, activeMission.randomBurstInterval);
  }

  // Special bonus activation after N hits
  if (activeMission.bonusActivationHits) {
    // Track successful validations for bonus activation
    // This would be handled in the validation function
  }

  activateBonusSection();

  // Set all buttons with 3 green, 3 blue, 3 yellow (no adjacent same colors)
  setAllButtonsRandomColors();
}

// ========== NEW ROUND 3 IMPLEMENTATION ==========

// Helper function to turn on all buttons of a specific color
function turnOnAllButtonsOfColor(colorName) {
  const buttons = BUTTONS_BY_COLOR[colorName];
  if (!buttons) {
    console.error(`[STRIKELOOP] Invalid color name: ${colorName}`);
    return [];
  }

  // Clear all buttons first (turn off all 14-28)
  clearAllButtons();

  // Initialize activeButtonColors array for all 15 buttons (indexed 0-14 for buttons 14-28)
  activeButtonColors = new Array(15).fill('o');

  // Turn on the specified color buttons
  const colorCode = colorName === 'green' ? 'g' : colorName === 'blue' ? 'b' : colorName === 'yellow' ? 'y' : 'd';
  buttons.forEach(buttonId => {
    controlLED(buttonId, colorCode);
    const index = buttonId - 14; // Convert button ID to array index
    activeButtonColors[index] = colorCode;
  });

  console.log(`[STRIKELOOP] Turned on all ${colorName} buttons:`, buttons);
  return buttons;
}

// Level 1: Fixed Green + All 4 Green Buttons
function activateModeTwoStepAllButtonsGreen() {
  console.log('[STRIKELOOP] Activating Level 1: Fixed Green + All 4 Green Buttons');

  // Setup green circles (1-4) - always lit
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  // Setup red traps (5-8) - OPTIMIZATION: Constant red instead of blinking
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Turn off all buttons initially - but ONLY if not in active validation
  // (Don't clear buttons during LED refresh if player is validating)
  if (buttonsToValidate.length === 0) {
    clearAllButtons();
  }

  activateBonusSection();
}

// Level 2: Fixed Blue + All 4 Blue Buttons
function activateModeTwoStepAllButtonsBlue() {
  console.log('[STRIKELOOP] Activating Level 2: Fixed Blue + All 4 Blue Buttons');

  // Setup blue circles (5-8) - always lit
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  // Setup red traps (1-4) - OPTIMIZATION: Constant red instead of blinking
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Turn off all buttons initially - but ONLY if not in active validation
  if (buttonsToValidate.length === 0) {
    clearAllButtons();
  }

  activateBonusSection();
}

// Level 3: Alternating Green + All 4 Green Buttons
function activateModeTwoStepAlternatingAllButtonsGreen() {
  console.log('[STRIKELOOP] Activating Level 3: Alternating Green + All 4 Green Buttons');

  if (alternateInterval) clearInterval(alternateInterval);
  alternatePatternIndex = 0;

  const updatePattern = () => {
    activeTargets = activeTargets.filter(t => t.isBonus || t.isTrap);

    const pattern = activeMission.alternatePattern[alternatePatternIndex];
    pattern.forEach(pos => {
      const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, 'g');
    });

    // Turn off non-active green circles
    activeMission.greenTargets.forEach(pos => {
      if (!pattern.includes(pos)) {
        controlLED(pos, 'o');
      }
    });

    alternatePatternIndex = (alternatePatternIndex + 1) % activeMission.alternatePattern.length;
  };

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  updatePattern();
  alternateInterval = setInterval(updatePattern, activeMission.alternateInterval || 3000);

  if (buttonsToValidate.length === 0) {
    clearAllButtons();
  }
  activateBonusSection();
}

// Level 4: Alternating Blue + All 4 Blue Buttons
function activateModeTwoStepAlternatingAllButtonsBlue() {
  console.log('[STRIKELOOP] Activating Level 4: Alternating Blue + All 4 Blue Buttons');

  if (alternateInterval) clearInterval(alternateInterval);
  alternatePatternIndex = 0;

  const updatePattern = () => {
    activeTargets = activeTargets.filter(t => t.isBonus || t.isTrap);

    const pattern = activeMission.alternatePattern[alternatePatternIndex];
    pattern.forEach(pos => {
      const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, 'b');
    });

    // Turn off non-active blue circles
    activeMission.blueTargets.forEach(pos => {
      if (!pattern.includes(pos)) {
        controlLED(pos, 'o');
      }
    });

    alternatePatternIndex = (alternatePatternIndex + 1) % activeMission.alternatePattern.length;
  };

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  updatePattern();
  alternateInterval = setInterval(updatePattern, activeMission.alternateInterval || 3000);

  if (buttonsToValidate.length === 0) {
    clearAllButtons();
  }
  activateBonusSection();
}

// Level 5: Sequence Reproduction - Green
function activateModeTwoStepSequenceGreen() {
  console.log('[STRIKELOOP] Activating Level 5: Sequence Reproduction - Green');

  // Setup green circles (1-4) - always lit
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Don't clear buttons if sequence is being displayed or validated
  if (!sequenceDisplaying && !sequenceValidationActive) {
    clearAllButtons();
  }
  activateBonusSection();
}

// Level 6: Sequence Reproduction - Blue
function activateModeTwoStepSequenceBlue() {
  console.log('[STRIKELOOP] Activating Level 6: Sequence Reproduction - Blue');

  // Setup blue circles (5-8) - always lit
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Don't clear buttons if sequence is being displayed or validated
  if (!sequenceDisplaying && !sequenceValidationActive) {
    clearAllButtons();
  }
  activateBonusSection();
}

// Level 7: Random Green + All 4 Green Buttons
function activateModeTwoStepRandomAllButtonsGreen() {
  console.log('[STRIKELOOP] Activating Level 7: Random Green + All 4 Green Buttons');

  if (randomTargetInterval) clearInterval(randomTargetInterval);

  const updateRandomTargets = () => {
    activeTargets = activeTargets.filter(t => t.isBonus || t.isTrap);

    // Randomly select N targets
    const count = activeMission.randomTargetCount || 2;
    const shuffled = [...activeMission.greenTargets].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // Turn on selected
    selected.forEach(pos => {
      const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, 'g');
    });

    // Turn off non-selected
    activeMission.greenTargets.forEach(pos => {
      if (!selected.includes(pos)) {
        controlLED(pos, 'o');
      }
    });
  };

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  updateRandomTargets();
  randomTargetInterval = setInterval(updateRandomTargets, activeMission.randomChangeInterval || 4000);

  if (buttonsToValidate.length === 0) {
    clearAllButtons();
  }
  activateBonusSection();
}

// Level 8: Mixed Colors Alternating + All 4 Blue Buttons
function activateModeTwoStepMixedAllButtonsBlue() {
  console.log('[STRIKELOOP] Activating Level 8: Mixed Colors + All 4 Blue Buttons');

  if (alternateInterval) clearInterval(alternateInterval);
  alternatePatternIndex = 0;

  const updatePattern = () => {
    activeTargets = activeTargets.filter(t => t.isBonus);

    const pattern = activeMission.alternatePattern[alternatePatternIndex];
    pattern.forEach(pos => {
      const color = pos <= 4 ? 'g' : 'b';
      const target = { elementId: pos, colorCode: color, isValid: true, needsValidation: true };
      activeTargets.push(target);
      controlLED(pos, color);
    });

    // Turn off non-active circles
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(pos => {
      if (!pattern.includes(pos)) {
        controlLED(pos, 'o');
      }
    });

    alternatePatternIndex = (alternatePatternIndex + 1) % activeMission.alternatePattern.length;
  };

  updatePattern();
  alternateInterval = setInterval(updatePattern, activeMission.alternateInterval || 3000);

  if (buttonsToValidate.length === 0) {
    clearAllButtons();
  }
  activateBonusSection();
}

// Level 9: Color Rotation (Circles 1-4) + All Buttons Match Color
function activateModeTwoStepColorRotation1To4() {
  console.log('[STRIKELOOP] Activating Level 9: Color Rotation 1-4');

  if (colorRotationInterval) clearInterval(colorRotationInterval);
  currentRotationIndex = 0;

  const rotateColors = () => {
    activeTargets = activeTargets.filter(t => t.isBonus || t.isTrap);

    // Get current circle and color
    const circleId = activeMission.circleTargets[currentRotationIndex];
    const color = activeMission.rotationSequence[currentRotationIndex];

    // Turn on current circle with its color
    const target = { elementId: circleId, colorCode: color, isValid: true, needsValidation: true, rotatingColor: true };
    activeTargets.push(target);
    controlLED(circleId, color);

    // Turn off other circles in rotation
    activeMission.circleTargets.forEach(pos => {
      if (pos !== circleId) {
        controlLED(pos, 'o');
      }
    });

    currentRotationIndex = (currentRotationIndex + 1) % activeMission.circleTargets.length;
  };

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Turn on ALL buttons of all colors (do it manually to avoid clearing)
  clearAllButtons();
  activeButtonColors = new Array(15).fill('o');

  // Light all green buttons
  BUTTONS_BY_COLOR.green.forEach(buttonId => {
    controlLED(buttonId, 'g');
    activeButtonColors[buttonId - 14] = 'g';
  });

  // Light all blue buttons
  BUTTONS_BY_COLOR.blue.forEach(buttonId => {
    controlLED(buttonId, 'b');
    activeButtonColors[buttonId - 14] = 'b';
  });

  // Light all yellow buttons
  BUTTONS_BY_COLOR.yellow.forEach(buttonId => {
    controlLED(buttonId, 'y');
    activeButtonColors[buttonId - 14] = 'y';
  });

  // Light all white buttons
  BUTTONS_BY_COLOR.white.forEach(buttonId => {
    controlLED(buttonId, 'd');
    activeButtonColors[buttonId - 14] = 'd';
  });

  console.log('[STRIKELOOP] All buttons lit with their fixed colors');

  rotateColors();
  colorRotationInterval = setInterval(rotateColors, activeMission.rotationDelay || 2000);

  activateBonusSection();
}

// Level 10: Color Rotation (Circles 5-8) + Random One Button Per Color
function activateModeTwoStepColorRotation5To8() {
  console.log('[STRIKELOOP] Activating Level 10: Color Rotation 5-8');

  if (colorRotationInterval) clearInterval(colorRotationInterval);
  currentRotationIndex = 0;

  const rotateColors = () => {
    activeTargets = activeTargets.filter(t => t.isBonus || t.isTrap);

    // Get current circle and color
    const circleId = activeMission.circleTargets[currentRotationIndex];
    const color = activeMission.rotationSequence[currentRotationIndex];

    // Turn on current circle with its color
    const target = { elementId: circleId, colorCode: color, isValid: true, needsValidation: true, rotatingColor: true };
    activeTargets.push(target);
    controlLED(circleId, color);

    // Turn off other circles in rotation
    activeMission.circleTargets.forEach(pos => {
      if (pos !== circleId) {
        controlLED(pos, 'o');
      }
    });

    currentRotationIndex = (currentRotationIndex + 1) % activeMission.circleTargets.length;
  };

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // Note: Buttons will be lit randomly when player hits a circle (in validation logic)
  clearAllButtons();

  rotateColors();
  colorRotationInterval = setInterval(rotateColors, activeMission.rotationDelay || 2000);

  activateBonusSection();
}

// ========== HOLE SEQUENCE MATCHING MODES (LEVELS 7-10) ==========

// Level 7: All 8 holes lit (4 green + 4 blue), hit 2 holes, validate with matching buttons in order
function activateModeSequenceMatch2Holes() {
  console.log('[STRIKELOOP] Activating Level 7: Sequence Match - 2 Holes (All 8 lit)');

  // Light all 4 green holes
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  // Light all 4 blue holes
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  // OPTIMIZATION: Only light buttons once, not on every LED refresh (saves 15 serial writes per refresh)
  if (!buttonsInitialized) {
    clearAllButtons();
    [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].forEach(buttonId => {
      const color = BUTTONS_BY_COLOR.green.includes(buttonId) ? 'g' :
                    BUTTONS_BY_COLOR.blue.includes(buttonId) ? 'b' :
                    BUTTONS_BY_COLOR.yellow.includes(buttonId) ? 'y' : 'd';
      controlLED(buttonId, color);
    });
    buttonsInitialized = true;
    console.log('[STRIKELOOP] All 15 buttons initialized with fixed colors');
  }

  // Initialize hole sequence tracking
  holeSequenceActive = true;
  holeSequenceHit = [];
  buttonSequenceToMatch = [];
  buttonSequencePressed = [];
  buttonSequenceActive = false;

  activateBonusSection();
}

// Level 8: Only 4 holes lit (2 green + 2 blue + 4 red traps), same mechanic
function activateModeSequenceMatch2HolesHard() {
  console.log('[STRIKELOOP] Activating Level 8: Sequence Match - 2 Holes (4 lit + traps)');

  // Light 2 green holes
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  // Light 2 blue holes
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // OPTIMIZATION: Only light buttons once, not on every LED refresh (saves 15 serial writes per refresh)
  if (!buttonsInitialized) {
    clearAllButtons();
    [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].forEach(buttonId => {
      const color = BUTTONS_BY_COLOR.green.includes(buttonId) ? 'g' :
                    BUTTONS_BY_COLOR.blue.includes(buttonId) ? 'b' :
                    BUTTONS_BY_COLOR.yellow.includes(buttonId) ? 'y' : 'd';
      controlLED(buttonId, color);
    });
    buttonsInitialized = true;
    console.log('[STRIKELOOP] All 15 buttons initialized with fixed colors');
  }

  // Initialize hole sequence tracking
  holeSequenceActive = true;
  holeSequenceHit = [];
  buttonSequenceToMatch = [];
  buttonSequencePressed = [];
  buttonSequenceActive = false;

  activateBonusSection();
}

// Level 9: All 8 holes lit (2G + 2B + 2Y + 2W), hit 3 holes, validate with matching buttons in order
function activateModeSequenceMatch3Holes() {
  console.log('[STRIKELOOP] Activating Level 9: Sequence Match - 3 Holes (All 8 lit)');

  // Light 2 green holes
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  // Light 2 blue holes
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  // Light 2 yellow holes
  activeMission.yellowTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'y', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'y');
  });

  // Light 2 white holes
  activeMission.whiteTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'd', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'd');
  });

  // OPTIMIZATION: Only light buttons once, not on every LED refresh (saves 15 serial writes per refresh)
  if (!buttonsInitialized) {
    clearAllButtons();
    [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].forEach(buttonId => {
      const color = BUTTONS_BY_COLOR.green.includes(buttonId) ? 'g' :
                    BUTTONS_BY_COLOR.blue.includes(buttonId) ? 'b' :
                    BUTTONS_BY_COLOR.yellow.includes(buttonId) ? 'y' : 'd';
      controlLED(buttonId, color);
    });
    buttonsInitialized = true;
    console.log('[STRIKELOOP] All 15 buttons initialized with fixed colors');
  }

  // Initialize hole sequence tracking
  holeSequenceActive = true;
  holeSequenceHit = [];
  buttonSequenceToMatch = [];
  buttonSequencePressed = [];
  buttonSequenceActive = false;

  activateBonusSection();
}

// Level 10: Only 4 holes lit (1G + 1B + 1Y + 1W + 4 red traps), same mechanic
function activateModeSequenceMatch3HolesHard() {
  console.log('[STRIKELOOP] Activating Level 10: Sequence Match - 3 Holes (4 lit + traps)');

  // Light 1 green hole
  activeMission.greenTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'g', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'g');
  });

  // Light 1 blue hole
  activeMission.blueTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'b', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'b');
  });

  // Light 1 yellow hole
  activeMission.yellowTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'y', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'y');
  });

  // Light 1 white hole
  activeMission.whiteTargets.forEach(pos => {
    const target = { elementId: pos, colorCode: 'd', isValid: true, needsValidation: true };
    activeTargets.push(target);
    controlLED(pos, 'd');
  });

  // Setup red traps - OPTIMIZATION: Use constant red instead of blinking to reduce serial writes
  activeMission.redTraps.forEach(pos => {
    const trap = { elementId: pos, colorCode: 'r', isTrap: true };
    activeTargets.push(trap);
    trapPositions.push(trap);
    controlLED(pos, 'r'); // Constant red (was blinking - saves 4 serial writes/second per trap)
  });

  // OPTIMIZATION: Only light buttons once, not on every LED refresh (saves 15 serial writes per refresh)
  if (!buttonsInitialized) {
    clearAllButtons();
    [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].forEach(buttonId => {
      const color = BUTTONS_BY_COLOR.green.includes(buttonId) ? 'g' :
                    BUTTONS_BY_COLOR.blue.includes(buttonId) ? 'b' :
                    BUTTONS_BY_COLOR.yellow.includes(buttonId) ? 'y' : 'd';
      controlLED(buttonId, color);
    });
    buttonsInitialized = true;
    console.log('[STRIKELOOP] All 15 buttons initialized with fixed colors');
  }

  // Initialize hole sequence tracking
  holeSequenceActive = true;
  holeSequenceHit = [];
  buttonSequenceToMatch = [];
  buttonSequencePressed = [];
  buttonSequenceActive = false;

  activateBonusSection();
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

  
  // OPTIMIZATION: Always use constant red for traps (no blinking to reduce serial writes)
  console.log(`[STRIKELOOP] Setting up constant red trap at position ${position}`);
  controlLED(position, 'r');
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


function startBlinkingLED(position, color, interval = 400) {
  let isOn = true;
  const blinkInterval = setInterval(() => {
    if (isOn) {
      controlLED(position, color);
    } else {
      controlLED(position, 'o');
    }
    isOn = !isOn;
  }, interval); 

  
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
        controlLED(elementId, 'r'); // OPTIMIZATION: Constant red (was blinking)
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


  const noRefreshModes = [
    'sequence',
    'green-only',
    'rotating-green',
    'rotating-green-blue',
    'rotating-blue',
    'snake-green-3',
    'snake-blue-3',
    'snake-green-2',
    'snake-blue-2',
    // Two-step modes manage their own patterns - NEW
    'two-step-all-buttons-green',
    'two-step-all-buttons-blue',
    'two-step-alternating-all-buttons-green',
    'two-step-alternating-all-buttons-blue',
    'two-step-sequence-green',
    'two-step-sequence-blue',
    'two-step-random-all-buttons-green',
    'two-step-mixed-all-buttons-blue',
    'two-step-color-rotation-1-4',
    'two-step-color-rotation-5-8',
    // Hole sequence matching modes (Levels 7-10)
    'sequence-match-2-holes',
    'sequence-match-2-holes-hard',
    'sequence-match-3-holes',
    'sequence-match-3-holes-hard'
  ];
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
    // Two-step validation modes (Round 3) - NEW IMPLEMENTATION
    case 'two-step-all-buttons-green':
    case 'two-step-all-buttons-blue':
    case 'two-step-alternating-all-buttons-green':
    case 'two-step-alternating-all-buttons-blue':
    case 'two-step-sequence-green':
    case 'two-step-sequence-blue':
    case 'two-step-random-all-buttons-green':
    case 'two-step-mixed-all-buttons-blue':
    case 'two-step-color-rotation-1-4':
    case 'two-step-color-rotation-5-8':
      return processTwoStepMode(target);
    // Hole sequence matching modes (Levels 7-10)
    case 'sequence-match-2-holes':
    case 'sequence-match-2-holes-hard':
    case 'sequence-match-3-holes':
    case 'sequence-match-3-holes-hard':
      return processHoleSequenceMatchMode(target);
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
  if (target.colorCode === 'y') {
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
      // Reset index but keep sequence displayed (don't generate a new one)
      memorySequenceIndex = 0;
      // Keep memorySequenceDisplayed = true to prevent new sequence generation
      return true; // Full points awarded
    }
    return false; // Partial completion, no points yet
  } else {
    // Wrong hit! Penalty and reset
    const penalty = activeMission.penaltyRed || -100;
    console.log(`[STRIKELOOP] ❌ WRONG! Expected ${expectedId}, got ${elementId}. ${penalty} points. Sequence reset.`);
    // Mark as wrong for penalty scoring
    target.sequenceWrong = true;
    memorySequenceIndex = 0;
    return true; // Return true so penalty is calculated
  }
}

function processTwoStepMode(target) {
  // Handle two-step validation modes
  const elementId = target.elementId;
  const colorCode = target.colorCode;
  
  // Check if it's a bonus target (yellow) - always valid, no validation needed
  if (colorCode === 'y') {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${elementId} +${activeMission.pointsPerBonus} points`);
    return true;
  }
  
  // Check if it's a red trap
  if (target.isTrap || colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ TRAP HIT! Circle ${elementId} ${activeMission.penaltyRed} points`);
    return false; // Return false to apply penalty
  }
  
  // Check if it's a valid target that needs validation
  if (target.needsValidation && target.isValid) {
    console.log(`[STRIKELOOP] Target ${elementId} (${colorCode.toUpperCase()}) hit - awaiting button validation`);
    // Start validation process but don't award points yet
    handleTwoStepValidation(colorCode);
    return false; // No points until validated
  }
  
  // Not a valid target
  console.log(`[STRIKELOOP] ⚪ Target ${elementId} ignored`);
  return false;
}

// ========== HOLE SEQUENCE MATCHING PROCESSOR (LEVELS 7-10) ==========
function processHoleSequenceMatchMode(target) {
  const elementId = target.elementId;
  const colorCode = target.colorCode;

  // Check if it's a red trap FIRST
  if (target.isTrap || colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ TRAP HIT! Circle ${elementId} ${activeMission.penaltyRed} points`);
    // Reset hole sequence on trap hit
    holeSequenceActive = true;  // Reset to accept new hole hits
    holeSequenceHit = [];
    buttonSequenceToMatch = [];
    buttonSequencePressed = [];
    buttonSequenceActive = false;
    console.log('[STRIKELOOP] Hole sequence reset due to trap hit');
    return false;
  }

  // Check if it's a valid hole target (holes 1-8, including yellow targets)
  // This MUST come before bonus check to handle yellow holes correctly
  if (target.needsValidation && target.isValid && elementId <= 8) {
    const sequenceLength = activeMission.sequenceLength || 2;

    // If button sequence is active, ignore hole hits
    if (buttonSequenceActive) {
      console.log(`[STRIKELOOP] ⚠️ Ignoring hole hit - button validation in progress`);
      return false;
    }

    // Add hole to sequence
    holeSequenceHit.push(elementId);
    buttonSequenceToMatch.push(colorCode);

    console.log(`[STRIKELOOP] Hole ${elementId} (${colorCode.toUpperCase()}) hit - Progress: ${holeSequenceHit.length}/${sequenceLength}`);
    console.log(`[STRIKELOOP] Hole sequence so far: ${holeSequenceHit.join(', ')}`);
    console.log(`[STRIKELOOP] Button colors to match: ${buttonSequenceToMatch.map(c => c.toUpperCase()).join(', ')}`);

    // Check if sequence is complete
    if (holeSequenceHit.length >= sequenceLength) {
      console.log('[STRIKELOOP] 🎯 Hole sequence complete! Now validate with buttons in SAME ORDER');
      holeSequenceActive = false;
      buttonSequenceActive = true;
      return false; // No points yet, must validate with buttons
    }

    holeSequenceActive = true;
    return false; // No points yet, sequence not complete
  }

  // Check if it's a bonus target (circles 9-13 only, NOT yellow holes)
  if (elementId >= 9 && elementId <= 13 && (target.isBonus || (activeMission.bonusTargets && activeMission.bonusTargets.includes(elementId)))) {
    console.log(`[STRIKELOOP] ✅ BONUS HIT! Circle ${elementId} +${activeMission.pointsPerBonus} points`);
    const points = activeMission.pointsPerBonus || 50;
    const newScore = localScore + points;
    updateScore(newScore);
    return true;
  }

  // Not a valid target
  console.log(`[STRIKELOOP] ⚪ Target ${elementId} ignored`);
  return false;
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
      if (target.colorCode === 'y') {
        return activeMission.pointsPerBonus || 50;
      }
      // Full sequence completion gives goalScore
      if (target.sequenceCompleted) {
        return activeMission.goalScore;
      }
      // Wrong sequence hit gives penalty
      if (target.sequenceWrong) {
        return activeMission.penaltyRed || -100;
      }
      return 0;
    // Two-step validation modes
    case 'two-step-fixed-green':
    case 'two-step-fixed-blue':
    case 'two-step-alternating-green':
    case 'two-step-alternating-blue':
    case 'two-step-random-button-green':
    case 'two-step-random-button-blue':
    case 'two-step-random-green':
    case 'two-step-mixed-colors':
    case 'two-step-rotating-green':
    case 'two-step-ultimate':
      // Bonus targets give points immediately
      if (target.colorCode === 'y') {
        return activeMission.pointsPerBonus || 50;
      }
      // Traps give penalty
      if (target.isTrap || target.colorCode === 'r') {
        return activeMission.penaltyRed || -100;
      }
      // Valid targets need validation, no immediate points
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

  // Clear snake pattern tracking
  lastSnakeMode = null;
  snakePatternIndex = 0;
  
  // Round 3: Clear two-step validation state - NEW IMPLEMENTATION
  if (validationTimeout) {
    clearTimeout(validationTimeout);
    validationTimeout = null;
  }
  if (alternateInterval) {
    clearInterval(alternateInterval);
    alternateInterval = null;
  }
  if (randomTargetInterval) {
    clearInterval(randomTargetInterval);
    randomTargetInterval = null;
  }
  if (buttonRotationInterval) {
    clearInterval(buttonRotationInterval);
    buttonRotationInterval = null;
  }
  if (colorRotationInterval) {
    clearInterval(colorRotationInterval);
    colorRotationInterval = null;
  }

  validationPending = false;
  validationHitColor = null;
  activeButtonColors = [];
  alternatePatternIndex = 0;
  currentActiveTargets = [];
  currentRotationIndex = 0;

  // Clear new Round 3 state variables
  buttonsToValidate = [];
  buttonsValidated = [];
  sequenceToMatch = [];
  sequencePlayerInput = [];
  sequenceDisplaying = false;
  sequenceValidationActive = false;

  // Clear all buttons
  clearAllButtons();
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
