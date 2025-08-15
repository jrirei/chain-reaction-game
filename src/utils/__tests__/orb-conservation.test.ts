/**
 * Tests for Orb Conservation Physics
 *
 * Verifies the new physics invariants:
 * 1. Total orbs in the game never change during explosions
 * 2. Number of total moves equals number of orbs on the board
 * 3. Excess orbs remain in exploding cells
 */

import { describe, it, expect } from 'vitest';
import {
  processSimultaneousExplosions,
  processChainReactionsSequential,
  getExplodingCells,
} from '../explosionLogic';
import { createEmptyBoard, placeOrb } from '../boardOperations';
import type { GameBoard } from '../../types';

function countTotalOrbs(board: GameBoard): number {
  let total = 0;
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      total += board.cells[row][col].orbCount;
    }
  }
  return total;
}

describe('Orb Conservation Physics', () => {
  it('should conserve orbs in single explosion', () => {
    const board = createEmptyBoard(3, 3);
    let testBoard = board;

    // Corner cell with 3 orbs (critical mass = 2)
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 1
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 2
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 3

    const initialOrbs = countTotalOrbs(testBoard);
    console.log(`Initial orbs: ${initialOrbs}`);

    const explodingCells = getExplodingCells(testBoard);
    const result = processSimultaneousExplosions(testBoard, explodingCells);

    const finalOrbs = countTotalOrbs(result);
    console.log(`Final orbs: ${finalOrbs}`);

    // NEW PHYSICS: Orbs should be conserved
    expect(finalOrbs).toBe(initialOrbs);

    // Check specific distribution:
    // Corner (0,0): 3 - 2 = 1 orb remains (excess)
    // Adjacent (0,1): 0 + 1 = 1 orb (from explosion)
    // Adjacent (1,0): 0 + 1 = 1 orb (from explosion)
    // Total: 1 + 1 + 1 = 3 orbs ✓

    expect(result.cells[0][0].orbCount).toBe(1); // Excess remains
    expect(result.cells[0][1].orbCount).toBe(1); // Received from explosion
    expect(result.cells[1][0].orbCount).toBe(1); // Received from explosion
  });

  it('should conserve orbs in simultaneous explosions', () => {
    const board = createEmptyBoard(3, 3);
    let testBoard = board;

    // Two corner cells with excess orbs
    // (0,0): 3 orbs, critical mass 2 → sends 2, keeps 1
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 1
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 2
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 3

    // (0,2): 4 orbs, critical mass 2 → sends 2, keeps 2
    testBoard = placeOrb(testBoard, 0, 2, 'player1'); // 1
    testBoard = placeOrb(testBoard, 0, 2, 'player1'); // 2
    testBoard = placeOrb(testBoard, 0, 2, 'player1'); // 3
    testBoard = placeOrb(testBoard, 0, 2, 'player1'); // 4

    const initialOrbs = countTotalOrbs(testBoard);
    console.log(`Initial orbs: ${initialOrbs}`);

    const explodingCells = getExplodingCells(testBoard);
    expect(explodingCells).toHaveLength(2);

    const result = processSimultaneousExplosions(testBoard, explodingCells);

    const finalOrbs = countTotalOrbs(result);
    console.log(`Final orbs: ${finalOrbs}`);

    // Orbs must be conserved
    expect(finalOrbs).toBe(initialOrbs);

    // Check excess orbs remain
    expect(result.cells[0][0].orbCount).toBe(1); // 3 - 2 = 1
    expect(result.cells[0][2].orbCount).toBe(2); // 4 - 2 = 2
  });

  it('should conserve orbs throughout full chain reaction', () => {
    // Test the user's full scenario for orb conservation
    const board = createEmptyBoard(6, 9);
    let testBoard = board;

    // Set up user's scenario and add triggering orb
    testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 1
    testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 1
    testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 2
    testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 1
    testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 2
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 1
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 2
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 3
    testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 4 - triggers explosion

    const initialOrbs = countTotalOrbs(testBoard);
    console.log(`Initial total orbs: ${initialOrbs}`);

    const result = processChainReactionsSequential(testBoard, 'player1');

    const finalOrbs = countTotalOrbs(result.finalBoard);
    console.log(`Final total orbs: ${finalOrbs}`);

    // CRITICAL: Total orbs must be conserved throughout entire chain reaction
    expect(finalOrbs).toBe(initialOrbs);

    console.log(
      `Chain reaction took ${result.explosionSteps.length} steps, orbs conserved ✓`
    );
  });

  it('should verify move count equals orb count invariant', () => {
    // Test the invariant: number of moves = number of orbs on board
    const board = createEmptyBoard(4, 4);
    let testBoard = board;
    let moveCount = 0;

    // Make several moves
    testBoard = placeOrb(testBoard, 0, 0, 'player1');
    moveCount++;
    testBoard = placeOrb(testBoard, 0, 1, 'player1');
    moveCount++;
    testBoard = placeOrb(testBoard, 1, 0, 'player1');
    moveCount++;
    testBoard = placeOrb(testBoard, 0, 0, 'player1');
    moveCount++; // Total: 4 moves

    const orbCount = countTotalOrbs(testBoard);

    console.log(`Moves made: ${moveCount}`);
    console.log(`Orbs on board: ${orbCount}`);

    // Before any explosions, move count should equal orb count
    expect(orbCount).toBe(moveCount);

    // After chain reaction, orb count should still equal original move count
    const result = processChainReactionsSequential(testBoard, 'player1');
    const finalOrbCount = countTotalOrbs(result.finalBoard);

    console.log(`Final orbs after chain reaction: ${finalOrbCount}`);
    expect(finalOrbCount).toBe(moveCount);
  });
});
