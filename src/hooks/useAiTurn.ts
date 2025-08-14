/**
 * AI Turn Management Hook
 *
 * Handles AI player turns, including move decision making and execution.
 * Integrates with the game state to trigger AI moves when it's an AI player's turn.
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useGameState, usePlayer } from '../context';
import { BotRunner } from '../ai/botRunner';
import type { Player } from '../types/player';
import { GameEngine } from '../core/engineSimple';
import { GameStatus } from '../types/game';

export const useAiTurn = () => {
  const { gameState, dispatch } = useGameState();
  const { currentPlayer } = usePlayer();

  const engine = useMemo(() => new GameEngine(), []);
  const botRunner = useMemo(
    () => new BotRunner(engine, { minDelayMs: 500 }),
    [engine]
  );

  // Rate limiting: prevent multiple AI turns from executing simultaneously
  const [isExecutingAiTurn, setIsExecutingAiTurn] = useState(false);

  // Execute AI turn
  const executeAiTurn = useCallback(
    async (aiPlayer: Player) => {
      // Rate limiting: prevent simultaneous AI turn execution
      if (isExecutingAiTurn) {
        console.log('⏳ AI turn already in progress, skipping...');
        return;
      }

      setIsExecutingAiTurn(true);
      console.log('🚀 Starting AI turn execution for:', aiPlayer.name);

      try {
        // Check if it's actually an AI player
        if (aiPlayer.type !== 'ai' || !aiPlayer.aiConfig) {
          console.error('❌ executeAiTurn called on non-AI player:', aiPlayer);
          return;
        }

        // Get legal moves
        const legalMoves = engine.getLegalMoves(gameState);
        console.log('⚖️ Legal moves available:', legalMoves.length);

        if (legalMoves.length === 0) {
          console.error(
            '❌ No legal moves available for AI player:',
            aiPlayer.name
          );
          return;
        }

        // Clamp maxThinkingMs for better UX and performance
        const clampedThinkingMs = Math.max(
          100,
          Math.min(30000, aiPlayer.aiConfig.maxThinkingMs || 3000)
        );

        console.log(
          `🤖 AI ${aiPlayer.name} is thinking... (${aiPlayer.aiConfig.strategy}, max: ${clampedThinkingMs}ms)`
        );

        // Create AI strategy
        const { createAiStrategy } = await import('../ai/registry');
        const strategy = createAiStrategy(
          aiPlayer.aiConfig.strategy,
          aiPlayer.aiConfig
        );

        // Execute AI turn using BotRunner with clamped thinking time
        const result = await botRunner.playTurn(strategy, gameState, {
          rng: Math.random,
          maxThinkingMs: clampedThinkingMs,
        });

        // Calculate effective timing information
        const effectiveThinkingMs = Math.round(result.thinkingMs);
        const effectiveDelayMs = Math.round(result.delayAppliedMs || 0);
        const totalTimeMs = effectiveThinkingMs + effectiveDelayMs;

        console.log(
          `🎯 AI ${aiPlayer.name} chose move:`,
          result.move,
          `(thinking: ${effectiveThinkingMs}ms, delay: ${effectiveDelayMs}ms, total: ${totalTimeMs}ms)`
        );

        // Execute the move using proper orb placement logic
        console.log(
          '📤 Executing orb placement with proper turn progression...'
        );
        const { executeOrbPlacement } = await import('../utils/orbPlacement');

        const placementResult = await executeOrbPlacement(
          gameState,
          result.move.row,
          result.move.col,
          result.move.playerId,
          {
            skipValidation: false, // Still validate for safety
            enableAnimations: gameState.settings.enableAnimations,
            calculateChainReactions: true,
          }
        );

        if (!placementResult.success) {
          console.error('❌ AI orb placement failed:', placementResult.error);
          return;
        }

        // Dispatch all actions returned by orb placement (includes PLACE_ORB, NEXT_TURN, etc.)
        if (placementResult.actions) {
          console.log(
            `📋 Dispatching ${placementResult.actions.length} actions:`,
            placementResult.actions.map((a) => a.type)
          );

          for (const action of placementResult.actions) {
            dispatch(action);
          }
        }
      } catch (error: unknown) {
        console.error('❌ AI turn execution failed:', error);
        if (error instanceof Error) {
          console.error('Stack trace:', error.stack);
        }

        // Fallback to random move to prevent game from breaking
        try {
          const legalMoves = engine.getLegalMoves(gameState);
          if (legalMoves.length > 0) {
            const randomMove =
              legalMoves[Math.floor(Math.random() * legalMoves.length)];
            console.warn('🎲 Falling back to random move:', randomMove);

            dispatch({
              type: 'PLACE_ORB',
              payload: {
                row: randomMove.row,
                col: randomMove.col,
                playerId: randomMove.playerId,
              },
            });
          } else {
            console.error('💥 No legal moves available for fallback');
            // If no legal moves, end the turn without a move
            dispatch({
              type: 'END_PLAYER_TURN',
              payload: {
                playerId: aiPlayer.id,
                turnEndTime: Date.now(),
              },
            });
          }
        } catch (fallbackError) {
          console.error('💥 Fallback logic also failed:', fallbackError);
          // Last resort: just end the turn
          dispatch({
            type: 'END_PLAYER_TURN',
            payload: {
              playerId: aiPlayer.id,
              turnEndTime: Date.now(),
            },
          });
        }
      } finally {
        // Always clear the execution flag
        setIsExecutingAiTurn(false);
      }
    },
    [gameState, engine, botRunner, dispatch, isExecutingAiTurn]
  );

  // Effect to trigger AI turns when it's an AI player's turn
  useEffect(() => {
    console.log('🔍 AI Turn Check:', {
      gameStatus: gameState.gameStatus,
      isAnimating: gameState.isAnimating,
      currentPlayer: currentPlayer
        ? {
            name: currentPlayer.name,
            type: currentPlayer.type,
            aiConfig: currentPlayer.aiConfig,
          }
        : null,
    });

    // Only trigger if game is active and not animating, and no AI turn in progress
    if (
      gameState.gameStatus !== GameStatus.PLAYING ||
      gameState.isAnimating ||
      !currentPlayer ||
      isExecutingAiTurn
    ) {
      console.log('⏸️ AI Turn skipped - game not ready or AI turn in progress');
      return;
    }

    // Check if current player is AI
    if (currentPlayer.type === 'ai' && currentPlayer.aiConfig) {
      console.log('🤖 Triggering AI turn for:', currentPlayer.name);

      // Small delay to make AI turns feel more natural
      const delay = Math.max(500, currentPlayer.aiConfig.maxThinkingMs || 1000);

      const timeoutId = setTimeout(
        () => {
          executeAiTurn(currentPlayer);
        },
        Math.min(delay, 2000)
      ); // Cap at 2 seconds for UI responsiveness

      return () => clearTimeout(timeoutId);
    } else {
      console.log('👤 Current player is human:', currentPlayer.name);
    }
  }, [
    currentPlayer,
    gameState.gameStatus,
    gameState.isAnimating,
    executeAiTurn,
    isExecutingAiTurn,
  ]);

  return {
    executeAiTurn,
    isAiTurn: currentPlayer?.type === 'ai',
    isExecutingAiTurn,
  };
};
