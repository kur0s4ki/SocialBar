# Sound Assets for Social Bar Game

This directory contains all audio files used in the game. Place your `.mp3` files here.

## Required Files

### Basic Sound Effects
- **trap.mp3** - Plays when a red trap is hit (with penalty)
- **bonus.mp3** - Plays when bonus holes (9-13) are hit
- **point.mp3** - Plays when points are gained
- **correct.mp3** - Plays for valid hits that don't award points yet (e.g., hitting hole before button validation)
- **levelup.mp3** - Plays when the level goal is reached

### Background Music
- **background.mp3** - Loops continuously from game start to game end

### Round Narration
- **round1.mp3** - Narration for Round 1 description
- **round2.mp3** - Narration for Round 2 description
- **round3.mp3** - Narration for Round 3 description

## Sound Behavior

### When Sounds Play

| Sound | Trigger | Notes |
|-------|---------|-------|
| `trap.mp3` | Red trap hit with penalty | Only plays when points are deducted |
| `bonus.mp3` | Yellow bonus holes (9-13) hit | Immediate point gain |
| `point.mp3` | Score increases | Any positive point gain |
| `correct.mp3` | Valid hit, no points yet | Two-step validation: hole hit → awaiting button |
| `levelup.mp3` | Goal score reached | Plays once when crossing goal threshold |
| `background.mp3` | Game starts | Loops until game ends or resets |
| `round1/2/3.mp3` | Round changes | Background music ducks (reduces volume) during narration |

### Audio Ducking

When round narration plays:
- Background music volume reduces to 15% (from 40%)
- Narration plays at 70% volume
- Background music restores to 40% when narration ends

## Volume Levels

- **Background Music**: 40% (ducked to 15% during narration)
- **Sound Effects**: 70%
- **Narration**: 70%
- **Master Volume**: 100%

## File Format

All files should be:
- Format: MP3
- Sample Rate: 44.1kHz (standard)
- Bit Rate: 128kbps or higher
- Mono or Stereo

## Implementation Details

Sounds are managed by `SoundManager.js` in the game React app:
- Preloads all sounds on app init
- Plays sounds in response to WebSocket messages from backend
- Handles audio ducking for round narration
- Background music loops automatically
- Sounds can overlap (e.g., multiple `correct.mp3` can play simultaneously)

## Testing

To test sounds:
1. Place your MP3 files in this directory
2. Start the game: `npm start` (from game directory)
3. Start the backend: `node app.js` (from root)
4. Play the game and trigger different events

Check browser console for sound-related logs prefixed with `[SOUNDMANAGER]`.
