# Round 3 Complete Redesign - Implementation Summary

## Overview
Complete overhaul of Round 3 with fixed button colors, new validation mechanics, and extended hardware support (buttons 14-28).

**Implementation Date:** 2025-01-XX
**Status:** ✅ Complete - Ready for Testing

---

## Changes Summary

### 1. Hardware Extension (strikeloop.js)

#### Extended Button Range
- **Before:** Buttons 14-22 (9 buttons)
- **After:** Buttons 14-28 (15 buttons)

#### New Constants Added
```javascript
// Button IDs 23-28 added to OUTPUT_IDS
CONTROL_BUTTON_10: 23
CONTROL_BUTTON_11: 24
CONTROL_BUTTON_12: 25
CONTROL_BUTTON_13: 26
CONTROL_BUTTON_14: 27
CONTROL_BUTTON_15: 28

// Updated range
CONTROL_BUTTONS_RANGE = { min: 14, max: 28 }
```

#### Fixed Button Color Mapping
```javascript
const BUTTON_COLORS = {
  14: 'y',  // Yellow
  15: 'g',  // Green
  16: 'b',  // Blue
  17: 'b',  // Blue
  18: 'd',  // White
  19: 'd',  // White
  20: 'y',  // Yellow
  21: 'g',  // Green
  22: 'g',  // Green
  23: 'y',  // Yellow
  24: 'b',  // Blue
  25: 'd',  // White
  26: 'g',  // Green
  27: 'b',  // Blue
  28: 'y'   // Yellow
};

const BUTTONS_BY_COLOR = {
  green: [15, 21, 22, 26],    // 4 green buttons
  blue: [16, 17, 24, 27],     // 4 blue buttons
  yellow: [14, 20, 23, 28],   // 4 yellow buttons
  white: [18, 19, 25]         // 3 white buttons
};
```

#### White Color Protocol
- **New Code:** `'d'` = White color ON state
- **Old Code:** `'o'` = OFF state (kept for backward compatibility)
- **Protocol:** `O01d` means "Output 1 with white color"

---

### 2. Round 3 Level Configurations (strikeloop.js)

All 10 levels completely redesigned with new arcade modes and button modes:

#### **Level 1: Introduction - Green + 4 Green Buttons**
```javascript
{
  round: 3, level: 1,
  mission: 'Touchez les cibles vertes puis appuyez sur les 4 boutons VERT!',
  arcadeMode: 'two-step-all-buttons-green',
  greenTargets: [1, 2, 3, 4],  // Fixed green circles
  buttonMode: 'all-green',      // All 4 green buttons must be pressed
  goalScore: 4400
}
```

#### **Level 2: Fixed Blue + 4 Blue Buttons**
```javascript
{
  arcadeMode: 'two-step-all-buttons-blue',
  blueTargets: [5, 6, 7, 8],   // Fixed blue circles
  buttonMode: 'all-blue',       // All 4 blue buttons
  goalScore: 4400
}
```

#### **Level 3: Alternating Green + 4 Green Buttons**
```javascript
{
  arcadeMode: 'two-step-alternating-all-buttons-green',
  alternatePattern: [[1, 3], [2, 4]],  // Alternating every 3s
  buttonMode: 'all-green',
  goalScore: 4800
}
```

#### **Level 4: Alternating Blue + 4 Blue Buttons**
```javascript
{
  arcadeMode: 'two-step-alternating-all-buttons-blue',
  alternatePattern: [[5, 7], [6, 8]],
  buttonMode: 'all-blue',
  goalScore: 4800
}
```

#### **Level 5: Sequence Reproduction - Green**
```javascript
{
  arcadeMode: 'two-step-sequence-green',
  buttonMode: 'sequence-green',  // 3 random buttons, reproduce sequence
  sequenceLength: 3,
  sequenceDisplayTime: 1000,  // 1s on
  sequenceOffTime: 1000,      // 1s off
  goalScore: 5200
}
```

#### **Level 6: Sequence Reproduction - Blue**
```javascript
{
  arcadeMode: 'two-step-sequence-blue',
  buttonMode: 'sequence-blue',
  sequenceLength: 3,
  goalScore: 5200
}
```

