# Arduino/Controllino Firmware Update Guide

## Overview

Your firmware needs to be updated to handle the new protocol that includes color information.

## Protocol Change

### Old Protocol (4 characters)
```
O{NN}{0|1}
```
**Example:** `O101` = Output 10 ON

### New Protocol (5 characters)
```
O{NN}{0|1}{color}
```
**Example:** `O101g` = Output 10 ON with green color

## Required Changes

### 1. Update Serial Command Parser

**Before:**
```cpp
if (Serial.available() >= 4) {
  String cmd = Serial.readStringUntil('\n');
  if (cmd[0] == 'O') {
    int output = (cmd[1] - '0') * 10 + (cmd[2] - '0');
    int state = cmd[3] - '0';
    digitalWrite(output, state);
  }
}
```

**After:**
```cpp
if (Serial.available() >= 5) {
  String cmd = Serial.readStringUntil('\n');
  if (cmd[0] == 'O') {
    int output = (cmd[1] - '0') * 10 + (cmd[2] - '0');
    int state = cmd[3] - '0';
    char color = cmd[4];  // NEW: Color character

    // Handle the output with color information
    setOutputWithColor(output, state, color);
  }
}
```

### 2. Implement Color Handling

Choose the appropriate implementation based on your hardware:

#### Option A: Single-Color LEDs (Simple ON/OFF)

If you have simple LEDs that only turn ON/OFF, **ignore the color parameter**:

```cpp
void setOutputWithColor(int output, int state, char color) {
  // Ignore color, just set output state
  digitalWrite(output, state);

  // Optional: Send acknowledgment
  Serial.print("O");
  Serial.println(state);
}
```

#### Option B: RGB LEDs

If you have RGB LEDs (3 pins per LED), **use color to set RGB values**:

```cpp
void setOutputWithColor(int output, int state, char color) {
  if (state == 0) {
    // Turn off all RGB channels
    setRGB(output, 0, 0, 0);
  } else {
    // Turn on with specified color
    switch(color) {
      case 'r': setRGB(output, 255, 0, 0); break;     // Red
      case 'g': setRGB(output, 0, 255, 0); break;     // Green
      case 'b': setRGB(output, 0, 0, 255); break;     // Blue
      case 'y': setRGB(output, 255, 255, 0); break;   // Yellow
      case 'p': setRGB(output, 128, 0, 128); break;   // Purple
      case 'w': setRGB(output, 255, 255, 255); break; // White
      case 'c': setRGB(output, 0, 255, 255); break;   // Cyan
      default:  setRGB(output, 255, 255, 255); break; // Default white
    }
  }

  // Send acknowledgment
  Serial.print("O");
  Serial.println(state);
}

void setRGB(int output, int r, int g, int b) {
  // Assuming RGB outputs are sequential:
  // Output 1: R=pin1, G=pin2, B=pin3
  // Output 2: R=pin4, G=pin5, B=pin6
  int basePin = (output - 1) * 3;

  analogWrite(basePin, r);      // Red channel
  analogWrite(basePin + 1, g);  // Green channel
  analogWrite(basePin + 2, b);  // Blue channel
}
```

#### Option C: Multi-Color LEDs (e.g., WS2812B/NeoPixel)

If you have addressable RGB LEDs:

```cpp
#include <Adafruit_NeoPixel.h>

#define LED_PIN    6
#define LED_COUNT 22
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

void setOutputWithColor(int output, int state, char color) {
  if (state == 0) {
    strip.setPixelColor(output - 1, 0, 0, 0); // OFF
  } else {
    uint32_t pixelColor;
    switch(color) {
      case 'r': pixelColor = strip.Color(255, 0, 0); break;
      case 'g': pixelColor = strip.Color(0, 255, 0); break;
      case 'b': pixelColor = strip.Color(0, 0, 255); break;
      case 'y': pixelColor = strip.Color(255, 255, 0); break;
      case 'p': pixelColor = strip.Color(128, 0, 128); break;
      case 'w': pixelColor = strip.Color(255, 255, 255); break;
      case 'c': pixelColor = strip.Color(0, 255, 255); break;
      default:  pixelColor = strip.Color(255, 255, 255); break;
    }
    strip.setPixelColor(output - 1, pixelColor);
  }
  strip.show();

  // Send acknowledgment
  Serial.print("O");
  Serial.println(state);
}
```

## Complete Example (Option A - Simple LEDs)

