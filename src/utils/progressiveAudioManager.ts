// Progressive Audio Manager for Chain Reactions
// Supports 10 intensity levels with evolving sound characteristics

import { audioManager, SOUND_EFFECTS } from './audioManager';

export interface ProgressiveAudioConfig {
  baseVolume: number;
  maxVolume: number;
  intensitySteps: number;
  enabled: boolean;
}

export interface ChainAudioStep {
  intensity: number; // 1-10
  baseFrequency: number;
  harmonics: number[];
  noiseLevel: number;
  reverbAmount: number;
  duration: number;
  volume: number;
}

class ProgressiveAudioManager {
  private config: ProgressiveAudioConfig = {
    baseVolume: 0.3,
    maxVolume: 0.8,
    intensitySteps: 10,
    enabled: true,
  };

  private intensityCache: Map<number, string> = new Map();

  public setConfig(config: Partial<ProgressiveAudioConfig>) {
    this.config = { ...this.config, ...config };
  }

  public setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  /**
   * Play chain reaction sound with progressive intensity
   * @param intensity - Intensity level 1-10 (10 = maximum drama)
   * @param consecutiveExplosions - Number of consecutive explosions for context
   */
  public playChainReactionWithIntensity(
    intensity: number,
    consecutiveExplosions: number = 1
  ): void {
    if (!this.config.enabled || intensity < 1 || intensity > 10) return;

    try {
      // Clamp intensity to valid range
      const clampedIntensity = Math.max(1, Math.min(10, Math.floor(intensity)));

      // Generate or retrieve cached sound for this intensity
      const soundName = `chain-reaction-intensity-${clampedIntensity}`;

      if (!this.intensityCache.has(clampedIntensity)) {
        const audioData =
          this.generateProgressiveExplosionSound(clampedIntensity);
        this.intensityCache.set(clampedIntensity, audioData);
        // Load the generated sound
        audioManager.loadSound(soundName, audioData);
      }

      // Calculate volume based on intensity and consecutive explosions
      const volumeMultiplier = this.calculateVolumeMultiplier(
        clampedIntensity,
        consecutiveExplosions
      );
      const finalVolume = Math.min(
        this.config.maxVolume,
        this.config.baseVolume * volumeMultiplier
      );

      // Play the sound with calculated volume
      audioManager.playSound(soundName, finalVolume);

      console.log(
        `🔊 Chain reaction intensity ${clampedIntensity}/10, volume: ${finalVolume.toFixed(2)}, explosions: ${consecutiveExplosions}`
      );
    } catch (error) {
      console.warn('Failed to play progressive chain reaction sound:', error);
      // Fallback to regular chain reaction sound
      audioManager.playSound(SOUND_EFFECTS.CHAIN_REACTION);
    }
  }

  /**
   * Calculate volume multiplier based on intensity and consecutive explosions
   */
  private calculateVolumeMultiplier(
    intensity: number,
    consecutiveExplosions: number
  ): number {
    // Base volume increases linearly with intensity
    const intensityMultiplier = 0.5 + (intensity / 10) * 0.8; // 0.5 to 1.3

    // Additional boost for consecutive explosions (diminishing returns)
    const consecutiveBoost = 1 + Math.log(consecutiveExplosions) * 0.1;

    return intensityMultiplier * consecutiveBoost;
  }

  /**
   * Generate progressive explosion sound with evolving characteristics
   */
  private generateProgressiveExplosionSound(intensity: number): string {
    const sampleRate = 44100;
    const baseDuration = 0.6;
    const intensityFactor = intensity / 10;

    // Duration increases with intensity
    const duration = baseDuration + intensityFactor * 0.4; // 0.6s to 1.0s
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(samples);

    // Sound characteristics evolve with intensity
    const characteristics = this.getIntensityCharacteristics(intensity);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      let sample = 0;

      // Layer 1: Deep rumble (gets deeper and longer with intensity)
      const rumbleFreq =
        characteristics.baseFrequency * (1 - intensityFactor * 0.3);
      sample +=
        0.4 *
        Math.sin(2 * Math.PI * rumbleFreq * t) *
        Math.exp(-progress * (3 - intensityFactor));

      // Layer 2: Mid-frequency burst (gets more complex)
      characteristics.harmonics.forEach((harmonic, index) => {
        const weight = 0.25 / (index + 1); // Diminishing weights
        sample +=
          weight *
          Math.sin(2 * Math.PI * harmonic * t) *
          Math.exp(-progress * (6 - intensityFactor * 2));
      });

      // Layer 3: High-frequency sizzle (increases with intensity)
      const sizzleIntensity = intensityFactor * 0.3;
      sample +=
        sizzleIntensity *
        Math.sin(2 * Math.PI * 1200 * t) *
        Math.exp(-progress * 15);

      // Layer 4: Noise component (more chaotic at higher intensities)
      const noiseAmount = characteristics.noiseLevel;
      sample +=
        noiseAmount *
        (Math.random() * 2 - 1) *
        Math.exp(-progress * (8 - intensityFactor * 2));

      // Layer 5: Sub-harmonic distortion (only at higher intensities)
      if (intensity >= 6) {
        const distortionAmount = ((intensity - 5) / 5) * 0.2;
        const distortionFreq = characteristics.baseFrequency * 0.5;
        sample +=
          distortionAmount *
          Math.sin(2 * Math.PI * distortionFreq * t) *
          Math.exp(-progress * 4);
      }

      // Apply dynamic envelope based on intensity
      const envelope = this.calculateDynamicEnvelope(progress, intensity);
      sample *= envelope;

      // Apply soft clipping to prevent harsh distortion
      sample = this.softClip(sample);

      buffer[i] = sample * characteristics.volume;
    }

