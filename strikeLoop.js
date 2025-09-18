const events = require('events');
const arduino = require('./arduino.js');
const readline = require('readline');
const emitter = new events.EventEmitter();


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


let gameState = {
  round: 1,
  level: 1,
  score: 0,
  missionNumber: 1,
  multiplier: 'x1',
  missionDescription: 'Waiting for mission...',
  totalGameTimeMinutes: 15 
};


let gameRounds = [
  
  {
    round: 1, level: 1,
    mission: 'Touchez uniquement les VERTS. Évitez les rouges !',
    duration: 25,
    arcadeMode: 'green-only',
    largeHoles: { active: 4, color: 'g' }, 
    mediumHoles: { active: 4, color: 'trap', blinking: true }, 
    smallHoles: { active: 0 }, 
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
    mediumHoles: { active: 2, color: 'b' }, 
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
    sequence: ['g', 'b', 'g'], 
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
    largeHoles: { active: 2, color: 'g' }, 
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
    activationRequirement: 3, 
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
    largeHoles: { active: 1, color: 'g' }, 
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 0 }, 
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 7,
    mission: 'Visez le même trou 3× pour +10 pts cumulés !',
    duration: 32,
    arcadeMode: 'cumulative-bonus',
    cumulativeBonus: { hits: 3, bonus: 10 }, 
    largeHoles: { active: 1, color: 'g' },
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 3 }, 
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 8,
    mission: 'Visez le même trou 3× pour +10 pts cumulés !',
    duration: 33,
    arcadeMode: 'cumulative-bonus',
    cumulativeBonus: { hits: 3, bonus: 10 },
    largeHoles: { active: 0, color: 'trap' }, 
    mediumHoles: { active: 4, color: 'b' }, 
    smallHoles: { active: 0 },
    traps: { count: 4, penalty: -100, reactivateDelay: 3 }, 
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 50
  },
  {
    round: 1, level: 9,
    mission: 'Évitez les rouges. Réalisez un combo de 3 !',
    duration: 33,
    arcadeMode: 'combo-system',
    comboRequirement: 3, 
    largeHoles: { active: 0, color: 'trap' }, 
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 3 }, 
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 60
  },
  {
    round: 1, level: 10,
    mission: 'Évitez les rouges. Réalisez un combo de 3 !',
    duration: 34,
    arcadeMode: 'combo-system',
    comboRequirement: 3,
    largeHoles: { active: 1, color: 'g' }, 
    mediumHoles: { active: 4, color: 'b' },
    smallHoles: { active: 0 },
    traps: { count: 3, penalty: -100, reactivateDelay: 3 },
    multiplier: { x2After: 2, x3After: 3, x2Duration: 10, x3Duration: 12 },
    pointsPerHit: 60
  },

  
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


addTrackedGameListener(emitter, 'start', (teamData) => {
  console.log('[STRIKELOOP] Game start received for team:', teamData.teamName);
  startRoundBasedGame();
  setupKeyboardListener();
});




addTrackedGameListener(emitter, 'EventInput', (message, value) => {
  if (isRunning) {
    console.log('[STRIKELOOP] Arduino input received during game:', message, 'Value:', value);
    
    processGameInput(message, 'arduino');
  } else {
    console.log('[STRIKELOOP] Arduino input received but no game running');
  }
});


