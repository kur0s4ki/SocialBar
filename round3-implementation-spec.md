# Round 3 - Two-Step Validation System

## Core Concept
Round 3 introduces a **two-step scoring mechanism** where players must:
1. **Hit** colored circle targets (green or blue)
2. **Press** corresponding colored buttons to validate and score points

Points are ONLY awarded after successful button validation. No button press = no points.

## Hardware Layout
- **Circles 1-4**: "Grands" (large) - Green when active
- **Circles 5-8**: "Moyens" (medium) - Blue when active  
- **Circles 9-13**: Bonus zone (yellow) - Always safe, never trapped
- **Control Buttons**: Left panel buttons for validation (likely 14-22)

## Universal Rules
- Each level: **30 seconds duration**
- **4 active targets** and **4 traps** per level (except bonus zone)
- Inactive circles become **red blinking traps** (-100 points penalty)
- Bonus circles (9-13) are **always yellow** and give +50 points
- Button validation window: **3 seconds** after hitting a target

---

## Level Progression (Reorganized by Difficulty)

### **Level 1: Introduction to Two-Step**
- **Pattern**: FIXED Green (circles 1-4 always active)
- **Traps**: Circles 5-8 (red blinking)
- **Button Mode**: FIXED Green (specific green buttons always lit)
- **Goal**: 4400 points
- **Mission**: "Touchez les cibles vertes puis appuyez sur un bouton VERT!"
- **Learning**: Basic two-step mechanic with no pattern changes

**Gameplay**: All 4 green circles stay lit. Hit any green circle, then press any lit green button to score.

---

### **Level 2: Blue Targets Introduction**
- **Pattern**: FIXED Blue (circles 5-8 always active)
- **Traps**: Circles 1-4 (red blinking)
- **Button Mode**: FIXED Blue (specific blue buttons always lit)
- **Goal**: 4600 points
- **Mission**: "Touchez les cibles bleues puis appuyez sur un bouton BLEU!"
- **Learning**: Same mechanic with blue targets

**Gameplay**: All 4 blue circles stay lit. Hit any blue circle, then press any lit blue button to score.

---

### **Level 3: Alternating Pattern - Green**
- **Pattern**: ALTERNATING Green (1,3 active ↔ 2,4 active, switches every 3 seconds)
- **Traps**: Circles 5-8 (red blinking)
- **Button Mode**: FIXED Green
- **Goal**: 4800 points
- **Mission**: "Touchez les cibles vertes mobiles puis appuyez sur un bouton VERT!"
- **Learning**: Introduction to moving patterns

**Gameplay**: Green targets alternate between positions. Time your hits when circles are green, then press button.

---

### **Level 4: Alternating Pattern - Blue**
- **Pattern**: ALTERNATING Blue (5,7 active ↔ 6,8 active, switches every 3 seconds)
- **Traps**: Circles 1-4 (red blinking)
- **Button Mode**: FIXED Blue
- **Goal**: 5000 points
- **Mission**: "Touchez les cibles bleues mobiles puis appuyez sur un bouton BLEU!"
- **Learning**: Alternating pattern with blue targets

**Gameplay**: Blue targets alternate between positions. Track the pattern and validate with blue buttons.

---

### **Level 5: Random Button Selection - Green**
- **Pattern**: FIXED Green (circles 1-4 always active)
- **Traps**: Circles 5-8 (red blinking)
- **Button Mode**: RANDOM Green (different green buttons light up after each hit)
- **Goal**: 5200 points
- **Mission**: "Touchez les vertes puis trouvez et appuyez sur le bouton VERT allumé!"
- **Learning**: Must identify which button lit up

**Gameplay**: After hitting a green circle, a random green button lights up. Find and press it quickly.

---

### **Level 6: Random Button Selection - Blue**
- **Pattern**: FIXED Blue (circles 5-8 always active)
- **Traps**: Circles 1-4 (red blinking)
- **Button Mode**: RANDOM Blue (different blue buttons light up after each hit)
- **Goal**: 5400 points
- **Mission**: "Touchez les bleues puis trouvez et appuyez sur le bouton BLEU allumé!"
- **Learning**: Random button selection with blue

**Gameplay**: After hitting a blue circle, a random blue button lights up. Quick identification required.

---

