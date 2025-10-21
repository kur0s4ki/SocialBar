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
  enableLogging: true
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
    log(`Mode set to: ${mode}`);
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
  log(`Turn ON output ${outputId} with color ${colorCode}`);

  const state = 1;

  // Send to simulation
  if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
    _sendToSimulation(outputId, colorCode, state);
  }

  // Send to hardware
  if (CONFIG.mode === 'hardware' || CONFIG.mode === 'both') {
    const hardwareColor = _translateColorCode(colorCode, outputId);
    _sendToHardware(outputId, state, hardwareColor);
  }
}

/**
 * Turn off an output
 * @param {number} outputId - Output identifier (1-22)
 */
function turnOffOutput(outputId) {
  log(`Turn OFF output ${outputId}`);

  const state = 0;

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
 * Send output command to simulation (WebSocket)
 * @private
 */
function _sendToSimulation(outputId, colorCode, state) {
  const colorValue = _getColorValue(outputId, colorCode);

  emitter.emit('ledControl', {
    elementId: outputId,
    colorCode: colorCode,
    colorValue: colorValue,
    timestamp: Date.now()
  });
}

/**
 * Send output command to hardware (Serial)
 * @private
 */
function _sendToHardware(outputId, state, colorChar) {
  log(`Hardware: Output ${outputId} → state ${state}, color ${colorChar}`);
  arduino.set_output(outputId, state, colorChar);
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

  // Legacy compatibility
  controlLED,
  controlOutput,
};
