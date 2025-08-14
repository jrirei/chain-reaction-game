import type { GameState, GameAction, PlayerGameStats } from '../types';
import { GameStatus } from '../types';
import { checkGameEnd } from './winLoseDetection';
import { createEmptyBoard } from './gameLogic';
import { DEFAULT_GRID_SIZE, DEFAULT_PLAYER_COUNT } from './constants';
import { updateGameState } from './immutableUtils';

export const createInitialGameState = (): GameState => ({
  board: createEmptyBoard(DEFAULT_GRID_SIZE.rows, DEFAULT_GRID_SIZE.cols),
  players: [],
  currentPlayerIndex: 0,
  gameStatus: GameStatus.SETUP,
  winner: null,
  isAnimating: false,
  moveCount: 0,
  gameStartTime: null,
  gameEndTime: null,
  settings: {
    gridRows: DEFAULT_GRID_SIZE.rows,
    gridCols: DEFAULT_GRID_SIZE.cols,
    playerCount: DEFAULT_PLAYER_COUNT,
    playerNames: ['Player 1', 'Player 2'],
    enableAnimations: true,
    enableSounds: true,
    maxPlayers: 4,
  },
  gameStats: {
    totalExplosions: 0,
    chainReactionsCount: 0,
    longestChainReaction: 0,
    playerStats: {},
  },
});

