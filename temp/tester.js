/**
 * StrikeLoop single-file game (H2C-ready, uses arduino.js)
 *
 * - Uses arduino.js: set_output, OUT_ON, OUT_OFF, powerOnCell, powerOffCell, setBarled, emitter
 * - Decodes Controllino "EventInput" frames into high-level events (start, stop, hit, panel)
 * - Runs continuously. After a session ends you can start again from keyboard or hardware start
 * - Very verbose logs for monitoring and debugging
 *
 * Edit the OUTPUT_MAP and INPUT_MAP sections to match your wiring
 */

"use strict";

const { EventEmitter } = require("events");
const readline = require("readline");
const arduino = require("../arduino.js"); // you provided this

/* ----------------------------- Time helpers ------------------------------ */

function ts() {
  // uses arduino.getCurrentTime if available, falls back to ISO clock
  try {
    return `[${arduino.getCurrentTime()}]`;
  } catch {
    const d = new Date();
    return `[${d.toISOString().split("T")[1].replace("Z", "")}]`;
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* ----------------------- Output mapping (edit me) ------------------------ */
/**
 * Replace these IDs with your real output numbers.
 * arduino.set_output expects 0..99 (padded to 2 chars internally).
 * Examples below are placeholders. Keep everything numeric.
 */

const OUTPUT_MAP = {
  // 8 main holes - single LED output per hole (can show different colors/patterns for L/M/S)
  HOLES: [1, 2, 3, 4, 5, 6, 7, 8],
  
  // Central bonus area backlight
  CENTRAL_BACKLIGHT: 9,
  
  // 9 panel button LEDs
  PANEL_BUTTONS: [10, 11, 12, 13, 14, 15, 16, 17, 18],
  
  // Effects
  FX: {
    BUZZER: 19,
    STROBE: 20,
    AMBIENT: 21,
  },

  // Legacy compatibility - map old structure to new
  ZONES: {
    L: [1, 2, 3, 4, 5, 6, 7, 8], // Same as HOLES (size determined by LED pattern)
    M: [1, 2, 3, 4, 5, 6, 7, 8], // Same as HOLES
    S: [1, 2, 3, 4, 5, 6, 7, 8], // Same as HOLES
  },
  BONUS: 9, // Same as CENTRAL_BACKLIGHT
  PANEL: {
    READY: 10, STEP1: 11, STEP2: 12, STEP3: 13, 
    OK: 14, FAIL: 15, BTN7: 16, BTN8: 17, BTN9: 18
  },
};

/* ------------------------ Input mapping (edit me) ------------------------ */
/**
 * Your arduino.js emits: emitter.emit("EventInput", mes, bitmask)
 * - mes is a 2-char code like "01", "02"
 * - bitmask is a 16-bit number from the controller
 *
 * We track edges on each bit and translate them to high-level events:
 *  - start, stop
 *  - panel button N
 *  - hit (zone, size)
 *
 * Update these to the real groups and bits from your wiring.
 * Below is a sensible default pattern for quick testing.
 */

const INPUT_MAP = {
  // Start and Stop buttons
  START: { group: "01", bit: 0 }, // rising edge = start
  STOP: { group: "01", bit: 1 },  // rising edge = emergency stop

  // Main 8 holes (single input per hole, size determined by active LED pattern)
  HOLES: { group: "02", bitForZone: (zone) => zone - 1 }, // bits 0..7 → holes 1..8
  
  // Central 5 small holes
  CENTRAL_HOLES: { group: "03", bitForZone: (zone) => zone - 1 }, // bits 0..4 → central holes 1..5
  
  // 9 panel buttons
  PANEL_BUTTONS: { group: "04", bitForZone: (button) => button - 1 }, // bits 0..8 → buttons 1..9

  // Legacy compatibility
  PANEL_GROUP: "04",
  HITS: {
    L: { group: "02", bitForZone: (zone) => zone - 1 }, // Same as HOLES
    M: { group: "02", bitForZone: (zone) => zone - 1 }, // Same as HOLES  
    S: { group: "02", bitForZone: (zone) => zone - 1 }, // Same as HOLES
  },
};

/* -------------------------- Output helper API ---------------------------- */

function setOn(id) {
  if (id == null) return;
  //console.log(`[DEV] Simulating: set_output(${id}, ON)`);
  // arduino.set_output(Number(id), arduino.OUT_ON);
}

function setOff(id) {
  if (id == null) return;
  //console.log(`[DEV] Simulating: set_output(${id}, OFF)`);
  // arduino.set_output(Number(id), arduino.OUT_OFF);
}

async function pulse(id, ms = 150) {
  if (id == null) return;
  setOn(id);
  await sleep(ms);
  setOff(id);
}

function idFor(size /* "L"|"M"|"S" */, zone /* 1..8 */) {
  // All sizes use the same hole LED, just different patterns/colors
  const idx = zone - 1;
  return OUTPUT_MAP.HOLES[idx];
}

function centralHoleId(holeNum /* 1..5 */) {
  // Central holes don't have individual LEDs, controlled by central backlight
  return OUTPUT_MAP.CENTRAL_BACKLIGHT;
}

function panelButtonId(buttonNum /* 1..9 */) {
  const idx = buttonNum - 1;
  return OUTPUT_MAP.PANEL_BUTTONS[idx];
}

async function turnGroup(size, zones, on) {
  for (const z of zones) {
    const id = idFor(size, z);
    if (id != null) {
      on ? setOn(id) : setOff(id);
      await sleep(4);
    }
  }
}

function allOff() {
  // Turn off all hole LEDs
  OUTPUT_MAP.HOLES.forEach((id) => setOff(id));
  
  // Turn off central backlight
  setOff(OUTPUT_MAP.CENTRAL_BACKLIGHT);
  
  // Turn off all panel button LEDs
  OUTPUT_MAP.PANEL_BUTTONS.forEach((id) => setOff(id));
  
  // Turn off effects
  Object.values(OUTPUT_MAP.FX).forEach((id) => setOff(id));
  
  // powerOffCell is separate since it also logs
  //console.log(`[DEV] Simulating: powerOffCell()`);
  // try {
  //   arduino.powerOffCell();
  // } catch {}
}

/* ----------------------------- Game config ------------------------------- */
/**
 * Translate each row of your spreadsheet into a phase entry here.
 * You can define as many phases as you want.
 * Hooks: onEnter, onBeat, onHit, onExit
 */

// ===================== DROP-IN REPLACEMENT =====================
// PHASES generated from StrikeLoop.xlsx (exact timings and metadata)
const PHASES = [
    {
      name: "Manche 1, Niveau 1",
      durationMs: 25000,
      pacingBPM: 100,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L"],
      concurrency: { L: 4, M: 0 },
      sizeRule: "Démarrage facile: uniquement grands actifs.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. Faible densité rouge (1 trou).",
      instructions: "Touchez uniquement les VERTS. Évitez les rouges !",
      mode: "Couleur simple + Cumulatif léger",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 2",
      durationMs: 26000,
      pacingBPM: 102,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 4, M: 2 },
      sizeRule: "Introduction précision: quelques moyens actifs.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 3",
      durationMs: 27000,
      pacingBPM: 104,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 3, M: 3 },
      sizeRule: "Équilibre 50/50.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 4",
      durationMs: 29000,
      pacingBPM: 106,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 2, M: 4 },
      sizeRule: "Précision croissante: majorité de moyens.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 5",
      durationMs: 30000,
      pacingBPM: 108,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 2, M: 4 },
      sizeRule: "Précision croissante: majorité de moyens.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 6",
      durationMs: 31000,
      pacingBPM: 110,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 2, M: 4 },
      sizeRule: "Intensité stable, précision demandée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 7",
      durationMs: 32000,
      pacingBPM: 110,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 2, M: 4 },
      sizeRule: "Intensité stable, précision demandée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 8",
      durationMs: 33000,
      pacingBPM: 110,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 2, M: 4 },
      sizeRule: "Intensité stable, précision demandée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 9",
      durationMs: 33000,
      pacingBPM: 110,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 2, M: 4 },
      sizeRule: "Intensité stable, précision demandée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
    {
      name: "Manche 1, Niveau 10",
      durationMs: 34000,
      pacingBPM: 110,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M"],
      concurrency: { L: 1, M: 4 },
      sizeRule: "Précision avancée: très majoritaire moyens.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2–3 rouges. Réactivation auto après 3s.",
      instructions: "Évitez les rouges. Réalisez un combo de 3 !",
      mode: "Pièges rouges + Combo",
      multiplier: {
        activation: "x2: 2 hits consécutifs (tous trous actifs). x3: 3 hits consécutifs.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "—", duration: "—" }
    },
  
    // -------------- Manche 2 --------------
    {
      name: "Manche 2, Niveau 1",
      durationMs: 26000,
      pacingBPM: 114,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Transition: encore quelques grands, base en moyens.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2 rouges. Zone centrale NON impactée.",
      instructions: "Activez la zone JAUNE (petits) via un combo de 3 !",
      mode: "Activation Bonus Central (combo 3)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      },
      panel: { mode: "reflex", trigger: "Débloqué par combo 3 sur trous (fenêtre 10s)." } // mode principal mentions reflex trigger
    },
    {
      name: "Manche 2, Niveau 2",
      durationMs: 27000,
      pacingBPM: 116,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Précision: renforcement moyens, petits via zone.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2 rouges. Zone centrale NON impactée.",
      instructions: "Activez la zone JAUNE (petits) via un combo de 3 !",
      mode: "Activation Bonus Central (combo 3)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 3",
      durationMs: 28000,
      pacingBPM: 118,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Précision: renforcement moyens, petits via zone.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2 rouges. Zone centrale NON impactée.",
      instructions: "Activez la zone JAUNE (petits) via un combo de 3 !",
      mode: "Activation Bonus Central (combo 3)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 4",
      durationMs: 30000,
      pacingBPM: 120,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 1, M: 4, S: 5 },
      sizeRule: "Majorité moyens, petits situés en zone dédiée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2 rouges. Zone centrale NON impactée.",
      instructions: "Combo de 4 = Central. 5 d’affilée = x3 !",
      mode: "Activation Bonus Central (combo 4)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 5",
      durationMs: 30000,
      pacingBPM: 122,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 1, M: 4, S: 5 },
      sizeRule: "Majorité moyens, petits situés en zone dédiée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2 rouges. Zone centrale NON impactée.",
      instructions: "Combo de 4 = Central. 5 d’affilée = x3 !",
      mode: "Activation Bonus Central (combo 4)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 6",
      durationMs: 31000,
      pacingBPM: 124,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 1, M: 4, S: 5 },
      sizeRule: "Majorité moyens, petits situés en zone dédiée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2 rouges. Zone centrale NON impactée.",
      instructions: "Combo de 4 = Central. 5 d’affilée = x3 !",
      mode: "Activation Bonus Central (combo 4)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 7",
      durationMs: 32000,
      pacingBPM: 126,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 1, M: 4, S: 5 },
      sizeRule: "Majorité moyens, petits situés en zone dédiée.",
      traps: "Rouge = trou piégé (-100), clignotant. Validation coupe le multiplicateur en cours. 2 rouges. Zone centrale NON impactée.",
      instructions: "Évitez les rouges. Débloquez les petits JAUNES !",
      mode: "Activation Bonus Central (combo 4)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 8",
      durationMs: 33000,
      pacingBPM: 128,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 1, M: 4, S: 5 },
      sizeRule: "Majorité moyens, petits situés en zone dédiée.",
      traps: "Un trou peut devenir ROUGE (2s). Évitez-le ! Pas de purge possible.",
      instructions: "Un trou peut devenir ROUGE (2s). Évitez-le ! Pas de purge possible.",
      mode: "Caméléon Rouge Interdit (mix)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 9",
      durationMs: 33000,
      pacingBPM: 128,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 1, M: 4, S: 5 },
      sizeRule: "Majorité moyens, petits situés en zone dédiée.",
      traps: "Les petits trous s’allument 1 par 1 (3s). Touchez-les vite !",
      instructions: "Les petits trous s’allument 1 par 1 (3s). Touchez-les vite !",
      mode: "Déclenche Boutons (réflexe)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
    {
      name: "Manche 2, Niveau 10",
      durationMs: 30000,
      pacingBPM: 128,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 1, M: 4, S: 5 },
      sizeRule: "Majorité moyens, petits situés en zone dédiée.",
      traps: "Un trou (moyen ou petit actif) peut devenir ROUGE (2s). Évitez-le !",
      instructions: "Un trou (moyen ou petit actif) peut devenir ROUGE (2s). Évitez-le !",
      mode: "Déclenche Boutons (réflexe)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +1s par petit trou, max +5s, rétroéclairage ON."
      }
    },
  
    // -------------- Manche 3 --------------
    {
      name: "Manche 3, Niveau 1",
      durationMs: 26000,
      pacingBPM: 130,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Mix avec introduction panneau en réflexe.",
      traps: "—",
      instructions: "Activez Tape-Taupe via combo 3, frappez les boutons VERTS !",
      mode: "Déclenche Boutons (réflexe)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "+5s par petits, cap 5s, rétroéclairage ON."
      },
      panel: {
        mode: "reflex",
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "10s initiaux, +2s/hit sur trous cibles (cap 20s)."
      }
    },
    {
      name: "Manche 3, Niveau 2",
      durationMs: 27000,
      pacingBPM: 132,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Mix avec introduction panneau en réflexe.",
      traps: "—",
      instructions: "Activez Tape-Taupe via combo 3, frappez les boutons VERTS !",
      mode: "Déclenche Boutons (réflexe)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "+5s par petits, cap 5s, rétroéclairage ON."
      },
      panel: {
        mode: "reflex",
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "12s initiaux, +2s/hit sur trous cibles (cap 22s)."
      }
    },
    {
      name: "Manche 3, Niveau 3",
      durationMs: 28000,
      pacingBPM: 134,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Mix avec introduction panneau en réflexe.",
      traps: "—",
      instructions: "Activez Tape-Taupe via combo 3, frappez les boutons VERTS !",
      mode: "Déclenche Boutons (réflexe)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "+5s par petits, cap 5s, rétroéclairage ON."
      },
      panel: {
        mode: "reflex",
        trigger: "Débloqué par combo 3 sur trous (fenêtre 10s).",
        duration: "14s initiaux, +2s/hit sur trous cibles (cap 24s)."
      }
    },
    {
      name: "Manche 3, Niveau 4",
      durationMs: 29000,
      pacingBPM: 136,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Mémoire couleurs, séquence croissante.",
      traps: "—",
      instructions: "Combo 4 pour ouvrir MEMOIRE (6 couleurs).",
      mode: "Mémoire couleurs (3→8) + Central",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "+5s par petits, cap 5s, rétroéclairage ON."
      },
      panel: { mode: "memory", colors: 6, trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).", duration: "10s initiaux, +2s/hit sur trous cibles (cap 20s)." }
    },
    {
      name: "Manche 3, Niveau 5",
      durationMs: 30000,
      pacingBPM: 138,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Mémoire couleurs, séquence croissante.",
      traps: "—",
      instructions: "Combo 4 pour ouvrir MEMOIRE (7 couleurs).",
      mode: "Mémoire couleurs (3→8) + Central",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "+5s par petits, cap 5s, rétroéclairage ON."
      },
      panel: { mode: "memory", colors: 7, trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).", duration: "12s initiaux, +2s/hit sur trous cibles (cap 22s)." }
    },
    {
      name: "Manche 3, Niveau 6",
      durationMs: 31000,
      pacingBPM: 140,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Mémoire couleurs, séquence croissante.",
      traps: "—",
      instructions: "Combo 4 pour ouvrir MEMOIRE (8 couleurs).",
      mode: "Mémoire couleurs (3→8) + Central",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).",
        duration: "+5s par petits, cap 5s, rétroéclairage ON."
      },
      panel: { mode: "memory", colors: 8, trigger: "Débloqué par combo 4 sur trous (fenêtre 10s).", duration: "14s initiaux, +2s/hit sur trous cibles (cap 24s)." }
    },
    {
      name: "Manche 3, Niveau 7",
      durationMs: 32000,
      pacingBPM: 142,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Réflexe anti-rouge.",
      traps: "Caméléon Rouge Interdit (avancé).",
      instructions: "Un trou actif devient ROUGE (2s). Purgez-le au panneau (bouton de sa couleur d’origine) !",
      mode: "Caméléon Rouge Interdit (avancé)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: { trigger: "Déclenché par combo 4 sur trous principaux", duration: "—" },
      panel: { mode: "reflex+purge", duration: "Fenêtre de purge ouverte 2s après switch rouge (taper le bouton correspondant)" }
    },
    {
      name: "Manche 3, Niveau 8",
      durationMs: 33000,
      pacingBPM: 144,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Réflexe + désactivation rouge via boutons.",
      traps: "—",
      instructions: "Les petits trous s’allument 1 par 1 (1-2s). Touchez-les vite !",
      mode: "Roulette Bonus (rapide)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Roulette auto après combo 5 sur trous principaux.",
        duration: "Chaque trou petit touché ajoute +2s au cycle (cap 20s)."
      },
      panel: { mode: "reflex", duration: "10s initiaux, +2s/hit sur trous cibles (cap 20s)." }
    },
    {
      name: "Manche 3, Niveau 9",
      durationMs: 33000,
      pacingBPM: 146,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Réflexe anti-rouge (purge immédiate).",
      traps: "Caméléon Rouge Interdit (difficile).",
      instructions: "Attention: un trou actif peut devenir ROUGE (interdit) pendant 2s. Évitez-le !",
      mode: "Caméléon Rouge Interdit (difficile)",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Combo 5 sur trous principaux",
        duration: "+2s/hit sur trous cibles (cap 24s)"
      },
      panel: { mode: "anti-rouge", duration: "Fenêtre de purge ouverte 2s après switch rouge" }
    },
    {
      name: "Manche 3, Niveau 10",
      durationMs: 31000,
      pacingBPM: 148,
      activeZones: [1,2,3,4,5,6,7,8],
      sizesActive: ["L","M","S"],
      concurrency: { L: 2, M: 4, S: 5 },
      sizeRule: "Mix final.",
      traps: "—",
      instructions: "Suivez la séquence, évitez ROUGE, exploitez x3 !",
      mode: "Mix final",
      multiplier: {
        activation: "x2: 2 hits consécutifs dans une couleur imposée. x3: 3 hits dont ≥1 petit trou bonus.",
        duration: "x2 10s, x3 12s. Réactivation nécessaire."
      },
      bonus: {
        trigger: "Débloqué par combo 5 sur trous (fenêtre 12s).",
        duration: "+5s par petits, cap 5s, rétroéclairage ON."
      },
      panel: { mode: "mix" }
    }
  ];
  

