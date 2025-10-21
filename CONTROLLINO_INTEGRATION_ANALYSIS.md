# Controllino Integration Analysis

## Executive Summary

This document provides a comprehensive analysis of what needs to be modified to integrate the physical Controllino device alongside the existing simulation interface in the SocialBar game system.

## Current Architecture Overview

### 1. Simulation Mode (Current Implementation)

#### Output Flow (Game → UI Display)
```
strikeloop.js: controlLED(elementId, colorCode)
    ↓ emits 'ledControl' event
app.js: listens for 'ledControl'
    ↓ broadcasts via WebSocket
Staff React App: receives and displays colored UI elements
```

**Example:**
- `controlLED(8, '1')` → Staff UI circle #8 changes color to show it's active

#### Input Flow (UI Click → Game)
```
Staff React App: user clicks circle/button
    ↓ sends WebSocket message {type: 'circleClick', circleId: 8}
app.js: receives WebSocket message
    ↓ emits 'circleClick' event
strikeloop.js: processes via processGameInput(8, 'simulator')
```

**Example:**
- User clicks circle #8 in UI → Game processes input from circle 8

### 2. Hardware Mode (Partially Implemented)

#### Output Flow (Currently Direct)
```
strikeloop.js: controlOutput(outputNum, value)
    ↓ direct call
arduino.js: set_output(outputNum, value)
    ↓ writes to serial port
Controllino Device: receives command 'O08{0|1}'
    ↓ physical LED turns on/off
```

**Current Issue:** `controlOutput()` is called directly in some places, bypassing the abstraction layer needed for dual-mode operation.

#### Input Flow (Currently Implemented)
```
Controllino Device: physical button pressed
    ↓ sends serial data 'I{message}{value}'
arduino.js: receives serial data, emits 'EventInput'
    ↓ forwards event
app.js: listens for arduino 'EventInput'
    ↓ re-emits to strikeloop
strikeloop.js: processes via processGameInput(message, 'arduino')
```

**Status:** ✓ Input flow from Controllino already works correctly

## Problem Statement

The system currently has **TWO SEPARATE CODE PATHS** for outputs:

1. **Visual Outputs (Simulation):** `controlLED()` → WebSocket → Staff UI
2. **Physical Outputs (Controllino):** `controlOutput()` → Serial → Hardware

**Missing:** A unified abstraction layer that can:
- Send outputs to BOTH simulation AND hardware simultaneously, OR
- Switch between modes based on configuration
- Maintain consistent behavior regardless of mode

## Detailed Analysis

### Current Code Locations

#### strikeloop.js (Game Logic)

**Line 1434-1437:** Physical output control
```javascript
function controlOutput(outputNum, value) {
  console.log('[STRIKELOOP] Setting output', outputNum, 'to', value);
  arduino.set_output(outputNum, value);
}
```

**Line 1440-1460:** Visual LED control for simulation
```javascript
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
```

#### arduino.js (Hardware Interface)

**Line 262-267:** Physical output implementation
```javascript
function set_output(num, val) {
  var n = num.toString();
  var v = val.toString();
  if (n.length == 1) n = '0' + n;
  sendCmd1(`O` + n + v);
}
```

**Protocol:** `O{NN}{V}` where NN is 2-digit output number, V is 0 or 1
- Example: `O081` = Turn output 8 ON
- Example: `O080` = Turn output 8 OFF

**Line 147-156:** Input event handling (already working)
```javascript
arduino.emitter.on('EventInput', (message, value) => {
  // message: input identifier (e.g., "08")
  // value: integer value from input
  strikeLoop.emitter.emit('EventInput', message, value);
});
```

### Input Handling (Already Unified)

**Good News:** Input handling is already properly abstracted!

**strikeloop.js Lines 624-648:**
```javascript
// Arduino hardware input
emitter.on('EventInput', (message, value) => {
  if (isRunning) {
    processGameInput(message, 'arduino');
  }
});

// Simulation UI input
emitter.on('circleClick', (data) => {
  if (isRunning) {
    processGameInput(data.circleId, 'simulator');
  }
});
```