```cpp
// Complete Arduino sketch for simple LED control with new protocol

void setup() {
  Serial.begin(9600);

  // Initialize output pins
  for (int i = 1; i <= 22; i++) {
    pinMode(i, OUTPUT);
    digitalWrite(i, LOW);
  }

  Serial.println("Controllino ready - Protocol v2 with color");
}

String commandBuffer = "";

void loop() {
  // Read serial data
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      // Process complete command
      if (commandBuffer.length() >= 5) {
        processCommand(commandBuffer);
      }
      commandBuffer = "";
    } else {
      commandBuffer += c;
    }
  }
}

void processCommand(String cmd) {
  if (cmd[0] == 'O') {
    // Parse output number (2 digits)
    int output = (cmd[1] - '0') * 10 + (cmd[2] - '0');

    // Parse state (1 digit)
    int state = cmd[3] - '0';

    // Parse color (1 character) - we'll ignore it for simple LEDs
    char color = cmd[4];

    // Validate output number
    if (output >= 1 && output <= 22) {
      digitalWrite(output, state == 1 ? HIGH : LOW);

      // Send acknowledgment
      Serial.print("O");
      Serial.println(state);
    }
  }
  else if (cmd[0] == 'I') {
    // Handle input request (existing code)
    // ... your existing input handling ...
  }
  else if (cmd[0] == 'L') {
    // Handle LED bar (existing code)
    // ... your existing LED bar handling ...
  }
}
```

## Testing the Firmware

### 1. Upload Updated Firmware
1. Update your Arduino/Controllino code with the changes above
2. Upload to device
3. Open Serial Monitor (9600 baud)

### 2. Manual Test via Serial Monitor
Send these commands in the Serial Monitor:

```
O011g    → Should turn output 1 ON (green - color ignored for simple LEDs)
O010w    → Should turn output 1 OFF
O101r    → Should turn output 10 ON (red - color ignored for simple LEDs)
O100w    → Should turn output 10 OFF
```

**Expected Response:**
```
O1       → Acknowledgment for ON command
O0       → Acknowledgment for OFF command
```

### 3. Test with Node.js Backend

Start your backend with hardware mode:
```bash
node app.js --hardware
```

Watch the serial output in the console. You should see commands like:
```
[HAL] Hardware: Output 8 → state 1, color g
[HAL] Hardware: Output 8 → state 0, color w
```

## Color Codes Reference

| Code | Color  | RGB Value (if applicable) |
|------|--------|---------------------------|
| `r`  | Red    | (255, 0, 0)               |
| `g`  | Green  | (0, 255, 0)               |
| `b`  | Blue   | (0, 0, 255)               |
| `y`  | Yellow | (255, 255, 0)             |
| `p`  | Purple | (128, 0, 128)             |
| `w`  | White  | (255, 255, 255)           |
| `c`  | Cyan   | (0, 255, 255)             |

## Troubleshooting

### Issue: Commands not recognized
**Cause:** Buffer length check might be wrong
**Fix:** Ensure you're checking for 5 characters minimum:
```cpp
if (commandBuffer.length() >= 5) {
  processCommand(commandBuffer);
}
```

### Issue: Outputs flickering or behaving erratically
**Cause:** Multiple characters being read as separate commands
**Fix:** Add proper line ending detection:
```cpp
if (c == '\n' || c == '\r') {
  processCommand(commandBuffer);
  commandBuffer = "";
}
```

### Issue: Some outputs work, others don't
**Cause:** Output number parsing issue
**Fix:** Add validation:
```cpp
if (output >= 1 && output <= 22) {
  digitalWrite(output, state);
} else {
  Serial.println("ERROR: Invalid output");
}
```

## Migration Checklist

- [ ] Update serial command parser to expect 5 characters
- [ ] Add color parameter parsing (cmd[4])
- [ ] Implement setOutputWithColor() function
- [ ] Test with Serial Monitor manually
- [ ] Test with Node.js backend in hardware mode
- [ ] Verify all 22 outputs respond correctly
- [ ] Test with both mode (simulation + hardware)
- [ ] Document your specific pin mappings if using RGB LEDs

## Need Help?

If you encounter issues:
1. Check Serial Monitor output for error messages
2. Verify baud rate matches (9600)
3. Test simple commands manually first
4. Use `Serial.println()` to debug command parsing
5. Check that output pins are correctly initialized

## Summary

The firmware update is straightforward:
1. Change buffer length check from 4 to 5
2. Parse color character at position cmd[4]
3. Either use or ignore color based on your hardware

The protocol is **backward compatible** in that:
- All existing output IDs still work (1-22)
- State values are unchanged (0/1)
- Only the color byte is added

**Time to update:** ~15-30 minutes depending on LED type