/* ------------------------------ Game engine ------------------------------ */

const GAME_STATE = {
  IDLE: "IDLE",
  PREPARE: "PREPARE",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  ENDED: "ENDED",
};

// High-level event bus (start, stop, hit, panel)
const bus = new EventEmitter();

class StrikeLoop {
  constructor() {
    this.state = GAME_STATE.IDLE;
    this.phaseIndex = -1;
    this.phaseStartTs = 0;
    this.beatTimer = null;
    this.phaseTimer = null;
    this.barTimer = null;
    this.session = null;
    this.stateBag = null;

    this._frozen = null;

    this._bindHighLevelEvents();
    this._bindHardware();
    this._bindKeyboard();

    console.log(ts(), "[GAME] Ready. Press s to start. Type h for help.");
  }

  log(msg) {
    console.log(ts(), "[GAME]", msg);
  }
  warn(msg) {
    console.warn(ts(), "[WARN]", msg);
  }

  resetSession() {
    this.session = { score: 0, hits: 0, phaseHits: 0, startedAt: 0, consecutiveHits: 0, lastHitColors: [] };
    this.stateBag = { 
      multiplier: 1.0, 
      panelProgress: [],
      activeBonusZone: false,
      bonusZoneTimer: null,
      multiplierTimer: null,
      redTraps: new Set(),
      chameleonTimer: null,
      panelMode: null,
      panelSequence: [],
      panelTimer: null,
      activeTargets: new Map(), // hole -> {size, pattern, spawnTime} mapping
      rouletteIndex: 0,
      rouletteTimer: null,
      holePatterns: new Map(), // hole -> current LED pattern/color
      targetTimeouts: new Map(), // hole -> timeout ID for auto-expire
      lastSpawnTime: 0 // prevent too frequent spawning
    };
  }