#### **Level 7: Random Green + 4 Green Buttons**
```javascript
{
  arcadeMode: 'two-step-random-all-buttons-green',
  randomTargetCount: 2,  // Random 2 of 4 green circles
  buttonMode: 'all-green',
  goalScore: 5600
}
```

#### **Level 8: Mixed Colors + 4 Blue Buttons**
```javascript
{
  arcadeMode: 'two-step-mixed-all-buttons-blue',
  alternatePattern: [[1, 3, 5, 7], [2, 4, 6, 8]],  // Mixed colors
  buttonMode: 'all-blue',
  goalScore: 5800
}
```

#### **Level 9: Color Rotation (1-4) + All Buttons Match**
```javascript
{
  arcadeMode: 'two-step-color-rotation-1-4',
  circleTargets: [1, 2, 3, 4],
  rotationSequence: ['b', 'y', 'g', 'd'],  // Blue, Yellow, Green, White
  rotationDelay: 2000,  // 2 seconds per color
  buttonMode: 'all-colors-match',  // All buttons lit, press matching color
  goalScore: 6000
}
```

#### **Level 10: Color Rotation (5-8) + Random One Per Color**
```javascript
{
  arcadeMode: 'two-step-color-rotation-5-8',
  circleTargets: [5, 6, 7, 8],
  rotationSequence: ['b', 'y', 'g', 'd'],
  buttonMode: 'random-one-per-color',  // 1 random button of each color
  goalScore: 6200
}
```

---

### 3. New Activation Functions (strikeloop.js)

10 new activation functions created:
- `activateModeTwoStepAllButtonsGreen()` - Level 1
- `activateModeTwoStepAllButtonsBlue()` - Level 2
- `activateModeTwoStepAlternatingAllButtonsGreen()` - Level 3
- `activateModeTwoStepAlternatingAllButtonsBlue()` - Level 4
- `activateModeTwoStepSequenceGreen()` - Level 5
- `activateModeTwoStepSequenceBlue()` - Level 6
- `activateModeTwoStepRandomAllButtonsGreen()` - Level 7
- `activateModeTwoStepMixedAllButtonsBlue()` - Level 8
- `activateModeTwoStepColorRotation1To4()` - Level 9
- `activateModeTwoStepColorRotation5To8()` - Level 10

---

### 4. New Validation Logic (strikeloop.js)

#### New State Variables
```javascript
// Multi-button validation state (Levels 1-4, 7-8)
let buttonsToValidate = [];   // Array of button IDs that need to be pressed
let buttonsValidated = [];    // Array of button IDs that have been pressed

// Sequence validation state (Levels 5-6)
let sequenceToMatch = [];           // The sequence player must reproduce
let sequenceDisplaying = false;     // Whether we're showing the sequence
let sequencePlayerInput = [];       // Player's input so far
let sequenceValidationActive = false;  // Whether player is entering sequence

// Color rotation state (Levels 9-10)
let colorRotationInterval = null;
let currentRotationIndex = 0;
```

#### Redesigned Functions

**`handleTwoStepValidation(hitColor)`** - Completely rewritten
- Handles 6 different button modes:
  - `all-green` / `all-blue`: Light all 4 colored buttons
  - `sequence-green` / `sequence-blue`: Generate and display 3-button sequence
  - `all-colors-match`: All buttons already lit, wait for color match
  - `random-one-per-color`: Light 1 random button of each color

**`validateButtonPress(buttonIndex)`** - Completely rewritten
- Routes to appropriate validator based on mode:
  - `validateSequenceButtonPress()` - For Levels 5-6
  - `validateMultiButtonPress()` - For Levels 1-4, 7-8
  - `validateColorMatchButtonPress()` - For Levels 9-10

**Helper Functions Added:**
- `startSequenceValidation(colorName)` - Initialize sequence mode
- `displayButtonSequence(sequence, colorName)` - Show sequence (1s on, 1s off)
- `lightOneRandomButtonPerColor()` - For Level 10
- `resetValidationState()` - Clear all validation state
- `turnOnAllButtonsOfColor(colorName)` - Helper for lighting buttons

---

### 5. Frontend Updates

