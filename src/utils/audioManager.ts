// Audio Manager for game sounds
// Uses Web Audio API with fallback to HTML Audio

import { createWAVBuffer } from './audioUtils';

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

// Generate realistic sound effects using Web Audio API
function generateSoundEffects(): Record<string, string> {
  const sounds: Record<string, string> = {};

  try {
    // Generate realistic game sounds
    sounds[SOUND_EFFECTS.ORB_PLACE] = generateOrbPlaceSound();
    sounds[SOUND_EFFECTS.EXPLOSION] = generateExplosionSound();
    sounds[SOUND_EFFECTS.CHAIN_REACTION] = generateChainReactionSound();
    sounds[SOUND_EFFECTS.GAME_WIN] = generateVictorySound();
    sounds[SOUND_EFFECTS.GAME_OVER] = generateDefeatSound();
    sounds[SOUND_EFFECTS.UI_CLICK] = generateClickSound();
    sounds[SOUND_EFFECTS.UI_HOVER] = generateHoverSound();
    sounds[SOUND_EFFECTS.INVALID_MOVE] = generateErrorSound();
  } catch (error) {
    console.warn('Failed to generate sound effects:', error);
  }

  return sounds;
}

// Generate realistic explosion sound with multiple frequency components and noise
function generateExplosionSound(): string {
  const sampleRate = 44100;
  const duration = 0.8; // Longer for more impact
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;

    // Create explosion-like sound with multiple components
    let sample = 0;

    // Low frequency rumble (exponentially decaying)
    sample += 0.4 * Math.sin(2 * Math.PI * 60 * t) * Math.exp(-progress * 3);
    sample += 0.3 * Math.sin(2 * Math.PI * 120 * t) * Math.exp(-progress * 4);

    // Mid frequency burst
    sample += 0.3 * Math.sin(2 * Math.PI * 300 * t) * Math.exp(-progress * 8);

    // High frequency sizzle
    sample += 0.2 * Math.sin(2 * Math.PI * 800 * t) * Math.exp(-progress * 12);

    // Add some noise for realism
    sample += 0.15 * (Math.random() * 2 - 1) * Math.exp(-progress * 6);

    // Apply envelope
    const envelope = Math.exp(-progress * 2.5) * (1 - progress * 0.3);
    sample *= envelope;

    buffer[i] = sample * 0.6; // Overall volume
  }

  return createWAVBuffer(buffer, sampleRate);
}

// Generate dramatic chain reaction sound with cascading explosions
function generateChainReactionSound(): string {
  const sampleRate = 44100;
  const duration = 1.2; // Longer for chain effect
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  // Multiple explosion bursts for chain effect
  const burstTimes = [0, 0.2, 0.4, 0.6, 0.8];

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Generate multiple overlapping explosions
    burstTimes.forEach((burstTime, index) => {
      if (t >= burstTime) {
        const localT = t - burstTime;
        const progress = localT / (duration - burstTime);
        const intensity = 1 - index * 0.15; // Each burst slightly quieter

        if (progress <= 1) {
          // Low rumble
          sample +=
            intensity *
            0.3 *
            Math.sin(2 * Math.PI * (80 + index * 20) * localT) *
            Math.exp(-progress * 4);

          // Mid burst
          sample +=
            intensity *
            0.25 *
            Math.sin(2 * Math.PI * (400 + index * 100) * localT) *
            Math.exp(-progress * 8);

          // High sizzle
          sample +=
            intensity *
            0.15 *
            Math.sin(2 * Math.PI * (1000 + index * 200) * localT) *
            Math.exp(-progress * 12);

          // Crackling noise
          sample +=
            intensity *
            0.1 *
            (Math.random() * 2 - 1) *
            Math.exp(-progress * 10);
        }
      }
    });

    // Overall envelope
    const overallProgress = t / duration;
    const envelope = Math.exp(-overallProgress * 1.5);
    sample *= envelope;

    buffer[i] = sample * 0.7; // Chain reactions are louder
  }

  return createWAVBuffer(buffer, sampleRate);
}