  currentPhase() {
    return PHASES[this.phaseIndex] || null;
  }

  async start() {
    if (![GAME_STATE.IDLE, GAME_STATE.ENDED].includes(this.state)) {
      this.warn(`Cannot start in state ${this.state}.`);
      return;
    }
    this.resetSession();
    this.session.startedAt = Date.now();
    this.state = GAME_STATE.PREPARE;
    this.log("Session starting, preparing outputs.");
    allOff();
    await pulse(OUTPUT_MAP.FX.STROBE, 120);
    await this._advancePhase("start");
  }

  async _advancePhase(reason) {
    this._clearTimers();

    const prev = this.currentPhase();
    if (prev && typeof prev.onExit === "function") {
      try {
        await prev.onExit(this._ctx(), reason);
      } catch (e) {
        this.warn(`onExit error: ${e.message}`);
      }
    }

    this.phaseIndex += 1;
    this.session.phaseHits = 0;

    const phase = this.currentPhase();
    if (!phase) {
      this.log("No more phases, session complete.");
      await pulse(OUTPUT_MAP.FX.BUZZER, 200);
      await this.end("complete");
      return;
    }

    this.state = GAME_STATE.RUNNING;
    this.phaseStartTs = Date.now();

    if (typeof phase.onEnter === "function") {
      try {
        await phase.onEnter(this._ctx());
      } catch (e) {
        this.warn(`onEnter error: ${e.message}`);
      }
    }

    // Beat timer
    if (phase.pacingBPM && phase.pacingBPM > 0) {
      const beatMs = Math.max(120, Math.round(60000 / phase.pacingBPM));
      let beat = 0;
      this.beatTimer = setInterval(async () => {
        beat += 1;
        try {
          if (phase.onBeat) await phase.onBeat(this._ctx(), beat);
          await this._onBeat(beat, phase);
        } catch (e) {
          this.warn(`onBeat error: ${e.message}`);
        }
      }, beatMs);
    }

    // Start phase-specific mechanics
    await this._startPhaseLogic(phase);

    // Hard timeout
    const ms = phase.durationMs || 30000;
    this.phaseTimer = setTimeout(async () => {
      this.log("Phase time up.");
      await this._advancePhase("timeout");
    }, ms);

    // Progress bar on the front panel bargraph (1..100)
    this.barTimer = setInterval(() => {
      const elapsed = Date.now() - this.phaseStartTs;
      const pct = Math.max(1, Math.min(100, Math.round((elapsed / ms) * 100)));
      // console.log(`[DEV] Simulating: setBarled(${pct})`); // Disabled - too verbose
      // try {
      //   arduino.setBarled(pct);
      // } catch {}
    }, 200);

    this.log(`Phase started: ${phase.name} for ${Math.round(ms / 1000)} s`);
  }

