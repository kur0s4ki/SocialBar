/**
 * SoundManager - Centralized audio management for Social Bar game
 * Handles all sound effects, background music, and round narration with ducking
 */

class SoundManager {
  constructor() {
    this.sounds = {};
    this.backgroundMusic = null;
    this.roundNarration = null;
    this.isInitialized = false;
    this.isMuted = false;

    // Volume levels
    this.masterVolume = 1.0;
    this.backgroundVolume = 0.4; // Background music at 40%
    this.duckedVolume = 0.15; // Ducked to 15% during narration
    this.sfxVolume = 0.7; // Sound effects at 70%

    // State tracking
    this.currentRound = 1;
    this.lastScore = 0;
    this.isBackgroundPlaying = false;
    this.isNarrationPlaying = false;
  }

  /**
   * Initialize and preload all audio files
   * Call this when the game component mounts
   */
  async init() {
    if (this.isInitialized) {
      console.log('[SOUNDMANAGER] Already initialized');
      return;
    }

    console.log('[SOUNDMANAGER] Initializing sound system...');

    try {
      // Preload all sound effects
      this.sounds.trap = await this.loadSound('/assets/sounds/trap.mp3');
      this.sounds.bonus = await this.loadSound('/assets/sounds/bonus.mp3');
      this.sounds.point = await this.loadSound('/assets/sounds/point.mp3');
      this.sounds.correct = await this.loadSound('/assets/sounds/correct.mp3');
      this.sounds.levelup = await this.loadSound('/assets/sounds/levelup.mp3');

      // Preload round narrations
      this.sounds.round1 = await this.loadSound('/assets/sounds/round1.mp3');
      this.sounds.round2 = await this.loadSound('/assets/sounds/round2.mp3');
      this.sounds.round3 = await this.loadSound('/assets/sounds/round3.mp3');

      // Load background music (will be looped)
      this.backgroundMusic = await this.loadSound('/assets/sounds/background.mp3');
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.backgroundVolume * this.masterVolume;

      this.isInitialized = true;
      console.log('[SOUNDMANAGER] Sound system initialized successfully');
    } catch (error) {
      console.error('[SOUNDMANAGER] Error initializing sound system:', error);
      // Don't throw - game should work even if sounds fail
    }
  }

