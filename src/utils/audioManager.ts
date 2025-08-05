// Audio Manager for game sounds
// Uses Web Audio API with fallback to HTML Audio

export interface AudioConfig {
  volume: number;
  enabled: boolean;
}

export interface SoundEffect {
  name: string;
  url: string;
  volume?: number;
}

class AudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private config: AudioConfig = {
    volume: 0.7,
    enabled: true,
  };
  private fallbackAudio: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      // Use Web Audio API if available
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch {
      console.warn('Web Audio API not supported, falling back to HTML Audio');
      this.audioContext = null;
    }
  }

  public setConfig(config: Partial<AudioConfig>) {
    this.config = { ...this.config, ...config };
  }

  public setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  public setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  public async loadSound(name: string, url: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      if (this.audioContext) {
        // Use Web Audio API
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer =
          await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds.set(name, audioBuffer);
      } else {
        // Fallback to HTML Audio
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = this.config.volume;
        this.fallbackAudio.set(name, audio);
      }
    } catch (error) {
      console.warn(`Failed to load sound: ${name}`, error);
    }
  }

  public playSound(name: string, volume?: number): void {
    if (!this.config.enabled) return;

    const effectiveVolume = volume ?? this.config.volume;

    try {
      if (this.audioContext && this.sounds.has(name)) {
        // Use Web Audio API
        const audioBuffer = this.sounds.get(name)!;
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = audioBuffer;
        gainNode.gain.value = effectiveVolume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start();
      } else if (this.fallbackAudio.has(name)) {
        // Use HTML Audio fallback
        const audio = this.fallbackAudio.get(name)!;
        audio.volume = effectiveVolume;
        audio.currentTime = 0;
        audio.play().catch((e) => console.warn('Audio play failed:', e));
      }
    } catch (error) {
      console.warn(`Failed to play sound: ${name}`, error);
    }
  }

  public stopAllSounds(): void {
    // For Web Audio API, sounds stop automatically when they finish
    // For HTML Audio fallback
    this.fallbackAudio.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  public resumeAudioContext(): void {
    // Resume audio context after user interaction (required by browsers)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Sound effect definitions using generated sounds or placeholders
export const SOUND_EFFECTS = {
  ORB_PLACE: 'orb-place',
  EXPLOSION: 'explosion',
  CHAIN_REACTION: 'chain-reaction',
  GAME_WIN: 'game-win',
  GAME_OVER: 'game-over',
  UI_CLICK: 'ui-click',
  UI_HOVER: 'ui-hover',
  INVALID_MOVE: 'invalid-move',
} as const;

// Initialize sound effects with generated audio data URLs
// These are simple beep sounds generated programmatically
export const initializeSounds = async () => {
  const generatedSounds = generateSoundEffects();

  for (const [name, audioData] of Object.entries(generatedSounds)) {
    await audioManager.loadSound(name, audioData);
  }
};

// Generate simple sound effects using Web Audio API
function generateSoundEffects(): Record<string, string> {
  const sounds: Record<string, string> = {};

  try {
    // Generate simple beep sounds as data URLs
    sounds[SOUND_EFFECTS.ORB_PLACE] = generateBeep(800, 0.1, 'sine');
    sounds[SOUND_EFFECTS.EXPLOSION] = generateBeep(200, 0.3, 'sawtooth');
    sounds[SOUND_EFFECTS.CHAIN_REACTION] = generateBeep(600, 0.2, 'square');
    sounds[SOUND_EFFECTS.GAME_WIN] = generateBeep(1000, 0.5, 'sine');
    sounds[SOUND_EFFECTS.GAME_OVER] = generateBeep(150, 0.8, 'triangle');
    sounds[SOUND_EFFECTS.UI_CLICK] = generateBeep(1200, 0.05, 'sine');
    sounds[SOUND_EFFECTS.UI_HOVER] = generateBeep(900, 0.03, 'sine');
    sounds[SOUND_EFFECTS.INVALID_MOVE] = generateBeep(300, 0.15, 'square');
  } catch (error) {
    console.warn('Failed to generate sound effects:', error);
  }

  return sounds;
}

function generateBeep(
  frequency: number,
  duration: number,
  waveType: OscillatorType = 'sine'
): string {
  try {
    // Create a simple beep sound as a data URL
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate samples
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (waveType) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
          break;
        case 'triangle':
          sample =
            2 *
              Math.abs(2 * (t * frequency - Math.floor(0.5 + t * frequency))) -
            1;
          break;
      }

      // Apply envelope to avoid clicking
      const envelope = Math.min(1, Math.min(t * 10, (duration - t) * 10));
      sample *= envelope * 0.3; // Reduce volume

      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn('Failed to generate beep:', error);
    return '';
  }
}

// Convenience functions for common game sounds
export const playOrbPlaceSound = () =>
  audioManager.playSound(SOUND_EFFECTS.ORB_PLACE);
export const playExplosionSound = () =>
  audioManager.playSound(SOUND_EFFECTS.EXPLOSION);
export const playChainReactionSound = () =>
  audioManager.playSound(SOUND_EFFECTS.CHAIN_REACTION);
export const playGameWinSound = () =>
  audioManager.playSound(SOUND_EFFECTS.GAME_WIN);
export const playGameOverSound = () =>
  audioManager.playSound(SOUND_EFFECTS.GAME_OVER);
export const playUIClickSound = () =>
  audioManager.playSound(SOUND_EFFECTS.UI_CLICK);
export const playUIHoverSound = () =>
  audioManager.playSound(SOUND_EFFECTS.UI_HOVER);
export const playInvalidMoveSound = () =>
  audioManager.playSound(SOUND_EFFECTS.INVALID_MOVE);
