///
/// Hardware Abstraction Layer (HAL)
/// Provides unified interface for simulation and hardware outputs
///

const events = require('events');
const arduino = require('./arduino.js');

const emitter = new events.EventEmitter();

// Configuration
const CONFIG = {
  mode: process.env.HARDWARE_MODE || 'simulation', // 'simulation' | 'hardware' | 'both'
  enableLogging: false // Disabled for cleaner logs - serial writes are logged in arduino.js
};

// Hardware state cache to prevent redundant serial writes
// Tracks current state of each output: { state: 0|1, color: 'r'|'g'|'b'|... }
const hardwareStateCache = {};

// Hardware ID Mapping
// Maps logical IDs (used in code/UI) to physical hardware IDs (actual wiring)
// This compensates for wiring errors without changing the game logic or UI
const HARDWARE_ID_MAP = {
  1: 1,   // Logical 1 → Hardware 1
  2: 4,   // Logical 2 → Hardware 4
  3: 6,   // Logical 3 → Hardware 6
  4: 7,   // Logical 4 → Hardware 7
  5: 2,   // Logical 5 → Hardware 2
  6: 3,   // Logical 6 → Hardware 3
  7: 5,   // Logical 7 → Hardware 5
  8: 8,   // Logical 8 → Hardware 8
  // IDs 9-22 are correctly wired (no remapping needed)
  9: 9, 10: 10, 11: 11, 12: 12, 13: 13,
  14: 14, 15: 15, 16: 16, 17: 17, 18: 18,
  19: 19, 20: 20, 21: 21, 22: 22
};

// Color mapping for simulation display
const COLORS = {
  'o': '#ffffff',     // OFF - white
  '0': '#ffffff',     // OFF - white
  'r': '#e74c3c',     // Red
  'g': '#27ae60',     // Green
  'b': '#3498db',     // Blue
  'y': '#f1c40f',     // Yellow
  'p': '#9b59b6',     // Purple
  'w': '#ecf0f1',     // White
  'c': '#1abc9c',     // Cyan
};

// Control button specific colors (elements 14-22)
const CONTROL_BUTTON_COLORS = {
  14: '#27ae60',  // Green
  15: '#f1c40f',  // Yellow
  16: '#3498db',  // Blue
  17: '#f1c40f',  // Yellow
  18: '#9b59b6',  // Purple
  19: '#e74c3c',  // Red
  20: '#3498db',  // Blue
  21: '#27ae60',  // Green
  22: '#e67e22',  // Orange
};

/**
 * Set hardware mode
 * @param {string} mode - 'simulation', 'hardware', or 'both'
 */
function setMode(mode) {
  if (['simulation', 'hardware', 'both'].includes(mode)) {
    CONFIG.mode = mode;
    // Always log mode changes (important)
    console.log(`[HAL] Mode set to: ${mode}`);
  } else {
    console.error(`[HAL] Invalid mode: ${mode}. Must be 'simulation', 'hardware', or 'both'`);
  }
}

/**
 * Get current hardware mode
 * @returns {string} Current mode
 */
function getMode() {
  return CONFIG.mode;
}

/**
 * Turn on an output with specified color
 * @param {number} outputId - Output identifier (1-22)
 * @param {string} colorCode - Color code ('r', 'g', 'b', 'y', 'p', 'w', 'c', or '1' for element-specific)
 */
function turnOnOutput(outputId, colorCode = '1') {
  const state = 1;
  const hardwareColor = _translateColorCode(colorCode, outputId);

  // Check cache to avoid redundant writes
  const cached = hardwareStateCache[outputId];
  if (cached && cached.state === state && cached.color === hardwareColor) {
    log(`Output ${outputId} already ON with color ${hardwareColor}, skipping hardware write`);

    // Still send to simulation for UI sync
    if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
      _sendToSimulation(outputId, colorCode, state);
    }
    return;
  }

  log(`Turn ON output ${outputId} with color ${colorCode}`);

  // Update cache
  hardwareStateCache[outputId] = { state, color: hardwareColor };

  // Send to simulation
  if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
    _sendToSimulation(outputId, colorCode, state);
  }

  // Send to hardware
  if (CONFIG.mode === 'hardware' || CONFIG.mode === 'both') {
    _sendToHardware(outputId, state, hardwareColor);
  }
}

/**
 * Turn off an output
 * @param {number} outputId - Output identifier (1-22)
 */
function turnOffOutput(outputId) {
  const state = 0;
  const hardwareColor = 'w'; // OFF uses 'w' as placeholder

  // Check cache to avoid redundant writes
  const cached = hardwareStateCache[outputId];
  if (cached && cached.state === state) {
    log(`Output ${outputId} already OFF, skipping hardware write`);

    // Still send to simulation for UI sync
    if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
      _sendToSimulation(outputId, 'o', state);
    }
    return;
  }

  log(`Turn OFF output ${outputId}`);

  // Update cache
  hardwareStateCache[outputId] = { state, color: hardwareColor };

  // Send to simulation
  if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
    _sendToSimulation(outputId, 'o', state);
  }

  // Send to hardware (use 'w' as dummy color since it's irrelevant when off)
  if (CONFIG.mode === 'hardware' || CONFIG.mode === 'both') {
    _sendToHardware(outputId, state, 'w');
  }
}

/**
 * Set output state with color
 * @param {number} outputId - Output identifier
 * @param {number} state - 0 (OFF) or 1 (ON)
 * @param {string} colorCode - Color code
 */
function setOutput(outputId, state, colorCode = '1') {
  if (state === 0 || state === '0') {
    turnOffOutput(outputId);
  } else {
    turnOnOutput(outputId, colorCode);
  }
}

/**
 * Control LED with color code (legacy compatibility)
 * @param {number} elementId - Element identifier
 * @param {string} colorCode - Color code
 */
