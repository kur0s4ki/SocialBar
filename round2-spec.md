  ROUND 2 LEVEL SPECIFICATIONS

  Level 1 (Round 2, Level 1)

  - Goal: 2900 points
  - Duration: 30 sec
  - Mission: "Touchez uniquement les verts. Évitez les rouges !"
  - Mechanics:
    - LEDs 1,2,3,4: Green, blinking (1 sec on, 1 sec off)
    - LEDs 5,6,7,8: Red penalties, blinking (1 sec on, 1 sec off)
    - LEDs 9,10,11,12,13: Yellow bonus, static (always on)
  - Scoring:
    - Green hit: +140 points
    - Yellow bonus: +50 points (unlimited)
    - Red penalty: -100 points (can be hit multiple times)

  Level 2 (Round 2, Level 2)

  - Goal: 2900 points
  - Duration: 30 sec
  - Mission: "Touchez uniquement les bleus. Évitez les rouges !"
  - Mechanics:
    - LEDs 1,2,3,4: Red penalties, blinking
    - LEDs 5,6,7,8: Blue, blinking
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Blue hit: +140 points
    - Yellow bonus: +50 points (unlimited)
    - Red penalty: -100 points

  Level 3 (Round 2, Level 3)

  - Goal: 3100 points
  - Duration: 30 sec
  - Mission: "Touchez les cibles vertes. Évitez les rouges !"
  - Mechanics:
    - LEDs 1,2,3,4: Snake pattern - 3 LEDs green, 1 LED red, rotates every 3 sec
    - Rotation: [1,2,4] → [2,4,3] → [4,3,1] → [3,1,2] → repeat
    - LEDs 5,6,7,8: Red penalties, static
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Green snake hit: +150 points (only lit green LEDs)
    - Yellow bonus: +50 points
    - Red penalty: -100 points (any red LED)

  Level 4 (Round 2, Level 4)

  - Goal: 3300 points
  - Duration: 30 sec
  - Mission: "Touchez les cibles bleus. Évitez les rouges !"
  - Mechanics:
    - LEDs 1,2,3,4: Red penalties, static
    - LEDs 5,6,7,8: Snake pattern - 3 LEDs blue, 1 LED red, rotates every 3 sec
    - Rotation: [5,6,8] → [6,8,7] → [8,7,5] → [7,5,6] → repeat
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Blue snake hit: +160 points
    - Yellow bonus: +50 points
    - Red penalty: -100 points

  Level 5 (Round 2, Level 5)

  - Goal: 3500 points
  - Duration: 30 sec
  - Mission: "Touchez les cibles vertes. Évitez les rouges !"
  - Mechanics:
    - LEDs 1,2,3,4: Snake pattern - 2 LEDs green, 2 LEDs red, rotates every 3 sec
    - Rotation: [1,2] → [2,4] → [4,3] → [3,1] → repeat
    - LEDs 5,6,7,8: Red penalties, static
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Green snake hit: +160 points
    - Yellow bonus: +50 points
    - Red penalty: -100 points

  Level 6 (Round 2, Level 6)

  - Goal: 3700 points
  - Duration: 30 sec
  - Mission: "Touchez les cibles bleus. Évitez les rouges !"
  - Mechanics:
    - LEDs 1,2,3,4: Red penalties, static
    - LEDs 5,6,7,8: Snake pattern - 2 LEDs blue, 2 LEDs red, rotates every 3 sec
    - Rotation: [5,6] → [6,8] → [8,7] → [7,5] → repeat
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Blue snake hit: +170 points
    - Yellow bonus: +50 points
    - Red penalty: -100 points

  Level 7 (Round 2, Level 7)

  - Goal: 3900 points
  - Duration: 30 sec
  - Mission: "Reconstituez la séquence. Évitez les rouges !"
  - Mechanics:
    - Display phase (8 sec): Show random sequence of 4 targets from (1,2,3,4) in green
        - Each target: 1 sec on, 1 sec off
    - Reproduction phase (22 sec): All targets turn OFF, user must reproduce exact order
    - LEDs 5,6,7,8: Red penalties, static
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Complete correct sequence: +3900 points (full goal!)
    - Yellow bonus: +50 points (during reproduction phase)
    - Red penalty: -100 points + sequence resets
    - Wrong target or wrong order: No points + sequence resets

  Level 8 (Round 2, Level 8)

  - Goal: 4100 points
  - Duration: 30 sec
  - Mission: "Reconstituez la séquence. Évitez les rouges !"
  - Mechanics:
    - Display phase (8 sec): Show random sequence of 4 targets from (5,6,7,8) in blue
    - Reproduction phase (22 sec): All targets turn OFF
    - LEDs 1,2,3,4: Red penalties, static
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Complete correct sequence: +4100 points
    - Yellow bonus: +50 points
    - Red penalty: -100 points + sequence resets

  Level 9 (Round 2, Level 9)

  - Goal: 4300 points
  - Duration: 30 sec
  - Mission: "Reconstituez la séquence. Évitez les rouges !"
  - Mechanics:
    - Display phase (12 sec): Show random sequence of 6 targets from (1-8) in mixed colors
    - Reproduction phase (18 sec): All targets turn OFF
    - Non-sequence LEDs: Red (but NO penalty - they're ignored)
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Complete correct sequence: +4300 points
    - Yellow bonus: +50 points
    - Non-sequence LEDs: No penalty (ignored)

  Level 10 (Round 2, Level 10)

  - Goal: 4400 points
  - Duration: 30 sec
  - Mission: "Reconstituez la séquence. Évitez les rouges !"
  - Mechanics:
    - Display phase (14 sec): Show random sequence of 7 targets from (1-8) in mixed colors
    - Reproduction phase (16 sec): All targets turn OFF
    - Non-sequence LEDs: Red (but NO penalty - ignored)
    - LEDs 9,10,11,12,13: Yellow bonus, static
  - Scoring:
    - Complete correct sequence: +4400 points
    - Yellow bonus: +50 points