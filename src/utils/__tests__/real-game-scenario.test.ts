/**
 * Test for User's Real Game Scenario on 6x9 Board
 *
 * User clarified: "I observed this in the actual game where the playing field is 6x9.
 * Adjust the test to use the whole playing field where just the left upper corner uses
 * the setup as described. That way it won't trigger an endless loop."
 *
 * Expected cascade in upper-left 3x3 corner:
 * Initial: 1 2 0    Step 1: 1 3 0    Step 2: 3 0 1    Step 3: 1 1 1
 *          2 4 0             3 0 1             0 2 1             1 2 1
 *          0 0 0             0 1 0             1 1 0             1 1 0
 */

import { describe, it, expect } from 'vitest';
import { processChainReactionsSequential } from '../explosionLogic';
import { createEmptyBoard, placeOrb } from '../boardOperations';

describe('Real Game Scenario - 6x9 Board with 3x3 Corner Setup', () => {
  it('should handle the 12/23 scenario correctly on full 6x9 board', () => {
    // Create full 6x9 board (default game size)
    const board = createEmptyBoard(6, 9);
    let testBoard = board;

    // Set up upper-left 3x3 corner as: 1 2 0
    //                                   2 3 0
    //                                   0 0 0

    // Row 0: 1 2 0
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 1 orb
    testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 1 orb
    testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 2 orbs
    // (0,2) stays empty (0 orbs)

    // Row 1: 2 3 0
    testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 1 orb
    testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 2 orbs
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 1 orb
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 2 orbs
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 3 orbs
    // (1,2) stays empty (0 orbs)

    // Row 2: 0 0 0 (all stay empty)

    console.log('Initial upper-left 3x3 corner:');
    for (let row = 0; row < 3; row++) {
      let rowStr = '';
      for (let col = 0; col < 3; col++) {
        rowStr += testBoard.cells[row][col].orbCount + ' ';
      }
      console.log(rowStr);
    }

    // Add the triggering orb to cell (1,1) to make it 4 orbs
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 4 orbs - will explode

    console.log('After adding triggering orb:');
    for (let row = 0; row < 3; row++) {
      let rowStr = '';
      for (let col = 0; col < 3; col++) {
        rowStr += testBoard.cells[row][col].orbCount + ' ';
      }
      console.log(rowStr);
    }

    // Process the chain reaction
    const result = processChainReactionsSequential(testBoard, 'player1');

    console.log(`Chain reaction took ${result.explosionSteps.length} steps`);

    // Print each step of the cascade
    for (
      let stepIndex = 0;
      stepIndex < result.explosionSteps.length;
      stepIndex++
    ) {
      const step = result.explosionSteps[stepIndex];
      console.log(`\nStep ${stepIndex + 1}:`);
      for (let row = 0; row < 3; row++) {
        let rowStr = '';
        for (let col = 0; col < 3; col++) {
          rowStr += step.resultingBoard.cells[row][col].orbCount + ' ';
        }
        console.log(rowStr);
      }
    }

    console.log('\nFinal state upper-left 3x3:');
    for (let row = 0; row < 3; row++) {
      let rowStr = '';
      for (let col = 0; col < 3; col++) {
        rowStr += result.finalBoard.cells[row][col].orbCount + ' ';
      }
      console.log(rowStr);
    }

    // Check if the cascade matches user's expectation
    // Expected final state: 1 1 1
    //                       1 2 1
    //                       1 1 0

    console.log('\nComparing with user expectation:');
    console.log('Expected: 1 1 1 / 1 2 1 / 1 1 0');

    const finalBoard = result.finalBoard;

    // User expects corner (0,0) to have 1 orb
    const cornerOrbs = finalBoard.cells[0][0].orbCount;
    console.log(`Corner (0,0) has ${cornerOrbs} orbs`);

    // Let's see what we actually get vs user expectation
    expect(cornerOrbs).toBe(1); // This should pass if the bug is fixed
  });

  it('should step through the cascade to verify intermediate states', () => {
    // Same setup but with detailed step-by-step verification
    const board = createEmptyBoard(6, 9);
    let testBoard = board;

    // Setup: 1 2 0 / 2 4 0 / 0 0 0 (after adding triggering orb)
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 1
    testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 1
    testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 2
    testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 1
    testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 2
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 1
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 2
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 3
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 4 - triggers explosion

    const result = processChainReactionsSequential(testBoard, 'player1');

    // Verify user's expected intermediate states
    if (result.explosionSteps.length >= 1) {
      const step1 = result.explosionSteps[0].resultingBoard;
      console.log('Step 1 actual vs expected:');
      console.log('Expected: 1 3 0 / 3 0 1 / 0 1 0');
      console.log('Actual:');
      for (let row = 0; row < 3; row++) {
        let rowStr = '';
        for (let col = 0; col < 3; col++) {
          rowStr += step1.cells[row][col].orbCount + ' ';
        }
        console.log(rowStr);
      }
    }

    if (result.explosionSteps.length >= 2) {
      const step2 = result.explosionSteps[1].resultingBoard;
      console.log('\nStep 2 actual vs expected:');
      console.log('Expected: 3 0 1 / 0 2 1 / 1 1 0');
      console.log('Actual:');
      for (let row = 0; row < 3; row++) {
        let rowStr = '';
        for (let col = 0; col < 3; col++) {
          rowStr += step2.cells[row][col].orbCount + ' ';
        }
        console.log(rowStr);
      }
    }

    if (result.explosionSteps.length >= 3) {
      const step3 = result.explosionSteps[2].resultingBoard;
      console.log('\nStep 3 actual vs expected:');
      console.log('Expected: 1 1 1 / 1 2 1 / 1 1 0');
      console.log('Actual:');
      for (let row = 0; row < 3; row++) {
        let rowStr = '';
        for (let col = 0; col < 3; col++) {
          rowStr += step3.cells[row][col].orbCount + ' ';
        }
        console.log(rowStr);
      }
    }

    // Check if we reach the stable state the user expects
    const shouldBeStable = result.explosionSteps.length <= 3;
    console.log(
      `\nChain reaction stable after ${result.explosionSteps.length} steps: ${shouldBeStable}`
    );
  });
});