// Generate satisfying orb placement sound
function generateOrbPlaceSound(): string {
  const sampleRate = 44100;
  const duration = 0.15;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;

    // Soft, pleasant tone with slight pitch bend
    const frequency = 600 + Math.sin(progress * Math.PI) * 100;
    let sample = 0.4 * Math.sin(2 * Math.PI * frequency * t);

    // Add harmonic
    sample += 0.2 * Math.sin(2 * Math.PI * frequency * 2 * t);

    // Smooth envelope
    const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.5);
    sample *= envelope;

    buffer[i] = sample;
  }

  return createWAVBuffer(buffer, sampleRate);
}

// Generate triumphant victory sound
function generateVictorySound(): string {
  const sampleRate = 44100;
  const duration = 1.0;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  // Victory fanfare notes (C major chord arpeggio)
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const noteLength = duration / notes.length;

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.floor(t / noteLength);
    const localT = (t % noteLength) / noteLength;

    if (noteIndex < notes.length) {
      const frequency = notes[noteIndex];
      let sample = 0.3 * Math.sin(2 * Math.PI * frequency * t);

      // Add harmonics for richness
      sample += 0.15 * Math.sin(2 * Math.PI * frequency * 2 * t);
      sample += 0.1 * Math.sin(2 * Math.PI * frequency * 3 * t);

      // Note envelope
      const noteEnvelope = Math.sin(localT * Math.PI);
      sample *= noteEnvelope;

      buffer[i] = sample;
    }
  }

  return createWAVBuffer(buffer, sampleRate);
}

// Generate somber defeat sound
function generateDefeatSound(): string {
  const sampleRate = 44100;
  const duration = 0.8;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;

    // Descending minor chord
    const baseFreq = 220 * (1 - progress * 0.3); // Descending A3
    let sample = 0.2 * Math.sin(2 * Math.PI * baseFreq * t);
    sample += 0.15 * Math.sin(2 * Math.PI * baseFreq * 1.2 * t); // Minor third
    sample += 0.1 * Math.sin(2 * Math.PI * baseFreq * 1.5 * t); // Perfect fifth

    // Envelope
    const envelope = (1 - progress) * Math.sin(progress * Math.PI);
    sample *= envelope;

    buffer[i] = sample;
  }

  return createWAVBuffer(buffer, sampleRate);
}

// Generate clean UI click sound
function generateClickSound(): string {
  const sampleRate = 44100;
  const duration = 0.08;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;

    let sample = 0.3 * Math.sin(2 * Math.PI * 1000 * t);
    sample += 0.15 * Math.sin(2 * Math.PI * 2000 * t);

    const envelope = Math.exp(-progress * 8);
    sample *= envelope;

    buffer[i] = sample;
  }

  return createWAVBuffer(buffer, sampleRate);
}

// Generate subtle hover sound
function generateHoverSound(): string {
  const sampleRate = 44100;
  const duration = 0.05;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;

    let sample = 0.15 * Math.sin(2 * Math.PI * 800 * t);

    const envelope = Math.sin(progress * Math.PI);
    sample *= envelope;

    buffer[i] = sample;
  }

  return createWAVBuffer(buffer, sampleRate);
}

// Generate error/invalid move sound
function generateErrorSound(): string {
  const sampleRate = 44100;
  const duration = 0.3;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;

    // Harsh, dissonant sound
    let sample = 0.2 * Math.sin(2 * Math.PI * 200 * t);
    sample += 0.15 * Math.sin(2 * Math.PI * 300 * t);
    sample += 0.1 * Math.sin(2 * Math.PI * 150 * t);

    // Make it "buzzy"
    if (Math.floor(t * 20) % 2 === 0) {
      sample *= 0.7;
    }

    const envelope = (1 - progress) * Math.sin(progress * Math.PI * 2);
    sample *= envelope;

    buffer[i] = sample;
  }

  return createWAVBuffer(buffer, sampleRate);
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
