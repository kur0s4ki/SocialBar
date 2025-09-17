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
  // ROUND 1: ARCADE GAME - Touch only GREENS, avoid REDS with multipliers and traps
  {
    round: 1, level: 1,
    mission: 'Touchez uniquement les VERTS. Évitez les rouges !',
    duration: 25,
    arcadeMode: 'green-only',
    largeHoles: { active: 4, color: 'g' }, // 4 large green holes active
    mediumHoles: { active: 4, color: 'trap', blinking: true }, // 4 medium red traps
    smallHoles: { active: 0 }, // No small holes
    traps: { count: 4, penalty: -100, reactivateDelay: 0 },
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 2,
    mission: 'Touchez uniquement les VERTS. Évitez les rouges !',
    duration: 26,
    arcadeMode: 'green-only',
    largeHoles: { active: 4, color: 'g' },
    mediumHoles: { active: 2, color: 'b' }, // Introduces blue medium holes (not to touch)
    smallHoles: { active: 0 },
    traps: { count: 2, penalty: -100, reactivateDelay: 0 },
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 3,
    mission: 'Séquence: VERT > BLEU > VERT !',
    duration: 27,
    arcadeMode: 'sequence',
    sequence: ['g', 'b', 'g'], // Green -> Blue -> Green sequence
    largeHoles: { active: 3, color: 'g' },
    mediumHoles: { active: 3, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 2, penalty: -100, reactivateDelay: 0 },
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 60
  },
  {
    round: 1, level: 4,
    mission: 'Séquence: VERT > BLEU > VERT !',
    duration: 29,
    arcadeMode: 'sequence',
    sequence: ['g', 'b', 'g'],
    largeHoles: { active: 2, color: 'g' }, // Fewer greens for precision
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 2, penalty: -100, reactivateDelay: 0 },
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 60
  },
  {
    round: 1, level: 5,
    mission: 'Enchaînez 3 cibles correctes pour activer x2 !',
    duration: 30,
    arcadeMode: 'chain-activation',
    activationRequirement: 3, // Need 3 hits to activate x2
    largeHoles: { active: 2, color: 'g' },
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 2, penalty: -100, reactivateDelay: 0 },
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 6,
    mission: 'Enchaînez 3 cibles correctes pour activer x2 !',
    duration: 31,
    arcadeMode: 'chain-activation',
    activationRequirement: 3,
    largeHoles: { active: 1, color: 'g' }, // Very scarce greens
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 0 }, // More traps
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 7,
    mission: 'Visez le même trou 3× pour +10 pts cumulés !',
    duration: 32,
    arcadeMode: 'cumulative-bonus',
    cumulativeBonus: { hits: 3, bonus: 10 }, // 3 hits on same target = +10 bonus
    largeHoles: { active: 1, color: 'g' },
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 3 }, // Traps reactivate after 3 seconds
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 8,
    mission: 'Visez le même trou 3× pour +10 pts cumulés !',
    duration: 33,
    arcadeMode: 'cumulative-bonus',
    cumulativeBonus: { hits: 3, bonus: 10 },
    largeHoles: { active: 0, color: 'trap' }, // All large holes are traps!
    mediumHoles: { active: 4, color: 'b' }, // Only medium holes are valid
    smallHoles: { active: 0 },
    traps: { count: 4, penalty: -100, reactivateDelay: 3 }, // All 4 large positions are traps
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 9,
    mission: 'Évitez les rouges. Réalisez un combo de 3 !',
    duration: 33,
    arcadeMode: 'combo-system',
    comboRequirement: 3, // Need 3 clean hits for combo
    largeHoles: { active: 0, color: 'trap' }, // All large holes are traps
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 3 }, // 2-3 traps reactivating
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 60
  },
  {
    round: 1, level: 10,
    mission: 'Évitez les rouges. Réalisez un combo de 3 !',
    duration: 34,
    arcadeMode: 'combo-system',
    comboRequirement: 3,
    largeHoles: { active: 1, color: 'g' }, // Final level: 1 green large, 4 blue medium
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 3 },
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 60
  },

  // ROUND 2: Intermediate Challenge (5 minutes = 300 seconds) - Precision and avoidance
  { round: 2, level: 1, mission: 'Only BLUE circles!', duration: 30, targetColors: ['b'], avoidColors: ['r', 'g', 'y'], pointsPerHit: 30, penaltyPerMiss: -10 },
  { round: 2, level: 2, mission: 'Only GREEN, avoid RED!', duration: 30, targetColors: ['g'], avoidColors: ['r'], pointsPerHit: 35, penaltyPerMiss: -15 },
  { round: 2, level: 3, mission: 'Only YELLOW, ignore others!', duration: 30, targetColors: ['y'], avoidColors: ['r', 'g', 'b'], pointsPerHit: 30, penaltyPerMiss: -10 },
  { round: 2, level: 4, mission: 'Sequence: GREEN then BLUE!', duration: 30, sequence: ['g', 'b'], pointsPerSequence: 50 },
  { round: 2, level: 5, mission: 'Fast hits on any color!', duration: 30, targetColors: ['g', 'b', 'y', 'r'], pointsPerHit: 40, speedBonus: true },
  { round: 2, level: 6, mission: 'No mistakes allowed!', duration: 30, targetColors: ['g', 'b'], avoidColors: ['r', 'y'], pointsPerHit: 50, penaltyPerMiss: -25 },
  { round: 2, level: 7, mission: 'Multi-color precision!', duration: 30, targetColors: ['g', 'b', 'y'], avoidColors: ['r'], pointsPerHit: 45, penaltyPerMiss: -15 },
  { round: 2, level: 8, mission: 'Pattern: RED-YELLOW-GREEN!', duration: 30, sequence: ['r', 'y', 'g'], pointsPerSequence: 75 },
  { round: 2, level: 9, mission: 'Rapid fire challenge!', duration: 30, targetColors: ['g', 'b', 'y', 'r'], pointsPerHit: 60, speedBonus: true },
  { round: 2, level: 10, mission: 'Round 2 boss level!', duration: 30, targetColors: ['g', 'b'], avoidColors: ['r', 'y'], pointsPerHit: 70, penaltyPerMiss: -20, speedBonus: true },

  // ROUND 3: Master Level (5 minutes = 300 seconds) - Complex patterns and high stakes
  { round: 3, level: 1, mission: 'Master precision: BLUE only!', duration: 30, targetColors: ['b'], avoidColors: ['r', 'g', 'y'], pointsPerHit: 80, penaltyPerMiss: -30 },
  { round: 3, level: 2, mission: 'Complex pattern: G-R-B-Y!', duration: 30, sequence: ['g', 'r', 'b', 'y'], pointsPerSequence: 120 },
  { round: 3, level: 3, mission: 'Speed and precision!', duration: 30, targetColors: ['g', 'y'], avoidColors: ['r', 'b'], pointsPerHit: 90, penaltyPerMiss: -25, speedBonus: true },
  { round: 3, level: 4, mission: 'Reverse: Y-B-R-G pattern!', duration: 30, sequence: ['y', 'b', 'r', 'g'], pointsPerSequence: 140 },
  { round: 3, level: 5, mission: 'Maximum difficulty!', duration: 30, targetColors: ['g'], avoidColors: ['r', 'b', 'y'], pointsPerHit: 100, penaltyPerMiss: -40, speedBonus: true },
  { round: 3, level: 6, mission: 'Elite double sequence!', duration: 30, sequence: ['r', 'g', 'r', 'g'], pointsPerSequence: 160 },
  { round: 3, level: 7, mission: 'Ultimate speed test!', duration: 30, targetColors: ['g', 'b', 'y', 'r'], pointsPerHit: 120, speedBonus: true, speedMultiplier: 2 },
  { round: 3, level: 8, mission: 'Master precision combo!', duration: 30, targetColors: ['b', 'y'], avoidColors: ['r', 'g'], pointsPerHit: 110, penaltyPerMiss: -35, speedBonus: true },
  { round: 3, level: 9, mission: 'Final sequence: G-B-Y-R-G!', duration: 30, sequence: ['g', 'b', 'y', 'r', 'g'], pointsPerSequence: 200 },
  { round: 3, level: 10, mission: 'GRAND FINALE: All skills!', duration: 30, targetColors: ['g', 'b', 'y'], avoidColors: ['r'], pointsPerHit: 150, penaltyPerMiss: -50, speedBonus: true, speedMultiplier: 3 }
];

