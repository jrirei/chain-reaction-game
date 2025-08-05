import { useMemo } from 'react';
import { useGameContext } from '../context/useGameContext';
import { countPlayerOrbs } from '../utils/gameLogic';
import type { Player } from '../types';

export const useGameState = () => {
  const {
    gameState,
    dispatch,
    currentPlayer,
    players,
    activePlayers,
    isGameActive,
    canMakeMove,
    initializeGame,
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
  } = useGameContext();

  // Enhanced player data with orb counts
  const playersWithStats = useMemo(() => {
    return players.map((player) => {
      const orbCount = countPlayerOrbs(gameState.board, player.id);
      // Player is only eliminated if they have no orbs AND all players have had at least one complete round
      const minMovesForElimination = players.length;
      const isEliminated =
        orbCount === 0 &&
        gameState.moveCount > minMovesForElimination &&
        gameState.gameStatus !== 'setup';

      return {
        ...player,
        orbCount,
        isEliminated,
        isActive: !isEliminated,
      } as Player;
    });
  }, [players, gameState.board, gameState.moveCount, gameState.gameStatus]);

  // Current player with updated stats
  const currentPlayerWithStats = useMemo(() => {
    if (!currentPlayer) return null;
    return (
      playersWithStats.find((p) => p.id === currentPlayer.id) || currentPlayer
    );
  }, [currentPlayer, playersWithStats]);

  // Game status information
  const gameInfo = useMemo(
    () => ({
      status: gameState.gameStatus,
      moveCount: gameState.moveCount,
      currentPlayerName: currentPlayerWithStats?.name || '',
      currentPlayerColor: currentPlayerWithStats?.color || '',
      isGameStarted: gameState.gameStatus !== 'setup',
      isGameFinished: gameState.gameStatus === 'finished',
      isPaused: gameState.gameStatus === 'paused',
      isAnimating: gameState.isAnimating,
      winner: gameState.winner
        ? playersWithStats.find((p) => p.id === gameState.winner)
        : null,
      gameTime: gameState.gameStartTime
        ? (gameState.gameEndTime || Date.now()) - gameState.gameStartTime
        : 0,
    }),
    [gameState, currentPlayerWithStats, playersWithStats]
  );

  // Board information
  const boardInfo = useMemo(
    () => ({
      rows: gameState.board.rows,
      cols: gameState.board.cols,
      cells: gameState.board.cells,
      totalCells: gameState.board.rows * gameState.board.cols,
      occupiedCells: gameState.board.cells
        .flat()
        .filter((cell) => cell.orbCount > 0).length,
    }),
    [gameState.board]
  );

  // Settings information
  const settings = useMemo(() => gameState.settings, [gameState.settings]);

  // Action creators for common operations
  const actions = useMemo(
    () => ({
      updateSettings: (newSettings: Partial<typeof gameState.settings>) => {
        dispatch({
          type: 'UPDATE_SETTINGS',
          payload: { settings: newSettings },
        });
      },

      setAnimating: (isAnimating: boolean) => {
        dispatch({
          type: 'SET_ANIMATING',
          payload: { isAnimating },
        });
      },
    }),
    [dispatch, gameState]
  );

  return {
    // State
    gameState,
    gameInfo,
    boardInfo,
    settings,

    // Players
    players: playersWithStats,
    currentPlayer: currentPlayerWithStats,
    activePlayers: activePlayers.map(
      (ap) => playersWithStats.find((p) => p.id === ap.id) || ap
    ),

    // Status checks
    isGameActive,
    canMakeMove,

    // Actions
    dispatch,
    initializeGame,
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
    ...actions,
  };
};
