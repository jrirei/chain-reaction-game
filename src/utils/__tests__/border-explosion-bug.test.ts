import { describe, it, expect } from 'vitest';
import { executeOrbPlacement } from '../orbPlacement';
import { createEmptyBoard } from '../gameLogic';
import { GameStatus } from '../../types';
import type { GameState } from '../../types';

describe('Border Cell Explosion Bug', () => {
  it('should explode border cell when 3 orbs are placed', async () => {
    const board = createEmptyBoard(4, 4); // Use 4x4 to have clear borders

    const gameState: GameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      gameStartTime: Date.now(),
      gameEndTime: null,
      moveCount: 0,
      isAnimating: false,
      winner: null,
      settings: {
        gridRows: 4,
        gridCols: 4,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
      },
    };

    console.log('=== TESTING BORDER CELL EXPLOSION ===');

    // Test border cell at (0, 1) - top edge, should have critical mass of 3
    const borderRow = 0;
    const borderCol = 1;
    const borderCell = gameState.board.cells[borderRow][borderCol];

    console.log(
      `Border cell (${borderRow}, ${borderCol}) critical mass:`,
      borderCell.criticalMass
    );
    expect(borderCell.criticalMass).toBe(3); // Border cells should need 3 orbs to explode

    let currentGameState = gameState;

    // Place first orb
    console.log('\n=== PLACING FIRST ORB ===');
    let result = await executeOrbPlacement(
      currentGameState,
      borderRow,
      borderCol,
      'player1'
    );
    expect(result.success).toBe(true);
    expect(result.chainReactionSteps?.length || 0).toBe(0); // Should not explode yet

    if (result.updatedGameState) {
      currentGameState = result.updatedGameState;
    }

    console.log(
      'After 1st orb:',
      currentGameState.board.cells[borderRow][borderCol]
    );

    // Place second orb
    console.log('\n=== PLACING SECOND ORB ===');
    result = await executeOrbPlacement(
      currentGameState,
      borderRow,
      borderCol,
      'player1'
    );
    expect(result.success).toBe(true);
    expect(result.chainReactionSteps?.length || 0).toBe(0); // Should not explode yet

    if (result.updatedGameState) {
      currentGameState = result.updatedGameState;
    }

    console.log(
      'After 2nd orb:',
      currentGameState.board.cells[borderRow][borderCol]
    );

    // Place third orb - THIS SHOULD EXPLODE
    console.log('\n=== PLACING THIRD ORB (SHOULD EXPLODE) ===');
    result = await executeOrbPlacement(
      currentGameState,
      borderRow,
      borderCol,
      'player1'
    );
    expect(result.success).toBe(true);

    console.log('Result after 3rd orb:');
    console.log('  Chain reactions:', result.chainReactionSteps?.length || 0);
    console.log(
      '  Actions:',
      result.actions?.map((a) => a.type)
    );

    if (result.updatedGameState) {
      console.log(
        '  Border cell after explosion:',
        result.updatedGameState.board.cells[borderRow][borderCol]
      );

      // The border cell should now be empty (exploded)
      expect(
        result.updatedGameState.board.cells[borderRow][borderCol].orbCount
      ).toBe(0);
      expect(
        result.updatedGameState.board.cells[borderRow][borderCol].playerId
      ).toBe(null);
    }

    // Should have caused explosions
    expect(result.chainReactionSteps?.length || 0).toBeGreaterThan(0);

    console.log('✅ Border cell exploded correctly after 3 orbs');
  });

  it('should demonstrate the bug - border cell fails to explode with 3 orbs', async () => {
    // This test deliberately shows the current buggy behavior
    // Once fixed, this test should be updated to expect correct behavior

    const board = createEmptyBoard(4, 4);

    // Add orbs for both players to prevent elimination
    board.cells[3][3].orbCount = 1;
    board.cells[3][3].playerId = 'player2';
    board.cells[3][2].orbCount = 1;
    board.cells[3][2].playerId = 'player1';

    const gameState: GameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      gameStartTime: Date.now(),
      gameEndTime: null,
      moveCount: 10, // Both players have had turns
      isAnimating: false,
      winner: null,
      settings: {
        gridRows: 4,
        gridCols: 4,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: false,
        enableSounds: false,
      },
    };

    console.log('\n=== REPRODUCING BORDER EXPLOSION BUG ===');

    // Test top border cell (0, 1)
    const borderRow = 0;
    const borderCol = 1;
    let currentGameState = gameState;

    console.log(
      'Border cell critical mass:',
      currentGameState.board.cells[borderRow][borderCol].criticalMass
    );

    // Place orbs manually by directly calling the game logic functions
    // to isolate the issue from validation problems
    console.log('\n=== MANUAL ORB PLACEMENT (BYPASSING VALIDATION) ===');

    for (let i = 1; i <= 4; i++) {
      // Try placing 4 orbs to see what happens
      console.log(`\nPlacing orb ${i}...`);

      // Skip validation and place orb directly
      const result = await executeOrbPlacement(
        currentGameState,
        borderRow,
        borderCol,
        'player1',
        {
          skipValidation: true,
          enableAnimations: false,
        }
      );

      if (result.success && result.updatedGameState) {
        currentGameState = result.updatedGameState;
        const cell = currentGameState.board.cells[borderRow][borderCol];
        console.log(
          `  After orb ${i}: orbCount=${cell.orbCount}, playerId=${cell.playerId}`
        );
        console.log(
          `  Chain reactions: ${result.chainReactionSteps?.length || 0}`
        );

        if (i >= 3 && cell.orbCount > 0) {
          console.log(
            `  ❌ BUG: Border cell should explode at 3 orbs but has ${cell.orbCount} orbs`
          );
        }

        if (result.chainReactionSteps && result.chainReactionSteps.length > 0) {
          console.log(
            `  ✅ Explosion occurred with ${result.chainReactionSteps.length} steps`
          );
          break;
        }
      } else {
        console.log(`  ❌ Failed to place orb ${i}:`, result.error);
        break;
      }
    }
  });
});
