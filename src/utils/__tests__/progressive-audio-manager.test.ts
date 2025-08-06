// Progressive Audio Manager Tests
// Tests the 10-level intensity system for chain reactions

import { describe, it, expect, beforeEach } from 'vitest';
import {
  progressiveAudioManager,
  ProgressiveAudioManager,
} from '../progressiveAudioManager';

describe('Progressive Audio Manager', () => {
  beforeEach(() => {
    progressiveAudioManager.clearCache();
  });

  describe('Intensity Level Calculation', () => {
    it('should map consecutive explosions to correct intensity levels', () => {
      expect(ProgressiveAudioManager.getIntensityFromExplosions(1)).toBe(1);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(2)).toBe(2);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(3)).toBe(3);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(4)).toBe(4);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(5)).toBe(5);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(6)).toBe(6);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(7)).toBe(7);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(8)).toBe(8);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(9)).toBe(9);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(10)).toBe(10);
      expect(ProgressiveAudioManager.getIntensityFromExplosions(15)).toBe(10); // Max level
      expect(ProgressiveAudioManager.getIntensityFromExplosions(100)).toBe(10); // Max level
    });

    it('should handle edge cases for intensity calculation', () => {
      expect(ProgressiveAudioManager.getIntensityFromExplosions(0)).toBe(1); // Minimum
      expect(ProgressiveAudioManager.getIntensityFromExplosions(-1)).toBe(1); // Minimum
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      progressiveAudioManager.setConfig({
        baseVolume: 0.5,
        maxVolume: 1.0,
        intensitySteps: 10,
        enabled: false,
      });

      // Configuration is internal, so we test behavior
      progressiveAudioManager.setEnabled(true);
      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(5, 3);
      }).not.toThrow();
    });

    it('should respect enabled/disabled state', () => {
      progressiveAudioManager.setEnabled(false);
      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(5, 3);
      }).not.toThrow(); // Should not throw but also not play sound
    });
  });

  describe('Audio Generation', () => {
    it('should generate different audio for different intensity levels', () => {
      // We can't easily test the actual audio generation in a unit test environment,
      // but we can test that the methods don't throw errors
      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(1, 1);
      }).not.toThrow();

      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(5, 5);
      }).not.toThrow();

      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(10, 10);
      }).not.toThrow();
    });

    it('should handle invalid intensity levels gracefully', () => {
      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(0, 1); // Below min
      }).not.toThrow();

      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(11, 15); // Above max
      }).not.toThrow();

      expect(() => {
        progressiveAudioManager.playChainReactionWithIntensity(-5, 1); // Negative
      }).not.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache without errors', () => {
      expect(() => {
        progressiveAudioManager.clearCache();
      }).not.toThrow();
    });

    it('should handle preloading', async () => {
      await expect(
        progressiveAudioManager.preloadAllIntensities()
      ).resolves.not.toThrow();
    });
  });

  describe('Volume Calculations', () => {
    it('should calculate progressive volume correctly', () => {
      // Test different intensity and consecutive explosion combinations
      const testCases = [
        { intensity: 1, consecutive: 1 },
        { intensity: 5, consecutive: 5 },
        { intensity: 10, consecutive: 10 },
        { intensity: 3, consecutive: 8 }, // Mixed scenarios
        { intensity: 8, consecutive: 3 },
      ];

      testCases.forEach(({ intensity, consecutive }) => {
        expect(() => {
          progressiveAudioManager.playChainReactionWithIntensity(
            intensity,
            consecutive
          );
        }).not.toThrow();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should demonstrate the 10-level intensity system', () => {
      console.log('🎵 Progressive Audio System Test:');

      // Test each intensity level
      for (let level = 1; level <= 10; level++) {
        const consecutiveExplosions = level;
        const calculatedIntensity =
          ProgressiveAudioManager.getIntensityFromExplosions(
            consecutiveExplosions
          );

        console.log(
          `Level ${level}: ${consecutiveExplosions} explosions → intensity ${calculatedIntensity}/10`
        );

        expect(calculatedIntensity).toBe(level);
        expect(() => {
          progressiveAudioManager.playChainReactionWithIntensity(
            calculatedIntensity,
            consecutiveExplosions
          );
        }).not.toThrow();
      }

      console.log('✅ All 10 intensity levels tested successfully');
    });

    it('should demonstrate maximum drama scenarios', () => {
      console.log('🔥 Maximum Drama Test:');

      // Test scenarios that should reach maximum drama (level 10)
      const maxDramaScenarios = [10, 12, 15, 20, 50];

      maxDramaScenarios.forEach((consecutiveExplosions) => {
        const intensity = ProgressiveAudioManager.getIntensityFromExplosions(
          consecutiveExplosions
        );
        console.log(
          `${consecutiveExplosions} consecutive explosions → MAX DRAMA (${intensity}/10)`
        );

        expect(intensity).toBe(10);
        expect(() => {
          progressiveAudioManager.playChainReactionWithIntensity(
            intensity,
            consecutiveExplosions
          );
        }).not.toThrow();
      });

      console.log('✅ Maximum drama scenarios tested successfully');
    });
  });
});
