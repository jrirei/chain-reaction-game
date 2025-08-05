import { describe, it, expect } from 'vitest';
import { executeOrbPlacement } from '../orbPlacement';
import { createEmptyBoard } from '../gameLogic';
import { gameReducer } from '../gameReducer';
import { GameStatus } from '../../types';
import type { GameState } from '../../types';

describe('Turn Progression After Moves', () => {
  it('should advance turn exactly once for non-explosive moves', async () => {
    const board = createEmptyBoard(3, 3);

    // Add some orbs for both players so no one gets eliminated
    board.cells[0][1].orbCount = 1;
    board.cells[0][1].playerId = 'player2';
    board.cells[2][2].orbCount = 1;
    board.cells[2][2].playerId = 'player1';

    const gameState: GameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0, // Player 1's turn
      gameStatus: GameStatus.PLAYING,
      gameStartTime: Date.now(),
      gameEndTime: null,
      moveCount: 10, // Ensure all players have had multiple turns
      isAnimating: false,
      winner: null,
      settings: {
        gridRows: 3,
        gridCols: 3,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
      },
    };

    console.log('=== TESTING NON-EXPLOSIVE MOVE TURN PROGRESSION ===');
    console.log('Initial currentPlayerIndex:', gameState.currentPlayerIndex);

    // Place orb in empty cell (won't explode)
    const result = await executeOrbPlacement(gameState, 1, 1, 'player1', {
      enableAnimations: true,
    });

    expect(result.success).toBe(true);
    expect(result.chainReactionSteps?.length || 0).toBe(0); // No explosions
    expect(result.actions).toBeDefined();

    console.log(
      'Actions generated:',
      result.actions?.map((a) => a.type)
    );

    // Apply actions through reducer to simulate full flow
    let currentState = result.updatedGameState!;
    if (result.actions) {
      for (const action of result.actions) {
        console.log(`Applying action: ${action.type}`);
        const beforeIndex = currentState.currentPlayerIndex;
        currentState = gameReducer(currentState, action);
        const afterIndex = currentState.currentPlayerIndex;

        console.log(`  Player index: ${beforeIndex} -> ${afterIndex}`);
      }
    }

    // Should be Player 2's turn (index 1)
    expect(currentState.currentPlayerIndex).toBe(1);
    console.log('✅ Turn advanced correctly for non-explosive move');
  });

  it('should advance turn exactly once after explosion animations complete', async () => {
    const board = createEmptyBoard(3, 3);

    // Add some orbs for both players so no one gets eliminated
    // Place player 2's orb far away from the explosion
    board.cells[2][2].orbCount = 1;
    board.cells[2][2].playerId = 'player2';
    board.cells[2][1].orbCount = 1;
    board.cells[2][1].playerId = 'player1';

    // Set up a corner cell that will explode when one more orb is added
    board.cells[0][0].orbCount = 1; // Corner needs 2 to explode
    board.cells[0][0].playerId = 'player1';

    const gameState: GameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0, // Player 1's turn
      gameStatus: GameStatus.PLAYING,
      gameStartTime: Date.now(),
      gameEndTime: null,
      moveCount: 10, // Ensure all players have had multiple turns
      isAnimating: false,
      winner: null,
      settings: {
        gridRows: 3,
        gridCols: 3,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
      },
    };

    console.log('\n=== TESTING EXPLOSIVE MOVE TURN PROGRESSION ===');
    console.log('Initial currentPlayerIndex:', gameState.currentPlayerIndex);
    console.log('Corner cell before:', board.cells[0][0]);

    // Place orb that will cause explosion
    const result = await executeOrbPlacement(gameState, 0, 0, 'player1', {
      enableAnimations: true,
    });

    expect(result.success).toBe(true);
    expect(result.chainReactionSteps?.length || 0).toBeGreaterThan(0); // Should have explosions
    expect(result.actions).toBeDefined();

    console.log(
      'Actions generated:',
      result.actions?.map((a) => a.type)
    );

    // Apply actions through reducer to simulate full flow
    let currentState = result.updatedGameState!;
    let turnAdvanceCount = 0;

    if (result.actions) {
      for (const action of result.actions) {
        console.log(`Applying action: ${action.type}`);
        const beforeIndex = currentState.currentPlayerIndex;
        currentState = gameReducer(currentState, action);
        const afterIndex = currentState.currentPlayerIndex;

        if (beforeIndex !== afterIndex) {
          turnAdvanceCount++;
          console.log(
            `  ⭐ Turn advanced: ${beforeIndex} -> ${afterIndex} (advance #${turnAdvanceCount})`
          );
        }

        console.log(
          `  Status: ${currentState.gameStatus}, Animating: ${currentState.isAnimating}`
        );
      }
    }

    // Should advance turn exactly once
    expect(turnAdvanceCount).toBe(1);
    // Should be Player 2's turn (index 1)
    expect(currentState.currentPlayerIndex).toBe(1);
    console.log('✅ Turn advanced exactly once after explosion animations');
  });
});
