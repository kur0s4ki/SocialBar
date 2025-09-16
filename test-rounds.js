const strikeLoop = require('./strikeLoop.js');

console.log('=== Testing Round-Based Game System ===\n');

// Test 1: Verify round configuration
const rounds = strikeLoop.gameRounds();
console.log(`Total rounds configured: ${rounds.length}`);
console.log(`Total game duration: ${rounds.reduce((sum, round) => sum + round.duration, 0)} seconds`);

rounds.forEach((round, index) => {
  console.log(`Round ${round.round}: Level ${round.level}, ${round.duration}s - "${round.mission}"`);
});

console.log('\n=== Event Listener Test ===');

// Test 2: Event listener functionality
let eventCount = 0;
const testEvents = [];

strikeLoop.emitter.on('gameStarted', () => {
  testEvents.push('gameStarted');
  console.log(`Event ${++eventCount}: gameStarted`);
});

strikeLoop.emitter.on('roundUpdate', (data) => {
  testEvents.push(`roundUpdate-${data.round}`);
  console.log(`Event ${++eventCount}: roundUpdate - Round ${data.round}, Mission: "${data.mission}"`);
});

strikeLoop.emitter.on('timeUpdate', (data) => {
  if (data.timeLeft % 10 === 0) { // Only log every 10 seconds to avoid spam
    testEvents.push(`timeUpdate-${data.timeString}`);
    console.log(`Event ${++eventCount}: timeUpdate - ${data.timeString}`);
  }
});

strikeLoop.emitter.on('gameFinished', () => {
  testEvents.push('gameFinished');
  console.log(`Event ${++eventCount}: gameFinished`);

  console.log('\n=== Test Summary ===');
  console.log(`Total events fired: ${eventCount}`);
  console.log('Game completed successfully!');

  // Cleanup and exit
  setTimeout(() => {
    console.log('Test completed. Exiting...');
    process.exit(0);
  }, 1000);
});

// Test 3: Start the game with test data
console.log('\nStarting round-based game test...');
strikeLoop.emitter.emit('start', { teamName: 'Test Team' });

// Prevent the script from running indefinitely
setTimeout(() => {
  console.log('\nTest timeout reached. Stopping game...');
  strikeLoop.stopGame();
  process.exit(0);
}, 30000); // 30 seconds max