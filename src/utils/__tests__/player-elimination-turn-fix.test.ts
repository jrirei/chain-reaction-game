import { describe, it, expect } from 'vitest';
import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Player Elimination Turn Progression Fix', () => {
  it('should advance turn correctly after player elimination', () => {
    // Initialize 4-player game
    const initialState = createInitialGameState();
    let gameState = gameReducer(initialState, {
      type: 'INITIALIZE_GAME',
      payload: {
        settings: {
          ...initialState.settings,
          playerCount: 4,
          playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
        },
        players: ['player1', 'player2', 'player3', 'player4'],
      },
    });

    gameState = gameReducer(gameState, { type: 'START_GAME' });

    // Set up scenario where only players 1 and 3 have orbs (2 and 4 eliminated)
    gameState.board.cells[0][0].orbCount = 2;
    gameState.board.cells[0][0].playerId = 'player1';
    gameState.board.cells[2][2].orbCount = 1;
    gameState.board.cells[2][2].playerId = 'player3';
    gameState.moveCount = 20; // Ensure minimum moves requirement

    // Set current player to player 3 (index 2 in original array)
    gameState.currentPlayerIndex = 2;

    console.log('Before COMPLETE_EXPLOSIONS:');
    console.log('Players:', gameState.players);
    console.log('Current player index:', gameState.currentPlayerIndex);
    console.log(
      'Current player:',
      gameState.players[gameState.currentPlayerIndex]
    );

    // Trigger explosion completion (this should eliminate players 2 and 4)
    const finalState = gameReducer(gameState, { type: 'COMPLETE_EXPLOSIONS' });

    console.log('After COMPLETE_EXPLOSIONS:');
    console.log('Players:', finalState.players);
    console.log('Current player index:', finalState.currentPlayerIndex);
    console.log(
      'Current player:',
      finalState.players[finalState.currentPlayerIndex]
    );

    // Should have eliminated players 2 and 4, leaving only 1 and 3
    expect(finalState.players).toEqual(['player1', 'player3']);

    // Should advance from player3 to player1 (next in the remaining players)
    expect(finalState.currentPlayerIndex).toBe(0); // player1's new index
    expect(finalState.players[finalState.currentPlayerIndex]).toBe('player1');

    // Game should continue (not finished)
    expect(finalState.gameStatus).toBe('playing');
  });

  it('should handle when current player gets eliminated', () => {
    // Initialize 4-player game
    const initialState = createInitialGameState();
    let gameState = gameReducer(initialState, {
      type: 'INITIALIZE_GAME',
      payload: {
        settings: {
          ...initialState.settings,
          playerCount: 4,
          playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
        },
        players: ['player1', 'player2', 'player3', 'player4'],
      },
    });

    gameState = gameReducer(gameState, { type: 'START_GAME' });

    // Set up scenario where players 1 and 3 have orbs (2 and 4 eliminated)
    gameState.board.cells[0][0].orbCount = 2;
    gameState.board.cells[0][0].playerId = 'player1';
    gameState.board.cells[2][2].orbCount = 1;
    gameState.board.cells[2][2].playerId = 'player3';
    gameState.moveCount = 20; // Ensure minimum moves requirement

    // Set current player to player2 (who will be eliminated)
    gameState.currentPlayerIndex = 1;

    console.log('Before elimination - Current player is player2 (eliminated)');

    const finalState = gameReducer(gameState, { type: 'COMPLETE_EXPLOSIONS' });

    console.log('After elimination - Should switch to next active player');
    console.log('Players:', finalState.players);
    console.log('Current player index:', finalState.currentPlayerIndex);

    // Should have players 1 and 3 remaining
    expect(finalState.players).toEqual(['player1', 'player3']);

    // Should advance to next active player (player3 since we were at eliminated player2)
    expect(finalState.currentPlayerIndex).toBe(1); // player3's new index
    expect(finalState.players[finalState.currentPlayerIndex]).toBe('player3');

    // Game should continue (2 players left)
    expect(finalState.gameStatus).toBe('playing');
  });

  it('should handle normal turn progression when no eliminations occur', () => {
    // Initialize 3-player game
    const initialState = createInitialGameState();
    let gameState = gameReducer(initialState, {
      type: 'INITIALIZE_GAME',
      payload: {
        settings: {
          ...initialState.settings,
          playerCount: 3,
          playerNames: ['Player 1', 'Player 2', 'Player 3'],
        },
        players: ['player1', 'player2', 'player3'],
      },
    });

    gameState = gameReducer(gameState, { type: 'START_GAME' });

    // All players have orbs
    gameState.board.cells[0][0].orbCount = 1;
    gameState.board.cells[0][0].playerId = 'player1';
    gameState.board.cells[1][1].orbCount = 1;
    gameState.board.cells[1][1].playerId = 'player2';
    gameState.board.cells[2][2].orbCount = 1;
    gameState.board.cells[2][2].playerId = 'player3';
    gameState.moveCount = 10;

    // Current player is player1 (index 0)
    gameState.currentPlayerIndex = 0;

    const finalState = gameReducer(gameState, { type: 'COMPLETE_EXPLOSIONS' });

    // All players should remain
    expect(finalState.players).toEqual(['player1', 'player2', 'player3']);

    // Should advance from player1 to player2
    expect(finalState.currentPlayerIndex).toBe(1);
    expect(finalState.players[finalState.currentPlayerIndex]).toBe('player2');

    // Game should continue
    expect(finalState.gameStatus).toBe('playing');
  });
});
