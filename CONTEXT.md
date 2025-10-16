# SocialBar Game - Round 3 Implementation Context

**Last Updated**: October 16, 2025  
**Session Summary**: Round 3 Two-Step Validation System Implementation

---

## 📋 Overview

This document provides a comprehensive summary of the recent work on the SocialBar arcade game, focusing on the implementation of Round 3's two-step validation system. This system introduces a new gameplay mechanic where players must hit targets and then validate with button presses to score points.

---

## 🔄 Recent Commits (Last 4)

### 1. **feat: update game rounds to proper round numbering and fix LED interval clearing** (017431d)
- **Date**: Oct 16, 2025
- **Changes**:
  - Updated round numbering from `round: 1` to `round: 3` for all 10 two-step validation levels
  - Fixed crash caused by intervals from previous levels not being cleared
  - Added comprehensive interval cleanup in `activateArcadeLEDs()` function
  - Clears `alternateInterval`, `randomTargetInterval`, and `buttonRotationInterval` before each new level
  - Fixed button state management for rotating and fixed modes
- **Files Modified**: `strikeLoop.js` (51 insertions, 26 deletions)

### 2. **round3- lvls 1 to 4** (ea12616)
- **Date**: Oct 16, 2025
- **Changes**:
  - Implemented UI fixes for button display and color management
  - Updated button validation logic to check color matching (not just if lit)
  - Changed button display to show white when off (removed hardcoded colors)
  - Added button rotation system for levels 5-6 (buttons change positions every 5 seconds)
  - Created `setAllButtonsRandomColors()` function with adjacency constraint (no two adjacent buttons same color)
  - Fixed LED refresh spam by adding two-step modes to `noRefreshModes` list
- **Files Modified**: 
  - `staff/src/App.js` (184 insertions, 70 deletions)
  - `strikeLoop.js` (significant refactoring)

### 3. **feat: ongoing round 3** (fd94bb6)
- **Date**: Oct 16, 2025
- **Changes**:
  - Initial implementation of Round 3 two-step validation system
  - Created 10 levels with progressive difficulty
  - Implemented core two-step validation logic (`handleTwoStepValidation()`, `validateButtonPress()`)
  - Added button control functions (`clearAllButtons()`, `setButtonColors()`, `lightRandomButton()`)
  - Created mode-specific activation functions for all 10 levels
  - Added two-step processing in arcade validation flow
  - Integrated with existing scoring and LED control systems
- **Files Modified**: 
  - `strikeLoop.js` (1128 insertions, 68 deletions)
  - Created `round3-implementation-spec.md` (205 lines)
  - Created `round3-spec-analysis.md` (183 lines)

### 4. **feat: improve memory sequence mode gameplay** (209af4e)
- **Date**: Oct 16, 2025
- **Changes**:
  - Fixed critical bugs in Round 2 memory sequence levels (7-10)
  - Fixed duplicate values in sequences using `splice()` method
  - Fixed bonus holes validation (changed from `isBonus` flag to `colorCode === 'y'`)
  - Fixed NaN scoring with fallback penalty values (`|| -100`)
  - Prevented multiple sequence generation per level
  - Added proper `penaltyRed` configuration to game rounds
- **Files Modified**: `strikeLoop.js` (29 insertions, 17 deletions)

---

## 🎮 Round 3 System Architecture

### Core Concept
Two-step validation mechanism:
1. **Hit** a colored target (green/blue circle)
2. **Press** a matching colored button within 3 seconds to score

**No validation = No points**

### Hardware Layout
```
Circles 1-4:   Green targets (Grands)
Circles 5-8:   Blue targets (Moyens)
Circles 9-13:  Bonus zone (Yellow, always safe)
Buttons 14-22: Control buttons (9 buttons, 3x3 grid layout)
```

### Button Grid Layout
```
14  15  16
17  18  19
20  21  22
```

### Level Progression (10 Levels)