### **Level 7: Random Target Pattern**
- **Pattern**: RANDOM Green (2 random circles from 1-4 are active, changes every 4 seconds)
- **Traps**: Circles 5-8 (red blinking)
- **Button Mode**: RANDOM Green
- **Goal**: 5600 points
- **Mission**: "Cibles vertes aléatoires! Touchez-les et validez avec les boutons!"
- **Learning**: Unpredictable target positions

**Gameplay**: Random green circles activate. React quickly to changing patterns and find the right button.

---

### **Level 8: Mixed Color Buttons**
- **Pattern**: ALTERNATING Mixed (Green 1,3 + Blue 5,7 ↔ Green 2,4 + Blue 6,8)
- **Traps**: None (all circles alternate between colors)
- **Button Mode**: Color-matched (green button for green hit, blue for blue)
- **Goal**: 5800 points
- **Mission**: "Vert et bleu ensemble! Appuyez sur le bouton de la MÊME couleur!"
- **Learning**: Color matching under pressure

**Gameplay**: Both colors active simultaneously. Must press button matching the color you hit.

---

### **Level 9: Rotating Pattern**
- **Pattern**: ROTATING Green (active circles rotate clockwise: 1→2→3→4→1, every 2 seconds)
- **Traps**: Circles 5-8 (red blinking)
- **Button Mode**: RANDOM All Colors (any color button can light up)
- **Goal**: 6000 points
- **Mission**: "Cibles tournantes! Validez avec N'IMPORTE quel bouton allumé!"
- **Learning**: Following rotating pattern + any color button

**Gameplay**: Green targets rotate in a circle. After hitting, any color button might light up - stay alert!

---

### **Level 10: Ultimate Challenge**
- **Pattern**: ROTATING Blue (5→6→7→8→5) + Random Green bursts (1-4)
- **Traps**: Dynamic (changes based on active patterns)
- **Button Mode**: TIMED Random All Colors (buttons turn off after 2 seconds)
- **Goal**: 6200 points
- **Mission**: "Chaos total! Touchez et validez RAPIDEMENT avant extinction!"
- **Special**: Bonus zone (9-13) activates after 7 successful validations
- **Learning**: Maximum complexity

**Gameplay**: Blue circles rotate while green ones randomly appear. Buttons light up briefly - must press before timeout!

---

## Scoring Details

### Base Points (per validated hit)
- Green targets (grands): 100 points
- Blue targets (moyens): 100 points  
- Bonus targets (yellow): 50 points (no button validation needed)
- Trap penalty: -100 points (immediate, no validation)

### Validation Mechanics
1. **Hit Detection**: Player hits a colored circle
2. **Button Activation**: Corresponding button(s) light up
3. **Validation Window**: 3 seconds to press lit button (2 seconds in Level 10)
4. **Success**: Correct button = points awarded, next target ready
5. **Timeout**: No button press = no points, target resets

### Button Color Modes
- **FIXED**: Specific buttons of one color stay lit
- **RANDOM Single Color**: Random button of specified color lights up per hit
- **RANDOM All Colors**: Any color button can light up
- **TIMED**: Buttons turn off if not pressed quickly

---

## Technical Implementation Notes

### LED States
```
Active Green: Solid green (circles 1-4)
Active Blue: Solid blue (circles 5-8)
Trapped: Blinking red (inactive circles)
Bonus: Solid yellow (circles 9-13)
Button Ready: Solid color matching mode
Button Timeout: Fading/blinking before turning off
```

### Pattern Timing
- **Fixed**: No changes
- **Alternating**: Switch every 3 seconds
- **Random**: Change every 4 seconds
- **Rotating**: Move every 2 seconds

### Validation Queue
- Single validation at a time (no queuing multiple hits)
- Must complete current validation before next target hit counts
- Clear visual/audio feedback for successful validation

---

## Progressive Difficulty Summary

1. **Levels 1-2**: Learn two-step mechanic (fixed patterns, fixed buttons)
2. **Levels 3-4**: Moving targets (alternating patterns, fixed buttons)
3. **Levels 5-6**: Button hunting (fixed patterns, random buttons)
4. **Level 7**: Full randomization (random patterns, random buttons)
5. **Level 8**: Color matching (mixed colors, matched buttons)
6. **Levels 9-10**: Maximum challenge (rotating patterns, all color buttons, time pressure)

This progression ensures players gradually master each component before combining them in later levels.