export const gameReducer = (
  state: GameState,
  action: GameAction
): GameState => {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      const { settings, players } = action.payload;

      // Initialize player stats for all players
      const playerStats: Record<string, PlayerGameStats> = {};
      players.forEach((playerId) => {
        playerStats[playerId] = {
          playerId,
          movesPlayed: 0,
          chainReactionsTriggered: 0,
          explosionsCaused: 0,
          longestChainReaction: 0,
          totalThinkingTimeMs: 0,
          turnStartTime: null,
        };
      });

      return updateGameState(state, {
        board: createEmptyBoard(settings.gridRows, settings.gridCols),
        players,
        currentPlayerIndex: 0,
        gameStatus: GameStatus.SETUP,
        winner: null,
        isAnimating: false,
        moveCount: 0,
        gameStartTime: null,
        gameEndTime: null,
        settings,
        gameStats: {
          totalExplosions: 0,
          chainReactionsCount: 0,
          longestChainReaction: 0,
          playerStats,
        },
      });
    }

    case 'START_GAME': {
      const currentTime = Date.now();
      const firstPlayerId = state.players[0];

      // Start timing for the first player
      const gameStats = state.gameStats || {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      };

      const firstPlayerStats = gameStats.playerStats[firstPlayerId] || {
        playerId: firstPlayerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
        totalThinkingTimeMs: 0,
        turnStartTime: null,
      };

      const updatedGameStats = {
        ...gameStats,
        playerStats: {
          ...gameStats.playerStats,
          [firstPlayerId]: {
            ...firstPlayerStats,
            turnStartTime: currentTime,
          },
        },
      };

      return updateGameState(state, {
        gameStatus: GameStatus.PLAYING,
        gameStartTime: currentTime,
        gameStats: updatedGameStats,
      });
    }

    case 'PLACE_ORB': {
      const { row, col, playerId } = action.payload;
      const newBoard = { ...state.board };
      newBoard.cells = state.board.cells.map((rowArray) =>
        rowArray.map((cell) => ({ ...cell }))
      );

      const cell = newBoard.cells[row][col];
      cell.orbCount += 1;
      cell.playerId = playerId;

      // Update player move count in stats (with defensive check)
      const gameStats = state.gameStats || {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      };

      const currentPlayerStats = gameStats.playerStats[playerId] || {
        playerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
      };

      const updatedPlayerStats = {
        ...currentPlayerStats,
        movesPlayed: currentPlayerStats.movesPlayed + 1,
      };

      const updatedGameStats = {
        ...gameStats,
        playerStats: {
          ...gameStats.playerStats,
          [playerId]: updatedPlayerStats,
        },
      };

      return {
        ...state,
        board: newBoard,
        moveCount: state.moveCount + 1,
        gameStats: updatedGameStats,
      };
    }

    case 'TRIGGER_EXPLOSION': {
      const { explosions } = action.payload;
      const newBoard = { ...state.board };
      newBoard.cells = state.board.cells.map((rowArray) =>
        rowArray.map((cell) => ({ ...cell }))
      );

      // Mark exploding cells
      explosions.forEach(({ row, col }) => {
        const cell = newBoard.cells[row][col];
        cell.isExploding = true;
      });

      return {
        ...state,
        board: newBoard,
        gameStatus: GameStatus.ANIMATING,
        isAnimating: true,
      };
    }

    case 'COMPLETE_EXPLOSIONS': {
      const newState = {
        ...state,
        gameStatus: GameStatus.PLAYING,
        isAnimating: false,
      };

      // Check for game over conditions now that animations are complete
      const gameEndResult = checkGameEnd(newState);
      if (gameEndResult.isGameOver) {
        return {
          ...newState,
          gameStatus: 'finished',
          winner: gameEndResult.winner || null,
          gameEndTime: Date.now(),
        };
      }

      // Get active players (those who still have orbs on the board)
      const activePlayers = gameEndResult.finalScores
        .filter((score) => !score.isEliminated)
        .map((score) => score.playerId);

      // If players have been eliminated, update the players array
      let updatedPlayers = newState.players;
      let nextPlayerIndex = 0; // Default fallback

      if (activePlayers.length < newState.players.length) {
        // Players have been eliminated - keep only the active player IDs
        updatedPlayers = activePlayers;

        // Find the next active player in the original turn order
        const originalPlayers = newState.players;
        let searchIndex = newState.currentPlayerIndex;

        // Search for the next active player starting from current position
        for (let attempts = 0; attempts < originalPlayers.length; attempts++) {
          searchIndex = (searchIndex + 1) % originalPlayers.length;
          const candidatePlayerId = originalPlayers[searchIndex];

          if (activePlayers.includes(candidatePlayerId)) {
            // Found next active player, get their index in the updated players array
            nextPlayerIndex = activePlayers.indexOf(candidatePlayerId);
            break;
          }
        }
      } else {
        // No eliminations, normal turn progression
        nextPlayerIndex =
          (newState.currentPlayerIndex + 1) % newState.players.length;
      }

      return {
        ...newState,
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
      };
    }

    case 'DEFER_WIN_CHECK': {
      // No-op action - just indicates that win checking should be deferred
      return state;
    }

    case 'NEXT_TURN': {
      const currentPlayerId = state.players[state.currentPlayerIndex];
      const nextPlayerIndex =
        (state.currentPlayerIndex + 1) % state.players.length;
      const nextPlayerId = state.players[nextPlayerIndex];
      const currentTime = Date.now();

      // End current player's turn timing
      const gameStats = state.gameStats || {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      };

      const currentPlayerStats = gameStats.playerStats[currentPlayerId] || {
        playerId: currentPlayerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
        totalThinkingTimeMs: 0,
        turnStartTime: null,
      };

      // Calculate thinking time if we have a start time
      const thinkingTime = currentPlayerStats.turnStartTime
        ? currentTime - currentPlayerStats.turnStartTime
        : 0;

      // Initialize next player stats if needed
      const nextPlayerStats = gameStats.playerStats[nextPlayerId] || {
        playerId: nextPlayerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
        totalThinkingTimeMs: 0,
        turnStartTime: null,
      };

      const updatedGameStats = {
        ...gameStats,
        playerStats: {
          ...gameStats.playerStats,
          [currentPlayerId]: {
            ...currentPlayerStats,
            totalThinkingTimeMs:
              currentPlayerStats.totalThinkingTimeMs + thinkingTime,
            turnStartTime: null, // Reset for next turn
            // movesPlayed is already incremented in PLACE_ORB action, don't double-count
          },
          [nextPlayerId]: {
            ...nextPlayerStats,
            turnStartTime: currentTime, // Start timing for next player
          },
        },
      };

      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        gameStats: updatedGameStats,
      };
    }

    case 'ELIMINATE_PLAYER': {
      const { playerId } = action.payload;
      const remainingPlayers = state.players.filter((id) => id !== playerId);

      let newCurrentPlayerIndex = state.currentPlayerIndex;
      if (newCurrentPlayerIndex >= remainingPlayers.length) {
        newCurrentPlayerIndex = 0;
      }

      return {
        ...state,
        players: remainingPlayers,
        currentPlayerIndex: newCurrentPlayerIndex,
      };
    }

    case 'SET_WINNER': {
      const { winner } = action.payload;
      return {
        ...state,
        winner,
        gameStatus: GameStatus.FINISHED,
        gameEndTime: Date.now(),
        isAnimating: false,
      };
    }

    case 'PAUSE_GAME': {
      return {
        ...state,
        gameStatus: GameStatus.PAUSED,
      };
    }

    case 'RESUME_GAME': {
      return {
        ...state,
        gameStatus: GameStatus.PLAYING,
      };
    }

    case 'RESET_GAME': {
      return {
        ...createInitialGameState(),
        settings: state.settings,
      };
    }

    case 'UPDATE_SETTINGS': {
      const { settings } = action.payload;
      return {
        ...state,
        settings: {
          ...state.settings,
          ...settings,
        },
      };
    }

    case 'SET_ANIMATING': {
      const { isAnimating } = action.payload;
      return {
        ...state,
        isAnimating,
        gameStatus: isAnimating ? GameStatus.ANIMATING : GameStatus.PLAYING,
      };
    }

    case 'SET_GAME_STATE': {
      // Replace entire game state (used after orb placement with chain reactions)
      return action.payload;
    }

    case 'RECORD_CHAIN_REACTION': {
      const { playerId, chainLength, explosionsCount } = action.payload;

      // Defensive check for gameStats
      const gameStats = state.gameStats || {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      };

      // Initialize player stats if they don't exist
      const currentPlayerStats = gameStats.playerStats[playerId] || {
        playerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
        totalThinkingTimeMs: 0,
        turnStartTime: null,
      };

      // Update player stats
      const updatedPlayerStats = {
        ...currentPlayerStats,
        chainReactionsTriggered: currentPlayerStats.chainReactionsTriggered + 1,
        explosionsCaused: currentPlayerStats.explosionsCaused + explosionsCount,
        longestChainReaction: Math.max(
          currentPlayerStats.longestChainReaction,
          chainLength
        ),
      };

      // Update game stats
      const updatedGameStats = {
        ...gameStats,
        totalExplosions: gameStats.totalExplosions + explosionsCount,
        chainReactionsCount: gameStats.chainReactionsCount + 1,
        longestChainReaction: Math.max(
          gameStats.longestChainReaction,
          chainLength
        ),
        playerStats: {
          ...gameStats.playerStats,
          [playerId]: updatedPlayerStats,
        },
      };

      return {
        ...state,
        gameStats: updatedGameStats,
      };
    }

    case 'START_CHAIN_SEQUENCE': {
      const {
        explosionSteps,
        totalSteps,
        finalBoard,
        safetyLimitReached,
        gameWonEarly,
      } = action.payload;

      return {
        ...state,
        gameStatus: 'chain_reacting',
        chainReactionState: {
          isPlaying: true,
          currentStep: 0,
          totalSteps,
          consecutiveExplosions: 0,
          explosionSteps,
          finalBoard, // Store final board for completion
          safetyLimitReached,
          gameWonEarly,
          safety: {
            maxSteps: 10000,
            currentCount: totalSteps,
            limitReached: safetyLimitReached,
          },
        },
      };
    }

    case 'PLAY_EXPLOSION_STEP': {
      const { stepIndex, intensity, boardState } = action.payload;

      if (!state.chainReactionState) {
        return state; // Safety check
      }

      return {
        ...state,
        board: boardState,
        chainReactionState: {
          ...state.chainReactionState,
          currentStep: stepIndex,
          consecutiveExplosions: intensity,
        },
      };
    }

    case 'COMPLETE_CHAIN_SEQUENCE': {
      const { finalBoard } = action.payload;

      // Check for game over conditions now that chain reaction is complete
      const gameEndResult = checkGameEnd({
        ...state,
        board: finalBoard,
      });

      if (gameEndResult.isGameOver) {
        return {
          ...state,
          board: finalBoard,
          gameStatus: 'finished',
          winner: gameEndResult.winner || null,
          gameEndTime: Date.now(),
          chainReactionState: undefined,
        };
      }

      // Get active players and update turn progression (same logic as COMPLETE_EXPLOSIONS)
      const activePlayers = gameEndResult.finalScores
        .filter((score) => !score.isEliminated)
        .map((score) => score.playerId);

      let updatedPlayers = state.players;
      let nextPlayerIndex = 0;

      if (activePlayers.length < state.players.length) {
        // Players have been eliminated - keep only the active player IDs
        updatedPlayers = activePlayers;

        // Find the next active player in the original turn order
        const originalPlayers = state.players;
        let searchIndex = state.currentPlayerIndex;

        // Search for the next active player starting from current position
        for (let attempts = 0; attempts < originalPlayers.length; attempts++) {
          searchIndex = (searchIndex + 1) % originalPlayers.length;
          const candidatePlayerId = originalPlayers[searchIndex];

          if (activePlayers.includes(candidatePlayerId)) {
            // Found next active player, get their index in the updated players array
            nextPlayerIndex = activePlayers.indexOf(candidatePlayerId);
            break;
          }
        }
      } else {
        // No eliminations, normal turn progression
        nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      }

      return {
        ...state,
        board: finalBoard,
        gameStatus: 'playing',
        chainReactionState: undefined,
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
      };
    }

    case 'START_PLAYER_TURN': {
      const { playerId, turnStartTime } = action.payload;

      const gameStats = state.gameStats || {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      };

      const currentPlayerStats = gameStats.playerStats[playerId] || {
        playerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
        totalThinkingTimeMs: 0,
        turnStartTime: null,
      };

      const updatedPlayerStats = {
        ...currentPlayerStats,
        turnStartTime,
      };

      const updatedGameStats = {
        ...gameStats,
        playerStats: {
          ...gameStats.playerStats,
          [playerId]: updatedPlayerStats,
        },
      };

      return {
        ...state,
        gameStats: updatedGameStats,
      };
    }

    case 'END_PLAYER_TURN': {
      const { playerId, turnEndTime } = action.payload;

      const gameStats = state.gameStats || {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      };

      const currentPlayerStats = gameStats.playerStats[playerId] || {
        playerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
        totalThinkingTimeMs: 0,
        turnStartTime: null,
      };

      // Calculate thinking time if we have a start time
      const thinkingTime = currentPlayerStats.turnStartTime
        ? turnEndTime - currentPlayerStats.turnStartTime
        : 0;

      const updatedPlayerStats = {
        ...currentPlayerStats,
        totalThinkingTimeMs:
          currentPlayerStats.totalThinkingTimeMs + thinkingTime,
        turnStartTime: null, // Reset for next turn
        // movesPlayed is already incremented in PLACE_ORB action, don't double-count
      };

      const updatedGameStats = {
        ...gameStats,
        playerStats: {
          ...gameStats.playerStats,
          [playerId]: updatedPlayerStats,
        },
      };

      return {
        ...state,
        gameStats: updatedGameStats,
      };
    }

    default:
      return state;
  }
};