  async pause() {
    if (this.state !== GAME_STATE.RUNNING) return;
    this.state = GAME_STATE.PAUSED;
    this.log("Paused.");
    this._freezeTimers();
  }

  async resume() {
    if (this.state !== GAME_STATE.PAUSED) return;
    this.state = GAME_STATE.RUNNING;
    this.log("Resumed.");
    await this._unfreezeTimers();
  }

  async end(reason) {
    this._clearTimers();
    this.state = GAME_STATE.ENDED;
    allOff();
    this.log(
      `Session ended, reason ${reason}. Score ${this.session.score}, Hits ${this.session.hits}`
    );
    this.log("Back to idle, press s to start again.");
  }

  async shutdown() {
    this.log("Shutting down.");
    this._clearTimers();
    allOff();
    process.exit(0);
  }

  async handleHit(zone, size) {
    if (this.state !== GAME_STATE.RUNNING) return;
    const phase = this.currentPhase();
    if (!phase) return;

    if (!phase.activeZones.includes(zone)) return;
    if (!phase.sizesActive.includes(size)) return;

    // Check if hitting a red trap
    const holeId = OUTPUT_MAP.HOLES[zone - 1];
    if (this.stateBag.redTraps.has(holeId)) {
      this.session.score = Math.max(0, this.session.score - 100);
      this.session.consecutiveHits = 0;
      this.session.lastHitColors = [];
      this.stateBag.multiplier = 1.0;
      this.log(`RED TRAP HIT! -100 points, multiplier reset. Score: ${this.session.score}`);
      await pulse(OUTPUT_MAP.FX.BUZZER, 300);
      return;
    }

    this.session.hits += 1;
    this.session.phaseHits += 1;
    this.session.consecutiveHits += 1;
    this.session.lastHitColors.push(size); // Track hit sequence
    if (this.session.lastHitColors.length > 5) this.session.lastHitColors.shift();

    // Check for multiplier activation
    await this._checkMultiplier(phase, { zone, size });

    // Check for bonus zone activation
    await this._checkBonusZone(phase);

    // Check for panel activation
    await this._checkPanelActivation(phase);

    // Scoring
    const base = size === "L" ? 10 : size === "M" ? 20 : 30;
    const add = Math.round(base * this.stateBag.multiplier);
    this.session.score += add;
    this.log(`Hit Z${zone}-${size} +${add} (x${this.stateBag.multiplier.toFixed(1)}) → ${this.session.score}`);

    // Clear the hit target
    this._clearHitTarget(zone);
    
    // Visual feedback - brief pulse then turn off
    await pulse(holeId, 150);

    if (phase.onHit) {
      try {
        await phase.onHit(this._ctx(), { zone, size });
      } catch (e) {
        this.warn(`onHit error: ${e.message}`);
      }
    }

    if (phase.requiredHits && this.session.phaseHits >= phase.requiredHits) {
      this.log(`Phase cleared by hits, needed ${phase.requiredHits}.`);
      await this._advancePhase("cleared");
    }
  }