#### Staff App (staff/src/App.js)
**Changes:**
1. Button rendering updated from 9 to 15 buttons:
```jsx
{[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map(buttonId => (
  <div
    key={buttonId}
    className={`control-button ${getButtonPulseClass(buttonId)}`}
    style={{opacity: getButtonOpacity(buttonId), backgroundColor: getCircleColor(buttonId)}}
    onClick={() => handleCircleClick(buttonId)}
    title={getElementTooltip(buttonId)}
  ></div>
))}
```

2. Functions updated:
   - `getElementTooltip()` - Now handles 14-28
   - `getButtonOpacity()` - Now handles 14-28
   - `getCircleColor()` - Now handles 14-28

#### Staff App CSS (staff/src/App.css)
**Changes:**
1. Grid layout updated for 15 buttons:
```css
.control-buttons {
  grid-template-columns: repeat(3, 1fr);  /* 3 columns */
  gap: 20px;                               /* Reduced gap */
  max-height: 500px;                       /* Increased for 5 rows */
}

.control-button {
  width: 70px;   /* Reduced from 80px */
  height: 70px;
}
```

Layout: 3 columns × 5 rows = 15 buttons

#### Game App
No changes needed (display-only, no button controls)

---

## Testing Checklist

### Level-by-Level Testing

#### ✅ Level 1: Fixed Green + All 4 Green Buttons
- [ ] All 4 green circles (1-4) stay lit
- [ ] Red traps (5-8) blink
- [ ] Bonus circles (9-13) are yellow
- [ ] Hit green circle → All 4 green buttons (15, 21, 22, 26) light up
- [ ] Press all 4 buttons (any order) → Each turns off when pressed
- [ ] After all 4 pressed → +100 points awarded
- [ ] Goal: 4400 points

#### ✅ Level 2: Fixed Blue + All 4 Blue Buttons
- [ ] All 4 blue circles (5-8) stay lit
- [ ] Red traps (1-4) blink
- [ ] Hit blue circle → All 4 blue buttons (16, 17, 24, 27) light up
- [ ] Press all 4 buttons → +100 points
- [ ] Goal: 4400 points

#### ✅ Level 3: Alternating Green + All 4 Green Buttons
- [ ] Green circles alternate: (1,3) ↔ (2,4) every 3 seconds
- [ ] Hit green circle → All 4 green buttons light up
- [ ] Press all 4 buttons → +100 points
- [ ] Goal: 4800 points

#### ✅ Level 4: Alternating Blue + All 4 Blue Buttons
- [ ] Blue circles alternate: (5,7) ↔ (6,8) every 3 seconds
- [ ] Hit blue circle → All 4 blue buttons light up
- [ ] Press all 4 buttons → +100 points
- [ ] Goal: 4800 points

#### ✅ Level 5: Sequence Reproduction - Green
- [ ] All 4 green circles (1-4) stay lit
- [ ] Hit green circle → System shows sequence of 3 buttons (1s on, 1s off each)
- [ ] After sequence shown → Player must reproduce exact order
- [ ] Correct sequence → +100 points
- [ ] Wrong button → Reset, must hit circle again
- [ ] Goal: 5200 points

#### ✅ Level 6: Sequence Reproduction - Blue
- [ ] All 4 blue circles (5-8) stay lit
- [ ] Hit blue circle → System shows 3-button sequence
- [ ] Player reproduces sequence → +100 points
- [ ] Wrong button → Reset
- [ ] Goal: 5200 points

#### ✅ Level 7: Random Green + All 4 Green Buttons
- [ ] Random 2 of 4 green circles lit (changes every 4s)
- [ ] Hit green circle → All 4 green buttons light up
- [ ] Press all 4 buttons → +100 points
- [ ] Goal: 5600 points

#### ✅ Level 8: Mixed Colors + All 4 Blue Buttons
- [ ] Green and blue circles alternate together
- [ ] Pattern: (1,3,5,7) ↔ (2,4,6,8) every 3s
- [ ] Hit any circle → All 4 blue buttons light up
- [ ] Press all 4 buttons → +100 points
- [ ] Goal: 5800 points

