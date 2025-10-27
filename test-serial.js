///
/// STANDALONE SERIAL PORT TESTER
/// Test serial communication with Controllino hardware
/// No game logic - just raw serial commands
///

const readline = require('readline');
const SerialPort = require('serialport');
const asyncLock = require('async-lock');
const lock = new asyncLock();

// Serial port configuration
let ControllinoSerialPort;
let ControllinoPort;
const ControllinovendorId = '2341';
let SerialComBusy = false;

// Command batching
let commandBatchQueue = [];
let batchTimer = null;
const BATCH_DELAY_MS = 20; // Wait 20ms to collect commands before sending

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Find and initialize serial port
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           CONTROLLINO SERIAL PORT TESTER                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

SerialPort.list()
  .then((ports) => {
    console.log(`[${getCurrentTime()}] 🔍 Scanning for serial ports...`);
    console.log(`[${getCurrentTime()}] Available ports:`, ports.map(p => p.path).join(', '));

    ControllinoPort = ports.find(port => port.vendorId === ControllinovendorId);

    if (ControllinoPort) {
      console.log(`[${getCurrentTime()}] ✅ Found Controllino at: ${ControllinoPort.path}`);
      initControllinoSerialPort(ControllinoPort.path);
    } else {
      console.error(`[${getCurrentTime()}] ❌ Controllino not found!`);
      console.log(`[${getCurrentTime()}] Available ports:`, ports);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(`[${getCurrentTime()}] ❌ Error listing serial ports:`, error);
    process.exit(1);
  });

function initControllinoSerialPort(portPath) {
  console.log(`[${getCurrentTime()}] 📡 Initializing port: ${portPath}`);

  ControllinoSerialPort = new SerialPort(portPath, {
    baudRate: 9600,
    autoOpen: false,
  });

  // Handle port open event
  ControllinoSerialPort.on('open', function() {
    console.log(`[${getCurrentTime()}] ✓ Serial port opened successfully`);
    console.log(`[${getCurrentTime()}] ⏳ Waiting for Arduino bootloader (3 seconds)...\n`);

    setTimeout(() => {
      console.log(`[${getCurrentTime()}] ✓ Arduino ready!\n`);
      showMenu();
      startInteractiveMode();
    }, 3000);
  });

  // Handle port errors
  ControllinoSerialPort.on('error', function(err) {
    console.error(`[${getCurrentTime()}] ✗ Serial port error:`, err.message);
  });

  // Handle incoming data
  ControllinoSerialPort.on('data', function(data) {
    const s = data.toString('utf8');
    console.log(`[${getCurrentTime()}] 📥 Arduino Response: ${s}`);
  });

  // Open the port
  ControllinoSerialPort.open();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//cut message in 2 parts
async function sendIn2Parts(mes) {
  await lock.acquire('exampleLock', async () => {
    if (SerialComBusy === true) {
      return;
    }

    SerialComBusy = true;
    ControllinoSerialPort.write(mes.slice(0, 1));
    await sleep(110);
    ControllinoSerialPort.write(mes.slice(1));
    SerialComBusy = false;
  });
}

//send serial in loop
async function sendSerial(count) {
  await lock.acquire('loopLock', async () => {
    do {
      await sendIn2Parts(count);
    } while (SerialComBusy === true);
  });
}

function showMenu() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    COMMAND FORMAT                          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║                                                            ║');
  console.log('║  Single command:   [ID] [STATE] [COLOR]                   ║');
  console.log('║  Example:          1 1 g        (Output 1 ON green)       ║');
  console.log('║                    2 0          (Output 2 OFF)             ║');
  console.log('║                                                            ║');
  console.log('║  Batch commands:   [ID][STATE][COLOR] [ID][STATE][COLOR]  ║');
  console.log('║  Example:          1 1 g 2 1 b 3 0                        ║');
  console.log('║                                                            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  IDs:     1-9  (Circles 1-9)                              ║');
  console.log('║           9     Central circle                             ║');
  console.log('║           10-13 Inner holes                                ║');
  console.log('║           14-22 Control buttons                            ║');
  console.log('║  STATE:   0 (OFF) or 1 (ON)                               ║');
  console.log('║  COLOR:   g (green), b (blue), r (red), y (yellow)        ║');
  console.log('║           w (white/off)                                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Special Commands:                                         ║');
  console.log('║  - all on [color]    Turn all LEDs on with color          ║');
  console.log('║  - all off           Turn all LEDs off                     ║');
  console.log('║  - test              Run quick test pattern                ║');
  console.log('║  - batch             Send batched test (like game does)    ║');
  console.log('║                                                            ║');
  console.log('║  Game Level Tests:                                         ║');
  console.log('║  - r1l1 to r1l10     Test Round 1, Levels 1-10            ║');
  console.log('║  - r2l1 to r2l10     Test Round 2, Levels 1-10            ║');
  console.log('║  - r3l1 to r3l10     Test Round 3, Levels 1-10            ║');
  console.log('║  - levels            Show all available level tests        ║');
  console.log('║                                                            ║');
  console.log('║  - help              Show this menu                        ║');
  console.log('║  - exit              Quit program                          ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

async function sendSerialCommand(command) {
  if (!ControllinoSerialPort || !ControllinoSerialPort.isOpen) {
    console.log(`[${getCurrentTime()}] ❌ Serial port not open!`);
    return;
  }

  console.log(`[${getCurrentTime()}] 📤 Sending: ${command}`);
  await sendSerial(command);
}

function sendBatchedCommands(commands) {
  console.log(`[${getCurrentTime()}] 📦 Sending ${commands.length} commands with 30ms delay between each...`);

  let index = 0;

  function sendNext() {
    if (index < commands.length) {
      const cmd = commands[index];
      console.log(`[${getCurrentTime()}]   → Command ${index + 1}/${commands.length}: ${cmd}`);
      sendSerialCommand(cmd);
      index++;

      // Wait 100ms before sending next command
      setTimeout(sendNext, 30);
    } else {
      console.log(`[${getCurrentTime()}] ✅ All ${commands.length} commands sent!`);
    }
  }

  sendNext();
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME LEVEL CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

function getGameLevelPattern(round, level) {
  const patterns = {
    // ─────────────────────────────────────────────────────────────────────────
    // ROUND 1: BASIC GAMEPLAY
    // ─────────────────────────────────────────────────────────────────────────
    'r1l1': {
      name: 'Round 1, Level 1: Green-Blue Combo',
      description: 'Touch greens (1-4) and blues (5-8)',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05b', 'O06b', 'O07b', 'O08b']
    },
    'r1l2': {
      name: 'Round 1, Level 2: Green Avoid Red',
      description: 'Touch greens (1-4), avoid reds (5-8)',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r']
    },
    'r1l3': {
      name: 'Round 1, Level 3: Blue Avoid Red',
      description: 'Touch blues (5-8), avoid reds (1-4)',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b']
    },
    'r1l4': {
      name: 'Round 1, Level 4: Rotating Green',
      description: 'Greens rotate every 2 seconds (simulated pattern)',
      commands: ['O01g', 'O02g', 'O03w', 'O04w', 'O05r', 'O06r', 'O07r', 'O08r']
    },
    'r1l5': {
      name: 'Round 1, Level 5: Rotating Green-Blue',
      description: 'Greens and blues rotate',
      commands: ['O01g', 'O02g', 'O03w', 'O04w', 'O05b', 'O06b', 'O07w', 'O08w']
    },
    'r1l6': {
      name: 'Round 1, Level 6: Rotating Blue',
      description: 'Blues rotate, reds are traps',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07w', 'O08w']
    },
    'r1l7': {
      name: 'Round 1, Level 7: Multi-Hit Green (2x)',
      description: 'Touch same green twice, avoid reds',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r']
    },
    'r1l8': {
      name: 'Round 1, Level 8: Multi-Hit Blue (2x)',
      description: 'Touch same blue twice, avoid reds',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b']
    },
    'r1l9': {
      name: 'Round 1, Level 9: Multi-Hit Green (3x)',
      description: 'Touch same green three times, avoid reds',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r']
    },
    'r1l10': {
      name: 'Round 1, Level 10: Multi-Hit Blue (3x)',
      description: 'Touch same blue three times, avoid reds',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b']
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ROUND 2: ADVANCED GAMEPLAY WITH BONUSES
    // ─────────────────────────────────────────────────────────────────────────
    'r2l1': {
      name: 'Round 2, Level 1: Blinking Green Bonus',
      description: 'Greens + bonus targets (9-13)',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l2': {
      name: 'Round 2, Level 2: Blinking Blue Bonus',
      description: 'Blues + bonus targets (9-13)',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l3': {
      name: 'Round 2, Level 3: Snake Pattern Green (3)',
      description: 'Snake pattern with 3 greens + bonuses',
      commands: ['O01g', 'O02g', 'O03w', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l4': {
      name: 'Round 2, Level 4: Snake Pattern Blue (3)',
      description: 'Snake pattern with 3 blues + bonuses',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07w', 'O08b', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l5': {
      name: 'Round 2, Level 5: Snake Pattern Green (4)',
      description: 'All 4 greens in snake pattern + bonuses',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l6': {
      name: 'Round 2, Level 6: Snake Pattern Blue (4)',
      description: 'All 4 blues in snake pattern + bonuses',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l7': {
      name: 'Round 2, Level 7: Memory Sequence (4 Green)',
      description: 'Remember 4-hole green sequence',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l8': {
      name: 'Round 2, Level 8: Memory Sequence (4 Blue)',
      description: 'Remember 4-hole blue sequence',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l9': {
      name: 'Round 2, Level 9: Memory Sequence (5 Green)',
      description: 'Remember 5-hole green sequence',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },
    'r2l10': {
      name: 'Round 2, Level 10: Memory Sequence (5 Blue)',
      description: 'Remember 5-hole blue sequence',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y']
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ROUND 3: TWO-STEP VALIDATION WITH BUTTONS
    // ─────────────────────────────────────────────────────────────────────────
    'r3l1': {
      name: 'Round 3, Level 1: Fixed Green Button',
      description: 'Touch greens then press green button (14 or 16)',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14g', 'O15w', 'O16g', 'O17w', 'O18w', 'O19w', 'O20w', 'O21w', 'O22w']
    },
    'r3l2': {
      name: 'Round 3, Level 2: Fixed Blue Button',
      description: 'Touch blues then press blue button (18 or 20)',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14w', 'O15w', 'O16w', 'O17w', 'O18b', 'O19w', 'O20b', 'O21w', 'O22w']
    },
    'r3l3': {
      name: 'Round 3, Level 3: Alternating Green',
      description: 'Alternating green targets (1,3 / 2,4) + green buttons',
      commands: ['O01g', 'O02w', 'O03g', 'O04w', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14g', 'O15w', 'O16g', 'O17w', 'O18w', 'O19w', 'O20w', 'O21w', 'O22w']
    },
    'r3l4': {
      name: 'Round 3, Level 4: Alternating Blue',
      description: 'Alternating blue targets (5,7 / 6,8) + blue buttons',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06w', 'O07b', 'O08w', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14w', 'O15w', 'O16w', 'O17w', 'O18b', 'O19w', 'O20b', 'O21w', 'O22w']
    },
    'r3l5': {
      name: 'Round 3, Level 5: Random Button Green',
      description: 'Touch greens, find random green button',
      commands: ['O01g', 'O02g', 'O03g', 'O04g', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14w', 'O15w', 'O16g', 'O17w', 'O18w', 'O19w', 'O20w', 'O21w', 'O22w']
    },
    'r3l6': {
      name: 'Round 3, Level 6: Random Button Blue',
      description: 'Touch blues, find random blue button',
      commands: ['O01r', 'O02r', 'O03r', 'O04r', 'O05b', 'O06b', 'O07b', 'O08b', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14w', 'O15w', 'O16w', 'O17w', 'O18w', 'O19w', 'O20b', 'O21w', 'O22w']
    },
    'r3l7': {
      name: 'Round 3, Level 7: Random Targets Green',
      description: '2 random greens + random green button',
      commands: ['O01g', 'O02w', 'O03g', 'O04w', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14g', 'O15w', 'O16w', 'O17w', 'O18w', 'O19w', 'O20w', 'O21w', 'O22w']
    },
    'r3l8': {
      name: 'Round 3, Level 8: Mixed Colors',
      description: 'Green and blue targets + color-matched buttons',
      commands: ['O01g', 'O02w', 'O03g', 'O04w', 'O05b', 'O06w', 'O07b', 'O08w', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14g', 'O15w', 'O16w', 'O17w', 'O18b', 'O19w', 'O20w', 'O21w', 'O22w']
    },
    'r3l9': {
      name: 'Round 3, Level 9: Rotating with Any Button',
      description: 'Rotating greens + any color button works',
      commands: ['O01g', 'O02g', 'O03w', 'O04w', 'O05r', 'O06r', 'O07r', 'O08r', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14g', 'O15b', 'O16w', 'O17r', 'O18w', 'O19w', 'O20w', 'O21w', 'O22w']
    },
    'r3l10': {
      name: 'Round 3, Level 10: Ultimate Chaos',
      description: 'Mixed targets + rapid button validation',
      commands: ['O01g', 'O02g', 'O03w', 'O04w', 'O05b', 'O06b', 'O07w', 'O08w', 'O09y', 'O10y', 'O11y', 'O12y', 'O13y', 'O14g', 'O15b', 'O16r', 'O17y', 'O18w', 'O19w', 'O20w', 'O21w', 'O22w']
    }
  };

  return patterns[`r${round}l${level}`] || null;
}

function showLevels() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              AVAILABLE GAME LEVEL TESTS                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║                                                            ║');
  console.log('║  ROUND 1: BASIC GAMEPLAY                                   ║');
  console.log('║  r1l1  - Green-Blue Combo                                  ║');
  console.log('║  r1l2  - Green Avoid Red                                   ║');
  console.log('║  r1l3  - Blue Avoid Red                                    ║');
  console.log('║  r1l4  - Rotating Green                                    ║');
  console.log('║  r1l5  - Rotating Green-Blue                               ║');
  console.log('║  r1l6  - Rotating Blue                                     ║');
  console.log('║  r1l7  - Multi-Hit Green (2x)                              ║');
  console.log('║  r1l8  - Multi-Hit Blue (2x)                               ║');
  console.log('║  r1l9  - Multi-Hit Green (3x)                              ║');
  console.log('║  r1l10 - Multi-Hit Blue (3x)                               ║');
  console.log('║                                                            ║');
  console.log('║  ROUND 2: ADVANCED WITH BONUSES                            ║');
  console.log('║  r2l1  - Blinking Green Bonus                              ║');
  console.log('║  r2l2  - Blinking Blue Bonus                               ║');
  console.log('║  r2l3  - Snake Pattern Green (3)                           ║');
  console.log('║  r2l4  - Snake Pattern Blue (3)                            ║');
  console.log('║  r2l5  - Snake Pattern Green (4)                           ║');
  console.log('║  r2l6  - Snake Pattern Blue (4)                            ║');
  console.log('║  r2l7  - Memory Sequence (4 Green)                         ║');
  console.log('║  r2l8  - Memory Sequence (4 Blue)                          ║');
  console.log('║  r2l9  - Memory Sequence (5 Green)                         ║');
  console.log('║  r2l10 - Memory Sequence (5 Blue)                          ║');
  console.log('║                                                            ║');
  console.log('║  ROUND 3: TWO-STEP WITH BUTTONS                            ║');
  console.log('║  r3l1  - Fixed Green Button                                ║');
  console.log('║  r3l2  - Fixed Blue Button                                 ║');
  console.log('║  r3l3  - Alternating Green                                 ║');
  console.log('║  r3l4  - Alternating Blue                                  ║');
  console.log('║  r3l5  - Random Button Green                               ║');
  console.log('║  r3l6  - Random Button Blue                                ║');
  console.log('║  r3l7  - Random Targets Green                              ║');
  console.log('║  r3l8  - Mixed Colors                                      ║');
  console.log('║  r3l9  - Rotating with Any Button                          ║');
  console.log('║  r3l10 - Ultimate Chaos                                    ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

function parseCommand(input) {
  const trimmed = input.trim().toLowerCase();

  // Handle special commands
  if (trimmed === 'help') {
    showMenu();
    return null;
  }

  if (trimmed === 'levels') {
    showLevels();
    return null;
  }

  if (trimmed === 'exit') {
    console.log(`[${getCurrentTime()}] 👋 Exiting...`);
    if (ControllinoSerialPort && ControllinoSerialPort.isOpen) {
      ControllinoSerialPort.close();
    }
    process.exit(0);
  }

  // Handle game level tests (r1l1, r2l5, r3l10, etc.)
  const levelMatch = trimmed.match(/^r(\d)l(\d+)$/);
  if (levelMatch) {
    const round = parseInt(levelMatch[1]);
    const level = parseInt(levelMatch[2]);
    const pattern = getGameLevelPattern(round, level);

    if (pattern) {
      console.log(`[${getCurrentTime()}] 🎮 ${pattern.name}`);
      console.log(`[${getCurrentTime()}] 📝 ${pattern.description}`);
      return { type: 'batch', commands: pattern.commands };
    } else {
      console.log(`[${getCurrentTime()}] ❌ Level r${round}l${level} not found. Type 'levels' to see available tests.`);
      return null;
    }
  }

  if (trimmed.startsWith('all on')) {
    const color = trimmed.split(' ')[2] || 'g';
    const commands = [];
    for (let i = 1; i <= 9; i++) {
      commands.push(`O${i.toString().padStart(2, '0')}${color}`);
    }
    return { type: 'batch', commands };
  }

  if (trimmed === 'all off') {
    const commands = [];
    for (let i = 1; i <= 9; i++) {
      commands.push(`O${i.toString().padStart(2, '0')}w`);
    }
    return { type: 'batch', commands };
  }

  if (trimmed === 'test') {
    console.log(`[${getCurrentTime()}] 🧪 Running test pattern...`);
    const commands = [
      'O01g', 'O02b', 'O03r', 'O04y',
      'O05g', 'O06b', 'O07r', 'O08y', 'O09g'
    ];
    return { type: 'batch', commands };
  }

  if (trimmed === 'batch') {
    console.log(`[${getCurrentTime()}] 🎮 Simulating game batch (like level start)...`);
    // Simulate what the game does: turn all off, then turn some on
    const commands = [
      'O01w', 'O04w', 'O06w', 'O07w', 'O02w', 'O03w', 'O05w', 'O08w', 'O09w', // All OFF
      'O01g', 'O04g', 'O06g', 'O07g', 'O02b', 'O03b', 'O05b', 'O08b'          // Some ON
    ];
    return { type: 'batch', commands };
  }

  // Parse regular command: [ID] [STATE] [COLOR] or multiple
  const tokens = trimmed.split(/\s+/);

  if (tokens.length === 0) {
    return null;
  }

  // Check if it's multiple commands
  if (tokens.length >= 2) {
    const commands = [];
    let i = 0;

    while (i < tokens.length) {
      const id = parseInt(tokens[i]);
      const state = tokens[i + 1];

      if (isNaN(id) || (state !== '0' && state !== '1')) {
        console.log(`[${getCurrentTime()}] ❌ Invalid command at position ${i}`);
        return null;
      }

      const paddedId = id.toString().padStart(2, '0');

      // New protocol: O{NN}{color}
      // If state is 0, color defaults to 'w' (OFF)
      // If state is 1, color is required
      if (state === '0') {
        commands.push(`O${paddedId}w`);
        i += 2; // Skip id and state
      } else {
        const color = tokens[i + 2];
        if (!color) {
          console.log(`[${getCurrentTime()}] ❌ Color required when turning ON`);
          return null;
        }
        commands.push(`O${paddedId}${color}`);
        i += 3; // Skip id, state, and color
      }
    }

    if (commands.length === 1) {
      return { type: 'single', command: commands[0] };
    }
    return { type: 'batch', commands };
  }

  console.log(`[${getCurrentTime()}] ❌ Invalid command format. Type 'help' for usage.`);
  return null;
}

function startInteractiveMode() {
  rl.setPrompt('serial> ');
  rl.prompt();

  rl.on('line', (line) => {
    const parsed = parseCommand(line);

    if (parsed) {
      if (parsed.type === 'batch') {
        sendBatchedCommands(parsed.commands);
      } else if (parsed.type === 'single') {
        sendSerialCommand(parsed.command);
      }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n[${getCurrentTime()}] 👋 Goodbye!`);
    if (ControllinoSerialPort && ControllinoSerialPort.isOpen) {
      ControllinoSerialPort.close();
    }
    process.exit(0);
  });
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n[${getCurrentTime()}] 👋 Interrupted. Exiting...`);
  if (ControllinoSerialPort && ControllinoSerialPort.isOpen) {
    ControllinoSerialPort.close();
  }
  process.exit(0);
});
