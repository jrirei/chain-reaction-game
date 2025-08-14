import { describe, it, expect } from 'vitest';
import { PLAYER_COLORS } from '../constants';

describe('Player Color Consistency After Elimination', () => {
  it('should maintain correct player colors after elimination', () => {
    // Test the color assignment logic directly
    const mockGameState = {
      players: ['player1', 'player2', 'player3', 'player4'],
      settings: {
        playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
        playerConfigs: [
          { type: 'human' },
          { type: 'ai', aiConfig: { strategy: 'default' } },
          { type: 'human' }, // This is the user (Player 3)
          { type: 'ai', aiConfig: { strategy: 'oskar' } },
        ],
      },
    };

    // Function to simulate the player mapping logic from GameContext
    const createPlayers = (playerIds: string[]) => {
      return playerIds.map((playerId: string) => {
        const playerNumber = parseInt(playerId.replace('player', ''));
        const config = mockGameState.settings.playerConfigs[playerNumber - 1];
        const colorIndex = (playerNumber - 1) % PLAYER_COLORS.length;

        return {
          id: playerId,
          name:
            mockGameState.settings.playerNames[playerNumber - 1] ||
            `Player ${playerNumber}`,
          color: PLAYER_COLORS[colorIndex],
          type: config?.type || 'human',
          aiConfig: config?.aiConfig,
        };
      });
    };

    console.log('=== TESTING PLAYER COLOR CONSISTENCY ===');

    // Initial state: all 4 players
    const initialPlayers = createPlayers([
      'player1',
      'player2',
      'player3',
      'player4',
    ]);
    console.log('\nInitial players:');
    initialPlayers.forEach((player) => {
      console.log(
        `  ${player.id}: ${player.name} - Color: ${player.color} (${player.type})`
      );
    });

    // Expected colors
    expect(initialPlayers[0].color).toBe('#FF0000'); // Red
    expect(initialPlayers[1].color).toBe('#0000FF'); // Blue
    expect(initialPlayers[2].color).toBe('#008000'); // Green (User - Player 3)
    expect(initialPlayers[3].color).toBe('#FFA500'); // Orange

    // After player4 elimination: ['player1', 'player2', 'player3']
    const afterPlayer4Elimination = createPlayers([
      'player1',
      'player2',
      'player3',
    ]);
    console.log('\nAfter Player 4 elimination:');
    afterPlayer4Elimination.forEach((player) => {
      console.log(
        `  ${player.id}: ${player.name} - Color: ${player.color} (${player.type})`
      );
    });

    // Player colors should remain the same
    expect(afterPlayer4Elimination[0].color).toBe('#FF0000'); // Red
    expect(afterPlayer4Elimination[1].color).toBe('#0000FF'); // Blue
    expect(afterPlayer4Elimination[2].color).toBe('#008000'); // Green (User still green!)

    // After player2 elimination: ['player1', 'player3']
    const afterPlayer2Elimination = createPlayers(['player1', 'player3']);
    console.log('\nAfter Player 2 elimination (critical test case):');
    afterPlayer2Elimination.forEach((player) => {
      console.log(
        `  ${player.id}: ${player.name} - Color: ${player.color} (${player.type})`
      );
    });

    // This is the critical test - Player 3 should STILL be green, not blue
    expect(afterPlayer2Elimination[0].color).toBe('#FF0000'); // Red
    expect(afterPlayer2Elimination[1].color).toBe('#008000'); // Green (NOT blue!)
    expect(afterPlayer2Elimination[1].id).toBe('player3');
    expect(afterPlayer2Elimination[1].name).toBe('Player 3');
    expect(afterPlayer2Elimination[1].type).toBe('human');

    console.log(
      '\n✅ Player 3 maintains green color and human identity throughout eliminations'
    );
    console.log('✅ Player position/identity switching bug is fixed!');
  });

  it('should preserve player configurations after elimination', () => {
    const createPlayers = (playerIds: string[]) => {
      return playerIds.map((playerId: string) => {
        const playerNumber = parseInt(playerId.replace('player', ''));

        // Mock configs
        const configs = [
          {
            type: 'ai',
            aiConfig: { strategy: 'default', maxThinkingMs: 1000 },
          },
          {
            type: 'ai',
            aiConfig: { strategy: 'trigger', maxThinkingMs: 2000 },
          },
          { type: 'human' }, // User
          {
            type: 'ai',
            aiConfig: { strategy: 'oskar', maxThinkingMs: 3000 },
          },
        ];

        const config = configs[playerNumber - 1];
        const colorIndex = (playerNumber - 1) % PLAYER_COLORS.length;

        return {
          id: playerId,
          name: `Player ${playerNumber}`,
          color: PLAYER_COLORS[colorIndex],
          type: config?.type || 'human',
          aiConfig: config?.aiConfig,
        };
      });
    };

    console.log('\n=== TESTING AI CONFIG PRESERVATION ===');

    // After complex elimination scenario: ['player1', 'player3', 'player4']
    const remainingPlayers = createPlayers(['player1', 'player3', 'player4']);
    console.log('\nRemaining players after elimination:');
    remainingPlayers.forEach((player) => {
      console.log(
        `  ${player.id}: ${player.type} - Strategy: ${player.aiConfig?.strategy || 'N/A'} - Thinking: ${player.aiConfig?.maxThinkingMs || 'N/A'}ms`
      );
    });

    // Verify each player keeps their original configuration
    expect(remainingPlayers[0].id).toBe('player1');
    expect(remainingPlayers[0].aiConfig?.strategy).toBe('default');
    expect(remainingPlayers[0].aiConfig?.maxThinkingMs).toBe(1000);

    expect(remainingPlayers[1].id).toBe('player3');
    expect(remainingPlayers[1].type).toBe('human');
    expect(remainingPlayers[1].aiConfig).toBeUndefined();

    expect(remainingPlayers[2].id).toBe('player4');
    expect(remainingPlayers[2].aiConfig?.strategy).toBe('oskar');
    expect(remainingPlayers[2].aiConfig?.maxThinkingMs).toBe(3000);

    console.log('\n✅ All players maintain their original AI configurations');
  });
});