function controlLED(elementId, colorCode) {
  if (colorCode === 'o' || colorCode === '0') {
    turnOffOutput(elementId);
  } else {
    turnOnOutput(elementId, colorCode);
  }
}

/**
 * Control output with binary state (legacy compatibility)
 * @param {number} outputNum - Output number
 * @param {number} value - 0 or 1
 */
function controlOutput(outputNum, value) {
  setOutput(outputNum, value, '1');
}

/**
 * Control bar LED
 * @param {number} percentage - Percentage value (0-100)
 */
function setBarLED(percentage) {
  log(`Set bar LED to ${percentage}%`);

  // Send to hardware
  if (CONFIG.mode === 'hardware' || CONFIG.mode === 'both') {
    arduino.setBarled(percentage);
  }

  // Send to simulation (if UI supports it)
  if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
    emitter.emit('barLED', { percentage });
  }
}

/**
 * Flash an output with specified color and duration
 * @param {number} outputId - Output identifier
 * @param {string} colorCode - Color code
 * @param {number} duration - Duration in milliseconds
 */
function flashOutput(outputId, colorCode, duration) {
  turnOnOutput(outputId, colorCode);
  setTimeout(() => {
    turnOffOutput(outputId);
  }, duration);
}

// ============================================================================
// Private Functions
// ============================================================================

/**
 * Translate logical ID to physical hardware ID
 * @private
 * @param {number} logicalId - Logical ID used in code/UI
 * @returns {number} Physical hardware ID based on actual wiring
 */
function _translateToHardwareId(logicalId) {
  const hardwareId = HARDWARE_ID_MAP[logicalId];

  if (hardwareId === undefined) {
    console.warn(`[HAL] No hardware mapping for logical ID ${logicalId}, using as-is`);
    return logicalId;
  }

  // Log mapping only when IDs differ (to show remapping in action)
  if (CONFIG.enableLogging && hardwareId !== logicalId) {
    console.log(`[HAL] ID Translation: Logical ${logicalId} → Hardware ${hardwareId}`);
  }

  return hardwareId;
}

/**
 * Send output command to simulation (WebSocket)
 * Uses LOGICAL IDs - no translation needed
 * @private
 */
function _sendToSimulation(outputId, colorCode, state) {
  const colorValue = _getColorValue(outputId, colorCode);

  emitter.emit('ledControl', {
    elementId: outputId,  // Uses logical ID for UI display
    colorCode: colorCode,
    colorValue: colorValue,
    timestamp: Date.now()
  });
}

/**
 * Send output command to hardware (Serial)
 * Translates logical ID to physical hardware ID
 * @private
 */
function _sendToHardware(logicalId, state, colorChar) {
  // Translate logical ID to physical hardware ID
  const hardwareId = _translateToHardwareId(logicalId);

  log(`Hardware: Logical ${logicalId} → Hardware ${hardwareId}, state ${state}, color ${colorChar}`);

  // Send to Arduino using the PHYSICAL hardware ID
  arduino.set_output(hardwareId, state, colorChar);
}

/**
 * Get color value for simulation display
 * @private
 */
function _getColorValue(elementId, colorCode) {
  // Element-specific color for control buttons
  if (colorCode === '1') {
    if (elementId >= 14 && elementId <= 22) {
      return CONTROL_BUTTON_COLORS[elementId] || COLORS['g'];
    }
    // Default for other elements
    return COLORS['g'];
  }

  return COLORS[colorCode] || '#ffffff';
}

/**
 * Translate color code to single character for hardware protocol
 * @private
 */
function _translateColorCode(colorCode, elementId) {
  // If colorCode is '1' (element-specific), determine actual color
  if (colorCode === '1') {
    // For control buttons, map to their specific colors
    if (elementId >= 14 && elementId <= 22) {
      const elementColor = CONTROL_BUTTON_COLORS[elementId];
      // Map hex color back to color code
      if (elementColor === '#27ae60') return 'g'; // Green
      if (elementColor === '#f1c40f') return 'y'; // Yellow
      if (elementColor === '#3498db') return 'b'; // Blue
      if (elementColor === '#9b59b6') return 'p'; // Purple
      if (elementColor === '#e74c3c') return 'r'; // Red
      if (elementColor === '#e67e22') return 'r'; // Orange -> Red (closest)
    }
    // Default to green for other elements
    return 'g';
  }

  // Direct color code mapping
  if (colorCode === '0' || colorCode === 'o') return 'w'; // OFF uses white (irrelevant)
  if (['r', 'g', 'b', 'y', 'p', 'w', 'c'].includes(colorCode)) {
    return colorCode;
  }

  // Default fallback
  return 'w';
}

/**
 * Logging helper
 * @private
 */
function log(message) {
  if (CONFIG.enableLogging) {
    console.log(`[HAL] ${message}`);
  }
}

/**
 * Enable or disable logging
 */
function setLogging(enabled) {
  CONFIG.enableLogging = enabled;
}

/**
 * Clear hardware state cache
 * Use this when hardware state might be out of sync (e.g., after hardware reset)
 */
function clearStateCache() {
  Object.keys(hardwareStateCache).forEach(key => delete hardwareStateCache[key]);
  console.log('[HAL] Hardware state cache cleared');
}

/**
 * Get current cached state for debugging
 */
function getStateCache() {
  return { ...hardwareStateCache };
}

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
  // Event emitter for simulation
  emitter,

  // Configuration
  setMode,
  getMode,
  setLogging,

  // Primary API
  turnOnOutput,
  turnOffOutput,
  setOutput,
  setBarLED,
  flashOutput,

  // State management
  clearStateCache,
  getStateCache,

  // Legacy compatibility
  controlLED,
  controlOutput,
};