Both inputs feed into the same `processGameInput()` function, which handles game logic uniformly.

## Proposed Solution: Hardware Abstraction Layer (HAL)

### Architecture Design

Create a **Hardware Abstraction Layer** that provides a unified interface for all I/O operations.

```
┌─────────────────────────────────────────────────────────┐
│                    Game Logic                           │
│                  (strikeloop.js)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│          Hardware Abstraction Layer (HAL)               │
│                  (hardwareAbstraction.js)               │
│                                                          │
│  turnOnOutput(id)    turnOffOutput(id)                  │
│  setOutputColor(id, color)                              │
│  setBarLED(value)                                       │
└────────────┬─────────────────────┬──────────────────────┘
             │                     │
             ↓                     ↓
┌──────────────────────┐  ┌──────────────────────┐
│  Simulation Backend  │  │  Hardware Backend    │
│  (WebSocket)         │  │  (arduino.js)        │
│                      │  │                      │
│  → Staff UI Display  │  │  → Serial Port       │
│  → LED visual        │  │  → Controllino       │
│     feedback         │  │  → Physical LEDs     │
└──────────────────────┘  └──────────────────────┘
```

### Implementation Requirements

#### 1. Create New Module: `hardwareAbstraction.js`

**Purpose:** Provide unified API for all hardware/simulation I/O

**Key Functions:**
```javascript
// Configuration
function setMode(mode) // 'simulation', 'hardware', or 'both'
function getMode()

// Output Control
function turnOnOutput(outputId, color = null)
function turnOffOutput(outputId)
function setOutput(outputId, state, color = null)
function setBarLED(percentage)
function flashOutput(outputId, color, duration)

// Internal routing
function _sendToSimulation(outputId, state, color)
function _sendToHardware(outputId, state)
```

**Configuration Options:**
```javascript
const CONFIG = {
  mode: 'simulation',  // 'simulation' | 'hardware' | 'both'
  enableSimulation: true,
  enableHardware: false,
  outputMapping: {
    // Map logical outputs to physical outputs if needed
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8,
    9: 9, 10: 10, 11: 11, 12: 12, 13: 13,
    14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19,
    20: 20, 21: 21, 22: 22
  }
};
```

#### 2. Modify `strikeloop.js`

**Replace:**
```javascript
// OLD - Direct calls
controlOutput(8, 1);
controlLED(8, '1');

// NEW - Unified calls
HAL.turnOnOutput(8, 'green');
HAL.turnOffOutput(8);
```

**Search and Replace Required:**
- Find all calls to `controlLED(id, colorCode)`
- Find all calls to `controlOutput(id, value)`
- Replace with appropriate HAL calls

#### 3. No Changes Needed in `arduino.js`

The arduino.js module is already well-designed and can be used as-is by the HAL.

#### 4. Modify `app.js` (Optional Enhancement)

Currently, app.js forwards arduino events to strikeloop. This can remain the same, but could be enhanced to route through HAL for consistency.

### Output Mapping Strategy

#### Color Code Translation

**Current Simulation Codes:**
- `'o'` or `'0'` = OFF (white/dim)
- `'1'` = ON (element-specific color)
- `'r'` = Red
- `'g'` = Green
- `'b'` = Blue
- `'y'` = Yellow
- etc.

**Hardware Behavior:**
- Controllino outputs are typically ON/OFF (binary)
- For RGB LEDs on hardware, may need PWM or multiple outputs per LED
- Current protocol: `O{NN}{0|1}` - simple binary control

**Translation Logic:**
```javascript
// HAL translates color codes to hardware states
function translateColorToHardwareState(colorCode) {
  if (colorCode === 'o' || colorCode === '0') {
    return 0; // OFF
  }
  return 1; // ON (any color = ON)
}
```

**Note:** If hardware has RGB LEDs requiring multiple outputs, additional logic needed:
```javascript
// Example for RGB LED on outputs 8, 9, 10 (R, G, B)
function setRGBOutput(ledId, color) {
  if (ledId === 8) {
    const rgb = parseColor(color);
    arduino.set_output(8, rgb.r > 0 ? 1 : 0);
    arduino.set_output(9, rgb.g > 0 ? 1 : 0);
    arduino.set_output(10, rgb.b > 0 ? 1 : 0);
  }
}
```