  async handlePanel(button) {
    if (this.state !== GAME_STATE.RUNNING) return;
    const phase = this.currentPhase();

    // Handle red trap purging
    if (this.stateBag.redTraps.size > 0) {
      const purged = await this._handleTrapPurge(button);
      if (purged) return;
    }

    // Handle panel modes
    if (this.stateBag.panelMode) {
      await this._handlePanelMode(button, phase);
      return;
    }

    // Legacy panel handling
    if (phase && phase.buttonPanel) {
      const panel = phase.buttonPanel;

      if (panel.mode === "sequence") {
        const expected = panel.sequence[this.stateBag.panelProgress.length];
        if (button === expected) {
          this.stateBag.panelProgress.push(button);
          setOn(OUTPUT_MAP.PANEL.STEP1);
          if (this.stateBag.panelProgress.length >= 2) setOn(OUTPUT_MAP.PANEL.STEP2);
          if (this.stateBag.panelProgress.length >= 3) setOn(OUTPUT_MAP.PANEL.STEP3);
          this.log(`Panel sequence OK: ${this.stateBag.panelProgress.join("→")}`);
          if (this.stateBag.panelProgress.length === panel.sequence.length) {
            this.log("Panel sequence complete, activating bonus.");
            await pulse(OUTPUT_MAP.PANEL.OK, 400);
            await pulse(OUTPUT_MAP.BONUS, 600);
            this.session.score += 100;
            this.log(`Bonus +100 → total ${this.session.score}`);
            this.stateBag.panelProgress = [];
          }
        } else {
          this.log(`Panel wrong button ${button}, expected ${expected}.`);
          await pulse(OUTPUT_MAP.PANEL.FAIL, 200);
          this.stateBag.panelProgress = [];
          setOff(OUTPUT_MAP.PANEL.STEP1);
          setOff(OUTPUT_MAP.PANEL.STEP2);
          setOff(OUTPUT_MAP.PANEL.STEP3);
        }
      } else {
        // free mode
        this.session.score += 5;
        this.log(`Panel bonus +5 → total ${this.session.score}`);
        await pulse(OUTPUT_MAP.PANEL.OK, 80);
      }
    }
  }

  /* -------------------------- Wiring and UI hooks ------------------------- */

  _ctx() {
    return { log: (m) => this.log(m), state: this.stateBag };
  }

  _bindHighLevelEvents() {
    bus.on("start", () => this.start());
    bus.on("stop", () => this.end("stop"));
    bus.on("pause", () => this.pause());
    bus.on("resume", () => this.resume());
    bus.on("hit", ({ zone, size }) => this.handleHit(zone, size));
    bus.on("panel", ({ button }) => this.handlePanel(button));
  }

  _bindHardware() {
    // Command failures from arduino transport - disabled in dev mode
    arduino.emitter.on("cmdFailedEvent", (msg) => {
      //console.log(`[DEV] Simulating: Arduino command success (${msg || "no details"})`);
    });

    // Decode input frames to edges
    const lastMaskByGroup = new Map();

    arduino.emitter.on("EventInput", (mes, mask) => {
      // mes is like "01", mask is a number
      const prev = lastMaskByGroup.get(mes) ?? 0;
      const rising = (~prev) & mask;
      if (rising) {
        for (let bit = 0; bit < 16; bit++) {
          if (rising & (1 << bit)) {
            this._dispatchEdge(mes, bit);
          }
        }
      }
      lastMaskByGroup.set(mes, mask);
    });
  }

  _dispatchEdge(group, bit) {
    // Start
    if (group === INPUT_MAP.START.group && bit === INPUT_MAP.START.bit) {
      this.log("Start button edge.");
      bus.emit("start");
      return;
    }
    // Stop
    if (group === INPUT_MAP.STOP.group && bit === INPUT_MAP.STOP.bit) {
      this.warn("Stop button edge.");
      bus.emit("stop");
      return;
    }
    // This is now handled above in the unified panel button handling
    // Main hole hits (group 02)
    if (group === INPUT_MAP.HOLES.group) {
      const zone = bit + 1; // bits 0..7 → zones 1..8
      if (zone >= 1 && zone <= 8) {
        // Determine size based on active target for this hole
        const targetInfo = this.stateBag.activeTargets.get(zone);
        const size = targetInfo ? targetInfo.size : 'L'; // Default to Large if no specific target
        this.log(`Hole ${zone} hit, detected as ${size}`);
        bus.emit("hit", { zone, size });
        return;
      }
    }
    
    // Central bonus holes (group 03)
    if (group === INPUT_MAP.CENTRAL_HOLES.group) {
      const centralHole = bit + 1; // bits 0..4 → central holes 1..5
      if (centralHole >= 1 && centralHole <= 5 && this.stateBag.activeBonusZone) {
        this.log(`Central hole ${centralHole} hit`);
        bus.emit("hit", { zone: centralHole + 8, size: 'S' }); // Treat as small hits, zones 9-13
        return;
      }
    }
    
    // Panel buttons (group 04)
    if (group === INPUT_MAP.PANEL_BUTTONS.group) {
      const button = bit + 1; // bits 0..8 → buttons 1..9
      if (button >= 1 && button <= 9) {
        this.log(`Panel button ${button} pressed`);
        bus.emit("panel", { button });
        return;
      }
    }

    // Unknown mapping
    this.warn(`Unmapped input edge group ${group}, bit ${bit}. Update INPUT_MAP.`);
  }

  _zoneFromBit(cfg, bit) {
    // reverse lookup for non-linear mapping
    for (let z = 1; z <= 8; z++) {
      if (cfg.bitForZone(z) === bit) return z;
    }
    return -1;
  }

