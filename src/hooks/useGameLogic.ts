import { useCallback } from 'react';
import { useGameState, usePlayer } from '../context';
import {
  isValidMove,
  placeOrb,
  processChainReactions,
  checkGameOver,
  getActivePlayers,
} from '../utils/gameLogic';
import type { PlayerId } from '../types';

export const useGameLogic = () => {
  const { gameState, dispatch, isGameActive } = useGameState();
  const { currentPlayer } = usePlayer();

  // Place an orb and handle chain reactions
  const makeMove = useCallback(
    async (row: number, col: number): Promise<boolean> => {
      if (!currentPlayer || !isGameActive) {
        console.warn('Cannot make move: game not active or no current player');
        return false;
      }

      // Validate the move
      if (!isValidMove(gameState.board, row, col, currentPlayer.id)) {
        console.warn('Invalid move attempted');
        return false;
      }

      try {
        // Place the orb
        dispatch({
          type: 'PLACE_ORB',
          payload: {
            row,
            col,
            playerId: currentPlayer.id,
          },
        });

        // Create updated board state for chain reaction processing
        const updatedBoard = placeOrb(
          gameState.board,
          row,
          col,
          currentPlayer.id
        );

        // Process chain reactions
        const { finalBoard, explosionSteps } =
          processChainReactions(updatedBoard);

        if (explosionSteps.length > 0) {
          // Set animating state
          dispatch({
            type: 'SET_ANIMATING',
            payload: { isAnimating: true },
          });

          // Process explosions with animation delays
          for (let i = 0; i < explosionSteps.length; i++) {
            // Simulate animation delay
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Update board state
            dispatch({
              type: 'TRIGGER_EXPLOSION',
              payload: {
                explosions: [], // This will be calculated in the reducer
              },
            });
          }

          // Complete explosions
          dispatch({ type: 'COMPLETE_EXPLOSIONS' });
        }

        // Update the board to final state after explosions
        // Note: In a real implementation, you'd want to dispatch the final board state

        // Check for game over conditions
        const gameOverResult = checkGameOver({
          ...gameState,
          board: finalBoard,
          moveCount: gameState.moveCount + 1,
        });

        if (gameOverResult.isGameOver && gameOverResult.winner) {
          dispatch({
            type: 'SET_WINNER',
            payload: { winner: gameOverResult.winner },
          });
        } else {
          // Move to next turn
          dispatch({ type: 'NEXT_TURN' });
        }

        return true;
      } catch (error) {
        console.error('Error making move:', error);
        return false;
      }
    },
    [gameState, dispatch, currentPlayer, isGameActive]
  );

  // Check if a specific move is valid
  const isValidMoveAt = useCallback(
    (row: number, col: number): boolean => {
      if (!currentPlayer) return false;
      return isValidMove(gameState.board, row, col, currentPlayer.id);
    },
    [gameState.board, currentPlayer]
  );

  // Get game statistics
  const getGameStats = useCallback(() => {
    const activePlayers = getActivePlayers(gameState.board);
    const eliminatedPlayers = gameState.players.filter(
      (playerId) => !activePlayers.includes(playerId)
    );

    return {
      totalMoves: gameState.moveCount,
      activePlayers: activePlayers.length,
      eliminatedPlayers: eliminatedPlayers.length,
      gameTime: gameState.gameStartTime
        ? (gameState.gameEndTime || Date.now()) - gameState.gameStartTime
        : 0,
    };
  }, [gameState]);

  // Force end game (for testing or admin purposes)
  const forceEndGame = useCallback(
    (winner?: PlayerId) => {
      if (winner) {
        dispatch({
          type: 'SET_WINNER',
          payload: { winner },
        });
      } else {
        // End with no winner (draw) - use first player as fallback
        dispatch({
          type: 'SET_WINNER',
          payload: { winner: gameState.players[0] || 'player-1' },
        });
      }
    },
    [dispatch, gameState.players]
  );

  return {
    makeMove,
    isValidMoveAt,
    getGameStats,
    forceEndGame,
  };
};
