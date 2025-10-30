/**
 * Centralized Logging Utility
 *
 * Provides configurable log levels to reduce console spam while maintaining debuggability
 *
 * Log Levels:
 * - ERROR: Critical errors only
 * - WARN: Warnings and errors
 * - INFO: Important state changes (default)
 * - DEBUG: Detailed operational logs
 * - TRACE: Everything including repetitive actions
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

class Logger {
  constructor() {
    // Default to INFO level - shows important events without spam
    this.logLevel = LOG_LEVELS.INFO;

    // Per-module log level overrides
    this.moduleLogLevels = {
      STRIKELOOP: LOG_LEVELS.INFO,
      APP: LOG_LEVELS.INFO,
      'STAFF-WS': LOG_LEVELS.INFO,
      'DISPLAY-WS': LOG_LEVELS.INFO,
      ARDUINO: LOG_LEVELS.INFO,
      HAL: LOG_LEVELS.WARN,
      FRONTEND: LOG_LEVELS.INFO
    };
  }

  /**
   * Set global log level
   * @param {string} level - 'ERROR', 'WARN', 'INFO', 'DEBUG', or 'TRACE'
   */
  setLevel(level) {
    const levelUpper = level.toUpperCase();
    if (LOG_LEVELS[levelUpper] !== undefined) {
      this.logLevel = LOG_LEVELS[levelUpper];
      console.log(`[LOGGER] Global log level set to: ${levelUpper}`);
    } else {
      console.error(`[LOGGER] Invalid log level: ${level}`);
    }
  }

  /**
   * Set log level for a specific module
   * @param {string} module - Module name (e.g., 'STRIKELOOP', 'APP')
   * @param {string} level - Log level
   */
  setModuleLevel(module, level) {
    const levelUpper = level.toUpperCase();
    if (LOG_LEVELS[levelUpper] !== undefined) {
      this.moduleLogLevels[module] = LOG_LEVELS[levelUpper];
      console.log(`[LOGGER] ${module} log level set to: ${levelUpper}`);
    } else {
      console.error(`[LOGGER] Invalid log level: ${level}`);
    }
  }

  /**
   * Check if a log should be output
   * @private
   */
  _shouldLog(module, messageLevel) {
    const moduleLevel = this.moduleLogLevels[module] !== undefined
      ? this.moduleLogLevels[module]
      : this.logLevel;
    return messageLevel <= moduleLevel;
  }

  /**
   * Log an error message
   */
  error(module, ...args) {
    if (this._shouldLog(module, LOG_LEVELS.ERROR)) {
      console.error(`[${module}] ❌`, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(module, ...args) {
    if (this._shouldLog(module, LOG_LEVELS.WARN)) {
      console.warn(`[${module}] ⚠️`, ...args);
    }
  }

  /**
   * Log an info message (important state changes)
   */
  info(module, ...args) {
    if (this._shouldLog(module, LOG_LEVELS.INFO)) {
      console.log(`[${module}]`, ...args);
    }
  }

  /**
   * Log a debug message (detailed operations)
   */
  debug(module, ...args) {
    if (this._shouldLog(module, LOG_LEVELS.DEBUG)) {
      console.log(`[${module}]`, ...args);
    }
  }

  /**
   * Log a trace message (verbose, repetitive actions)
   */
  trace(module, ...args) {
    if (this._shouldLog(module, LOG_LEVELS.TRACE)) {
      console.log(`[${module}]`, ...args);
    }
  }

  /**
   * Log success messages (always at INFO level)
   */
  success(module, ...args) {
    if (this._shouldLog(module, LOG_LEVELS.INFO)) {
      console.log(`[${module}] ✅`, ...args);
    }
  }

  /**
   * Special formatted logging for serial commands
   */
  serial(message) {
    if (this._shouldLog('ARDUINO', LOG_LEVELS.DEBUG)) {
      console.log(`\x1b[36m╔════════════════════════════════════════╗\x1b[0m`);
      console.log(`\x1b[36m║\x1b[0m \x1b[1m\x1b[33mSERIAL WRITE → Controllino:\x1b[0m \x1b[1m\x1b[32m${message}\x1b[0m`);
      console.log(`\x1b[36m╚════════════════════════════════════════╝\x1b[0m`);
    }
  }

  /**
   * Condensed score update (single line)
   */
  scoreUpdate(oldScore, newScore, delta) {
    if (this._shouldLog('STRIKELOOP', LOG_LEVELS.INFO)) {
      const sign = delta >= 0 ? '+' : '';
      console.log(`[STRIKELOOP] Score: ${oldScore} → ${newScore} (${sign}${delta})`);
    }
  }

  /**
   * Condensed round timer (only show at intervals)
   */
  roundTimer(round, level, timeRemaining, interval = 10) {
    // Only log at intervals (e.g., every 10 seconds) or at 0
    const seconds = parseInt(timeRemaining.split(':')[1]);
    if (seconds % interval === 0 || seconds === 0) {
      if (this._shouldLog('STRIKELOOP', LOG_LEVELS.INFO)) {
        console.log(`[STRIKELOOP] Round ${round} Level ${level} time remaining: ${timeRemaining}`);
      }
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export singleton and LOG_LEVELS constant
module.exports = logger;
module.exports.LOG_LEVELS = LOG_LEVELS;