// Ensure total duration equals 15 minutes (900 seconds)
const totalDuration = gameRounds.reduce((sum, round) => sum + round.duration, 0);
console.log(`[STRIKELOOP] Total game duration: ${totalDuration} seconds (${Math.floor(totalDuration/60)} minutes ${totalDuration%60} seconds)`);

// Timer variables for round-based time management
let currentRoundTimeLeft = 0;
let timeUpdateInterval;

// Mission state tracking
let activeMission = null;
let activeTargets = []; // Array of {elementId, colorCode} objects that should be clicked
let missionTargetsHit = 0;

// Sequence tracking for pattern-based missions
let currentSequence = [];
let sequenceProgress = 0;
let lastHitTime = 0;

// ARCADE GAME STATE VARIABLES
let consecutiveValidHits = 0; // Track consecutive valid hits for multipliers
let currentMultiplier = 1; // Current active multiplier (1, 2, or 3)
let multiplierTimer = null; // Timer for multiplier duration
let multiplierActive = false; // Whether multiplier is currently active
let trapPositions = []; // Array of trap positions with reactivation timers
let cumulativeHitCounts = {}; // Track hits per target for cumulative bonus
let comboProgress = 0; // Track combo progress
let activationHits = 0; // Track hits for activation requirement
let sequenceStep = 0; // Current step in sequence (0 = green, 1 = blue, 2 = green)

