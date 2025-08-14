/**
 * Shared Audio Utilities
 *
 * Common audio generation and WAV processing utilities used by
 * both standard and progressive audio managers.
 *
 * @fileoverview Framework-independent audio utilities that can
 * work in browser and headless environments.
 */

import { getEnvironmentCapabilities, isBrowser } from './environmentUtils';

/**
 * Audio generation configuration
 */
export interface AudioConfig {
  sampleRate?: number;
  duration: number;
  volume?: number;
}

/**
 * Wave generation parameters
 */
export interface WaveConfig extends AudioConfig {
  frequency: number;
  waveType?: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
  fadeIn?: number;
  fadeOut?: number;
}

/**
 * Create WAV buffer from audio samples
 *
 * @param samples - Float32Array of audio samples (-1 to 1 range)
 * @param sampleRate - Sample rate in Hz (default: 44100)
 * @returns Base64-encoded WAV data URL
 */
export function createWAVBuffer(
  samples: Float32Array,
  sampleRate: number = 44100
): string {
  // In non-browser environments, return silent audio
  if (!isBrowser()) {
    return createSilentAudio();
  }

  try {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // Helper function to write strings to buffer
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Format chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Convert samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    // Environment-aware conversion to data URL
    if (typeof btoa !== 'undefined') {
      // Browser environment with btoa available
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return 'data:audio/wav;base64,' + btoa(binary);
    } else {
      // Fallback for environments without btoa
      console.warn('btoa not available, returning silent audio');
      return createSilentAudio();
    }
  } catch (error) {
    console.warn('Failed to create WAV buffer:', error);
    return createSilentAudio();
  }
}

/**
 * Generate basic waveform samples
 *
 * @param config - Wave generation configuration
 * @returns Float32Array of audio samples
 */
export function generateWaveform(config: WaveConfig): Float32Array {
  const {
    frequency,
    duration,
    sampleRate = 44100,
    volume = 1.0,
    waveType = 'sine',
    fadeIn = 0,
    fadeOut = 0,
  } = config;

  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);
  const fadeInSamples = Math.floor(fadeIn * sampleRate);
  const fadeOutSamples = Math.floor(fadeOut * sampleRate);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const phase = 2 * Math.PI * frequency * t;

    // Generate base waveform
    let sample: number;
    switch (waveType) {
      case 'sine':
        sample = Math.sin(phase);
        break;
      case 'square':
        sample = Math.sin(phase) > 0 ? 1 : -1;
        break;
      case 'sawtooth':
        sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
        break;
      case 'triangle':
        sample =
          2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) -
          1;
        break;
      case 'noise':
        sample = Math.random() * 2 - 1;
        break;
      default:
        sample = Math.sin(phase);
    }

    // Apply volume
    sample *= volume;

    // Apply fade in/out
    if (i < fadeInSamples) {
      sample *= i / fadeInSamples;
    } else if (i > samples - fadeOutSamples) {
      sample *= (samples - i) / fadeOutSamples;
    }

    buffer[i] = sample;
  }

  return buffer;
}

/**
 * Generate complex tone with multiple harmonics
 *
 * @param fundamentalFreq - Base frequency in Hz
 * @param harmonics - Array of harmonic multipliers and their amplitudes
 * @param config - Audio configuration
 * @returns Float32Array of audio samples
 */
export function generateComplexTone(
  fundamentalFreq: number,
  harmonics: Array<{ multiplier: number; amplitude: number }>,
  config: AudioConfig
): Float32Array {
  const { duration, sampleRate = 44100, volume = 1.0 } = config;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Sum all harmonics
    for (const harmonic of harmonics) {
      const freq = fundamentalFreq * harmonic.multiplier;
      const phase = 2 * Math.PI * freq * t;
      sample += Math.sin(phase) * harmonic.amplitude;
    }

    buffer[i] = sample * volume;
  }

  return buffer;
}

/**
 * Apply envelope to audio samples
 *
 * @param samples - Input audio samples
 * @param attack - Attack time in seconds
 * @param decay - Decay time in seconds
 * @param sustain - Sustain level (0-1)
 * @param release - Release time in seconds
 * @param sampleRate - Sample rate in Hz
 * @returns Modified audio samples
 */
export function applyEnvelope(
  samples: Float32Array,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  sampleRate: number = 44100
): Float32Array {
  const result = new Float32Array(samples.length);
  const attackSamples = Math.floor(attack * sampleRate);
  const decaySamples = Math.floor(decay * sampleRate);
  const releaseSamples = Math.floor(release * sampleRate);
  const sustainStart = attackSamples + decaySamples;
  const releaseStart = samples.length - releaseSamples;

  for (let i = 0; i < samples.length; i++) {
    let envelope = 1;

    if (i < attackSamples) {
      // Attack phase
      envelope = i / attackSamples;
    } else if (i < sustainStart) {
      // Decay phase
      const decayProgress = (i - attackSamples) / decaySamples;
      envelope = 1 - decayProgress * (1 - sustain);
    } else if (i < releaseStart) {
      // Sustain phase
      envelope = sustain;
    } else {
      // Release phase
      const releaseProgress = (i - releaseStart) / releaseSamples;
      envelope = sustain * (1 - releaseProgress);
    }

    result[i] = samples[i] * envelope;
  }

  return result;
}

/**
 * Mix multiple audio buffers together
 *
 * @param buffers - Array of audio buffers to mix
 * @param weights - Optional array of mixing weights (default: equal mixing)
 * @returns Mixed audio buffer
 */
export function mixBuffers(
  buffers: Float32Array[],
  weights?: number[]
): Float32Array {
  if (buffers.length === 0) {
    return new Float32Array(0);
  }

  const maxLength = Math.max(...buffers.map((b) => b.length));
  const result = new Float32Array(maxLength);
  const actualWeights =
    weights || new Array(buffers.length).fill(1 / buffers.length);

  for (let i = 0; i < maxLength; i++) {
    let sample = 0;
    for (let j = 0; j < buffers.length; j++) {
      if (i < buffers[j].length) {
        sample += buffers[j][i] * actualWeights[j];
      }
    }
    result[i] = Math.max(-1, Math.min(1, sample)); // Clamp to prevent distortion
  }

  return result;
}

/**
 * Check if audio context is available (environment-aware)
 *
 * @returns True if audio context is available
 */
export function isAudioContextAvailable(): boolean {
  const capabilities = getEnvironmentCapabilities();
  return capabilities.hasAudioContext;
}

/**
 * Check if HTML5 audio is available (environment-aware)
 *
 * @returns True if HTML5 audio is available
 */
export function isHTMLAudioAvailable(): boolean {
  const capabilities = getEnvironmentCapabilities();
  return capabilities.hasHTMLAudio;
}

/**
 * Create no-op audio data URL for headless environments
 *
 * @returns Empty audio data URL
 */
export function createSilentAudio(): string {
  // Minimal WAV with 1 sample of silence
  const samples = new Float32Array([0]);
  return createWAVBuffer(samples, 44100);
}