| Level | Pattern Type | Button Mode | Key Feature | Goal |
|-------|-------------|-------------|-------------|------|
| 1 | Fixed Green (1-4) | Fixed Green | Introduction | 4400 |
| 2 | Fixed Blue (5-8) | Fixed Blue | Blue variant | 4600 |
| 3 | Alternating Green | Fixed Green | Moving pattern | 4800 |
| 4 | Alternating Blue | Fixed Blue | Moving blue | 5000 |
| 5 | Fixed Green | **Rotating Green** | Buttons change positions (5s) | 5200 |
| 6 | Fixed Blue | **Rotating Blue** | Buttons change positions (5s) | 5400 |
| 7 | Random Green (2/4) | Random Green | Random targets | 5600 |
| 8 | Mixed Green+Blue | Color Matched | Color matching | 5800 |
| 9 | Rotating Green | Any Color | Single rotating target | 6000 |
| 10 | Ultimate Chaos | Random All | Fast rotation + bursts | 6200 |

---

## 🔧 Key Implementation Details

### State Variables (strikeLoop.js)
```javascript
let validationPending = false;           // Is a validation in progress?
let validationHitColor = null;           // Color of target hit ('g' or 'b')
let validationTimeout = null;            // 3-second timeout timer
let activeButtonColors = [];             // Current button color array (9 elements)
let alternatePatternIndex = 0;           // For alternating patterns
let alternateInterval = null;            // Pattern switching timer
let randomTargetInterval = null;         // Random target change timer
let buttonRotationInterval = null;       // Button position rotation timer (levels 5-6)
```

### Core Functions

#### Button Display System
- **`setAllButtonsRandomColors()`**: Lights all 9 buttons with exactly 3 green, 3 blue, 3 yellow
  - Uses adjacency map to ensure no two adjacent buttons have the same color
  - Implements backtracking algorithm with fallback pattern
  - Called on level start and for rotation (levels 5-6)

#### Validation Flow
```javascript
// 1. Target Hit
handleTwoStepValidation(hitColor) 
  → validationPending = true
  → Start 3-second timeout
  → Buttons already lit (don't change in rotating modes)

// 2. Button Press
validateButtonPress(buttonIndex)
  → Check if button is lit
  → Check if button color matches hitColor
  → Award points if match
  → Return false if mismatch (no penalty, just no points)
```

#### Mode-Specific Activation Functions
Each level has a dedicated activation function:
- `activateModeTwoStepFixedGreen()`
- `activateModeTwoStepFixedBlue()`
- `activateModeTwoStepAlternatingGreen()`
- `activateModeTwoStepAlternatingBlue()`
- `activateModeTwoStepRandomButtonGreen()` ← Buttons rotate every 5s
- `activateModeTwoStepRandomButtonBlue()` ← Buttons rotate every 5s
- `activateModeTwoStepRandomGreen()`
- `activateModeTwoStepMixedColors()`
- `activateModeTwoStepRotatingGreen()`
- `activateModeTwoStepUltimate()`

### Button Color Validation Logic
```javascript
// In validateButtonPress()
const buttonColor = activeButtonColors[buttonIndex];

// Check 1: Is button lit?
if (buttonColor === 'o' || !buttonColor) {
  return false; // Button not lit
}

// Check 2: Does button color match target color?
if (buttonColor !== validationHitColor) {
  console.log(`❌ Wrong button color - expected ${validationHitColor}, got ${buttonColor}`);
  return false; // Wrong color
}

// Success! Award points
```

### Interval Management
**Critical**: All intervals must be cleared when starting a new level to prevent crashes.

```javascript
// In activateArcadeLEDs() - called at start of each level
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
```

### LED Refresh Exclusion
Two-step modes don't need LED refresh (they manage their own patterns):
```javascript
const noRefreshModes = [
  // ... other modes
  'two-step-fixed-green',
  'two-step-fixed-blue',
  'two-step-alternating-green',
  'two-step-alternating-blue',
  'two-step-random-button-green',
  'two-step-random-button-blue',
  'two-step-random-green',
  'two-step-mixed-colors',
  'two-step-rotating-green',
  'two-step-ultimate'
];
```

---

## 🎨 Frontend Changes (staff/src/App.js)

