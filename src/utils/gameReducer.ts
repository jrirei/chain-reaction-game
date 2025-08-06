import type { GameState, GameAction, PlayerGameStats } from '../types';
import { GameStatus } from '../types';
import { checkGameEnd } from './winLoseDetection';
import { createEmptyBoard } from './gameLogic';
import { DEFAULT_GRID_SIZE, DEFAULT_PLAYER_COUNT } from './constants';

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
        };
      });

      return {
        ...state,
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
      };
    }

    case 'START_GAME': {
      return {
        ...state,
        gameStatus: GameStatus.PLAYING,
        gameStartTime: Date.now(),
      };
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
      let nextPlayerIndex;

      if (activePlayers.length < newState.players.length) {
        // Players have been eliminated
        updatedPlayers = activePlayers;

        // Find the next active player in the original turn order
        const originalPlayers = newState.players;
        let searchIndex = newState.currentPlayerIndex;

        // Search for the next active player starting from current position
        for (let attempts = 0; attempts < originalPlayers.length; attempts++) {
          searchIndex = (searchIndex + 1) % originalPlayers.length;
          const candidatePlayerId = originalPlayers[searchIndex];

          if (activePlayers.includes(candidatePlayerId)) {
            // Found next active player, get their index in the new active players array
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
      const nextPlayerIndex =
        (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
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

    default:
      return state;
  }
};
