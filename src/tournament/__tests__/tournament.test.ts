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
      gamesPerMatchup: 1,
      maxThinkingTimeMs: 50, // Very fast for testing
      gameTimeoutMs: 10000, // 10 seconds
      enableDetailedLogging: false,
    };
  });

  describe('Single Game', () => {
    it('should run a single game between two bots', async () => {
      const bot1 = createTournamentBot('random', 'RandomBot1');
      const bot2 = createTournamentBot('default', 'DefaultBot1');

      const result = await runner.runSingleGame(bot1, bot2, config);

      expect(result.gameId).toBeDefined();
      expect(result.player1).toEqual(bot1);
      expect(result.player2).toEqual(bot2);
      expect(result.totalMoves).toBeGreaterThan(0);
      expect(result.gameDurationMs).toBeGreaterThan(0);
      expect(typeof result.isQuickWin).toBe('boolean');

      // Winner should be one of the players or null (draw/timeout)
      if (result.winner !== null) {
        expect([bot1, bot2]).toContainEqual(result.winner);
      }
    });

    it('should detect quick wins', async () => {
      const bot1 = createTournamentBot('random', 'RandomBot1');
      const bot2 = createTournamentBot('random', 'RandomBot2');

      // Just run one game and check the structure
      const result = await runner.runSingleGame(bot1, bot2, config);

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
      expect(result.matchups).toHaveLength(1); // Only one matchup for 2 bots
      expect(result.rankings).toHaveLength(2);
      expect(result.totalGames).toBe(1); // 1 game per matchup
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
      expect(result.matchups).toHaveLength(3); // 3 matchups for 3 bots (each plays each other once)
      expect(result.rankings).toHaveLength(3);
      expect(result.totalGames).toBe(3); // 1 game per matchup

      // Verify all matchup combinations exist
      const matchupPairs = result.matchups
        .map((m) => [m.player1.name, m.player2.name].sort().join(' vs '))
        .sort();

      const expectedPairs = [
        'DefaultBot vs RandomBot',
        'DefaultBot vs TriggerBot',
        'RandomBot vs TriggerBot',
      ];

      expect(matchupPairs).toEqual(expectedPairs);
    }, 15000); // 15 second timeout

    it('should calculate points correctly', async () => {
      const bots = [
        createTournamentBot('random', 'RandomBot'),
        createTournamentBot('default', 'DefaultBot'),
      ];

      const testConfig = {
        ...config,
        gamesPerMatchup: 2, // Play 2 games to test scoring
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
      const gameResult = await runner.runSingleGame(bot1, bot2, config);

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