### Button Color Display
```javascript
const getCircleColor = (elementId) => {
  const ledState = ledStates[elementId];
  if (ledState && ledState.active) {
    return ledState.colorValue;
  }
  
  // For control buttons (14-22), return white when not active
  if (elementId >= 14 && elementId <= 22) {
    return '#ffffff'; // White when not lit
  }
  
  return '#ffffff'; // Default white for circles
};
```

### Button Rendering
All 9 buttons now use dynamic `backgroundColor`:
```jsx
<div
  className={`control-button ${getButtonPulseClass(14)}`}
  style={{opacity: getButtonOpacity(14), backgroundColor: getCircleColor(14)}}
  onClick={() => handleCircleClick(14)}
  title={getElementTooltip(14)}
></div>
```

**Removed**: Hardcoded color classes like `green-button`, `blue-button`, `yellow-button`

---

## 🐛 Critical Bugs Fixed

### 1. Button Validation Accepting Any Button
**Problem**: Validation was only checking if a button was lit, not if it had the correct color.

**Solution**: Added color matching check in `validateButtonPress()`:
```javascript
if (buttonColor !== validationHitColor) {
  console.log(`❌ Wrong button color - expected ${validationHitColor}, got ${buttonColor}`);
  return false;
}
```

### 2. Level 5 Crash (alternatePattern undefined)
**Problem**: Level 4's `alternateInterval` kept running when Level 5 started, trying to access non-existent `alternatePattern`.

**Solution**: Clear all intervals at the start of each level in `activateArcadeLEDs()`.

### 3. Round Number Display
**Problem**: Showed "Round 1 Level 5" when it should be "Round 3 Level 5".

**Solution**: Changed all level configs from `round: 1` to `round: 3` in the swapped round data.

### 4. LED Refresh Spam
**Problem**: Bonus section kept activating every 3 seconds, spamming logs.

**Solution**: Added all two-step modes to `noRefreshModes` list.

### 5. Memory Sequence Duplicates (Round 2)
**Problem**: Same value appeared multiple times in memory sequences.

**Solution**: Used `splice()` to remove selected values from available pool:
```javascript
const randomIndex = Math.floor(Math.random() * availableTargets.length);
sequence.push(availableTargets[randomIndex]);
availableTargets.splice(randomIndex, 1); // Remove to prevent duplicates
```

### 6. Bonus Holes Not Counting (Round 2)
**Problem**: Bonus validation checked `isBonus` flag instead of color code.

**Solution**: Changed to `if (colorCode === 'y')` check.

### 7. NaN Scoring (Round 2 Levels 9-10)
**Problem**: Undefined penalty values caused NaN in score calculations.

**Solution**: Added fallback values: `const penalty = activeMission.penaltyRed || -100;`

---

## 📊 Game Configuration

### Round Organization (Temporarily Swapped)
```
Current Order (for testing):
- Levels 0-9:   Round 3 (Two-Step Validation)
- Levels 10-19: Round 2 (Memory/Snake modes)
- Levels 20-29: Round 1 (Original modes)

Note: Round 3 is temporarily first for testing purposes.
Testing flag: TESTING_MODE_SWAP_ROUNDS = false
```

### Scoring System
- **Validated Hit**: +100 points
- **Bonus Circle**: +50 points
- **Red Trap**: -100 points
- **Wrong Button Press**: No penalty, no points
- **Validation Timeout**: No penalty, no points

### Timing
- **Level Duration**: 30 seconds per level
- **Validation Window**: 3 seconds to press button after hitting target
- **Button Rotation**: Every 5 seconds (levels 5-6)
- **Pattern Alternation**: Every 3 seconds (levels 3-4, 8)
- **Target Change**: Every 4 seconds (level 7), 2 seconds (levels 9-10)

---

## 🎯 Testing Status

### ✅ Tested & Working
- Button color validation (color matching)
- Button display (white when off, colored when lit)
- Fixed patterns (levels 1-2)
- Alternating patterns (levels 3-4)
- Round number display (shows Round 3)
- Interval cleanup (no more crashes)
- LED refresh exclusion
- Memory sequence fixes (Round 2)

