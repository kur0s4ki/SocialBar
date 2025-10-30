# Logging Guide

## Overview

The codebase now uses a centralized logging utility (`logger.js`) that provides configurable log levels to reduce console spam while maintaining debuggability.

**✅ Migration Complete:**
- **app.js**: 0 console statements remaining (all migrated)
- **strikeloop.js**: 0 console statements remaining (232 migrated)
- **hardwareAbstraction.js**: 0 console statements remaining (9 migrated)
- **arduino.js**: 0 console statements remaining (19 migrated)
- **Total**: 260+ console statements migrated to logger

## Quick Start

By default, the logger is set to **INFO** level, which shows only important state changes without repetitive spam.

### Run with reduced logging (default)
```bash
node app.js --both
```

### Enable detailed logging for debugging
Open `logger.js` and modify line 14:
```javascript
this.logLevel = LOG_LEVELS.DEBUG;  // or LOG_LEVELS.TRACE for maximum verbosity
```

## Log Levels

| Level | Description | What you'll see |
|-------|-------------|-----------------|
| **ERROR** | Critical errors only | Only error messages |
| **WARN** | Warnings and errors | Errors + warnings |
| **INFO** | Important state changes (default) | Game start, round changes, level completions, hit/trap events |
| **DEBUG** | Detailed operations | All INFO + mission updates, client connections, bonus zone changes |
| **TRACE** | Everything including repetitive actions | All DEBUG + every click, validation, score update |

## What Changed

### Before (Verbose)
```
[STAFF-WS] Circle click from staff-2: circle 9
[STRIKELOOP] Circle clicked - ID: 9
[STRIKELOOP] Input detected: Circle 9 (Y) from simulator
[STRIKELOOP] Using ARCADE validation for two-step-all-buttons-green mode
[STRIKELOOP] Arcade validation - Circle 9: color=y, isTrap=undefined, isValid=true
[STRIKELOOP] ✅ BONUS HIT! Circle 9 +50 points
[STRIKELOOP] Local score updated to: 50
[APP] Score update received: 50
[DISPLAY-WS] Broadcasted message type 'scoreUpdate' to 1 display clients
[STRIKELOOP] Score: 0 -> 50 (+50)
```

### After (Concise - INFO level)
```
[STRIKELOOP] ✅ BONUS 9 +50pts
[STRIKELOOP] Score: 0 → 50 (+50)
```

## Key Improvements

1. **Score updates**: Single line instead of 3 separate logs
2. **Circle clicks**: Moved to TRACE level (too frequent for normal debugging)
3. **WebSocket broadcasts**: Score/LED/time updates no longer logged at INFO level
4. **Round initialization**: Condensed from 4 lines to 1-2 lines
5. **Time updates**: Only logged every 10 seconds instead of every second

## Per-Module Log Levels

You can set different log levels for different modules:

```javascript
// In logger.js, modify the moduleLogLevels object:
this.moduleLogLevels = {
  STRIKELOOP: LOG_LEVELS.INFO,    // Game logic
  APP: LOG_LEVELS.INFO,            // Server/WebSocket
  'STAFF-WS': LOG_LEVELS.DEBUG,   // Staff WebSocket (more verbose)
  'DISPLAY-WS': LOG_LEVELS.WARN,  // Display WebSocket (less verbose)
  ARDUINO: LOG_LEVELS.DEBUG,       // Serial commands
  HAL: LOG_LEVELS.WARN,            // Hardware abstraction
};
```

## Debugging Tips

### To debug score issues
Set `STRIKELOOP` to `DEBUG` or `TRACE` level to see every validation step.

### To debug WebSocket issues
Set `STAFF-WS` and `DISPLAY-WS` to `DEBUG` level to see all broadcasts.

### To debug hardware/Arduino
Set `ARDUINO` to `DEBUG` level to see serial commands with color-coded boxes.

### To see everything (maximum verbosity)
```javascript
this.logLevel = LOG_LEVELS.TRACE;
```

## Runtime Log Level Changes

You can change log levels at runtime by modifying the logger instance:

```javascript
const logger = require('./logger.js');

// Change global level
logger.setLevel('DEBUG');

// Change specific module level
logger.setModuleLevel('STRIKELOOP', 'TRACE');
```

## Migration Notes

- All `console.log()` calls in `app.js` and core `strikeloop.js` sections have been migrated
- The logger maintains the same `[MODULE]` prefix format for easy log filtering
- Emojis (✅, ❌, ⚠️) are still used for important events at INFO level and above
