import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameState } from './useGameState';
import { useProgressiveAudioManager } from './useProgressiveAudioManager';
import {
  executeOrbPlacement,
  previewOrbPlacement,
  getMoveAnalysis,
  type OrbPlacementOptions,
} from '../utils/orbPlacement';
import {
  validateMoveWithFeedback,
  type MoveContext,
} from '../utils/moveValidation';
import type { PlayerId } from '../types';

export interface OrbPlacementFeedback {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
}

export interface MovePreview {
  isValid: boolean;
  willExplode: boolean;
  chainReactionCount: number;
  affectedCells: Array<{ row: number; col: number }>;
  error?: string;
}

export const useOrbPlacement = () => {
  const { gameState, currentPlayer, players, dispatch } = useGameState();
  const { playOrbPlace, playChainReaction, playInvalidMove } =
    useProgressiveAudioManager();
  const [isPlacingOrb, setIsPlacingOrb] = useState(false);
  const [feedback, setFeedback] = useState<OrbPlacementFeedback | null>(null);
  const [movePreview, setMovePreview] = useState<MovePreview | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Clear feedback after a delay
  const clearFeedback = useCallback((delay: number = 3000) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, delay) as unknown as number;
  }, []);

  // Show feedback message
  const showFeedback = useCallback(
    (newFeedback: OrbPlacementFeedback) => {
      setFeedback(newFeedback);
      clearFeedback(newFeedback.duration);
    },
    [clearFeedback]
  );

  // Place orb with comprehensive feedback
  const placeOrb = useCallback(
    async (
      row: number,
      col: number,
      options: OrbPlacementOptions = {}
    ): Promise<boolean> => {
      if (!currentPlayer) {
        showFeedback({
          message: 'No current player',
          type: 'error',
        });
        return false;
      }

      if (isPlacingOrb) {
        showFeedback({
          message: 'Please wait for the current move to complete',
          type: 'warning',
        });
        return false;
      }

      setIsPlacingOrb(true);

      try {
        // Validate move first for immediate feedback
        const moveContext: MoveContext = {
          gameState,
          currentPlayerId: currentPlayer.id,
          targetRow: row,
          targetCol: col,
        };

        const validation = validateMoveWithFeedback(moveContext);

        if (!validation.canMove) {
          playInvalidMove();
          showFeedback({
            message: validation.message,
            type: validation.type,
          });
          return false;
        }

        // Get the current player's color for consistent animations
        const currentPlayerData = players.find(
          (p) => p.id === currentPlayer.id
        );
        const playerColor = currentPlayerData?.color;

        // Execute the placement with player color for consistent animations
        const result = await executeOrbPlacement(
          gameState,
          row,
          col,
          currentPlayer.id,
          {
            ...options,
            playerColor,
          }
        );

        if (!result.success) {
          playInvalidMove();
          showFeedback({
            message: result.error || 'Failed to place orb',
            type: 'error',
          });
          return false;
        }

        // Play orb placement sound
        playOrbPlace();

        // Check if the new step-wise system is being used
        const isUsingNewSystem =
          result.actions?.some(
            (action) => action.type === 'START_CHAIN_SEQUENCE'
          ) || false;

        if (isUsingNewSystem && result.actions) {
          // New system: dispatch individual actions to preserve chain reaction state
          console.log(
            '🎬 New system: dispatching individual actions',
            result.actions.map((a) => a.type)
          );
          for (const action of result.actions) {
            dispatch(action);
          }
        } else if (result.updatedGameState) {
          // Old system: Apply the final game state directly
          dispatch({
            type: 'SET_GAME_STATE',
            payload: result.updatedGameState,
          });
        }

        // Handle animations properly for chain reactions
        if (
          result.chainReactionSteps &&
          result.chainReactionSteps.length > 0 &&
          result.updatedGameState &&
          result.updatedGameState.isAnimating &&
          !isUsingNewSystem
        ) {
          // Only use old animation system if new system is not active
          // Always play chain reaction sound for any explosion
          // The new sound is designed to work for both single and multiple explosions
          playChainReaction();

          console.log('Chain reaction detected, using OLD animation system...');

          // Clear any existing animation timeout
          if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
          }

          // Calculate animation duration based on chain reaction complexity
          const baseAnimationTime = 500; // Base time for explosion animation (matches CSS)
          const chainReactionDelay = 200; // Additional delay per chain reaction step
          const totalAnimationTime =
            baseAnimationTime +
            result.chainReactionSteps.length * chainReactionDelay;

          console.log(
            `Animation will complete in ${totalAnimationTime}ms (${result.chainReactionSteps.length} chain steps)`
          );

          // Set timeout to complete animations after proper duration
          animationTimeoutRef.current = setTimeout(() => {
            console.log(
              'Animation sequence complete, dispatching COMPLETE_EXPLOSIONS'
            );
            dispatch({ type: 'COMPLETE_EXPLOSIONS' });
            animationTimeoutRef.current = null;
          }, totalAnimationTime) as unknown as number;
        } else if (isUsingNewSystem) {
          // New step-wise system is active - ChainReactionManager will handle the timing
          console.log(
            '🎬 Using NEW step-wise animation system - ChainReactionManager will handle timing'
          );
        } else if (result.actions) {
          // For non-animated moves, process turn progression immediately
          for (const action of result.actions) {
            if (
              action.type === 'NEXT_TURN' &&
              result.updatedGameState &&
              result.updatedGameState.gameStatus !== 'finished'
            ) {
              dispatch(action);
            }
          }
        }

        // Show success feedback
        let message = 'Orb placed successfully';
        let type: 'success' | 'info' = 'success';

        if (result.chainReactionSteps && result.chainReactionSteps.length > 0) {
          message = `Chain reaction with ${result.chainReactionSteps.length} explosions!`;
          type = 'info';
        }

        if (validation.type === 'warning') {
          message = validation.message;
          type = 'info';
        }

        showFeedback({ message, type });

        return true;
      } catch (error) {
        showFeedback({
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
          type: 'error',
        });
        return false;
      } finally {
        setIsPlacingOrb(false);
      }
    },
    [
      gameState,
      currentPlayer,
      players,
      dispatch,
      isPlacingOrb,
      showFeedback,
      playOrbPlace,
      playChainReaction,
      playInvalidMove,
    ]
  );

  // Preview a move without executing it
  const previewMove = useCallback(
    (row: number, col: number): MovePreview | null => {
      if (!currentPlayer) return null;

      const preview = previewOrbPlacement(
        gameState,
        row,
        col,
        currentPlayer.id
      );
      const movePreview: MovePreview = {
        isValid: preview.isValid,
        willExplode: preview.wouldExplode,
        chainReactionCount: preview.chainReactionCount,
        affectedCells: preview.affectedCells,
        error: preview.error,
      };
      setMovePreview(movePreview);
      return movePreview;
    },
    [gameState, currentPlayer]
  );

  // Clear move preview
  const clearMovePreview = useCallback(() => {
    setMovePreview(null);
  }, []);

  // Get move suggestions
  const getMoveHelp = useCallback(() => {
    if (!currentPlayer) return [];

    return getMoveAnalysis(gameState, currentPlayer.id);
  }, [gameState, currentPlayer]);

  // Check if a specific cell is a valid target
  const isValidTarget = useCallback(
    (row: number, col: number): boolean => {
      if (!currentPlayer) return false;

      const moveContext: MoveContext = {
        gameState,
        currentPlayerId: currentPlayer.id,
        targetRow: row,
        targetCol: col,
      };

      const validation = validateMoveWithFeedback(moveContext);
      return validation.canMove;
    },
    [gameState, currentPlayer]
  );

  // Get cell interaction feedback
  const getCellFeedback = useCallback(
    (row: number, col: number): OrbPlacementFeedback | null => {
      if (!currentPlayer) return null;

      const moveContext: MoveContext = {
        gameState,
        currentPlayerId: currentPlayer.id,
        targetRow: row,
        targetCol: col,
      };

      const validation = validateMoveWithFeedback(moveContext);

      return {
        message: validation.message,
        type: validation.type,
        duration: 1500,
      };
    },
    [gameState, currentPlayer]
  );

  // Batch place orbs (for testing/replay)
  const batchPlaceOrbs = useCallback(
    async (
      moves: Array<{ row: number; col: number; playerId: PlayerId }>
    ): Promise<boolean> => {
      setIsPlacingOrb(true);

      try {
        // This would require implementing batch placement in the game logic
        showFeedback({
          message: `Executing ${moves.length} moves...`,
          type: 'info',
        });

        // For now, execute moves sequentially
        for (const move of moves) {
          const success = await placeOrb(move.row, move.col, {
            enableAnimations: false,
          });
          if (!success) {
            showFeedback({
              message: `Failed to execute move at ${move.row}, ${move.col}`,
              type: 'error',
            });
            return false;
          }
        }

        showFeedback({
          message: `Successfully executed ${moves.length} moves`,
          type: 'success',
        });

        return true;
      } catch {
        showFeedback({
          message: 'Failed to execute batch moves',
          type: 'error',
        });
        return false;
      } finally {
        setIsPlacingOrb(false);
      }
    },
    [placeOrb, showFeedback]
  );

  return {
    // Core functionality
    placeOrb,
    isPlacingOrb,

    // Move preview and validation
    previewMove,
    clearMovePreview,
    movePreview,
    isValidTarget,

    // Feedback system
    feedback,
    showFeedback,
    clearFeedback: () => {
      setFeedback(null);
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      // Also clear animation timeout if user manually clears feedback
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    },
    getCellFeedback,

    // Helper functions
    getMoveHelp,
    batchPlaceOrbs,
  };
};