    return this.createWAVBuffer(buffer, sampleRate);
  }

  /**
   * Get sound characteristics for specific intensity level
   */
  private getIntensityCharacteristics(intensity: number): ChainAudioStep {
    const intensityFactor = intensity / 10;

    return {
      intensity,
      baseFrequency: 80 - intensityFactor * 20, // Gets deeper: 80Hz to 60Hz
      harmonics: this.generateHarmonics(intensity),
      noiseLevel: 0.1 + intensityFactor * 0.15, // 0.1 to 0.25
      reverbAmount: intensityFactor * 0.3,
      duration: 0.6 + intensityFactor * 0.4,
      volume: 0.6 + intensityFactor * 0.3, // 0.6 to 0.9
    };
  }

  /**
   * Generate harmonic frequencies for intensity level
   */
  private generateHarmonics(intensity: number): number[] {
    const baseHarmonics = [300, 450, 600];
    const harmonics = [...baseHarmonics];

    // Add more harmonics as intensity increases
    if (intensity >= 4) {
      harmonics.push(200, 800);
    }
    if (intensity >= 7) {
      harmonics.push(150, 350, 500, 1000);
    }
    if (intensity === 10) {
      harmonics.push(100, 400, 700, 900, 1200);
    }

    return harmonics;
  }

  /**
   * Calculate dynamic envelope that evolves with intensity
   */
  private calculateDynamicEnvelope(
    progress: number,
    intensity: number
  ): number {
    const intensityFactor = intensity / 10;

    // Basic exponential decay
    let envelope = Math.exp(-progress * (2.5 - intensityFactor * 0.5));

    // Add attack phase (sharper at higher intensities)
    if (progress < 0.05) {
      const attackSharpness = 1 + intensityFactor * 2;
      envelope *= Math.pow(progress / 0.05, 1 / attackSharpness);
    }

    // Add sustain phase for higher intensities
    if (intensity >= 6 && progress >= 0.1 && progress <= 0.3) {
      envelope *= 0.8 + 0.2 * intensityFactor; // Slight boost in sustain
    }

    return envelope;
  }

  /**
   * Soft clipping to prevent harsh distortion
   */
  private softClip(sample: number): number {
    const threshold = 0.8;
    if (Math.abs(sample) > threshold) {
      const sign = Math.sign(sample);
      const excess = Math.abs(sample) - threshold;
      return sign * (threshold + excess * 0.3);
    }
    return sample;
  }

  /**
   * Create WAV buffer from samples (utility function)
   */
  private createWAVBuffer(
    samples: Float32Array,
    sampleRate: number = 44100
  ): string {
    try {
      const buffer = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(buffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + samples.length * 2, true);
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
      view.setUint32(40, samples.length * 2, true);

      // Convert float samples to 16-bit PCM
      for (let i = 0; i < samples.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * 2, sample * 32767, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Failed to create WAV buffer:', error);
      return '';
    }
  }

  /**
   * Preload all intensity levels for better performance
   */
  public async preloadAllIntensities(): Promise<void> {
    try {
      const promises = [];
      for (let intensity = 1; intensity <= 10; intensity++) {
        const promise = new Promise<void>((resolve) => {
          if (!this.intensityCache.has(intensity)) {
            const audioData = this.generateProgressiveExplosionSound(intensity);
            this.intensityCache.set(intensity, audioData);
            const soundName = `chain-reaction-intensity-${intensity}`;
            audioManager.loadSound(soundName, audioData).then(() => resolve());
          } else {
            resolve();
          }
        });
        promises.push(promise);
      }

      await Promise.all(promises);
      console.log('🔊 Progressive audio: All 10 intensity levels preloaded');
    } catch (error) {
      console.warn('Failed to preload progressive audio intensities:', error);
    }
  }

  /**
   * Get intensity level based on consecutive explosions (1-10 scale)
   */
  public static getIntensityFromExplosions(
    consecutiveExplosions: number
  ): number {
    // Map consecutive explosions to intensity levels
    if (consecutiveExplosions <= 1) return 1;
    if (consecutiveExplosions <= 2) return 2;
    if (consecutiveExplosions <= 3) return 3;
    if (consecutiveExplosions <= 4) return 4;
    if (consecutiveExplosions <= 5) return 5;
    if (consecutiveExplosions <= 6) return 6;
    if (consecutiveExplosions <= 7) return 7;
    if (consecutiveExplosions <= 8) return 8;
    if (consecutiveExplosions <= 9) return 9;
    return 10; // Maximum drama at 10+ consecutive explosions
  }

  /**
   * Clear cached sounds to free memory
   */
  public clearCache(): void {
    this.intensityCache.forEach((audioData) => {
      try {
        URL.revokeObjectURL(audioData);
      } catch (error) {
        console.warn('Failed to revoke object URL:', error);
      }
    });
    this.intensityCache.clear();
    console.log('🔊 Progressive audio: Cache cleared');
  }
}

// Export class for static methods
export { ProgressiveAudioManager };

// Singleton instance
export const progressiveAudioManager = new ProgressiveAudioManager();
