import { useEffect, useCallback } from 'react';
import { useGameState } from './useGameState';
import {
  audioManager,
  initializeSounds,
  playOrbPlaceSound,
  playExplosionSound,
  playChainReactionSound,
  playGameWinSound,
  playGameOverSound,
  playUIClickSound,
  playUIHoverSound,
  playInvalidMoveSound,
} from '../utils/audioManager';

export interface UseAudioManagerReturn {
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
}

export const useAudioManager = (): UseAudioManagerReturn => {
  const { gameState } = useGameState();
  const soundsEnabled = gameState.settings.enableSounds;

  // Initialize audio system
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await initializeSounds();
        audioManager.setEnabled(soundsEnabled);
      } catch (error) {
        console.warn('Failed to initialize audio:', error);
      }
    };

    initializeAudio();
  }, [soundsEnabled]);

  // Update audio settings when game settings change
  useEffect(() => {
    audioManager.setEnabled(soundsEnabled);
  }, [soundsEnabled]);

  // Handle user interaction to resume audio context
  useEffect(() => {
    const handleUserInteraction = () => {
      audioManager.resumeAudioContext();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Wrapped sound functions that respect game settings
  const playOrbPlace = useCallback(() => {
    if (soundsEnabled) playOrbPlaceSound();
  }, [soundsEnabled]);

  const playExplosion = useCallback(() => {
    if (soundsEnabled) playExplosionSound();
  }, [soundsEnabled]);

  const playChainReaction = useCallback(() => {
    if (soundsEnabled) playChainReactionSound();
  }, [soundsEnabled]);

  const playGameWin = useCallback(() => {
    if (soundsEnabled) playGameWinSound();
  }, [soundsEnabled]);

  const playGameOver = useCallback(() => {
    if (soundsEnabled) playGameOverSound();
  }, [soundsEnabled]);

  const playUIClick = useCallback(() => {
    if (soundsEnabled) playUIClickSound();
  }, [soundsEnabled]);

  const playUIHover = useCallback(() => {
    if (soundsEnabled) playUIHoverSound();
  }, [soundsEnabled]);

  const playInvalidMove = useCallback(() => {
    if (soundsEnabled) playInvalidMoveSound();
  }, [soundsEnabled]);

  const setVolume = useCallback((volume: number) => {
    audioManager.setVolume(volume);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    audioManager.setEnabled(enabled);
  }, []);

  const resumeAudioContext = useCallback(() => {
    audioManager.resumeAudioContext();
  }, []);

  return {
    playOrbPlace,
    playExplosion,
    playChainReaction,
    playGameWin,
    playGameOver,
    playUIClick,
    playUIHover,
    playInvalidMove,
    setVolume,
    setEnabled,
    resumeAudioContext,
  };
};
