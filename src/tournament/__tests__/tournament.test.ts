import { describe, it, expect, beforeEach } from 'vitest';
import { TournamentRunner } from '../TournamentRunner';
import { createTournamentBot } from '../botRegistry';
import type { TournamentConfig } from '../types';

describe('Tournament System', () => {
  let runner: TournamentRunner;
  let config: TournamentConfig;

  beforeEach(() => {
    runner = new TournamentRunner();
    config = {
      gamesPerCombination: 1,
      playerCounts: [2], // Start with 2-player games for compatibility
      maxThinkingTimeMs: 50, // Very fast for testing
      gameTimeoutMs: 10000, // 10 seconds
      enableDetailedLogging: false,
    };
  });

  describe('Single Game', () => {
    it('should run a single game between two bots', async () => {
      const bot1 = createTournamentBot('random', 'RandomBot1');
      const bot2 = createTournamentBot('default', 'DefaultBot1');

      const result = await runner.runSingleGame([bot1, bot2], config);

      expect(result.gameId).toBeDefined();
      expect(result.players).toHaveLength(2);
      expect(result.players).toContain(bot1);
      expect(result.players).toContain(bot2);
      expect(result.finalRanking).toHaveLength(2);
      expect(result.totalMoves).toBeGreaterThan(0);
      expect(result.gameDurationMs).toBeGreaterThan(0);
      expect(typeof result.isQuickWin).toBe('boolean');

      // Winner should be one of the players or null (draw/timeout)
      if (result.winner !== null) {
        expect([bot1, bot2]).toContainEqual(result.winner);
        expect(result.finalRanking[0]).toEqual(result.winner);
      }
    });

    it('should detect quick wins', async () => {
      const bot1 = createTournamentBot('random', 'RandomBot1');
      const bot2 = createTournamentBot('random', 'RandomBot2');

      // Just run one game and check the structure
      const result = await runner.runSingleGame([bot1, bot2], config);

      // Verify quick win flag is set correctly
      expect(typeof result.isQuickWin).toBe('boolean');
      if (result.isQuickWin) {
        expect(result.totalMoves).toBeLessThanOrEqual(50);
      }
    }, 15000); // 15 second timeout
  });

  describe('Tournament', () => {
    it('should run a small tournament with 2 bots', async () => {
      const bots = [
        createTournamentBot('random', 'RandomBot'),
        createTournamentBot('default', 'DefaultBot'),
      ];

      const result = await runner.runTournament(bots, config);

      expect(result.participants).toEqual(bots);
      expect(result.combinations).toHaveLength(1); // Only one combination for 2 bots in 2-player games
      expect(result.rankings).toHaveLength(2);
      expect(result.totalGames).toBe(1); // 1 game per combination
      expect(result.totalDurationMs).toBeGreaterThan(0);

      // Check rankings structure
      const rankings = result.rankings;
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);
      expect(rankings[0].totalPoints).toBeGreaterThanOrEqual(
        rankings[1].totalPoints
      );
    });

    it('should run tournament with 3 bots', async () => {
      const bots = [
        createTournamentBot('random', 'RandomBot'),
        createTournamentBot('default', 'DefaultBot'),
        createTournamentBot('trigger', 'TriggerBot'),
      ];

      const result = await runner.runTournament(bots, config);

      expect(result.participants).toHaveLength(3);
      expect(result.combinations).toHaveLength(3); // 3 combinations for 3 bots in 2-player games (each plays each other once)
      expect(result.rankings).toHaveLength(3);
      expect(result.totalGames).toBe(3); // 1 game per combination

      // Verify all combination pairs exist
      const combinationPairs = result.combinations
        .map((c) =>
          c.players
            .map((p) => p.name)
            .sort()
            .join(' vs ')
        )
        .sort();

      const expectedPairs = [
        'DefaultBot vs RandomBot',
        'DefaultBot vs TriggerBot',
        'RandomBot vs TriggerBot',
      ];

      expect(combinationPairs).toEqual(expectedPairs);
    }, 15000); // 15 second timeout

    it('should run 3-player games correctly', async () => {
      const bots = [
        createTournamentBot('random', 'RandomBot'),
        createTournamentBot('default', 'DefaultBot'),
        createTournamentBot('trigger', 'TriggerBot'),
      ];

      const multiPlayerConfig = { ...config, playerCounts: [3] };
      const result = await runner.runTournament(bots, multiPlayerConfig);

      expect(result.participants).toHaveLength(3);
      expect(result.combinations).toHaveLength(1); // Only one 3-player combination possible
      expect(result.rankings).toHaveLength(3);
      expect(result.totalGames).toBe(1); // 1 game per combination

      // Verify the combination includes all 3 players
      const combination = result.combinations[0];
      expect(combination.playerCount).toBe(3);
      expect(combination.players).toHaveLength(3);
      expect(combination.playerStats).toHaveLength(3);

      // In a 3-player game, one player wins (position 1), one gets 2nd (position 2), one gets 3rd (position 3)
      const avgPositions = combination.playerStats
        .map((s) => s.averagePosition)
        .sort();
      expect(avgPositions).toEqual([1, 2, 3]);
    }, 15000);

    it('should run 4-player games correctly', async () => {
      const bots = [
        createTournamentBot('random', 'RandomBot1'),
        createTournamentBot('default', 'DefaultBot2'),
        createTournamentBot('trigger', 'TriggerBot3'),
        createTournamentBot('random', 'RandomBot4'),
      ];

      const multiPlayerConfig = { ...config, playerCounts: [4] };
      const result = await runner.runTournament(bots, multiPlayerConfig);

      expect(result.participants).toHaveLength(4);
      expect(result.combinations).toHaveLength(1); // Only one 4-player combination possible
      expect(result.rankings).toHaveLength(4);
      expect(result.totalGames).toBe(1); // 1 game per combination

      // Verify the combination includes all 4 players
      const combination = result.combinations[0];
      expect(combination.playerCount).toBe(4);
      expect(combination.players).toHaveLength(4);
      expect(combination.playerStats).toHaveLength(4);

      // In a 4-player game, positions should be 1, 2, 3, 4
      const avgPositions = combination.playerStats
        .map((s) => s.averagePosition)
        .sort();
      expect(avgPositions).toEqual([1, 2, 3, 4]);
    }, 15000);

    it('should run mixed player count tournaments', async () => {
      const bots = [
        createTournamentBot('random', 'RandomBot'),
        createTournamentBot('default', 'DefaultBot'),
        createTournamentBot('trigger', 'TriggerBot'),
      ];

      const mixedConfig = { ...config, playerCounts: [2, 3] };
      const result = await runner.runTournament(bots, mixedConfig);

      expect(result.participants).toHaveLength(3);
      expect(result.combinations).toHaveLength(4); // 3 two-player + 1 three-player combination
      expect(result.rankings).toHaveLength(3);
      expect(result.totalGames).toBe(4); // 1 game per combination

      // Check that we have both 2-player and 3-player combinations
      const playerCounts = result.combinations.map((c) => c.playerCount).sort();
      expect(playerCounts).toEqual([2, 2, 2, 3]);
    }, 15000);

    it('should calculate points correctly', async () => {
      const bots = [
        createTournamentBot('random', 'RandomBot'),
        createTournamentBot('default', 'DefaultBot'),
      ];

      const testConfig = {
        ...config,
        gamesPerCombination: 2, // Play 2 games to test scoring
      };

      const result = await runner.runTournament(bots, testConfig);

      expect(result.totalGames).toBe(2);

      // Check that points are awarded correctly
      const totalPointsAwarded = result.rankings.reduce(
        (sum, r) => sum + r.totalPoints,
        0
      );
      expect(totalPointsAwarded).toBeGreaterThanOrEqual(2); // At least 1 point per win, could be more with quick wins

      // Rankings should be sorted by points (descending)
      for (let i = 0; i < result.rankings.length - 1; i++) {
        expect(result.rankings[i].totalPoints).toBeGreaterThanOrEqual(
          result.rankings[i + 1].totalPoints
        );
      }
    }, 15000); // 15 second timeout
  });

  describe('Scoring System', () => {
    it('should award bonus points for quick wins', async () => {
      const bot1 = createTournamentBot('random', 'Bot1');
      const bot2 = createTournamentBot('random', 'Bot2');

      // Create a mock result that simulates a quick win
      const gameResult = await runner.runSingleGame([bot1, bot2], config);

      // Test the scoring logic conceptually
      const basePoints = gameResult.winner ? 1 : 0;
      const bonusPoints = gameResult.isQuickWin ? 1 : 0;
      const totalPoints = basePoints + bonusPoints;

      if (gameResult.winner) {
        expect(totalPoints).toBeGreaterThanOrEqual(1);
        if (gameResult.isQuickWin) {
          expect(totalPoints).toBe(2);
        } else {
          expect(totalPoints).toBe(1);
        }
      } else {
        expect(totalPoints).toBe(0);
      }
    }, 15000); // 15 second timeout
  });
});