#### ✅ Level 9: Color Rotation (1-4) + All Buttons Match
- [ ] Circles 1→2→3→4→1 rotate colors every 2s
- [ ] Color sequence: Blue → Yellow → Green → White
- [ ] ALL buttons (14-28) stay lit with their fixed colors
- [ ] Hit circle (e.g., yellow circle 2) → Press ANY yellow button → +100 points
- [ ] Wrong color → No points
- [ ] Goal: 6000 points

#### ✅ Level 10: Color Rotation (5-8) + Random One Per Color
- [ ] Circles 5→6→7→8→5 rotate colors every 2s
- [ ] Color sequence: Blue → Yellow → Green → White
- [ ] Hit circle → System lights 1 random button of each color (4 buttons total)
- [ ] Press button matching hit circle color → +100 points
- [ ] New random buttons light up for next hit
- [ ] Goal: 6200 points

### General Testing
- [ ] Bonus circles (9-13) work correctly (+50 points, no validation)
- [ ] Red trap penalties (-100 points) work
- [ ] 30-second timer per level
- [ ] Score carries between levels
- [ ] White buttons display correctly
- [ ] All 15 buttons visible in staff app
- [ ] Button press feedback works
- [ ] Validation timeout (3s) works correctly

---

## File Changes Summary

### Backend Files Modified
1. **strikeloop.js** (Main game logic)
   - Lines ~11-42: OUTPUT_IDS extended
   - Lines ~47: CONTROL_BUTTONS_RANGE updated
   - Lines ~545-598: COLORS and button mapping added
   - Lines ~345-511: All 10 Round 3 levels replaced
   - Lines ~2212-2233: New state variables added
   - Lines ~2484-2653: Validation handler rewritten
   - Lines ~2655-2801: Button validation rewritten
   - Lines ~2954-3334: New activation functions added
   - Lines ~3811-3820: Mode list updated
   - Lines ~3879-3889: Switch cases updated
   - Lines ~4534-4572: Cleanup updated

### Frontend Files Modified
2. **staff/src/App.js** (Staff interface)
   - Lines ~167-179: getCircleColor() updated for 14-28
   - Lines ~201-208: getButtonOpacity() updated for 14-28
   - Lines ~210-219: getElementTooltip() updated for 14-28
   - Lines ~276-289: Button rendering changed to loop

3. **staff/src/App.css** (Staff styles)
   - Lines ~390-398: Grid layout updated for 15 buttons
   - Lines ~400-414: Button size reduced to 70px

### Files Created
4. **ROUND3-IMPLEMENTATION-SUMMARY.md** (This file)

---

## Hardware Protocol Changes

### New White Color Command
- **Command Format:** `O[ID][COLOR]`
- **White ON:** `O01d` = Turn on output 1 with white color
- **White OFF:** `O01o` = Turn off output 1
- **Example:** `O18d` = Turn on button 18 (white button) with white color

### Button ID to Color Mapping (Hardware)
```
14 → Yellow    21 → Green    28 → Yellow
15 → Green     22 → Green
16 → Blue      23 → Yellow
17 → Blue      24 → Blue
18 → White     25 → White
19 → White     26 → Green
20 → Yellow    27 → Blue
```

---

## Known Issues / Notes

1. **White buttons:** Only 3 white buttons available (18, 19, 25) vs 4 for other colors
2. **Old functions:** Previous Round 3 functions still in code but unused (can be removed later for cleanup)
3. **Blue buttons:** 5 blue buttons in hardware (16, 17, 24, 27 + one more), but using only 4
4. **Testing:** Requires physical hardware testing with Arduino

---

## Next Steps

1. **Test with Simulator:**
   - Start the backend: `node app.js`
   - Open staff app: `http://localhost:3051`
   - Test each level systematically

2. **Test with Hardware:**
   - Connect Arduino
   - Test button lights (verify colors match hardware)
   - Test all 15 buttons respond correctly
   - Test white color protocol works

3. **Adjustments (if needed):**
   - Timing tweaks (sequence display, rotation delays)
   - Score balancing
   - Visual feedback improvements

---

## Implementation Complete! ✅

All Round 3 levels have been completely redesigned and implemented. The system is ready for testing.
