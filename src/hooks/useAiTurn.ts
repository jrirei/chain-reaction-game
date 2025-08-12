/**
 * AI Turn Management Hook
 *
 * Handles AI player turns, including move decision making and execution.
 * Integrates with the game state to trigger AI moves when it's an AI player's turn.
 */

import { useEffect, useCallback } from 'react';
import { useGameContext } from '../context/useGameContext';
import { BotRunner } from '../ai/botRunner';
import type { Player } from '../types/player';
import { GameEngine } from '../core/engineSimple';
import { GameStatus } from '../types/game';

export const useAiTurn = () => {
  const { gameState, currentPlayer, dispatch } = useGameContext();

  const engine = new GameEngine();
  const botRunner = new BotRunner(engine, { minDelayMs: 500 });

  // Execute AI turn
  const executeAiTurn = useCallback(
    async (aiPlayer: Player) => {
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

        console.log(
          `🤖 AI ${aiPlayer.name} is thinking... (${aiPlayer.aiConfig.strategy})`
        );

        // Create AI strategy
        const { createAiStrategy } = await import('../ai/registry');
        const strategy = createAiStrategy(
          aiPlayer.aiConfig.strategy,
          aiPlayer.aiConfig
        );

        // Execute AI turn using BotRunner
        const result = await botRunner.playTurn(strategy, gameState, {
          rng: Math.random,
          maxThinkingMs: aiPlayer.aiConfig.maxThinkingMs,
        });

        console.log(
          `🎯 AI ${aiPlayer.name} chose move:`,
          result.move,
          `(${result.thinkingMs}ms)`
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
        // TODO: Handle AI failure gracefully - maybe skip turn or fall back to random move
      }
    },
    [gameState, engine, botRunner, dispatch]
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

    // Only trigger if game is active and not animating
    if (
      gameState.gameStatus !== GameStatus.PLAYING ||
      gameState.isAnimating ||
      !currentPlayer
    ) {
      console.log('⏸️ AI Turn skipped - game not ready');
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
  ]);

  return {
    executeAiTurn,
    isAiTurn: currentPlayer?.type === 'ai',
  };
};
