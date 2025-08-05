import { describe, it, expect } from 'vitest';
import { executeOrbPlacement } from '../orbPlacement';
import { createEmptyBoard } from '../gameLogic';
import { GameStatus } from '../../types';
import type { GameState } from '../../types';

describe('Debug Explosion Issue', () => {
  it('should debug corner cell explosion step by step', async () => {
    // Create exact game state like in the real game
    const board = createEmptyBoard(6, 9);
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
        gridRows: 6,
        gridCols: 9,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
      },
    };

    console.log('=== STARTING DEBUG ===');
    console.log('Initial corner cell (0,0):', gameState.board.cells[0][0]);

    // Place first orb
    console.log('\n=== PLACING FIRST ORB ===');
    let result = await executeOrbPlacement(gameState, 0, 0, 'player1');
    console.log('First placement result:', {
      success: result.success,
      error: result.error,
    });

    if (result.updatedGameState) {
      gameState.board = result.updatedGameState.board;
      gameState.moveCount = result.updatedGameState.moveCount;
    }

    console.log(
      'After first orb, corner cell (0,0):',
      gameState.board.cells[0][0]
    );
    console.log(
      'Chain reaction steps:',
      result.chainReactionSteps?.length || 0
    );

    // Place second orb - THIS SHOULD EXPLODE
    console.log('\n=== PLACING SECOND ORB (SHOULD EXPLODE) ===');
    result = await executeOrbPlacement(gameState, 0, 0, 'player1');
    console.log('Second placement result:', {
      success: result.success,
      error: result.error,
    });

    if (result.updatedGameState) {
      console.log(
        'After second orb, corner cell (0,0):',
        result.updatedGameState.board.cells[0][0]
      );
      console.log('Adjacent cells after explosion:');
      console.log('  Right (0,1):', result.updatedGameState.board.cells[0][1]);
      console.log('  Down (1,0):', result.updatedGameState.board.cells[1][0]);
    }

    console.log(
      'Chain reaction steps:',
      result.chainReactionSteps?.length || 0
    );
    if (result.chainReactionSteps && result.chainReactionSteps.length > 0) {
      console.log(
        'Explosion occurred! Steps:',
        result.chainReactionSteps.length
      );
    } else {
      console.log('ERROR: No explosion occurred!');
    }

    console.log('Actions generated:', result.actions?.map((a) => a.type) || []);

    // The test expectation
    expect(result.success).toBe(true);
    if (result.updatedGameState) {
      // Corner should be empty after explosion
      expect(result.updatedGameState.board.cells[0][0].orbCount).toBe(0);
      // Adjacent cells should have orbs
      expect(result.updatedGameState.board.cells[0][1].orbCount).toBe(1);
      expect(result.updatedGameState.board.cells[1][0].orbCount).toBe(1);
    }
  });
});