  /**
   * Load a single audio file
   * @param {string} src - Path to audio file
   * @returns {Promise<HTMLAudioElement>}
   */
  loadSound(src) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);

      audio.addEventListener('canplaythrough', () => {
        console.log(`[SOUNDMANAGER] Loaded: ${src}`);
        resolve(audio);
      }, { once: true });

      audio.addEventListener('error', (e) => {
        console.error(`[SOUNDMANAGER] Failed to load: ${src}`, e);
        reject(e);
      });

      audio.load();
    });
  }

  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound to play
   */
  playSound(soundName) {
    if (!this.isInitialized || this.isMuted) return;

    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`[SOUNDMANAGER] Sound not found: ${soundName}`);
      return;
    }

    try {
      // Clone the audio to allow overlapping plays
      const clone = sound.cloneNode();
      clone.volume = this.sfxVolume * this.masterVolume;
      clone.play().catch(err => {
        console.warn(`[SOUNDMANAGER] Failed to play ${soundName}:`, err);
      });
    } catch (error) {
      console.error(`[SOUNDMANAGER] Error playing ${soundName}:`, error);
    }
  }

  /**
   * Play trap sound (red trap hit with penalty)
   */
  playTrap() {
    console.log('[SOUNDMANAGER] Playing trap sound');
    this.playSound('trap');
  }

  /**
   * Play bonus sound (yellow holes 9-13)
   */
  playBonus() {
    console.log('[SOUNDMANAGER] Playing bonus sound');
    this.playSound('bonus');
  }

  /**
   * Play point sound (when score increases)
   */
  playPoint() {
    console.log('[SOUNDMANAGER] Playing point sound');
    this.playSound('point');
  }

  /**
   * Play correct sound (valid hit, but no points yet)
   */
  playCorrect() {
    console.log('[SOUNDMANAGER] Playing correct sound');
    this.playSound('correct');
  }

  /**
   * Play level up sound (goal achieved)
   */
  playLevelUp() {
    console.log('[SOUNDMANAGER] Playing level up sound');
    this.playSound('levelup');
  }

  /**
   * Start background music loop
   * Call this when the game starts
   */
  startBackgroundMusic() {
    if (!this.isInitialized || this.isMuted || !this.backgroundMusic) return;

    if (this.isBackgroundPlaying) {
      console.log('[SOUNDMANAGER] Background music already playing');
      return;
    }

    console.log('[SOUNDMANAGER] Starting background music');
    this.backgroundMusic.currentTime = 0;
    this.backgroundMusic.volume = this.backgroundVolume * this.masterVolume;
    this.backgroundMusic.play().catch(err => {
      console.warn('[SOUNDMANAGER] Failed to start background music:', err);
    });
    this.isBackgroundPlaying = true;
  }

  /**
   * Stop background music
   * Call this when the game ends or resets
   */
  stopBackgroundMusic() {
    if (!this.backgroundMusic) return;

    console.log('[SOUNDMANAGER] Stopping background music');
    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
    this.isBackgroundPlaying = false;
  }

  /**
   * Duck background music (reduce volume temporarily)
   * @param {number} duration - Duration in ms to keep ducked
   */
  duckBackground(duration = 5000) {
    if (!this.backgroundMusic || !this.isBackgroundPlaying) return;

    console.log(`[SOUNDMANAGER] Ducking background music for ${duration}ms`);

    // Smoothly reduce volume
    this.backgroundMusic.volume = this.duckedVolume * this.masterVolume;

    // Restore volume after duration
    setTimeout(() => {
      if (this.backgroundMusic && this.isBackgroundPlaying && !this.isNarrationPlaying) {
        console.log('[SOUNDMANAGER] Restoring background music volume');
        this.backgroundMusic.volume = this.backgroundVolume * this.masterVolume;
      }
    }, duration);
  }

  /**
   * Play round narration with audio ducking
   * @param {number} roundNumber - Round number (1, 2, or 3)
   */
  playRoundNarration(roundNumber) {
    if (!this.isInitialized || this.isMuted) return;

    const narrationSound = this.sounds[`round${roundNumber}`];
    if (!narrationSound) {
      console.warn(`[SOUNDMANAGER] Round ${roundNumber} narration not found`);
      return;
    }

    console.log(`[SOUNDMANAGER] Playing round ${roundNumber} narration`);

    // Duck background music
    if (this.isBackgroundPlaying) {
      this.backgroundMusic.volume = this.duckedVolume * this.masterVolume;
    }

    this.isNarrationPlaying = true;

    // Play narration
    const clone = narrationSound.cloneNode();
    clone.volume = this.sfxVolume * this.masterVolume;

    clone.addEventListener('ended', () => {
      console.log('[SOUNDMANAGER] Round narration ended, restoring background volume');
      this.isNarrationPlaying = false;

      // Restore background music volume
      if (this.backgroundMusic && this.isBackgroundPlaying) {
        this.backgroundMusic.volume = this.backgroundVolume * this.masterVolume;
      }
    });

    clone.play().catch(err => {
      console.warn(`[SOUNDMANAGER] Failed to play round ${roundNumber} narration:`, err);
      this.isNarrationPlaying = false;
    });
  }

  /**
   * Handle score updates and play appropriate sounds
   * @param {number} newScore - New score value
   * @param {number} goalScore - Goal score for level
   */
  handleScoreUpdate(newScore, goalScore) {
    console.log(`[SOUNDMANAGER] Score update: ${this.lastScore} → ${newScore}, goal: ${goalScore}`);

    // Check if goal just achieved
    if (newScore >= goalScore && this.lastScore < goalScore) {
      console.log('[SOUNDMANAGER] 🎉 Goal achieved! Playing levelup sound');
      this.playLevelUp();
    }
    // Check if score increased (points gained)
    else if (newScore > this.lastScore) {
      this.playPoint();
    }
    // Score decreased means trap was hit (sound already played via soundEffect)

    this.lastScore = newScore;
  }

  /**
   * Handle round changes and play narration
   * @param {number} newRound - New round number
   * @param {boolean} forcePlay - Force narration even if round hasn't changed (for game start)
   */
  handleRoundChange(newRound, forcePlay = false) {
    if ((forcePlay || newRound !== this.currentRound) && newRound >= 1 && newRound <= 3) {
      console.log(`[SOUNDMANAGER] Round changed from ${this.currentRound} to ${newRound}`);
      this.playRoundNarration(newRound);
      this.currentRound = newRound;
    }
  }

  /**
   * Reset score tracking (called on level change)
   * This ensures levelup detection works correctly for new levels
   */
  resetScoreTracking() {
    console.log('[SOUNDMANAGER] Resetting score tracking for new level');
    this.lastScore = 0;
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    console.log(`[SOUNDMANAGER] Muted: ${this.isMuted}`);

    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else if (this.isInitialized) {
      this.startBackgroundMusic();
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    console.log('[SOUNDMANAGER] Cleaning up sound system');
    this.stopBackgroundMusic();

    // Remove all audio elements
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        sound.pause();
        sound.src = '';
      }
    });

    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.src = '';
    }

    this.isInitialized = false;
  }
}

// Export singleton instance
export default new SoundManager();