// LED refresh interval for continuous gameplay
let ledRefreshInterval;

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
    // Process Arduino input through mission validation
    processGameInput(message, 'arduino');
  } else {
    console.log('[STRIKELOOP] Arduino input received but no game running');
  }
});

// Listen for circle click events from simulator
addTrackedGameListener(emitter, 'circleClick', (data) => {
  if (isRunning) {
    console.log('[STRIKELOOP] Circle clicked - ID:', data.circleId);
    // Process simulator click through mission validation
    processGameInput(data.circleId, 'simulator');
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

  // Initialize mission logic
  initializeMission(currentLevel);

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

// Initialize mission logic for the current level
function initializeMission(levelConfig) {
  activeMission = levelConfig;
  activeTargets = [];
  missionTargetsHit = 0;
  sequenceProgress = 0;
  currentSequence = levelConfig.sequence || [];

  // Reset arcade game state
  consecutiveValidHits = 0;
  currentMultiplier = 1;
  multiplierActive = false;
  trapPositions = [];
  cumulativeHitCounts = {};
  comboProgress = 0;
  activationHits = 0;
  sequenceStep = 0;

  // Clear any existing multiplier timer
  if (multiplierTimer) {
    clearTimeout(multiplierTimer);
    multiplierTimer = null;
  }

  console.log(`[STRIKELOOP] ARCADE Mission initialized:`, {
    arcadeMode: levelConfig.arcadeMode,
    largeHoles: levelConfig.largeHoles,
    mediumHoles: levelConfig.mediumHoles,
    traps: levelConfig.traps,
    multiplier: levelConfig.multiplier,
    sequence: levelConfig.sequence,
    pointsPerHit: levelConfig.pointsPerHit
  });

  // Start arcade LED patterns
  startArcadeLEDs();

  // Start continuous LED refresh for arcade gameplay
  startLEDRefresh();
}

// Start continuous LED refresh for active gameplay
function startLEDRefresh() {
  // Clear any existing refresh interval
  if (ledRefreshInterval) {
    clearInterval(ledRefreshInterval);
  }

  // Refresh LEDs every 3-5 seconds for continuous play
  const refreshDelay = Math.floor(Math.random() * 2000) + 3000; // 3-5 seconds
  ledRefreshInterval = setInterval(() => {
    if (activeMission && !activeMission.sequence) {
      activateRandomLEDs();
    }
  }, refreshDelay);

  console.log(`[STRIKELOOP] LED refresh started every ${Math.floor(refreshDelay/1000)} seconds`);
}

// Stop LED refresh and clear all LEDs
function stopLEDRefresh() {
  if (ledRefreshInterval) {
    clearInterval(ledRefreshInterval);
    ledRefreshInterval = null;
  }

  // Turn off all LEDs
  for (let i = 1; i <= 8; i++) {
    controlLED(i, 'o');
  }

  // Clear central circle
  controlLED(CENTRAL_CIRCLE_ID, 'o');

  activeTargets = [];
  console.log('[STRIKELOOP] LED refresh stopped, all LEDs cleared');
}

// Start LED patterns for arcade gameplay
function startArcadeLEDs() {
  if (!activeMission || !activeMission.arcadeMode) return;

  console.log(`[STRIKELOOP] Starting arcade LEDs for mode: ${activeMission.arcadeMode}`);

  // Activate LEDs based on arcade configuration
  activateArcadeLEDs();
}

// Show the next target in a sequence mission with all 8 LEDs active
function showSequenceTarget() {
  if (!activeMission.sequence || sequenceProgress >= activeMission.sequence.length) return;

  const targetColor = activeMission.sequence[sequenceProgress];
  const allColors = ['r', 'g', 'b', 'y'];

  // Clear existing targets
  activeTargets = [];

  // Pick a random circle for the target
  const targetCircle = Math.floor(Math.random() * 8) + 1;

  console.log(`[STRIKELOOP] Sequence ${sequenceProgress + 1}/${activeMission.sequence.length}: Circle ${targetCircle} -> ${targetColor.toUpperCase()}`);

  // Activate ALL 8 circles with mixed colors for challenging sequence gameplay
  for (let circleId = 1; circleId <= 8; circleId++) {
    let color;

    if (circleId === targetCircle) {
      // This is the target circle with the required sequence color
      color = targetColor;
    } else {
      // Fill other circles with distractor colors
      // 60% chance of wrong colors, 40% chance of neutral colors
      if (Math.random() < 0.6) {
        // Use colors from the sequence as distractors (confusing!)
        const sequenceColors = [...new Set(activeMission.sequence)];
        const wrongColors = sequenceColors.filter(c => c !== targetColor);
        if (wrongColors.length > 0) {
          color = wrongColors[Math.floor(Math.random() * wrongColors.length)];
        } else {
          // Fallback to any other color
          color = allColors.filter(c => c !== targetColor)[Math.floor(Math.random() * 3)];
        }
      } else {
        // Use any color except the target
        const distractorColors = allColors.filter(c => c !== targetColor);
        color = distractorColors[Math.floor(Math.random() * distractorColors.length)];
      }
    }

    controlLED(circleId, color);
    activeTargets.push({elementId: circleId, colorCode: color});
  }

  // Mark which one is the actual target for validation
  const targetIndex = activeTargets.findIndex(t => t.elementId === targetCircle);
  activeTargets[targetIndex].isSequenceTarget = true;

  console.log(`[STRIKELOOP] Sequence LED Pattern:`, activeTargets.map(t =>
    `${t.elementId}:${t.colorCode ? t.colorCode.toUpperCase() : 'UNDEFINED'}${t.isSequenceTarget ? '*' : ''}`
  ).join(' '));
}

// Activate ALL 8 LEDs with mixed colors for challenging gameplay
function activateRandomLEDs() {
  if (!activeMission.targetColors) return;

  // Clear existing targets
  activeTargets = [];

  const allColors = ['r', 'g', 'b', 'y'];

  // Always activate ALL 8 circles for maximum difficulty
  for (let circleId = 1; circleId <= 8; circleId++) {
    let color;

    // Create strategic mix of colors based on mission type
    if (activeMission.targetColors && activeMission.avoidColors) {
      // For precision missions: guaranteed mix of target and avoid colors
      const shouldBeTarget = Math.random() < 0.4; // 40% chance of target color
      if (shouldBeTarget) {
        color = activeMission.targetColors[Math.floor(Math.random() * activeMission.targetColors.length)];
      } else {
        // Mix of avoid colors and neutral colors
        const distractors = [...activeMission.avoidColors];
        // Add neutral colors (not target, not avoid)
        allColors.forEach(c => {
          if (!activeMission.targetColors.includes(c) && !activeMission.avoidColors.includes(c)) {
            distractors.push(c);
          }
        });
        color = distractors[Math.floor(Math.random() * distractors.length)];
      }
    }
    else if (activeMission.targetColors) {
      // For target-only missions: mix target colors with all other colors
      const shouldBeTarget = Math.random() < 0.3; // 30% chance of target color
      if (shouldBeTarget) {
        color = activeMission.targetColors[Math.floor(Math.random() * activeMission.targetColors.length)];
      } else {
        // Use non-target colors as distractors
        const distractors = allColors.filter(c => !activeMission.targetColors.includes(c));
        if (distractors.length > 0) {
          color = distractors[Math.floor(Math.random() * distractors.length)];
        } else {
          // If no distractors available (all colors are targets), just use random target color
          color = activeMission.targetColors[Math.floor(Math.random() * activeMission.targetColors.length)];
        }
      }
    }
    else {
      // Fallback: random color
      color = allColors[Math.floor(Math.random() * 4)];
    }

    // Safety check: ensure color is never undefined
    if (!color) {
      color = allColors[Math.floor(Math.random() * 4)];
      console.warn(`[STRIKELOOP] Color was undefined, using fallback: ${color}`);
    }

    controlLED(circleId, color);
    activeTargets.push({elementId: circleId, colorCode: color});
  }

  // Count target vs distractor circles for logging
  const targetCircles = activeTargets.filter(t => activeMission.targetColors && activeMission.targetColors.includes(t.colorCode));
  const avoidCircles = activeTargets.filter(t => activeMission.avoidColors && activeMission.avoidColors.includes(t.colorCode));

  console.log(`[STRIKELOOP] All 8 LEDs activated! Targets: ${targetCircles.length}, Avoid: ${avoidCircles.length}, Neutral: ${8 - targetCircles.length - avoidCircles.length}`);
  console.log(`[STRIKELOOP] LED Pattern:`, activeTargets.map(t => `${t.elementId}:${t.colorCode ? t.colorCode.toUpperCase() : 'UNDEFINED'}`).join(' '));
}

// Process game input and validate against active mission
function processGameInput(inputId, source) {
  if (!activeMission || !activeTargets.length) return;

  const currentTime = Date.now();
  lastHitTime = currentTime;

  // Find the clicked target
  const clickedTarget = activeTargets.find(target => target.elementId == inputId);

  if (!clickedTarget) {
    console.log(`[STRIKELOOP] Input ${inputId} not found in active targets`);
    return;
  }

  console.log(`[STRIKELOOP] Input detected: Circle ${inputId} (${clickedTarget.colorCode.toUpperCase()}) from ${source}`);

  // Validate input against arcade mission requirements
  if (activeMission.arcadeMode) {
    console.log(`[STRIKELOOP] Using ARCADE validation for ${activeMission.arcadeMode} mode`);
    validateArcadeInput(clickedTarget, currentTime);
  } else {
    console.log(`[STRIKELOOP] Using ORIGINAL validation (no arcade mode)`);
    validateInput(clickedTarget, currentTime);
  }
}

// Validate input against mission requirements and award points
function validateInput(target, timestamp) {
  if (!activeMission) return;

  const { elementId, colorCode } = target;
  let pointsAwarded = 0;
  let valid = false;

  // Handle sequence missions
  if (activeMission.sequence) {
    const expectedColor = activeMission.sequence[sequenceProgress];

    // For sequences, must click the correct circle with correct color
    if (colorCode === expectedColor && target.isSequenceTarget) {
      valid = true;
      sequenceProgress++;

      console.log(`[STRIKELOOP] ✓ Sequence progress: ${sequenceProgress}/${activeMission.sequence.length}`);

      if (sequenceProgress >= activeMission.sequence.length) {
        // Sequence completed
        pointsAwarded = activeMission.pointsPerSequence || 100;
        console.log(`[STRIKELOOP] 🎉 SEQUENCE COMPLETED! +${pointsAwarded} points`);

        // Reset sequence for next round
        sequenceProgress = 0;
        setTimeout(() => showSequenceTarget(), 1000);
      } else {
        // Show next target in sequence
        setTimeout(() => showSequenceTarget(), 500);
        pointsAwarded = Math.floor((activeMission.pointsPerSequence || 100) / activeMission.sequence.length);
      }
    } else {
      // Wrong click in sequence
      if (target.isSequenceTarget) {
        console.log(`[STRIKELOOP] ❌ Wrong color! Expected ${expectedColor.toUpperCase()}, got ${colorCode.toUpperCase()}`);
      } else {
        console.log(`[STRIKELOOP] ❌ Wrong circle! Need to click the ${expectedColor.toUpperCase()} circle`);
      }

      // Apply penalty
      if (activeMission.penaltyPerMiss) {
        pointsAwarded = activeMission.penaltyPerMiss;
      }
      // Reset sequence on mistake
      sequenceProgress = 0;
      setTimeout(() => showSequenceTarget(), 1000);
    }
  }
  // Handle regular target/avoid missions
  else {
    // Check if it's a target color
    if (activeMission.targetColors && activeMission.targetColors.includes(colorCode)) {
      valid = true;
      pointsAwarded = activeMission.pointsPerHit || 10;

      // Apply speed bonus if applicable
      if (activeMission.speedBonus) {
        const timeSinceLastHit = timestamp - (lastHitTime - 1000); // Rough calculation
        if (timeSinceLastHit < 2000) { // Fast hit within 2 seconds
          const speedMultiplier = activeMission.speedMultiplier || 1.5;
          pointsAwarded = Math.floor(pointsAwarded * speedMultiplier);
          console.log(`[STRIKELOOP] SPEED BONUS! x${speedMultiplier}`);
        }
      }

      console.log(`[STRIKELOOP] ✅ TARGET HIT! ${colorCode.toUpperCase()} circle +${pointsAwarded} points`);
      missionTargetsHit++;
    }
    // Check if it's an avoid color
    else if (activeMission.avoidColors && activeMission.avoidColors.includes(colorCode)) {
      valid = false;
      pointsAwarded = activeMission.penaltyPerMiss || -10;
      console.log(`[STRIKELOOP] ❌ PENALTY! ${colorCode.toUpperCase()} circle ${pointsAwarded} points`);
    }
    // Neutral hit (neither target nor avoid)
    else {
      console.log(`[STRIKELOOP] ⚪ Neutral: ${colorCode.toUpperCase()} circle (no points)`);
    }

    // Generate new targets for continuous play
    setTimeout(() => activateRandomLEDs(), 500);
  }

  // Update score
  if (pointsAwarded !== 0) {
    const newScore = gameState.score + pointsAwarded;
    updateScore(newScore);
  }

  // Turn off the clicked LED
  controlLED(elementId, 'o');
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
        console.log(`[STRIKELOOP] Round ${currentLevel.round} Level ${currentLevel.level} completed!`);

        // Award level completion bonus based on hits scored during the level
        const levelCompletionBonus = Math.floor(missionTargetsHit * 10); // 10 points per hit
        if (levelCompletionBonus > 0) {
          const newScore = gameState.score + levelCompletionBonus;
          updateScore(newScore);
          console.log(`[STRIKELOOP] Level completion bonus: ${missionTargetsHit} hits x10 = +${levelCompletionBonus} points. Total: ${newScore}`);
        }

        // Check if we completed a round (every 10 levels)
        if (currentLevelIndex % 10 === 0) {
          const completedRound = Math.floor(currentLevelIndex / 10);
          const roundBonus = completedRound * 500; // Bonus for completing a round
          const bonusScore = gameState.score + roundBonus;
          updateScore(bonusScore);
          console.log(`[STRIKELOOP] 🎉 ROUND ${completedRound} COMPLETED! Round bonus: ${roundBonus} points. Total: ${bonusScore}`);
        }

        startNextLevel(); // Immediate transition to next level
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
  stopLEDRefresh(); // Clean up LED refresh
  activeMission = null; // Clear mission state
  console.log('[STRIKELOOP] All 30 levels (3 rounds × 10 levels) completed - game finished');
  emitter.emit('gameFinished');

  // Cleanup arcade game state
  cleanupArcadeGame();

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
    stopLEDRefresh(); // Clean up LED refresh
    cleanupArcadeGame(); // Clean up arcade game state
    activeMission = null; // Clear mission state
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
  // NO LED LOGGING - too much spam from blinking traps
  // Only log in debug mode if needed

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

// ARCADE LED ACTIVATION SYSTEM
function activateArcadeLEDs() {
  if (!activeMission) return;

  // Clear existing targets
  activeTargets = [];

  const config = activeMission;
  const largePositions = [1, 2, 3, 4]; // Large hole positions (outer circles)
  const mediumPositions = [5, 6, 7, 8]; // Medium hole positions

  // Handle large holes
  if (config.largeHoles && config.largeHoles.active > 0) {
    const activeLargeCount = Math.min(config.largeHoles.active, largePositions.length);
    const selectedPositions = largePositions.slice(0, activeLargeCount);

    selectedPositions.forEach(pos => {
      if (config.largeHoles.color === 'trap') {
        // This is a trap position
        setupTrapPosition(pos);
      } else {
        // This is a valid target
        const target = {
          elementId: pos,
          colorCode: config.largeHoles.color,
          size: 'large',
          isValid: true
        };
        activeTargets.push(target);
        controlLED(pos, config.largeHoles.color);
      }
    });
  }

  // Handle medium holes
  if (config.mediumHoles && config.mediumHoles.active > 0) {
    const activeMediumCount = Math.min(config.mediumHoles.active, mediumPositions.length);
    const selectedPositions = mediumPositions.slice(0, activeMediumCount);

    selectedPositions.forEach(pos => {
      if (config.mediumHoles.color === 'trap') {
        setupTrapPosition(pos);
      } else {
        const target = {
          elementId: pos,
          colorCode: config.mediumHoles.color,
          size: 'medium',
          isValid: true
        };
        activeTargets.push(target);
        controlLED(pos, config.mediumHoles.color);
      }
    });
  }

  // Setup additional trap positions if specified
  if (config.traps && config.traps.count > 0) {
    setupAdditionalTraps(config.traps);
  }

  const validTargets = activeTargets.filter(t => t.isValid).length;
  const trapCount = trapPositions.length;

  // Log LED pattern for debugging
  const ledPattern = activeTargets.map(t => `${t.elementId}:${t.colorCode?.toUpperCase()}${t.isTrap ? '(trap)' : ''}`).join(' ');
  console.log(`[STRIKELOOP] Arcade LEDs: ${validTargets} targets, ${trapCount} traps | Pattern: ${ledPattern}`);
}

// Setup a trap position with blinking red LED
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

  // Start blinking red LED for trap
  startBlinkingLED(position, 'r');
}

// Setup additional traps based on configuration
function setupAdditionalTraps(trapConfig) {
  const allPositions = [1, 2, 3, 4, 5, 6, 7, 8];
  const existingTraps = trapPositions.map(t => t.elementId);
  const availablePositions = allPositions.filter(pos => !existingTraps.includes(pos) && !activeTargets.some(t => t.elementId === pos && t.isValid));

  const additionalTraps = Math.min(trapConfig.count - trapPositions.length, availablePositions.length);

  for (let i = 0; i < additionalTraps; i++) {
    const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const index = availablePositions.indexOf(position);
    if (index > -1) availablePositions.splice(index, 1);

    setupTrapPosition(position);
  }
}

// Start blinking LED for traps
function startBlinkingLED(position, color) {
  let isOn = true;
  const blinkInterval = setInterval(() => {
    if (isOn) {
      controlLED(position, color);
    } else {
      controlLED(position, 'o');
    }
    isOn = !isOn;
  }, 400); // Blink every 400ms (slower, less noise)

  // Store blink interval for cleanup
  if (!activeMission.blinkIntervals) activeMission.blinkIntervals = [];
  activeMission.blinkIntervals.push(blinkInterval);
}

// MULTIPLIER SYSTEM IMPLEMENTATION
function activateMultiplier(level) {
  if (!activeMission?.multiplier) return;

  const multiplierConfig = activeMission.multiplier;
  let newMultiplier = 1;
  let duration = 0;

  if (level === 2 && consecutiveValidHits >= multiplierConfig.x2After) {
    newMultiplier = 2;
    duration = multiplierConfig.x2Duration * 1000; // Convert to milliseconds
  } else if (level === 3 && consecutiveValidHits >= multiplierConfig.x3After) {
    newMultiplier = 3;
    duration = multiplierConfig.x3Duration * 1000;
  }

  if (newMultiplier > currentMultiplier) {
    currentMultiplier = newMultiplier;
    multiplierActive = true;

    // Clear existing timer
    if (multiplierTimer) {
      clearTimeout(multiplierTimer);
    }

    // Set new timer
    multiplierTimer = setTimeout(() => {
      console.log(`[STRIKELOOP] Multiplier x${currentMultiplier} expired`);
      currentMultiplier = 1;
      multiplierActive = false;
      consecutiveValidHits = 0; // Reset streak when multiplier expires

      // Update UI
      gameState.multiplier = 'x1';
      emitter.emit('multiplierUpdate', gameState.multiplier);
    }, duration);

    console.log(`[STRIKELOOP] Multiplier ACTIVATED: x${currentMultiplier} for ${duration/1000}s`);

    // Update UI
    gameState.multiplier = `x${currentMultiplier}`;
    emitter.emit('multiplierUpdate', gameState.multiplier);
  }
}

// Cancel multiplier on trap hit
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

    // Update UI
    gameState.multiplier = 'x1';
    emitter.emit('multiplierUpdate', gameState.multiplier);
  }
}

// ARCADE GAME INPUT VALIDATION SYSTEM
function validateArcadeInput(target, timestamp) {
  if (!activeMission) return;

  const { elementId, colorCode, isTrap, isValid, size } = target;
  let pointsAwarded = 0;
  let wasValidHit = false;

  console.log(`[STRIKELOOP] Arcade validation - Circle ${elementId}: color=${colorCode}, isTrap=${isTrap}, isValid=${isValid}`);

  // Handle trap hits first - check if target is marked as trap OR has red color
  if (isTrap === true || colorCode === 'r') {
    console.log(`[STRIKELOOP] ❌ TRAP HIT! Circle ${elementId} - Penalty: ${activeMission.traps?.penalty || -100}`);
    pointsAwarded = activeMission.traps?.penalty || -100;

    // Cancel multiplier immediately
    cancelMultiplier();

    // Handle trap reactivation
    if (activeMission.traps?.reactivateDelay > 0) {
      setTimeout(() => {
        console.log(`[STRIKELOOP] Trap ${elementId} reactivated`);
        startBlinkingLED(elementId, 'r');
      }, activeMission.traps.reactivateDelay * 1000);
    }
  }
  // Handle valid hits based on arcade mode
  else {
    wasValidHit = processArcadeMode(target, timestamp);
    if (wasValidHit) {
      pointsAwarded = calculatePoints(target);
      consecutiveValidHits++;

      // Check for multiplier activation
      if (consecutiveValidHits >= (activeMission.multiplier?.x2After || 2)) {
        activateMultiplier(2);
      }
      if (consecutiveValidHits >= (activeMission.multiplier?.x3After || 3)) {
        activateMultiplier(3);
      }
    } else {
      // Apply penalty for wrong hits in green-only mode
      if (activeMission.arcadeMode === 'green-only' && target.colorCode !== 'g') {
        pointsAwarded = activeMission.traps?.penalty || -100;
        console.log(`[STRIKELOOP] ❌ WRONG COLOR PENALTY! Hit ${target.colorCode?.toUpperCase()}, need GREEN - Penalty: ${pointsAwarded}`);
        cancelMultiplier();
      }
    }
  }

  // Apply multiplier to points if active
  if (wasValidHit && multiplierActive && pointsAwarded > 0) {
    pointsAwarded = Math.floor(pointsAwarded * currentMultiplier);
    console.log(`[STRIKELOOP] Multiplier x${currentMultiplier} applied: ${pointsAwarded} points`);
  }

  // Award points and update score
  if (pointsAwarded !== 0) {
    const newScore = Math.max(0, gameState.score + pointsAwarded);
    updateScore(newScore);
    console.log(`[STRIKELOOP] Score: ${gameState.score} -> ${newScore} (${pointsAwarded > 0 ? '+' : ''}${pointsAwarded})`);
  }

  // Refresh LEDs after hit (always refresh for arcade modes)
  setTimeout(() => {
    activateArcadeLEDs();
  }, 300);
}

// Process different arcade game modes
function processArcadeMode(target, timestamp) {
  const mode = activeMission.arcadeMode;
  const { elementId, colorCode } = target;

  switch (mode) {
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
    default:
      console.log(`[STRIKELOOP] Unknown arcade mode: ${mode}`);
      return false;
  }
}

// Green-only mode: only green targets are valid
function processGreenOnlyMode(target) {
  if (target.colorCode === 'g') {
    console.log(`[STRIKELOOP] ✅ GREEN HIT! Circle ${target.elementId}`);
    return true;
  } else {
    console.log(`[STRIKELOOP] ❌ Wrong color! Need GREEN, got ${target.colorCode?.toUpperCase()}`);
    consecutiveValidHits = 0; // Reset streak on wrong color
    return false;
  }
}

// Sequence mode: Green -> Blue -> Green pattern
function processSequenceMode(target) {
  const sequence = activeMission.sequence || ['g', 'b', 'g'];
  const expectedColor = sequence[sequenceStep % sequence.length];

  if (target.colorCode === expectedColor) {
    console.log(`[STRIKELOOP] ✅ SEQUENCE ${sequenceStep + 1}/${sequence.length}: ${expectedColor.toUpperCase()} HIT!`);
    sequenceStep++;

    if (sequenceStep >= sequence.length) {
      console.log(`[STRIKELOOP] 🎉 SEQUENCE COMPLETED! Restarting...`);
      sequenceStep = 0;
    }
    return true;
  } else {
    console.log(`[STRIKELOOP] ❌ Wrong sequence! Expected ${expectedColor.toUpperCase()}, got ${target.colorCode?.toUpperCase()}`);
    sequenceStep = 0; // Reset sequence on wrong hit
    consecutiveValidHits = 0;
    return false;
  }
}

// Chain activation mode: need X hits to activate multiplier
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

// Cumulative bonus mode: hit same target 3 times for +10 bonus
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
      cumulativeHitCounts[targetId] = 0; // Reset counter
    }

    // Reset other counters when switching targets
    Object.keys(cumulativeHitCounts).forEach(id => {
      if (id != targetId) {
        cumulativeHitCounts[id] = 0;
      }
    });

    return true;
  }
  return false;
}

// Combo system mode: clean 3-hit combos
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

// Calculate points based on target and current game state
function calculatePoints(target) {
  let basePoints = activeMission.pointsPerHit || 50;

  // Size bonus
  if (target.size === 'large') {
    basePoints += 10;
  }

  return basePoints;
}

// CLEANUP FUNCTIONS FOR ARCADE GAME
function cleanupArcadeGame() {
  // Clear multiplier timer
  if (multiplierTimer) {
    clearTimeout(multiplierTimer);
    multiplierTimer = null;
  }

  // Clear blinking intervals
  if (activeMission?.blinkIntervals) {
    activeMission.blinkIntervals.forEach(interval => clearInterval(interval));
    activeMission.blinkIntervals = [];
  }

  // Reset all arcade state
  consecutiveValidHits = 0;
  currentMultiplier = 1;
  multiplierActive = false;
  trapPositions = [];
  cumulativeHitCounts = {};
  comboProgress = 0;
  activationHits = 0;
  sequenceStep = 0;
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
