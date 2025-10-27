///
/// Test script to verify game LED commands work correctly
/// Simulates what strikeloop.js does when controlling LEDs
///

const HAL = require('./hardwareAbstraction.js');
const readline = require('readline');

// Set HAL to hardware mode
HAL.setMode('hardware');

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

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           GAME LED COMMAND TESTER                         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`[${getCurrentTime()}] Testing game LED commands through HAL...`);

// Wait for Arduino to be ready (from arduino.js initialization)
setTimeout(() => {
  console.log(`[${getCurrentTime()}] Starting LED tests...\n`);
  
  // Test 1: Turn on circles like the game does
  console.log(`[${getCurrentTime()}] TEST 1: Green targets (1-4) and Blue targets (5-8)`);
  
  // Simulate green-blue-combo mode from Round 1 Level 1
  HAL.controlLED(1, 'g');
  HAL.controlLED(2, 'g');
  HAL.controlLED(3, 'g');
  HAL.controlLED(4, 'g');
  HAL.controlLED(5, 'b');
  HAL.controlLED(6, 'b');
  HAL.controlLED(7, 'b');
  HAL.controlLED(8, 'b');
  
  setTimeout(() => {
    console.log(`\n[${getCurrentTime()}] TEST 2: All LEDs OFF`);
    for (let i = 1; i <= 8; i++) {
      HAL.controlLED(i, 'o');
    }
    
    setTimeout(() => {
      console.log(`\n[${getCurrentTime()}] TEST 3: Rotating pattern (like game rotating modes)`);
      let position = 1;
      const rotateInterval = setInterval(() => {
        // Clear all
        for (let i = 1; i <= 8; i++) {
          HAL.controlLED(i, 'o');
        }
        
        // Light up one
        HAL.controlLED(position, 'g');
        console.log(`[${getCurrentTime()}] Position ${position} -> GREEN`);
        
        position++;
        if (position > 8) {
          clearInterval(rotateInterval);
          
          // Final test: batch commands
          console.log(`\n[${getCurrentTime()}] TEST 4: Batch commands (simulating level start)`);
          
          // Turn all off first
          for (let i = 1; i <= 8; i++) {
            HAL.controlLED(i, 'o');
          }
          
          // Then turn some on (like game does)
          setTimeout(() => {
            HAL.controlLED(1, 'g');
            HAL.controlLED(4, 'g');
            HAL.controlLED(6, 'b');
            HAL.controlLED(7, 'b');
            
            console.log(`\n[${getCurrentTime()}] ✅ All tests complete!`);
            console.log(`[${getCurrentTime()}] If LEDs responded correctly, the game should work now.`);
            console.log('\nPress Ctrl+C to exit...');
          }, 500);
        }
      }, 1000);
    }, 2000);
  }, 3000);
}, 9000); // Wait 9 seconds total (3 for port init + 3 for bootloader + 3 buffer)

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n[${getCurrentTime()}] Exiting...`);
  process.exit(0);
});
