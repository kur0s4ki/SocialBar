# Round 3 Implementation Spec Analysis

## Overview
Round 3 introduces a **two-step validation mechanic** combining circle hits with button panel interactions. Players must first hit colored targets, then press corresponding buttons to score points.

## Core Game Mechanics

### 1. Circle/Hole Configuration
- **8 Main Circles** (zones):
  - **Grands (Large)**: Circles 1-4 (20cm)
  - **Moyens (Medium)**: Circles 5-8 (17cm)
  - **Petits (Small/Bonus)**: Circles 9-13 (12cm) - Central bonus zone

### 2. Two-Step Scoring System
1. **Step 1**: Hit the active colored circles (green or blue)
2. **Step 2**: Press the corresponding colored button(s) on the control panel to validate and earn points
   - Points are only awarded after successful button validation
   - Missing the button press = no points for the hit

### 3. Target Patterns
The active circles follow different movement patterns:

#### **ALTERNATIF (Alternating)** - Levels 1-4
- Active targets alternate between positions
- Example: If circles 1,3 are active, they switch to 2,4 and back

#### **FIXES (Fixed)** - Levels 5-6
- All 4 targets in the group stay constantly active
- Static pattern, no movement

#### **RANDOM** - Levels 7-8
- Random selection of which circles are active
- Pattern changes randomly during gameplay

#### **TOURNANT (Rotating)** - Levels 9-10
- Active targets rotate in a circular pattern
- Similar to snake mode from Round 1

### 4. Button Panel Modes

#### **FIXE VERT/BLEU** (Fixed Green/Blue) - Levels 1-4
- Specific colored buttons are always active
- Green buttons for green targets, blue for blue targets
- Player knows exactly which buttons to press

#### **RANDOM VERT/BLEU** (Random Green/Blue) - Levels 5-6
- Random selection of green or blue buttons become active
- Must identify and press the lit buttons after hitting targets

#### **RANDOM TOUTES LES COULEURS** (Random All Colors) - Levels 7-10
- Any color button can become active (green, blue, possibly yellow/red)
- Most challenging - must quickly identify and press correct buttons

### 5. Trap System
- **4 trapped holes per level** (always the inactive group)
- Red blinking LED indicates traps
- **-100 points penalty** for hitting traps
- Hitting a trap **cancels any active multiplier**

### 6. Bonus Zone (Petits - Circles 9-13)
- **Never trapped** - always safe to hit
- Provides bonus points when hit
- Level 10 special: Bonus zone activates after 7 successful target hits

## Level Progression

### Levels 1-2: Introduction
- **Alternating** green (L1) or blue (L2) targets
- **Fixed** button colors matching targets
- Learn basic two-step mechanic

### Levels 3-4: Reinforcement
- Same as 1-2 but higher score requirements
- Master the alternating pattern

### Levels 5-6: Button Randomization
- **Fixed** active targets (all 4 always on)
- **Random** button selection
- Focus shifts to quick button identification

### Levels 7-8: Full Randomization
- **Random** target patterns
- **Random all colors** for buttons
- **Multipliers** introduced (Level 7)

### Levels 9-10: Maximum Difficulty
- **Rotating** target patterns
- **Random all colors** for buttons
- **Active multipliers** (x2 for 10s, x3 for 12s)
- Level 10: Bonus zone activation after 7 hits

## Scoring System

### Base Points
- Green targets (grands): ~100 points per validated hit
- Blue targets (moyens): ~100 points per validated hit
- Bonus targets (petits): ~50 points per hit
- Trap penalty: -100 points

### Score Goals
- Level 1: 4600 points
- Level 2: 4800 points
- Level 3: 5000 points
- Level 4: 5200 points
- Level 5: 5400 points
- Level 6: 5400 points
- Level 7: 5600 points (with multiplier)
- Level 8: 5800 points
- Level 9: 6000 points (with multiplier)
- Level 10: 6200 points (with multiplier)

### Multipliers (Levels 7, 9, 10)
- **x2 multiplier**: Active for 10 seconds
- **x3 multiplier**: Active for 12 seconds
- Requires reactivation (likely through consecutive hits)
- Cancelled immediately if trap is hit

## User Instructions by Level

### Level 1: "Touchez les cibles vertes puis appuyez sur les boutons VERTS!"
(Hit green targets then press GREEN buttons!)

### Level 2: "Touchez les cibles bleues puis appuyez sur les boutons bleus!"
(Hit blue targets then press BLUE buttons!)

### Levels 3-9: Similar pattern-based instructions

### Level 10: "Touchez les cibles VERTES. Évitez les rouges, pressez les boutons AVANT qu'il ne s'éteignent!"
(Hit GREEN targets. Avoid red ones, press buttons BEFORE they turn off!)
- Introduces time pressure on button pressing

## Implementation Considerations

### Button Mapping
Control buttons in the simulator (likely buttons 14-22):
- Need to be colored (green, blue, possibly yellow/red)
- Must have on/off states
- Should provide visual feedback when pressed

### Validation Logic
1. Track which circles were hit
2. Light up corresponding buttons
3. Wait for button press (with possible timeout)
4. Award points only after correct button validation
5. Clear the validation queue and continue

### LED Patterns
- Active targets: Solid green or blue
- Trapped holes: Blinking red
- Bonus zone: Solid yellow (always safe)
- Buttons: Match target colors when active

### Timing Windows
- Button press window: Likely 2-3 seconds after target hit
- Pattern changes: Every 3-5 seconds for alternating/rotating modes
- Multiplier durations: 10s (x2) and 12s (x3)

## Questions for Clarification

1. **Button Count & Layout**: How many control buttons? Their physical arrangement?
2. **Validation Window**: How long do players have to press buttons after hitting targets?
3. **Queue System**: Can multiple targets be hit before pressing buttons, or one at a time?
4. **Button Feedback**: Visual/audio feedback for correct/incorrect button presses?
5. **Pattern Speeds**: Rotation speed for TOURNANT mode? Alternation frequency?
6. **Color Mapping**: Which button IDs correspond to which colors?
7. **Multiplier Activation**: Exact trigger for multiplier activation/reactivation?

## Proposed Implementation Approach

1. **Phase 1**: Implement button color control and visual feedback
2. **Phase 2**: Create two-step validation system (hit → button press)
3. **Phase 3**: Implement different target patterns (alternating, fixed, random, rotating)
4. **Phase 4**: Add button panel modes (fixed, random, all colors)
5. **Phase 5**: Integrate multiplier system and special rules
6. **Phase 6**: Testing and balancing

## Key Differences from Previous Rounds

- **Two-step validation**: Major new mechanic requiring button interaction
- **Button panel integration**: New hardware/UI element
- **Trap persistence**: Red traps are always blinking (not appearing/disappearing)
- **Clear color coding**: Green for large circles, blue for medium, red for traps
- **Progressive complexity**: Each level adds a new challenge layer