## Implementation Plan

### Phase 1: Create HAL Module
1. Create `hardwareAbstraction.js`
2. Implement configuration system
3. Implement output functions with routing logic
4. Add logging for debugging

### Phase 2: Refactor strikeloop.js
1. Import HAL module
2. Search for all `controlLED()` calls
3. Search for all `controlOutput()` calls
4. Replace with unified HAL calls
5. Test in simulation mode

### Phase 3: Hardware Integration
1. Set HAL mode to 'hardware' or 'both'
2. Test physical outputs with Controllino
3. Verify input handling still works
4. Calibrate output timing if needed

### Phase 4: Configuration & Testing
1. Add configuration file or environment variables
2. Create mode switching mechanism (e.g., command line arg)
3. Test all three modes: simulation, hardware, both
4. Document hardware setup requirements

## Code Examples

### Example HAL Implementation

```javascript
// hardwareAbstraction.js
const events = require('events');
const arduino = require('./arduino.js');

const emitter = new events.EventEmitter();

// Configuration
const CONFIG = {
  mode: process.env.HARDWARE_MODE || 'simulation', // simulation | hardware | both
};

function setMode(mode) {
  CONFIG.mode = mode;
  console.log(`[HAL] Mode set to: ${mode}`);
}

// Unified output control
function turnOnOutput(outputId, colorCode = '1') {
  const state = 1;

  if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
    _sendToSimulation(outputId, colorCode);
  }

  if (CONFIG.mode === 'hardware' || CONFIG.mode === 'both') {
    _sendToHardware(outputId, state);
  }
}

function turnOffOutput(outputId) {
  const state = 0;

  if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
    _sendToSimulation(outputId, 'o'); // 'o' = off
  }

  if (CONFIG.mode === 'hardware' || CONFIG.mode === 'both') {
    _sendToHardware(outputId, state);
  }
}

// Private: Send to simulation (WebSocket)
function _sendToSimulation(outputId, colorCode) {
  const colorValue = _getColorValue(outputId, colorCode);

  emitter.emit('ledControl', {
    elementId: outputId,
    colorCode: colorCode,
    colorValue: colorValue,
    timestamp: Date.now()
  });
}

// Private: Send to hardware (Serial)
function _sendToHardware(outputId, state) {
  console.log(`[HAL] Hardware output ${outputId} → ${state}`);
  arduino.set_output(outputId, state);
}

// Helper: Get color value for simulation
function _getColorValue(elementId, colorCode) {
  const COLORS = {
    'o': '#ffffff',
    'r': '#e74c3c',
    'g': '#27ae60',
    'b': '#3498db',
    'y': '#f1c40f',
    'p': '#9b59b6',
    'w': '#ecf0f1',
  };

  if (colorCode === '1') {
    // Element-specific color (would need mapping)
    return COLORS['g']; // Default green
  }

  return COLORS[colorCode] || '#ffffff';
}

// Bar LED control
function setBarLED(percentage) {
  if (CONFIG.mode === 'hardware' || CONFIG.mode === 'both') {
    arduino.setBarled(percentage);
  }

  // Could also emit event for simulation if needed
  if (CONFIG.mode === 'simulation' || CONFIG.mode === 'both') {
    emitter.emit('barLED', { percentage });
  }
}

module.exports = {
  emitter,
  setMode,
  turnOnOutput,
  turnOffOutput,
  setBarLED,
};
```

### Example Usage in strikeloop.js

```javascript
// At top of file
const HAL = require('./hardwareAbstraction.js');

// In app.js, forward HAL events
HAL.emitter.on('ledControl', (data) => {
  broadcastToStaff({
    type: 'ledControl',
    ...data
  });
});

// Instead of:
controlLED(8, 'g');
controlOutput(8, 1);

// Use:
HAL.turnOnOutput(8, 'g'); // Works for both simulation and hardware!

// Turn off:
HAL.turnOffOutput(8);
```

