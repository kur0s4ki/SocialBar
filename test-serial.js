///
/// STANDALONE SERIAL PORT TESTER
/// Test serial communication with Controllino hardware
/// No game logic - just raw serial commands
///

const readline = require('readline');
const SerialPort = require('serialport');

// Serial port configuration
let ControllinoSerialPort;
let ControllinoPort;
const ControllinovendorId = '2341';

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
    console.log(`[${getCurrentTime()}] 📥 Arduino Response: ${data.toString()}`);
  });

  // Open the port
  ControllinoSerialPort.open();
}

function showMenu() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    COMMAND FORMAT                          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║                                                            ║');
  console.log('║  Single command:   [ID] [STATE] [COLOR]                   ║');
  console.log('║  Example:          1 1 g        (Output 1 ON green)       ║');
  console.log('║                    2 0 w        (Output 2 OFF)             ║');
  console.log('║                                                            ║');
  console.log('║  Batch commands:   [ID][STATE][COLOR] [ID][STATE][COLOR]  ║');
  console.log('║  Example:          1 1 g 2 1 b 3 1 r                      ║');
  console.log('║                                                            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  IDs:     1-9  (Circles 1-9)                              ║');
  console.log('║           14-22 (Control buttons)                         ║');
  console.log('║  STATE:   0 (OFF) or 1 (ON)                               ║');
  console.log('║  COLOR:   g (green), b (blue), r (red), y (yellow)        ║');
  console.log('║           w (white/off)                                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Special Commands:                                         ║');
  console.log('║  - all on [color]    Turn all LEDs on with color          ║');
  console.log('║  - all off           Turn all LEDs off                     ║');
  console.log('║  - test              Run quick test pattern                ║');
  console.log('║  - batch             Send batched test (like game does)    ║');
  console.log('║  - help              Show this menu                        ║');
  console.log('║  - exit              Quit program                          ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

function sendSerialCommand(command) {
  if (!ControllinoSerialPort || !ControllinoSerialPort.isOpen) {
    console.log(`[${getCurrentTime()}] ❌ Serial port not open!`);
    return;
  }

  console.log(`[${getCurrentTime()}] 📤 Sending: ${command}`);

  ControllinoSerialPort.write(command, (err) => {
    if (err) {
      console.error(`[${getCurrentTime()}] ❌ Write error:`, err.message);
    }
  });

  ControllinoSerialPort.drain();
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

function parseCommand(input) {
  const trimmed = input.trim().toLowerCase();

  // Handle special commands
  if (trimmed === 'help') {
    showMenu();
    return null;
  }

  if (trimmed === 'exit') {
    console.log(`[${getCurrentTime()}] 👋 Exiting...`);
    if (ControllinoSerialPort && ControllinoSerialPort.isOpen) {
      ControllinoSerialPort.close();
    }
    process.exit(0);
  }

  if (trimmed.startsWith('all on')) {
    const color = trimmed.split(' ')[2] || 'g';
    const commands = [];
    for (let i = 1; i <= 9; i++) {
      commands.push(`O${i.toString().padStart(2, '0')}1${color}`);
    }
    return { type: 'batch', commands };
  }

  if (trimmed === 'all off') {
    const commands = [];
    for (let i = 1; i <= 9; i++) {
      commands.push(`O${i.toString().padStart(2, '0')}0w`);
    }
    return { type: 'batch', commands };
  }

  if (trimmed === 'test') {
    console.log(`[${getCurrentTime()}] 🧪 Running test pattern...`);
    const commands = [
      'O011g', 'O021b', 'O031r', 'O041y',
      'O051g', 'O061b', 'O071r', 'O081y', 'O091g'
    ];
    return { type: 'batch', commands };
  }

  if (trimmed === 'batch') {
    console.log(`[${getCurrentTime()}] 🎮 Simulating game batch (like level start)...`);
    // Simulate what the game does: turn all off, then turn some on
    const commands = [
      'O010w', 'O040w', 'O060w', 'O070w', 'O020w', 'O030w', 'O050w', 'O080w', 'O090w', // All OFF
      'O011g', 'O041g', 'O061g', 'O071g', 'O021b', 'O031b', 'O051b', 'O081b'          // Some ON
    ];
    return { type: 'batch', commands };
  }

  // Parse regular command: [ID] [STATE] [COLOR] or multiple
  const tokens = trimmed.split(/\s+/);

  if (tokens.length === 0) {
    return null;
  }

  // Check if it's multiple commands (length divisible by 3)
  if (tokens.length >= 3 && tokens.length % 3 === 0) {
    const commands = [];
    for (let i = 0; i < tokens.length; i += 3) {
      const id = parseInt(tokens[i]);
      const state = tokens[i + 1];
      const color = tokens[i + 2];

      if (isNaN(id) || (state !== '0' && state !== '1')) {
        console.log(`[${getCurrentTime()}] ❌ Invalid command at position ${i}`);
        return null;
      }

      const paddedId = id.toString().padStart(2, '0');
      commands.push(`O${paddedId}${state}${color}`);
    }
    return { type: 'batch', commands };
  }

  // Single command
  if (tokens.length === 3) {
    const id = parseInt(tokens[0]);
    const state = tokens[1];
    const color = tokens[2];

    if (isNaN(id) || (state !== '0' && state !== '1')) {
      console.log(`[${getCurrentTime()}] ❌ Invalid command format`);
      return null;
    }

    const paddedId = id.toString().padStart(2, '0');
    const command = `O${paddedId}${state}${color}`;
    return { type: 'single', command };
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
