import { useEffect, useCallback, useRef } from 'react';
import { useGameState } from './useGameState';
import { useAudioManager } from './useAudioManager';
import {
  progressiveAudioManager,
  ProgressiveAudioManager,
} from '../utils/progressiveAudioManager';

export interface UseProgressiveAudioManagerReturn {
  // All original audio functions
  playOrbPlace: () => void;
  playExplosion: () => void;
  playChainReaction: () => void;
  playGameWin: () => void;
  playGameOver: () => void;
  playUIClick: () => void;
  playUIHover: () => void;
  playInvalidMove: () => void;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => void;
  resumeAudioContext: () => void;

  // Progressive chain reaction functions
  playProgressiveChainReaction: (
    intensity: number,
    consecutiveExplosions?: number
  ) => void;
  preloadProgressiveAudio: () => Promise<void>;
  clearProgressiveAudioCache: () => void;
  getIntensityFromExplosions: (consecutiveExplosions: number) => number;
}

export const useProgressiveAudioManager =
  (): UseProgressiveAudioManagerReturn => {
    const { gameState } = useGameState();
    const baseAudioManager = useAudioManager();
    const soundsEnabled = gameState.settings.enableSounds;
    const preloadedRef = useRef(false);

    // Initialize progressive audio system
    useEffect(() => {
      const initializeProgressiveAudio = async () => {
        try {
          progressiveAudioManager.setEnabled(soundsEnabled);

          // Preload progressive audio on first use
          if (soundsEnabled && !preloadedRef.current) {
            await progressiveAudioManager.preloadAllIntensities();
            preloadedRef.current = true;
          }
        } catch (error) {
          console.warn('Failed to initialize progressive audio:', error);
        }
      };

      initializeProgressiveAudio();
    }, [soundsEnabled]);

    // Update progressive audio settings when game settings change
    useEffect(() => {
      progressiveAudioManager.setEnabled(soundsEnabled);
    }, [soundsEnabled]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        progressiveAudioManager.clearCache();
      };
    }, []);

    // Enhanced chain reaction sound with progressive intensity
    const playProgressiveChainReaction = useCallback(
      (intensity: number, consecutiveExplosions: number = 1) => {
        if (soundsEnabled) {
          progressiveAudioManager.playChainReactionWithIntensity(
            intensity,
            consecutiveExplosions
          );
        }
      },
      [soundsEnabled]
    );

    // Preload all progressive audio intensity levels
    const preloadProgressiveAudio = useCallback(async () => {
      try {
        await progressiveAudioManager.preloadAllIntensities();
        preloadedRef.current = true;
      } catch (error) {
        console.warn('Failed to preload progressive audio:', error);
      }
    }, []);

    // Clear progressive audio cache
    const clearProgressiveAudioCache = useCallback(() => {
      progressiveAudioManager.clearCache();
      preloadedRef.current = false;
    }, []);

    // Get intensity level from consecutive explosions
    const getIntensityFromExplosions = useCallback(
      (consecutiveExplosions: number) => {
        return ProgressiveAudioManager.getIntensityFromExplosions(
          consecutiveExplosions
        );
      },
      []
    );

    // Override the regular chain reaction sound to use progressive version when appropriate
    const playChainReaction = useCallback(() => {
      if (soundsEnabled) {
        // Check if we're in a chain reaction state with consecutive explosions data
        const chainState = gameState.chainReactionState;
        if (chainState && chainState.consecutiveExplosions > 0) {
          const intensity = ProgressiveAudioManager.getIntensityFromExplosions(
            chainState.consecutiveExplosions
          );
          progressiveAudioManager.playChainReactionWithIntensity(
            intensity,
            chainState.consecutiveExplosions
          );
        } else {
          // Fall back to regular chain reaction sound
          baseAudioManager.playChainReaction();
        }
      }
    }, [soundsEnabled, gameState.chainReactionState, baseAudioManager]);

    return {
      // Original audio functions (pass through)
      playOrbPlace: baseAudioManager.playOrbPlace,
      playExplosion: baseAudioManager.playExplosion,
      playChainReaction, // Enhanced version
      playGameWin: baseAudioManager.playGameWin,
      playGameOver: baseAudioManager.playGameOver,
      playUIClick: baseAudioManager.playUIClick,
      playUIHover: baseAudioManager.playUIHover,
      playInvalidMove: baseAudioManager.playInvalidMove,
      setVolume: baseAudioManager.setVolume,
      setEnabled: baseAudioManager.setEnabled,
      resumeAudioContext: baseAudioManager.resumeAudioContext,

      // Progressive audio functions
      playProgressiveChainReaction,
      preloadProgressiveAudio,
      clearProgressiveAudioCache,
      getIntensityFromExplosions,
    };
  };
