import React, { useEffect, useState, useCallback } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useProgressiveAudioManager } from '../../hooks/useProgressiveAudioManager';
import ChainCounter from '../ChainCounter';
import OrbMovementAnimation from '../OrbMovementAnimation';
import type {
  ExplosionStep,
  OrbMovementAnimation as OrbMovementType,
} from '../../types';
import styles from './ChainReactionManager.module.css';

interface ChainReactionManagerProps {
  gridSize: { rows: number; cols: number };
  cellSize: number;
  onStepComplete?: (stepIndex: number) => void;
  onSequenceComplete?: () => void;
}

const ChainReactionManager: React.FC<ChainReactionManagerProps> = ({
  gridSize,
  cellSize,
  onStepComplete,
  onSequenceComplete,
}) => {
  const { gameState, dispatch } = useGameState();
  const { playProgressiveChainReaction, getIntensityFromExplosions } =
    useProgressiveAudioManager();
  const [activeAnimations, setActiveAnimations] = useState<OrbMovementType[]>(
    []
  );

  const chainReactionState = gameState.chainReactionState;
  const isChainReacting = chainReactionState?.isPlaying || false;
  const consecutiveExplosions = chainReactionState?.consecutiveExplosions || 0;

  // Play a single explosion step
  const playExplosionStep = useCallback(
    (step: ExplosionStep, intensity: number) => {
      console.log(
        `🎬 Playing explosion step ${step.stepIndex + 1}, intensity: ${intensity}`
      );

      // Set active animations for this step
      setActiveAnimations(step.orbMovements);

      // Calculate audio intensity based on step and total consecutive explosions
      const audioIntensity = getIntensityFromExplosions(intensity);

      // Play progressive audio effect
      playProgressiveChainReaction(audioIntensity, intensity);

      // Update game state with this step (advancing to next step)
      dispatch({
        type: 'PLAY_EXPLOSION_STEP',
        payload: {
          stepIndex: step.stepIndex + 1, // Advance to next step
          intensity,
          boardState: step.resultingBoard,
        },
      });

      // Complete the step after animation duration (400ms)
      setTimeout(() => {
        setActiveAnimations([]);
        onStepComplete?.(step.stepIndex);
      }, 400);
    },
    [
      dispatch,
      onStepComplete,
      playProgressiveChainReaction,
      getIntensityFromExplosions,
    ]
  );

  // Handle chain reaction sequence
  useEffect(() => {
    if (!chainReactionState || !chainReactionState.isPlaying) {
      console.log('🚫 Chain reaction manager: not playing');
      return;
    }

    const { explosionSteps, currentStep, totalSteps } = chainReactionState;
    console.log(
      `🎯 Chain reaction manager: step ${currentStep}/${totalSteps}, steps available: ${explosionSteps.length}`
    );

    // If we're starting or continuing the sequence
    if (currentStep < totalSteps && explosionSteps[currentStep]) {
      const step = explosionSteps[currentStep];
      const intensity = currentStep + 1; // 1-based intensity

      console.log(
        `⏱️ Scheduling step ${currentStep} with intensity ${intensity} in 100ms`
      );

      // Play this step after a brief delay
      const stepTimer = setTimeout(() => {
        playExplosionStep(step, intensity);
      }, 100);

      return () => clearTimeout(stepTimer);
    }

    // If sequence is complete
    if (currentStep >= totalSteps) {
      console.log('✅ Chain reaction sequence complete');
      const completeTimer = setTimeout(() => {
        // Dispatch completion action with the final board state
        if (chainReactionState.finalBoard) {
          dispatch({
            type: 'COMPLETE_CHAIN_SEQUENCE',
            payload: {
              finalBoard: chainReactionState.finalBoard,
              totalSteps: chainReactionState.totalSteps,
              safetyLimitReached:
                chainReactionState.safetyLimitReached || false,
            },
          });
        }
        onSequenceComplete?.();
      }, 100);

      return () => clearTimeout(completeTimer);
    }
  }, [chainReactionState, playExplosionStep, onSequenceComplete]);

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    // Animation completed, this is handled by the timeout in playExplosionStep
  }, []);

  return (
    <div className={styles.chainReactionManager}>
      {/* Chain Counter Display */}
      <ChainCounter
        consecutiveExplosions={consecutiveExplosions}
        isVisible={isChainReacting}
      />

      {/* Orb Movement Animations */}
      <div className={styles.animationLayer}>
        {activeAnimations.map((movement) => (
          <OrbMovementAnimation
            key={movement.id}
            movement={movement}
            gridSize={gridSize}
            cellSize={cellSize}
            onComplete={handleAnimationComplete}
          />
        ))}
      </div>

      {/* Debug Information (only in development) */}
      {import.meta.env.DEV && chainReactionState && (
        <div className={styles.debugInfo}>
          <div>
            Step: {chainReactionState.currentStep + 1}/
            {chainReactionState.totalSteps}
          </div>
          <div>Consecutive: {chainReactionState.consecutiveExplosions}</div>
          <div>
            Audio Intensity:{' '}
            {getIntensityFromExplosions(
              chainReactionState.consecutiveExplosions
            )}
            /10
          </div>
          <div>Active Animations: {activeAnimations.length}</div>
          <div>Safety: {chainReactionState.safety.currentCount}/20</div>
          {chainReactionState.safety.limitReached && (
            <div className={styles.safetyWarning}>Safety limit reached!</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChainReactionManager;
