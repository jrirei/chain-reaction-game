import React, { useEffect, useState, useCallback } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useProgressiveAudioManager } from '../../hooks/useProgressiveAudioManager';
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
  const consecutiveExplosions = chainReactionState?.consecutiveExplosions || 0;

  // Play a single explosion step
  const playExplosionStep = useCallback(
    (step: ExplosionStep, intensity: number) => {
      console.log(
        `🎬 Playing explosion step ${step.stepIndex + 1}, intensity: ${intensity}, duration: 400ms`
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

      // Complete the step after animation duration (400ms - original speed)
      setTimeout(() => {
        setActiveAnimations([]);
        onStepComplete?.(step.stepIndex);

        // After this step completes, check if we need to play the next step
        if (
          chainReactionState &&
          step.stepIndex + 1 < chainReactionState.totalSteps
        ) {
          const nextStepIndex = step.stepIndex + 1;
          const nextStep = chainReactionState.explosionSteps[nextStepIndex];
          if (nextStep) {
            console.log(
              `🔄 Scheduling next step ${nextStepIndex} after current step completed`
            );
            // Schedule the next step to play immediately after this one completes
            setTimeout(() => {
              playExplosionStep(nextStep, nextStepIndex + 1);
            }, 100); // Small delay to ensure state updates
          }
        } else if (
          chainReactionState &&
          step.stepIndex + 1 >= chainReactionState.totalSteps
        ) {
          // All steps completed, finish the sequence
          console.log('✅ All steps completed, finishing sequence');
          setTimeout(() => {
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
        }
      }, 400);
    },
    [
      dispatch,
      onStepComplete,
      playProgressiveChainReaction,
      getIntensityFromExplosions,
      chainReactionState,
      onSequenceComplete,
    ]
  );

  // Handle chain reaction sequence start
  useEffect(() => {
    if (!chainReactionState || !chainReactionState.isPlaying) {
      console.log('🚫 Chain reaction manager: not playing');
      return;
    }

    const { explosionSteps, currentStep, totalSteps, gameWonEarly } =
      chainReactionState;
    console.log(
      `🎯 Chain reaction manager: step ${currentStep}/${totalSteps}, steps available: ${explosionSteps.length}, gameWonEarly: ${gameWonEarly}`
    );

    // Continue with animations even if game was won early - let all explosions complete
    if (gameWonEarly && currentStep === 0) {
      console.log(
        '🏆 Game won early! Continuing chain reaction animations until all enemy orbs are consumed'
      );
      // Continue with normal animation flow instead of skipping
    }

    // Only start the first step here - subsequent steps will be chained by playExplosionStep
    if (currentStep === 0 && explosionSteps.length > 0) {
      const firstStep = explosionSteps[0];
      console.log('🚀 Starting chain reaction sequence with first step');

      // Start the first step immediately
      playExplosionStep(firstStep, 1);
    }
  }, [chainReactionState, playExplosionStep, dispatch, onSequenceComplete]); // Include complete dependency

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    // Animation completed, this is handled by the timeout in playExplosionStep
  }, []);

  return (
    <div className={styles.chainReactionManager}>
      {/* Orb Movement Animations */}
      <div className={styles.animationLayer}>
        {activeAnimations.map((movement) => (
          <OrbMovementAnimation
            key={movement.id}
            movement={movement}
            gridSize={gridSize}
            cellSize={cellSize}
            intensity={consecutiveExplosions}
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
          <div>Steps: {chainReactionState.safety.currentCount}</div>
          {chainReactionState.safety.limitReached && (
            <div className={styles.safetyWarning}>Safety limit reached!</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChainReactionManager;
