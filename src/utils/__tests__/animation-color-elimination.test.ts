import { describe, it, expect } from 'vitest';
import { processChainReactionsSequential } from '../explosionLogic';
import { createEmptyBoard } from '../boardOperations';
import { updateCell } from '../immutableUtils';

describe('Animation Color After Player Elimination', () => {
  it('should use correct player color in animations even after player elimination', () => {
    // Create a 4x4 board
    let board = createEmptyBoard(4, 4);

    // Set up a scenario where player1 triggers an explosion that eliminates player2
    // Player 1 has 1 orb in corner (0,0) - ready to explode
    board = updateCell(board, 0, 0, {
      orbCount: 1,
      playerId: 'player1',
    });

    // Player 2 has orbs that will be captured and eliminated
    board = updateCell(board, 0, 1, {
      orbCount: 1,
      playerId: 'player2',
    });

    board = updateCell(board, 1, 0, {
      orbCount: 1,
      playerId: 'player2',
    });

    // Now player1 places another orb in corner (0,0) - this will trigger explosion
    board = updateCell(board, 0, 0, {
      orbCount: 2, // This will explode (critical mass = 2 for corner)
      playerId: 'player1',
    });

    console.log('=== TESTING ANIMATION COLORS AFTER ELIMINATION ===');
    console.log('Initial board state:');
    console.log('Corner (0,0):', board.cells[0][0]);
    console.log('Right (0,1):', board.cells[0][1]);
    console.log('Down (1,0):', board.cells[1][0]);

    // Process the chain reaction with player1 as the triggering player
    const result = processChainReactionsSequential(board, 'player1');

    console.log('\nChain reaction result:');
    console.log('Steps:', result.explosionSteps.length);
    console.log('Safety limit reached:', result.safetyLimitReached);
    console.log('Game won early:', result.gameWonEarly);

    // Check the animation colors in the explosion steps
    expect(result.explosionSteps.length).toBeGreaterThan(0);

    for (
      let stepIndex = 0;
      stepIndex < result.explosionSteps.length;
      stepIndex++
    ) {
      const step = result.explosionSteps[stepIndex];
      console.log(
        `\nStep ${stepIndex + 1} orb movements:`,
        step.orbMovements.length
      );

      step.orbMovements.forEach((movement, movementIndex) => {
        console.log(
          `  Movement ${movementIndex + 1}: from(${movement.fromCell.row},${movement.fromCell.col}) to(${movement.toCell.row},${movement.toCell.col}) color=${movement.orbColor}`
        );

        // All orb movements should use player1's color (#FF0000 - red)
        // since player1 triggered the explosion
        expect(movement.orbColor).toBe('#FF0000');
      });
    }

    console.log('\n✅ All orb animations use correct player1 color (#FF0000)');
  });

  it('should maintain consistent color throughout multi-step chain reaction', () => {
    // Create a larger board for multi-step chain reaction
    let board = createEmptyBoard(6, 6);

    // Set up a complex chain reaction scenario
    // Player2 triggers, but other players get eliminated during chain

    // Player 2 has cells ready to cause a long chain reaction
    board = updateCell(board, 2, 2, {
      orbCount: 3, // Will explode (critical mass = 4 for center)
      playerId: 'player2',
    });

    // Add player1 and player3 orbs that will get captured
    board = updateCell(board, 2, 1, {
      orbCount: 2,
      playerId: 'player1',
    });

    board = updateCell(board, 2, 3, {
      orbCount: 1,
      playerId: 'player3',
    });

    // Trigger explosion by adding one more orb to player2's center cell
    board = updateCell(board, 2, 2, {
      orbCount: 4, // This will explode
      playerId: 'player2',
    });

    console.log('=== TESTING MULTI-STEP CHAIN REACTION COLORS ===');

    const result = processChainReactionsSequential(board, 'player2');

    expect(result.explosionSteps.length).toBeGreaterThan(0);

    // All animations throughout the entire chain should use player2's color (#0000FF - blue)
    for (const step of result.explosionSteps) {
      step.orbMovements.forEach((movement) => {
        expect(movement.orbColor).toBe('#0000FF'); // Player2 blue
      });
    }

    console.log(
      '✅ All orb animations consistently use player2 color (#0000FF) throughout chain'
    );
  });

  it('should use custom player color when provided', () => {
    // Test the new feature - passing custom player color
    let board = createEmptyBoard(4, 4);

    // Set up explosion scenario
    board = updateCell(board, 0, 0, {
      orbCount: 2, // Will explode (corner critical mass = 2)
      playerId: 'player1',
    });

    console.log('=== TESTING CUSTOM PLAYER COLOR OVERRIDE ===');

    // Use a custom color instead of the default player1 color
    const customColor = '#PURPLE'; // Some custom color
    const result = processChainReactionsSequential(
      board,
      'player1',
      10000,
      customColor
    );

    console.log('Custom color used:', customColor);
    console.log('Explosion steps:', result.explosionSteps.length);

    // All animations should use the custom color, not the default #FF0000
    for (const step of result.explosionSteps) {
      step.orbMovements.forEach((movement, index) => {
        console.log(
          `Movement ${index + 1}: color=${movement.orbColor} (should be ${customColor})`
        );
        expect(movement.orbColor).toBe(customColor);
      });
    }

    console.log('✅ Custom player color override works correctly');
  });
});
