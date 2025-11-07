# Serial Write Queue Implementation

## Overview
Implemented a serial write queue system to prevent overwhelming the Controllino hardware with rapid command bursts.

## Problem Solved
Previously, the game could send 19 serial commands within 75ms during level initialization:
- 1 cell power command
- 9 LED reset commands
- 8 arcade LED setup commands

The Controllino hardware couldn't process these fast enough, leading to potential command loss or errors.

## Solution
Added a FIFO queue system in `arduino.js` that:
1. **Queues all serial commands** instead of sending immediately
2. **Processes commands sequentially** with 200ms delay between each
3. **Maintains all existing APIs** - no code changes needed elsewhere
4. **Returns promises correctly** - business logic unaffected

## Key Changes in arduino.js

### New Queue System (lines 53-119)
- `serialWriteQueue[]` - FIFO queue for pending commands
- `SERIAL_WRITE_DELAY = 200ms` - configurable delay between writes
- `enqueueSerialCommand()` - adds commands to queue
- `processSerialQueue()` - processes queue with delays
- `getQueueStatus()` - debugging helper

### Refactored Functions
- `sendCmdImmediate()` - original sendCmd1 logic (private, internal use)
- `sendCmd1()` - now queues commands (public API, unchanged signature)

## Configuration
Adjust the delay if needed in arduino.js line 60:
```javascript
const SERIAL_WRITE_DELAY = 200; // milliseconds (recommended: 150-250ms)
```

- **Lower values (100-150ms)**: Faster LED updates, may still overwhelm hardware
- **Higher values (250-300ms)**: More reliable, slightly slower visual feedback
- **Current (200ms)**: Balanced - 19 commands take ~3.8 seconds total

## Business Logic Preservation
✅ **No changes needed** in:
- `strikeLoop.js` - game logic unchanged
- `hardwareAbstraction.js` - HAL interface unchanged
- `app.js` - application flow unchanged

✅ **All functions work identically**:
- `set_output()` - still turns LEDs on/off
- `set_output_raw()` - still controls cell power
- `send_effect()` - still sends effect codes
- `powerOnCell()` / `powerOffCell()` - still control power
- `setBarled()` - still controls LED bar

✅ **Promises still work**:
- Functions return promises as before
- Code can still `await` on serial commands
- Error handling preserved

## Trade-offs
⚠️ **Slower visual feedback**: LEDs light up sequentially over ~3-4 seconds instead of instantly
⚠️ **Queue buildup possible**: If game generates commands faster than 200ms rate, queue grows

✅ **Hardware reliability**: No more overwhelmed Controllino
✅ **Transparent**: Game code doesn't know about the queue
✅ **Non-blocking**: Game logic continues immediately

## Testing
Run your game normally:
```bash
node app.js --both
```

The LEDs will now light up sequentially with 200ms spacing instead of all at once.

## Debugging
To check queue status, call from your code:
```javascript
const arduino = require('./arduino.js');
const status = arduino.getQueueStatus();
console.log(status);
// { queueLength: 5, isProcessing: true, delayMs: 200 }
```

Enable ARDUINO debug logs to see queue size:
```javascript
logger.setModuleLevel('ARDUINO', 'DEBUG');
```

## Monitoring
With DEBUG level logging, you'll see:
- "Queue size: X commands pending" - when queue has multiple items
- Timestamps on each serial write box - to verify 200ms spacing
- Individual command execution as they process

## Next Steps if Issues Occur
1. **If LEDs are too slow**: Reduce `SERIAL_WRITE_DELAY` to 150ms
2. **If commands still fail**: Increase `SERIAL_WRITE_DELAY` to 250ms
3. **If queue grows indefinitely**: Check for command loops in game logic
4. **If specific commands need priority**: Can implement priority queue (future enhancement)
