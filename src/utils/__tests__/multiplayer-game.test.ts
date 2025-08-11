import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, createInitialGameState } from '../gameReducer';
import { executeOrbPlacement } from '../orbPlacement';
import { updateCell, updateGameStateWithBoard } from '../immutableUtils';
import type { GameState } from '../../types';

describe('Multi-Player Game Mechanics', () => {
  describe('3-Player Game Initialization', () => {
    it('should initialize 3-player game correctly', () => {
      const initialState = createInitialGameState();

      const action = {
        type: 'INITIALIZE_GAME' as const,
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 3,
            playerNames: ['Alice', 'Bob', 'Charlie'],
          },
          players: ['player1', 'player2', 'player3'],
        },
      };

      const gameState = gameReducer(initialState, action);

      expect(gameState.players).toEqual(['player1', 'player2', 'player3']);
      expect(gameState.settings.playerCount).toBe(3);
      expect(gameState.settings.playerNames).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ]);
      expect(gameState.currentPlayerIndex).toBe(0);

      // Check statistics initialization
      expect(gameState.gameStats?.playerStats).toHaveProperty('player1');
      expect(gameState.gameStats?.playerStats).toHaveProperty('player2');
      expect(gameState.gameStats?.playerStats).toHaveProperty('player3');

      Object.values(gameState.gameStats?.playerStats || {}).forEach((stats) => {
        expect(stats.movesPlayed).toBe(0);
        expect(stats.chainReactionsTriggered).toBe(0);
        expect(stats.explosionsCaused).toBe(0);
        expect(stats.longestChainReaction).toBe(0);
      });
    });

    it('should handle 4-player game initialization', () => {
      const initialState = createInitialGameState();

      const action = {
        type: 'INITIALIZE_GAME' as const,
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 4,
            playerNames: ['Alice', 'Bob', 'Charlie', 'Diana'],
          },
          players: ['player1', 'player2', 'player3', 'player4'],
        },
      };

      const gameState = gameReducer(initialState, action);

      expect(gameState.players).toHaveLength(4);
      expect(gameState.settings.playerCount).toBe(4);
      expect(Object.keys(gameState.gameStats?.playerStats || {})).toHaveLength(
        4
      );
    });
  });

  describe('3-Player Turn Progression', () => {
    let gameState: GameState;

    beforeEach(() => {
      const initialState = createInitialGameState();
      gameState = gameReducer(initialState, {
        type: 'INITIALIZE_GAME',
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 3,
            playerNames: ['Alice', 'Bob', 'Charlie'],
          },
          players: ['player1', 'player2', 'player3'],
        },
      });

      gameState = gameReducer(gameState, { type: 'START_GAME' });
    });

    it('should cycle through all 3 players correctly', () => {
      expect(gameState.currentPlayerIndex).toBe(0); // Alice

      // Player 1 -> Player 2
      gameState = gameReducer(gameState, { type: 'NEXT_TURN' });
      expect(gameState.currentPlayerIndex).toBe(1); // Bob

      // Player 2 -> Player 3
      gameState = gameReducer(gameState, { type: 'NEXT_TURN' });
      expect(gameState.currentPlayerIndex).toBe(2); // Charlie

      // Player 3 -> Player 1 (wrap around)
      gameState = gameReducer(gameState, { type: 'NEXT_TURN' });
      expect(gameState.currentPlayerIndex).toBe(0); // Alice again
    });

    it('should handle turn progression after explosions', async () => {
      // Place orb to trigger explosion and test turn progression
      const result = await executeOrbPlacement(gameState, 0, 0, 'player1');

      expect(result.success).toBe(true);
      if (result.updatedGameState && result.actions) {
        // Simulate executing all the actions returned by executeOrbPlacement
        let finalState = gameState;
        for (const action of result.actions) {
          finalState = gameReducer(finalState, action);
        }

        // Should advance to next player after explosion completes
        expect(finalState.currentPlayerIndex).toBe(1);
      }
    });
  });

  describe('3-Player Win Conditions', () => {
    let gameState: GameState;

    beforeEach(() => {
      const initialState = createInitialGameState();
      gameState = gameReducer(initialState, {
        type: 'INITIALIZE_GAME',
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 3,
            playerNames: ['Alice', 'Bob', 'Charlie'],
          },
          players: ['player1', 'player2', 'player3'],
        },
      });

      gameState = gameReducer(gameState, { type: 'START_GAME' });
    });

    it('should detect win when only one player remains', () => {
      // Simulate game state where only player1 has orbs
      gameState = updateGameStateWithBoard(
        gameState,
        updateCell(gameState.board, 0, 0, { orbCount: 1, playerId: 'player1' }),
        { moveCount: 10 }
      ); // Ensure minimum moves requirement

      const finalState = gameReducer(gameState, {
        type: 'COMPLETE_EXPLOSIONS',
      });

      expect(finalState.gameStatus).toBe('finished');
      expect(finalState.winner).toBe('player1');
    });

    it('should continue game when multiple players have orbs', () => {
      // Multiple players have orbs
      let newBoard = updateCell(gameState.board, 0, 0, {
        orbCount: 1,
        playerId: 'player1',
      });
      newBoard = updateCell(newBoard, 1, 1, {
        orbCount: 1,
        playerId: 'player2',
      });
      newBoard = updateCell(newBoard, 2, 2, {
        orbCount: 1,
        playerId: 'player3',
      });
      gameState = updateGameStateWithBoard(gameState, newBoard, {
        moveCount: 10,
      });

      const finalState = gameReducer(gameState, {
        type: 'COMPLETE_EXPLOSIONS',
      });

      expect(finalState.gameStatus).toBe('playing');
      expect(finalState.winner).toBeNull();
    });

    it('should eliminate players correctly', () => {
      // Player 2 has no orbs (eliminated)
      let newBoard = updateCell(gameState.board, 0, 0, {
        orbCount: 1,
        playerId: 'player1',
      });
      newBoard = updateCell(newBoard, 2, 2, {
        orbCount: 1,
        playerId: 'player3',
      });
      gameState = updateGameStateWithBoard(gameState, newBoard, {
        moveCount: 10,
      });

      const finalState = gameReducer(gameState, {
        type: 'COMPLETE_EXPLOSIONS',
      });

      // Game should continue with 2 remaining players
      expect(finalState.gameStatus).toBe('playing');
      expect(finalState.winner).toBeNull();
    });
  });

  describe('3-Player Statistics Tracking', () => {
    let gameState: GameState;

    beforeEach(() => {
      const initialState = createInitialGameState();
      gameState = gameReducer(initialState, {
        type: 'INITIALIZE_GAME',
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 3,
            playerNames: ['Alice', 'Bob', 'Charlie'],
          },
          players: ['player1', 'player2', 'player3'],
        },
      });

      gameState = gameReducer(gameState, { type: 'START_GAME' });
    });

    it('should track moves for all players independently', () => {
      // Player 1 makes a move
      gameState = gameReducer(gameState, {
        type: 'PLACE_ORB',
        payload: { row: 0, col: 0, playerId: 'player1' },
      });

      // Player 2 makes a move
      gameState = gameReducer(gameState, { type: 'NEXT_TURN' });
      gameState = gameReducer(gameState, {
        type: 'PLACE_ORB',
        payload: { row: 1, col: 1, playerId: 'player2' },
      });

      expect(gameState.gameStats?.playerStats.player1.movesPlayed).toBe(1);
      expect(gameState.gameStats?.playerStats.player2.movesPlayed).toBe(1);
      expect(gameState.gameStats?.playerStats.player3.movesPlayed).toBe(0);
    });

    it('should track chain reactions for all players', () => {
      // Record chain reaction for player1
      gameState = gameReducer(gameState, {
        type: 'RECORD_CHAIN_REACTION',
        payload: {
          playerId: 'player1',
          chainLength: 2,
          explosionsCount: 3,
        },
      });

      // Record chain reaction for player3
      gameState = gameReducer(gameState, {
        type: 'RECORD_CHAIN_REACTION',
        payload: {
          playerId: 'player3',
          chainLength: 4,
          explosionsCount: 5,
        },
      });

      expect(
        gameState.gameStats?.playerStats.player1.chainReactionsTriggered
      ).toBe(1);
      expect(gameState.gameStats?.playerStats.player1.explosionsCaused).toBe(3);
      expect(
        gameState.gameStats?.playerStats.player1.longestChainReaction
      ).toBe(2);

      expect(
        gameState.gameStats?.playerStats.player3.chainReactionsTriggered
      ).toBe(1);
      expect(gameState.gameStats?.playerStats.player3.explosionsCaused).toBe(5);
      expect(
        gameState.gameStats?.playerStats.player3.longestChainReaction
      ).toBe(4);

      expect(
        gameState.gameStats?.playerStats.player2.chainReactionsTriggered
      ).toBe(0);

      // Check global stats
      expect(gameState.gameStats?.totalExplosions).toBe(8);
      expect(gameState.gameStats?.chainReactionsCount).toBe(2);
      expect(gameState.gameStats?.longestChainReaction).toBe(4);
    });
  });

  describe('4-Player Game Scenarios', () => {
    let gameState: GameState;

    beforeEach(() => {
      const initialState = createInitialGameState();
      gameState = gameReducer(initialState, {
        type: 'INITIALIZE_GAME',
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 4,
            playerNames: ['Alice', 'Bob', 'Charlie', 'Diana'],
          },
          players: ['player1', 'player2', 'player3', 'player4'],
        },
      });

      gameState = gameReducer(gameState, { type: 'START_GAME' });
    });

    it('should cycle through all 4 players correctly', () => {
      expect(gameState.currentPlayerIndex).toBe(0);

      // Test full cycle
      for (let i = 1; i < 4; i++) {
        gameState = gameReducer(gameState, { type: 'NEXT_TURN' });
        expect(gameState.currentPlayerIndex).toBe(i);
      }

      // Should wrap back to player 1
      gameState = gameReducer(gameState, { type: 'NEXT_TURN' });
      expect(gameState.currentPlayerIndex).toBe(0);
    });

    it('should handle complex elimination scenarios', () => {
      // Set up scenario: Player 1 and Player 4 have orbs, others eliminated
      let newBoard = updateCell(gameState.board, 0, 0, {
        orbCount: 2,
        playerId: 'player1',
      });
      newBoard = updateCell(newBoard, 5, 8, {
        orbCount: 1,
        playerId: 'player4',
      });
      gameState = updateGameStateWithBoard(gameState, newBoard, {
        moveCount: 20,
      });

      const finalState = gameReducer(gameState, {
        type: 'COMPLETE_EXPLOSIONS',
      });

      // Game should continue with 2 remaining players
      expect(finalState.gameStatus).toBe('playing');
      expect(finalState.winner).toBeNull();
    });

    it('should detect winner in 4-player game', () => {
      // Only player3 has orbs
      gameState = updateGameStateWithBoard(
        gameState,
        updateCell(gameState.board, 2, 4, { orbCount: 3, playerId: 'player3' }),
        { moveCount: 25 }
      );

      const finalState = gameReducer(gameState, {
        type: 'COMPLETE_EXPLOSIONS',
      });

      expect(finalState.gameStatus).toBe('finished');
      expect(finalState.winner).toBe('player3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle player elimination during turn progression', () => {
      const initialState = createInitialGameState();
      let gameState = gameReducer(initialState, {
        type: 'INITIALIZE_GAME',
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 3,
            playerNames: ['Alice', 'Bob', 'Charlie'],
          },
          players: ['player1', 'player2', 'player3'],
        },
      });

      gameState = gameReducer(gameState, { type: 'START_GAME' });

      // Eliminate player2
      gameState = gameReducer(gameState, {
        type: 'ELIMINATE_PLAYER',
        payload: { playerId: 'player2' },
      });

      expect(gameState.players).toEqual(['player1', 'player3']);
      expect(gameState.currentPlayerIndex).toBe(0); // Should remain valid
    });

    it('should handle minimum moves requirement for win detection', () => {
      const initialState = createInitialGameState();
      let gameState = gameReducer(initialState, {
        type: 'INITIALIZE_GAME',
        payload: {
          settings: {
            ...initialState.settings,
            playerCount: 3,
            playerNames: ['Alice', 'Bob', 'Charlie'],
          },
          players: ['player1', 'player2', 'player3'],
        },
      });

      gameState = gameReducer(gameState, { type: 'START_GAME' });

      // Only player1 has orbs but minimum moves not reached
      gameState = updateGameStateWithBoard(
        gameState,
        updateCell(gameState.board, 0, 0, { orbCount: 1, playerId: 'player1' }),
        { moveCount: 2 }
      ); // Less than required (3 for 3-player game)

      const finalState = gameReducer(gameState, {
        type: 'COMPLETE_EXPLOSIONS',
      });

      // Game should continue despite only one player having orbs
      expect(finalState.gameStatus).toBe('playing');
      expect(finalState.winner).toBeNull();
    });
  });
});
