import { describe, it, expect } from 'vitest';
import { gameReducer, createInitialGameState } from '../gameReducer';
import { createEmptyBoard } from '../gameLogic';
import { executeOrbPlacement } from '../orbPlacement';
import type { GameState } from '../../types';
import { GameStatus } from '../../types';

describe('Chain Reaction Statistics', () => {
  it('should track chain reaction statistics correctly', async () => {
    // Create a game state with properly initialized stats
    let gameState: GameState = {
      ...createInitialGameState(),
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      board: createEmptyBoard(3, 3),
      moveCount: 10, // Ensure both players have had turns
    };

    // Initialize gameStats with both players
    gameState = gameReducer(gameState, {
      type: 'INITIALIZE_GAME',
      payload: {
        settings: gameState.settings,
        players: ['player1', 'player2'],
      },
    });

    console.log('=== TESTING CHAIN REACTION STATISTICS ===');
    console.log('Initial game stats:', gameState.gameStats);

    // Set up a scenario for chain reaction
    // Place orbs for both players to prevent elimination
    gameState.board.cells[2][2].orbCount = 1;
    gameState.board.cells[2][2].playerId = 'player2'; // Ensure player2 has orbs to prevent elimination
    gameState.board.cells[2][1].orbCount = 1;
    gameState.board.cells[2][1].playerId = 'player1'; // Player1 also has orbs

    // Set up corner cell with 1 orb, then place second to trigger explosion
    gameState.board.cells[0][0].orbCount = 1;
    gameState.board.cells[0][0].playerId = 'player1';

    // Place second orb in corner to trigger explosion
    const result = await executeOrbPlacement(gameState, 0, 0, 'player1', {
      enableAnimations: false,
      skipValidation: true, // Skip elimination check for test
    });

    expect(result.success).toBe(true);

    if (result.updatedGameState) {
      gameState = result.updatedGameState;

      // Apply all actions from the result
      if (result.actions) {
        for (const action of result.actions) {
          console.log(`Applying action: ${action.type}`);
          gameState = gameReducer(gameState, action);
        }
      }

      console.log('Final game stats:', gameState.gameStats);

      // Check that statistics were tracked
      expect(gameState.gameStats!.totalExplosions).toBeGreaterThan(0);
      expect(gameState.gameStats!.chainReactionsCount).toBeGreaterThan(0);

      // Check player-specific stats
      const player1Stats = gameState.gameStats!.playerStats['player1'];
      expect(player1Stats).toBeDefined();
      expect(player1Stats.movesPlayed).toBeGreaterThan(0);

      if (result.chainReactionSteps && result.chainReactionSteps.length > 0) {
        expect(player1Stats.chainReactionsTriggered).toBeGreaterThan(0);
        expect(player1Stats.explosionsCaused).toBeGreaterThan(0);
        expect(player1Stats.longestChainReaction).toBeGreaterThan(0);

        console.log('✅ Chain reaction statistics tracked correctly');
        console.log(`- Player 1 moves: ${player1Stats.movesPlayed}`);
        console.log(
          `- Player 1 chain reactions: ${player1Stats.chainReactionsTriggered}`
        );
        console.log(
          `- Player 1 explosions caused: ${player1Stats.explosionsCaused}`
        );
        console.log(
          `- Player 1 longest chain: ${player1Stats.longestChainReaction}`
        );
        console.log(
          `- Total game explosions: ${gameState.gameStats!.totalExplosions}`
        );
        console.log(
          `- Total game chain reactions: ${gameState.gameStats!.chainReactionsCount}`
        );
      }
    }
  });

  it('should track move counts for all players', async () => {
    let gameState: GameState = {
      ...createInitialGameState(),
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      board: createEmptyBoard(3, 3),
      moveCount: 10,
    };

    // Initialize with proper stats
    gameState = gameReducer(gameState, {
      type: 'INITIALIZE_GAME',
      payload: {
        settings: gameState.settings,
        players: ['player1', 'player2'],
      },
    });

    console.log('\n=== TESTING MOVE COUNT TRACKING ===');

    // Place orbs for both players to prevent elimination
    gameState.board.cells[2][2].orbCount = 1;
    gameState.board.cells[2][2].playerId = 'player2';

    // Place orbs for both players
    let result = await executeOrbPlacement(gameState, 1, 1, 'player1', {
      enableAnimations: false,
      skipValidation: true,
    });
    expect(result.success).toBe(true);

    if (result.updatedGameState) {
      gameState = result.updatedGameState;

      // Apply actions
      if (result.actions) {
        for (const action of result.actions) {
          gameState = gameReducer(gameState, action);
        }
      }
    }

    // Switch to player 2 and place an orb
    gameState.currentPlayerIndex = 1;
    result = await executeOrbPlacement(gameState, 1, 2, 'player2', {
      enableAnimations: false,
      skipValidation: true,
    });
    expect(result.success).toBe(true);

    if (result.updatedGameState) {
      gameState = result.updatedGameState;

      // Apply actions
      if (result.actions) {
        for (const action of result.actions) {
          gameState = gameReducer(gameState, action);
        }
      }
    }

    // Check that both players have move counts
    const player1Stats = gameState.gameStats!.playerStats['player1'];
    const player2Stats = gameState.gameStats!.playerStats['player2'];

    expect(player1Stats.movesPlayed).toBe(1);
    expect(player2Stats.movesPlayed).toBe(1);

    console.log('✅ Move counts tracked correctly for both players');
    console.log(`- Player 1 moves: ${player1Stats.movesPlayed}`);
    console.log(`- Player 2 moves: ${player2Stats.movesPlayed}`);
  });

  it('should handle defensive stats initialization', () => {
    // Test with a game state that doesn't have gameStats initialized
    const gameState: GameState = {
      ...createInitialGameState(),
      players: ['player1'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
    };

    // Remove gameStats to simulate old game state
    const gameStateWithoutStats = { ...gameState };
    delete gameStateWithoutStats.gameStats;

    // Apply PLACE_ORB action - should handle missing gameStats gracefully
    const newState = gameReducer(gameStateWithoutStats, {
      type: 'PLACE_ORB',
      payload: { row: 1, col: 1, playerId: 'player1' },
    });

    // Should have initialized gameStats with defensive check
    expect(newState.gameStats).toBeDefined();
    expect(newState.gameStats!.playerStats['player1']).toBeDefined();
    expect(newState.gameStats!.playerStats['player1'].movesPlayed).toBe(1);

    console.log('✅ Defensive stats initialization works correctly');
  });
});