### 🔄 Partially Tested
- Button rotation (levels 5-6) - implemented but needs full game testing
- Random target patterns (level 7)
- Mixed colors (level 8)
- Rotating single target (level 9)
- Ultimate chaos (level 10)

### ❓ Needs Testing
- Full 10-level progression
- Score accumulation across levels
- Bonus zone interactions during two-step validation
- Edge cases with validation timeouts
- Button rotation during active validation

---

## 🔍 Known Issues & Considerations

### None Currently
All reported issues have been fixed in the last 4 commits.

### Future Improvements (Not Implemented)
- Visual feedback animations for button validation
- Score popup on successful validation
- Sound effects for validation success/failure
- Countdown timer display for validation window
- Tutorial/practice mode for Round 3

---

## 📁 File Structure

```
SocialBar/
├── app.js                          # WebSocket server, event routing
├── strikeLoop.js                   # Main game logic (3700+ lines)
│   ├── Game state management
│   ├── Round/level configuration (gameRounds array)
│   ├── Two-step validation system (lines 1998-2700)
│   ├── Mode activation functions
│   ├── LED control functions
│   └── Scoring and validation logic
├── staff/
│   └── src/
│       └── App.js                  # React frontend, button UI
├── round3-implementation-spec.md   # Detailed level specifications
├── round3-spec-analysis.md         # Original analysis document
└── CONTEXT.md                      # This file

Key Functions in strikeLoop.js:
- handleTwoStepValidation()         # Lines ~2256-2298
- validateButtonPress()             # Lines ~2303-2337
- setAllButtonsRandomColors()       # Lines ~2151-2231
- activateModeTwoStep*()            # Lines ~2341-2710
- cleanupArcadeGame()               # Lines ~3617-3693
```

---

## 🚀 How to Run & Test

### Start the Application
```bash
node app.js
```

### Access Points
- **Staff Interface**: http://localhost:8080
- **Display Interface**: http://localhost:8081
- **WebSocket Ports**: 8080 (staff), 8081 (display)

### Testing Round 3
1. Start game with any team name
2. Round 3 levels 1-10 will play first (temporarily swapped)
3. Hit green/blue circles as instructed
4. Press matching colored buttons within 3 seconds
5. Watch for validation messages in console:
   - ✅ `VALIDATED! +100 points` - Success
   - ❌ `Wrong button color` - Wrong color pressed
   - `Validation timeout` - Didn't press in time

### Console Commands (Keyboard Listener)
```
Circle control:    [1-8][color] - e.g., "1g" = circle 1 green
Central circle:    9[color] - e.g., "9y" = circle 9 yellow
Button control:    [14-22] = turn on, [14-22]o = turn off
Colors:            g=green, b=blue, r=red, y=yellow, o=off
```

---

## 📝 Next Steps / TODO

### Immediate
- [ ] Complete full 10-level playthrough test
- [ ] Verify score accumulation works correctly
- [ ] Test button rotation during active validation state
- [ ] Verify bonus zone still awards points correctly

### Future Enhancements
- [ ] Add visual countdown timer for validation window
- [ ] Add sound effects for validation feedback
- [ ] Add animations for button state changes
- [ ] Consider difficulty adjustments based on playtesting
- [ ] Add tutorial overlay for first-time players

### Code Quality
- [ ] Add JSDoc comments to two-step validation functions
- [ ] Extract button adjacency logic into separate module
- [ ] Add unit tests for validation logic
- [ ] Refactor mode activation functions (reduce duplication)

---

## 🤝 Collaboration Notes

### For Next Session
1. **Round 3 is fully implemented** with all 10 levels
2. **All critical bugs are fixed** (validation, crashes, display)
3. **Button system is working** with proper color validation
4. **Testing is needed** for full progression
5. **Round numbering is correct** (shows Round 3)

### Key Takeaways
- Two-step validation requires careful state management
- Interval cleanup is critical to prevent crashes
- Button color matching is essential for gameplay
- All 9 buttons must always be lit (3g, 3b, 3y) for difficulty
- No adjacent buttons should have the same color

---

**End of Context Document**