addTrackedGameListener(emitter, 'circleClick', (data) => {
  if (isRunning) {
    console.log('[STRIKELOOP] Circle clicked - ID:', data.circleId);
    
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

  
  initializeGameState();

  emitter.emit('gameStarted');

  
  startNextLevel();
}

function startNextLevel() {
  if (currentLevelIndex >= gameRounds.length) {
    
    finishGame();
    return;
  }

  const currentLevel = gameRounds[currentLevelIndex];
  currentRoundTimeLeft = currentLevel.duration;

  console.log(`[STRIKELOOP] Starting Round ${currentLevel.round} - Level ${currentLevel.level}`);
  console.log(`[STRIKELOOP] Mission: ${currentLevel.mission}`);
  console.log(`[STRIKELOOP] Duration: ${currentLevel.duration} seconds`);

  
  gameState.round = currentLevel.round;
  gameState.level = currentLevel.level;
  gameState.missionNumber = currentLevel.level; 
  gameState.missionDescription = currentLevel.mission;

  
  initializeMission(currentLevel);

  
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

  
  startLevelTimer();
}


function initializeMission(levelConfig) {
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

  
  startArcadeLEDs();

  
  startLEDRefresh();
}


function startLEDRefresh() {
  
  if (ledRefreshInterval) {
    clearInterval(ledRefreshInterval);
  }

  
  if (activeMission && activeMission.arcadeMode &&
      activeMission.arcadeMode !== 'sequence' &&
      activeMission.arcadeMode !== 'green-only') {
    
    const refreshDelay = Math.floor(Math.random() * 2000) + 3000; 
    ledRefreshInterval = setInterval(() => {
      if (activeMission && activeMission.arcadeMode !== 'sequence' && activeMission.arcadeMode !== 'green-only') {
        activateArcadeLEDs(); 
      }
    }, refreshDelay);

    console.log(`[STRIKELOOP] LED refresh started every ${Math.floor(refreshDelay/1000)} seconds`);
  } else {
    console.log(`[STRIKELOOP] LED refresh skipped for ${activeMission?.arcadeMode || 'unknown'} mode`);
  }
}


function stopLEDRefresh() {
  if (ledRefreshInterval) {
    clearInterval(ledRefreshInterval);
    ledRefreshInterval = null;
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

      
      if (currentRoundTimeLeft % 30 === 0) {
        console.log(`[STRIKELOOP] Round ${gameRounds[currentLevelIndex].round} Level ${gameRounds[currentLevelIndex].level} time remaining: ${timeString}`);
      }
    } else {
      
      stopLevelTimer();
      const currentLevel = gameRounds[currentLevelIndex];
      currentLevelIndex++;

      if (currentLevelIndex < gameRounds.length) {
        console.log(`[STRIKELOOP] Round ${currentLevel.round} Level ${currentLevel.level} completed!`);

        
        const levelCompletionBonus = Math.floor(missionTargetsHit * 10); 
        if (levelCompletionBonus > 0) {
          const newScore = gameState.score + levelCompletionBonus;
          updateScore(newScore);
          console.log(`[STRIKELOOP] Level completion bonus: ${missionTargetsHit} hits x10 = +${levelCompletionBonus} points. Total: ${newScore}`);
        }

        
        if (currentLevelIndex % 10 === 0) {
          const completedRound = Math.floor(currentLevelIndex / 10);
          const roundBonus = completedRound * 500; 
          const bonusScore = gameState.score + roundBonus;
          updateScore(bonusScore);
          console.log(`[STRIKELOOP] 🎉 ROUND ${completedRound} COMPLETED! Round bonus: ${roundBonus} points. Total: ${bonusScore}`);
        }

        startNextLevel(); 
      } else {
        
        const finalBonus = Math.floor(Math.random() * 2000) + 1000; 
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
  stopLEDRefresh(); 
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
  gameState.score = newScore;
  console.log('[STRIKELOOP] Score updated to:', newScore);
  emitter.emit('scoreUpdate', newScore);
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

  
  if (config.traps && config.traps.count > 0) {
    setupAdditionalTraps(config.traps);
  }

  const validTargets = activeTargets.filter(t => t.isValid).length;
  const trapCount = trapPositions.length;

  
  const ledPattern = activeTargets.map(t => `${t.elementId}:${t.colorCode?.toUpperCase()}${t.isTrap ? '(trap)' : ''}`).join(' ');
  console.log(`[STRIKELOOP] Arcade LEDs: ${validTargets} targets, ${trapCount} traps | Pattern: ${ledPattern}`);
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
    console.log(`[STRIKELOOP] ❌ TRAP HIT! Circle ${elementId} - Penalty: ${activeMission.traps?.penalty || -100}`);
    pointsAwarded = activeMission.traps?.penalty || -100;

    
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

      
      if (consecutiveValidHits >= (activeMission.multiplier?.x2After || 2)) {
        activateMultiplier(2);
      }
      if (consecutiveValidHits >= (activeMission.multiplier?.x3After || 3)) {
        activateMultiplier(3);
      }
    } else {
      
      
      
    }
  }

  
  if (wasValidHit && multiplierActive && pointsAwarded > 0) {
    pointsAwarded = Math.floor(pointsAwarded * currentMultiplier);
    console.log(`[STRIKELOOP] Multiplier x${currentMultiplier} applied: ${pointsAwarded} points`);
  }

  
  if (pointsAwarded !== 0) {
    const newScore = Math.max(0, gameState.score + pointsAwarded);
    updateScore(newScore);
    console.log(`[STRIKELOOP] Score: ${gameState.score} -> ${newScore} (${pointsAwarded > 0 ? '+' : ''}${pointsAwarded})`);
  }

  
  setTimeout(() => {
    if (activeMission.arcadeMode === 'sequence') {
      
      console.log('[STRIKELOOP] Sequence mode: no LED refresh after hit');
    } else if (activeMission.arcadeMode === 'green-only') {
      
      console.log('[STRIKELOOP] Green-only mode: no LED refresh after hit');
    } else {
      
      activateArcadeLEDs();
    }
  }, 300);
}


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


function calculatePoints(target) {
  
  if (activeMission.arcadeMode === 'sequence') {
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
  }

  
  let basePoints = activeMission.pointsPerHit || 50;

  
  if (target.size === 'large') {
    basePoints += 10;
  }

  return basePoints;
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