## Environment Configuration

### Option 1: Environment Variable
```bash
# In .env file or system environment
HARDWARE_MODE=simulation  # or 'hardware' or 'both'
```

### Option 2: Command Line Argument
```bash
# Start in simulation mode (default)
node app.js

# Start in hardware mode
node app.js --hardware

# Start in both modes
node app.js --mode=both
```

### Option 3: Configuration File
```json
// config.json
{
  "hardwareMode": "simulation",
  "enableLogging": true,
  "outputMapping": {
    "1": 1,
    "2": 2
  }
}
```

## Testing Strategy

### 1. Simulation Mode Testing
- [ ] All LED controls display correctly in UI
- [ ] Colors match expected values
- [ ] UI clicks trigger correct game responses
- [ ] No serial port errors

### 2. Hardware Mode Testing
- [ ] Physical outputs respond to game events
- [ ] Timing is appropriate (no lag)
- [ ] Physical button presses register correctly
- [ ] Serial communication is stable

### 3. Both Mode Testing
- [ ] Outputs appear on BOTH simulation and hardware
- [ ] Synchronization is maintained
- [ ] Performance is acceptable
- [ ] No race conditions or conflicts

## Migration Checklist

- [ ] Create `hardwareAbstraction.js` module
- [ ] Add HAL event listeners in `app.js`
- [ ] Find and list all `controlLED()` calls in strikeloop.js
- [ ] Find and list all `controlOutput()` calls in strikeloop.js
- [ ] Replace LED/output calls with HAL calls
- [ ] Add mode configuration system
- [ ] Test simulation mode (should work exactly as before)
- [ ] Connect Controllino device
- [ ] Test hardware mode
- [ ] Test both mode
- [ ] Document hardware setup procedure
- [ ] Update architecture.md

## Benefits of This Approach

1. **Single Code Path:** Game logic doesn't need to know about simulation vs hardware
2. **Easy Switching:** Change mode with one configuration setting
3. **Debugging:** Run both modes simultaneously to compare behavior
4. **Future-Proof:** Easy to add new output types (e.g., network-based LEDs)
5. **Backward Compatible:** Simulation mode works exactly as before
6. **Testable:** Can test game logic without hardware connected

## Risks & Considerations

1. **Performance:** Sending to both simulation and hardware may add latency
   - *Mitigation:* Profile and optimize if needed

2. **Synchronization:** Outputs might not be perfectly synchronized
   - *Mitigation:* Add timing logs to measure and adjust

3. **Output Mapping:** Physical outputs might not map 1:1 with logical outputs
   - *Mitigation:* Use configurable mapping table

4. **Color Support:** Hardware might not support colors like simulation
   - *Mitigation:* Simple binary (ON/OFF) mapping for hardware

## Next Steps

1. Review this analysis
2. Decide on preferred configuration method
3. Determine if RGB LED support needed on hardware
4. Create output mapping specification (logical ID → physical output)
5. Begin Phase 1 implementation

## Questions to Resolve

1. Should the system support running BOTH modes simultaneously, or just one at a time?
   - **Recommendation:** Support all three for flexibility

2. Do physical LEDs need color support, or just ON/OFF?
   - **Action Required:** Check Controllino output capabilities

3. Should there be a UI control to switch modes at runtime?
   - **Recommendation:** Start with config file, add UI later if needed

4. How should output IDs map to physical Controllino outputs?
   - **Action Required:** Document physical wiring/output assignment

## Conclusion

The integration requires creating a Hardware Abstraction Layer (HAL) that sits between the game logic and the physical/simulated outputs. The input side is already well-designed and working. The main work is:

1. Create HAL module (estimated: 2-4 hours)
2. Refactor strikeloop.js output calls (estimated: 2-3 hours)
3. Testing and calibration (estimated: 2-4 hours)

**Total Estimated Effort:** 6-11 hours

The good news is that the architecture is well-structured, and the changes are mostly additive rather than requiring major refactoring.