  _bindKeyboard() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "[cmd] " });
    const help = () => {
      console.log("");
      console.log("Commands:");
      console.log("  s        start session");
      console.log("  p        pause or resume");
      console.log("  x        stop (emergency)");
      console.log("  q        quit");
      console.log("  r        end session to idle");
      console.log("  1..8     simulate LARGE hit at zone");
      console.log("  m1..m8   simulate MEDIUM hit at zone");
      console.log("  s1..s8   simulate SMALL hit at zone");
      console.log("  bN       panel button N");
      console.log("  h        help");
      console.log("");
    };
    help();
    rl.prompt();

    rl.on("line", async (line) => {
      const cmd = line.trim().toLowerCase();
      if (cmd === "h") help();
      else if (cmd === "s") bus.emit("start");
      else if (cmd === "p") this.state === GAME_STATE.RUNNING ? bus.emit("pause") : bus.emit("resume");
      else if (cmd === "x") bus.emit("stop");
      else if (cmd === "q") return this.shutdown();
      else if (cmd === "r") await this.end("reset");
      else if (/^[1-8]$/.test(cmd)) bus.emit("hit", { zone: Number(cmd), size: "L" });
      else if (/^m[1-8]$/.test(cmd)) bus.emit("hit", { zone: Number(cmd.slice(1)), size: "M" });
      else if (/^s[1-8]$/.test(cmd)) bus.emit("hit", { zone: Number(cmd.slice(1)), size: "S" });
      else if (/^b[0-9]+$/.test(cmd)) bus.emit("panel", { button: Number(cmd.slice(1)) });
      else console.log("Unknown command, type h for help.");
      rl.prompt();
    });

    process.on("SIGINT", async () => {
      console.log("");
      await this.shutdown();
    });
  }

  /* --------------------------- timer management --------------------------- */

  _clearTimers() {
    if (this.beatTimer) clearInterval(this.beatTimer);
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    if (this.barTimer) clearInterval(this.barTimer);
    this.beatTimer = null;
    this.phaseTimer = null;
    this.barTimer = null;
    this._frozen = null;
  }

  _freezeTimers() {
    const phase = this.currentPhase();
    if (!phase || !this.phaseTimer) return;
    const elapsed = Date.now() - this.phaseStartTs;
    const total = phase.durationMs || 30000;
    this._frozen = { remainingMs: Math.max(0, total - elapsed) };
    this._clearTimers();
  }

  async _unfreezeTimers() {
    const phase = this.currentPhase();
    if (!phase) return;

    // Beat
    if (phase.pacingBPM && phase.pacingBPM > 0) {
      const beatMs = Math.max(120, Math.round(60000 / phase.pacingBPM));
      let beat = 0;
      this.beatTimer = setInterval(async () => {
        beat += 1;
        try {
          if (phase.onBeat) await phase.onBeat(this._ctx(), beat);
          await this._onBeat(beat, phase);
        } catch (e) {
          this.warn(`onBeat error: ${e.message}`);
        }
      }, beatMs);
    }

    // Phase timer
    const ms = this._frozen?.remainingMs ?? (phase.durationMs || 30000);
    this.phaseTimer = setTimeout(async () => {
      this.log("Phase time up.");
      await this._advancePhase("timeout");
    }, ms);
    this.phaseStartTs = Date.now();

    // Bar (progress indicator - disabled in dev mode to reduce log spam)
    this.barTimer = setInterval(() => {
      const elapsed = Date.now() - this.phaseStartTs;
      const pct = Math.max(1, Math.min(100, Math.round((elapsed / ms) * 100)));
      // console.log(`[DEV] Simulating: setBarled(${pct})`); // Disabled - too verbose
      // try {
      //   arduino.setBarled(pct);
      // } catch {}
    }, 200);

    // Start phase-specific mechanics and initial target spawning
    try {
      await this._startPhaseLogic(phase);
    } catch (e) {
      this.warn(`Phase logic error: ${e.message}`);
    }
  }

  /* ----------------------- New Game Mechanics Implementation ----------------------- */

  async _checkMultiplier(phase, hit) {
    const { zone, size } = hit;
    
    // Clear existing multiplier timer
    if (this.stateBag.multiplierTimer) {
      clearTimeout(this.stateBag.multiplierTimer);
      this.stateBag.multiplierTimer = null;
    }

    // Determine multiplier rules based on phase (simplified from CSV patterns)
    const isManche1 = phase.name.includes("Manche 1");
    const isManche2 = phase.name.includes("Manche 2");
    const isManche3 = phase.name.includes("Manche 3");

    let x2Achieved = false;
    let x3Achieved = false;

    if (isManche1) {
      // x2: 2 consecutive hits, x3: 3 consecutive hits
      if (this.session.consecutiveHits >= 2) x2Achieved = true;
      if (this.session.consecutiveHits >= 3) x3Achieved = true;
    } else if (isManche2) {
      // x2: 2 hits consecutive in imposed color, x3: 3 hits with at least 1 small
      if (this.session.consecutiveHits >= 2 && this._checkColorSequence(2)) x2Achieved = true;
      if (this.session.consecutiveHits >= 3 && this.session.lastHitColors.includes("S")) x3Achieved = true;
    } else if (isManche3) {
      // x2: 2 consecutive without red, x3: 3 consecutive color sequence
      if (this.session.consecutiveHits >= 2 && !this._recentlyHitRed()) x2Achieved = true;
      if (this.session.consecutiveHits >= 3 && this._checkColorSequence(3)) x3Achieved = true;
    }

    if (x3Achieved && this.stateBag.multiplier < 3) {
      this.stateBag.multiplier = 3.0;
      this.log("MULTIPLIER x3 ACTIVATED!");
      await pulse(OUTPUT_MAP.FX.STROBE, 200);
      // Set timer for 10-12s duration
      this.stateBag.multiplierTimer = setTimeout(() => {
        this.stateBag.multiplier = 1.0;
        this.log("Multiplier x3 expired");
      }, isManche3 ? 10000 : 12000);
    } else if (x2Achieved && this.stateBag.multiplier < 2) {
      this.stateBag.multiplier = 2.0;
      this.log("MULTIPLIER x2 ACTIVATED!");
      await pulse(OUTPUT_MAP.FX.AMBIENT, 150);
      // Set timer for 8-10s duration
      this.stateBag.multiplierTimer = setTimeout(() => {
        this.stateBag.multiplier = 1.0;
        this.log("Multiplier x2 expired");
      }, isManche3 ? 8000 : 10000);
    }
  }

  async _checkBonusZone(phase) {
    if (!phase.bonus || phase.bonus.trigger === "—") return;

    const comboNeeded = phase.bonus.trigger.includes("combo 3") ? 3 : 
                       phase.bonus.trigger.includes("combo 4") ? 4 : 
                       phase.bonus.trigger.includes("combo 5") ? 5 : 0;

    if (comboNeeded > 0 && this.session.consecutiveHits >= comboNeeded && !this.stateBag.activeBonusZone) {
      this.stateBag.activeBonusZone = true;
      this.log(`BONUS ZONE ACTIVATED by combo ${comboNeeded}!`);
      
      // Turn on central backlight (activates all 5 small holes)
      setOn(OUTPUT_MAP.CENTRAL_BACKLIGHT);
      await pulse(OUTPUT_MAP.FX.STROBE, 500);
      
      // Set duration (10-15s base + extensions)
      const baseDuration = phase.bonus.duration?.includes("10s") ? 10000 :
                          phase.bonus.duration?.includes("12s") ? 12000 :
                          phase.bonus.duration?.includes("15s") ? 15000 : 10000;
      
      this.stateBag.bonusZoneTimer = setTimeout(() => {
        this._deactivateBonusZone();
      }, baseDuration);
    }
  }

  async _checkPanelActivation(phase) {
    if (!phase.panel) return;

    const comboNeeded = phase.panel.trigger?.includes("combo 3") ? 3 : 
                       phase.panel.trigger?.includes("combo 4") ? 4 : 
                       phase.panel.trigger?.includes("combo 5") ? 5 : 0;

    if (comboNeeded > 0 && this.session.consecutiveHits >= comboNeeded && !this.stateBag.panelMode) {
      this.log(`PANEL MODE ACTIVATED: ${phase.panel.mode}`);
      this.stateBag.panelMode = phase.panel.mode;
      
      if (phase.panel.mode === "reflex") {
        await this._startReflexMode();
      } else if (phase.panel.mode === "memory") {
        await this._startMemoryMode(phase.panel.colors || 6);
      }
      
      // Set panel duration
      const duration = this._parsePanelDuration(phase.panel.duration);
      this.stateBag.panelTimer = setTimeout(() => {
        this._deactivatePanel();
      }, duration);
    }
  }

  async _startReflexMode() {
    this.log("Reflex mode: Hit the lit buttons!");
    setOn(OUTPUT_MAP.PANEL_BUTTONS[0]); // Light first button as ready indicator
    
    // Start random button lighting
    const lightRandomButton = async () => {
      if (this.stateBag.panelMode !== "reflex") return;
      
      const buttonIndex = Math.floor(Math.random() * 9); // 0-8 for 9 buttons
      const buttonLed = OUTPUT_MAP.PANEL_BUTTONS[buttonIndex];
      await pulse(buttonLed, 1500);
      
      setTimeout(lightRandomButton, 2000 + Math.random() * 1000);
    };
    
    setTimeout(lightRandomButton, 500);
  }

  async _startMemoryMode(colors) {
    this.log(`Memory mode: Remember ${colors} button sequence!`);
    this.stateBag.panelSequence = [];
    
    // Generate random button sequence (1-9)
    for (let i = 0; i < colors; i++) {
      const buttonNum = Math.floor(Math.random() * 9) + 1; // 1-9
      this.stateBag.panelSequence.push(buttonNum);
    }
    
    // Show sequence
    for (let i = 0; i < this.stateBag.panelSequence.length; i++) {
      setTimeout(async () => {
        const buttonNum = this.stateBag.panelSequence[i];
        const led = OUTPUT_MAP.PANEL_BUTTONS[buttonNum - 1];
        await pulse(led, 800);
      }, i * 1000);
    }
    
    this.stateBag.panelProgress = [];
    this.log(`Sequence: ${this.stateBag.panelSequence.join('-')} - now repeat it!`);
  }

  async _deactivateBonusZone() {
    this.stateBag.activeBonusZone = false;
    this.log("Bonus zone deactivated");
    
    // Turn off central backlight (controls all 5 small holes)
    setOff(OUTPUT_MAP.CENTRAL_BACKLIGHT);
  }

  async _deactivatePanel() {
    this.log(`Panel mode ${this.stateBag.panelMode} deactivated`);
    this.stateBag.panelMode = null;
    this.stateBag.panelSequence = [];
    this.stateBag.panelProgress = [];
    
    // Turn off all panel button LEDs
    OUTPUT_MAP.PANEL_BUTTONS.forEach(id => setOff(id));
  }

  async _handleTrapPurge(button) {
    // Simplified purge logic - button press removes one red trap
    if (this.stateBag.redTraps.size > 0) {
      const firstTrap = this.stateBag.redTraps.values().next().value;
      this.stateBag.redTraps.delete(firstTrap);
      setOff(firstTrap); // Turn off red trap
      this.log(`Red trap purged by button ${button}`);
      await pulse(OUTPUT_MAP.PANEL.OK, 200);
      return true;
    }
    return false;
  }

  async _handlePanelMode(button, phase) {
    if (this.stateBag.panelMode === "reflex") {
      // In reflex mode, any button press gives points
      this.session.score += 20;
      this.log(`Reflex hit! +20 points`);
      await pulse(OUTPUT_MAP.PANEL.OK, 100);
      
    } else if (this.stateBag.panelMode === "memory") {
      // Check if button matches sequence
      const expectedIndex = this.stateBag.panelProgress.length;
      const expected = this.stateBag.panelSequence[expectedIndex];
      
      if (button === expected) {
        this.stateBag.panelProgress.push(expected);
        this.log(`Memory sequence correct: ${this.stateBag.panelProgress.length}/${this.stateBag.panelSequence.length}`);
        
        if (this.stateBag.panelProgress.length === this.stateBag.panelSequence.length) {
          this.session.score += 100;
          this.log(`Memory sequence complete! +100 points`);
          await pulse(OUTPUT_MAP.PANEL_BUTTONS[4], 400); // Use 5th button as OK indicator
          this._deactivatePanel();
        } else {
          await pulse(OUTPUT_MAP.PANEL_BUTTONS[button - 1], 150); // Confirm correct button
        }
      } else {
        this.log(`Memory sequence wrong! Expected ${expected}, got ${button}`);
        await pulse(OUTPUT_MAP.PANEL_BUTTONS[8], 300); // Use 9th button as FAIL indicator
        this.stateBag.panelProgress = [];
      }
    }
  }

  async _onBeat(beat, phase) {
    // Spawn new targets if needed (don't replace existing ones)
    await this._spawnTargetsIfNeeded(phase);
    
    // Handle chameleon traps
    if (phase.traps?.includes("Caméléon") && Math.random() < 0.1) {
      await this._activateRandomTrap();
    }
    
    // Handle roulette mode
    if (phase.sizeRule?.includes("Roulette")) {
      await this._updateRoulette();
    }
  }

  async _spawnTargetsIfNeeded(phase) {
    const concurrency = phase.concurrency || { L: 4, M: 0, S: 0 };
    
    // Count current active targets by size
    const currentCounts = { L: 0, M: 0, S: 0 };
    for (const [zone, target] of this.stateBag.activeTargets) {
      if (target && target.size) {
        currentCounts[target.size]++;
      }
    }
    
    // Spawn targets for each size that's under quota
    for (const [size, targetCount] of Object.entries(concurrency)) {
      if (!phase.sizesActive.includes(size) || targetCount === 0) continue;
      
      const needed = targetCount - currentCounts[size];
      for (let i = 0; i < needed; i++) {
        await this._spawnSingleTarget(phase, size);
      }
    }
  }
  
  async _spawnSingleTarget(phase, size) {
    // Prevent too frequent spawning
    const now = Date.now();
    if (now - this.stateBag.lastSpawnTime < 100) return; // Min 100ms between spawns
    
    // Find available zones (not currently active)
    const availableZones = phase.activeZones.filter(zone => 
      !this.stateBag.activeTargets.has(zone)
    );
    
    if (availableZones.length === 0) return; // No available holes
    
    // Pick random available zone
    const zone = availableZones[Math.floor(Math.random() * availableZones.length)];
    const holeId = OUTPUT_MAP.HOLES[zone - 1];
    
    if (holeId) {
      // Set the target info for this hole
      const targetInfo = { 
        size, 
        pattern: this._getSizePattern(size), 
        spawnTime: now 
      };
      
      this.stateBag.activeTargets.set(zone, targetInfo);
      this.stateBag.holePatterns.set(holeId, targetInfo.pattern);
      
      // Turn on the hole LED
      setOn(holeId);
      
      // Set timeout for auto-expire (10-15 seconds based on size)
      const expireTime = size === 'L' ? 15000 : size === 'M' ? 12000 : 8000;
      const timeoutId = setTimeout(() => {
        this._expireTarget(zone);
      }, expireTime);
      
      this.stateBag.targetTimeouts.set(zone, timeoutId);
      this.stateBag.lastSpawnTime = now;
      
      this.log(`Target spawned: Hole ${zone} as ${size} (${targetInfo.pattern})`);
    }
  }
  
  async _expireTarget(zone) {
    if (!this.stateBag.activeTargets.has(zone)) return;
    
    const holeId = OUTPUT_MAP.HOLES[zone - 1];
    
    // Clear target state
    this.stateBag.activeTargets.delete(zone);
    this.stateBag.holePatterns.delete(holeId);
    
    // Clear timeout
    const timeoutId = this.stateBag.targetTimeouts.get(zone);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.stateBag.targetTimeouts.delete(zone);
    }
    
    // Turn off LED
    setOff(holeId);
    
    this.log(`Target expired: Hole ${zone}`);
  }

  async _activateRandomTrap() {
    // Pick a random active hole to turn red
    const activeHoles = Array.from(this.stateBag.activeTargets.keys());
    if (activeHoles.length === 0) return;
    
    const trapZone = activeHoles[Math.floor(Math.random() * activeHoles.length)];
    const trapHoleId = OUTPUT_MAP.HOLES[trapZone - 1];
    
    this.stateBag.redTraps.add(trapHoleId);
    this.stateBag.holePatterns.set(trapHoleId, 'RED_TRAP');
    this.log(`Hole ${trapZone} turned RED (trap)!`);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      this.stateBag.redTraps.delete(trapHoleId);
      // Restore original pattern if still active
      const targetInfo = this.stateBag.activeTargets.get(trapZone);
      if (targetInfo) {
        this.stateBag.holePatterns.set(trapHoleId, targetInfo.pattern);
      }
      this.log(`Red trap on hole ${trapZone} expired`);
    }, 2000);
  }

  async _updateRoulette() {
    // Roulette mode for central bonus area (5 small holes)
    if (!this.stateBag.activeBonusZone) return;
    
    // Central area roulette is controlled by the backlight pattern
    // In real hardware, this would cycle the backlight or show different patterns
    const patterns = ['ROULETTE_1', 'ROULETTE_2', 'ROULETTE_3', 'ROULETTE_4', 'ROULETTE_5'];
    const currentPattern = patterns[this.stateBag.rouletteIndex % patterns.length];
    
    console.log(`[DEV] Central roulette pattern: ${currentPattern}`);
    // The central backlight would show the appropriate roulette pattern
    
    this.stateBag.rouletteIndex++;
  }

  async _startPhaseLogic(phase) {
    // Initialize phase-specific mechanics
    this.log(`Starting phase logic for: ${phase.name}`);
    
    // Clear any existing state
    this._clearPhaseState();
    
    // Spawn initial targets to reach desired concurrency
    await this._spawnTargetsIfNeeded(phase);
  }

  async _clearHitTarget(zone) {
    if (!this.stateBag.activeTargets.has(zone)) return;
    
    const holeId = OUTPUT_MAP.HOLES[zone - 1];
    
    // Clear target state
    this.stateBag.activeTargets.delete(zone);
    this.stateBag.holePatterns.delete(holeId);
    
    // Clear timeout
    const timeoutId = this.stateBag.targetTimeouts.get(zone);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.stateBag.targetTimeouts.delete(zone);
    }
  }
  
  _clearPhaseState() {
    // Clear timers
    if (this.stateBag.bonusZoneTimer) clearTimeout(this.stateBag.bonusZoneTimer);
    if (this.stateBag.multiplierTimer) clearTimeout(this.stateBag.multiplierTimer);
    if (this.stateBag.panelTimer) clearTimeout(this.stateBag.panelTimer);
    if (this.stateBag.chameleonTimer) clearTimeout(this.stateBag.chameleonTimer);
    
    // Clear all target timeouts
    for (const timeoutId of this.stateBag.targetTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    
    // Reset state
    this.stateBag.activeBonusZone = false;
    this.stateBag.panelMode = null;
    this.stateBag.redTraps.clear();
    this.stateBag.activeTargets.clear();
    this.stateBag.holePatterns.clear();
    this.stateBag.targetTimeouts.clear();
    this.stateBag.rouletteIndex = 0;
    this.stateBag.lastSpawnTime = 0;
    
    // Turn off all targets
    allOff();
  }

  // Helper methods
  _checkColorSequence(length) {
    if (this.session.lastHitColors.length < length) return false;
    const recent = this.session.lastHitColors.slice(-length);
    return recent.length === length; // Simplified check
  }

  _recentlyHitRed() {
    return false; // Simplified - would check if recently hit a red trap
  }

  _parsePanelDuration(durationStr) {
    if (!durationStr) return 10000;
    const match = durationStr.match(/(\d+)s/);
    return match ? parseInt(match[1]) * 1000 : 10000;
  }

  _buttonToColor(button) {
    const colorMap = {
      1: 'RED', 2: 'GREEN', 3: 'BLUE', 4: 'YELLOW',
      5: 'ORANGE', 6: 'PURPLE', 7: 'WHITE', 8: 'CYAN', 9: 'PINK'
    };
    return colorMap[button] || 'WHITE';
  }
  
  _getSizePattern(size) {
    // Map target sizes to LED patterns/colors
    const patterns = {
      'L': 'GREEN',    // Large targets = green
      'M': 'BLUE',     // Medium targets = blue  
      'S': 'YELLOW'    // Small targets = yellow
    };
    return patterns[size] || 'GREEN';
  }
}

/* --------------------------------- Boot ---------------------------------- */

const game = new StrikeLoop();

/* --------------------------- Optional auto demo --------------------------- */
// setTimeout(() => bus.emit("start"), 1200);
// setTimeout(() => bus.emit("hit", { zone: 1, size: "L" }), 2500);
// setTimeout(() => bus.emit("panel", { button: 1 }), 4000);

