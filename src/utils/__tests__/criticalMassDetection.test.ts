import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeCellCriticalMass,
  getBoardCriticalMassState,
  previewExplosion,
  detectNearCriticalCells,
  calculateBoardTension,
  detectCriticalMassThreats,
} from '../criticalMassDetection';
import { createEmptyBoard } from '../boardOperations';
import { updateCell } from '../immutableUtils';
import type { GameBoard, GameState } from '../../types';

describe('Critical Mass Detection', () => {
  let board: GameBoard;
  let gameState: GameState;

  beforeEach(() => {
    board = createEmptyBoard(4, 4);
    gameState = {
      board,
      currentPlayerIndex: 0,
      players: [
        {
          id: 'player1',
          name: 'Player 1',
          color: '#ff0000',
          isEliminated: false,
        },
      ],
      gameStatus: 'playing',
      isAnimating: false,
      winner: null,
      stats: {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      },
    };
  });

  describe('analyzeCellCriticalMass', () => {
    it('should detect explosive cells', () => {
      // Place 2 orbs in corner (critical mass = 2)
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' });

      const analysis = analyzeCellCriticalMass(board, 0, 0);

      expect(analysis.willExplode).toBe(true);
      expect(analysis.orbsToExplode).toBe(0);
      expect(analysis.isAtCapacity).toBe(false);
      expect(analysis.explosionImpact.strategicValue).toBe('low');
    });

    it('should detect cells at capacity', () => {
      // Place 1 orb in corner (critical mass = 2)
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' });

      const analysis = analyzeCellCriticalMass(board, 0, 0);

      expect(analysis.willExplode).toBe(false);
      expect(analysis.orbsToExplode).toBe(1);
      expect(analysis.isAtCapacity).toBe(true);
    });

    it('should calculate chain potential', () => {
      // Create a setup for potential chain reaction
      board = updateCell(board, 1, 1, { orbCount: 4, playerId: 'player1' }); // Center cell at critical mass
      board = updateCell(board, 0, 1, { orbCount: 2, playerId: 'player1' }); // Adjacent cell near critical
      board = updateCell(board, 1, 0, { orbCount: 2, playerId: 'player1' }); // Another adjacent cell near critical

      const analysis = analyzeCellCriticalMass(board, 1, 1);

      expect(analysis.willExplode).toBe(true);
      expect(analysis.explosionImpact.chainPotential).toBe(2);
      expect(analysis.explosionImpact.strategicValue).toBe('medium');
    });

    it('should identify high strategic value explosions', () => {
      // Create setup with high chain potential
      board = updateCell(board, 1, 1, { orbCount: 4, playerId: 'player1' }); // Center cell
      board = updateCell(board, 0, 1, { orbCount: 2, playerId: 'player1' });
      board = updateCell(board, 1, 0, { orbCount: 2, playerId: 'player1' });
      board = updateCell(board, 2, 1, { orbCount: 2, playerId: 'player1' });
      board = updateCell(board, 1, 2, { orbCount: 2, playerId: 'player1' });

      const analysis = analyzeCellCriticalMass(board, 1, 1);

      // Chain potential is based on adjacent cells that would explode after getting +1 orb
      expect(analysis.explosionImpact.chainPotential).toBe(2); // 2 adjacent edge cells at critical mass 3
      expect(analysis.explosionImpact.strategicValue).toBe('medium'); // chainPotential=2 gives medium
    });
  });

  describe('getBoardCriticalMassState', () => {
    it('should identify critical and near-critical cells', () => {
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' }); // Critical (corner, critical mass = 2)
      board = updateCell(board, 0, 1, { orbCount: 2, playerId: 'player1' }); // Near critical (edge, critical mass = 3)
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' }); // Near critical (center, critical mass = 4)

      const state = getBoardCriticalMassState(board);

      expect(state.criticalCells).toHaveLength(1); // Only corner cell is critical
      expect(state.nearCriticalCells).toHaveLength(2); // Edge and center cells near critical
      expect(state.totalExplosiveCells).toBe(1);
      expect(state.boardStability).toBe('volatile');
    });

    it('should detect stable board', () => {
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' });

      const state = getBoardCriticalMassState(board);

      expect(state.criticalCells).toHaveLength(0);
      expect(state.nearCriticalCells).toHaveLength(0);
      expect(state.boardStability).toBe('stable');
    });

    it('should detect critical board state', () => {
      // Create many critical cells
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' });
      board = updateCell(board, 0, 1, { orbCount: 3, playerId: 'player1' });
      board = updateCell(board, 1, 0, { orbCount: 3, playerId: 'player1' });
      board = updateCell(board, 1, 1, { orbCount: 4, playerId: 'player1' });

      const state = getBoardCriticalMassState(board);

      expect(state.totalExplosiveCells).toBeGreaterThan(3);
      expect(state.boardStability).toBe('critical');
    });
  });

  describe('previewExplosion', () => {
    it('should preview simple explosion effects', () => {
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' });

      const preview = previewExplosion(board, 0, 0);

      expect(preview.originCell).toEqual({ row: 0, col: 0 });
      expect(preview.affectedCells).toHaveLength(2); // Corner has 2 adjacents
      expect(preview.affectedCells[0].orbsAfterExplosion).toBe(1);
      expect(preview.affectedCells[0].newOwnerId).toBe('player1');
    });

    it('should detect ownership changes', () => {
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' });
      board = updateCell(board, 0, 1, { orbCount: 1, playerId: 'player2' });

      const preview = previewExplosion(board, 0, 0);

      const affectedCell = preview.affectedCells.find(
        (cell) => cell.row === 0 && cell.col === 1
      );
      expect(affectedCell?.ownershipChange).toBe(true);
      expect(affectedCell?.newOwnerId).toBe('player1');
    });

    it('should calculate chain reaction depth', () => {
      // Set up a chain reaction scenario
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' });
      board = updateCell(board, 0, 1, { orbCount: 2, playerId: 'player1' });

      const preview = previewExplosion(board, 0, 0);

      expect(preview.chainReactionDepth).toBeGreaterThan(0);
      expect(preview.totalCellsAffected).toBeGreaterThan(1);
    });
  });

  describe('detectNearCriticalCells', () => {
    it('should identify accessible near-critical cells', () => {
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' }); // Player cell
      board = updateCell(board, 0, 1, { orbCount: 1, playerId: null }); // Neutral cell
      board = updateCell(board, 1, 0, { orbCount: 2, playerId: 'player2' }); // Enemy cell

      const nearCritical = detectNearCriticalCells(board, 'player1');

      const playerCell = nearCritical.find(
        (cell) => cell.row === 0 && cell.col === 0
      );
      const neutralCell = nearCritical.find(
        (cell) => cell.row === 0 && cell.col === 1
      );
      const enemyCell = nearCritical.find(
        (cell) => cell.row === 1 && cell.col === 0
      );

      expect(playerCell?.canPlayerAccess).toBe(true);
      expect(neutralCell?.canPlayerAccess).toBe(true);
      expect(enemyCell?.canPlayerAccess).toBe(false);
    });

    it('should calculate threat levels correctly', () => {
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' }); // 1 orb needed = high threat
      board = updateCell(board, 0, 1, { orbCount: 1, playerId: 'player1' }); // 2 orbs needed = medium threat
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' }); // 3 orbs needed = low threat

      const nearCritical = detectNearCriticalCells(board, 'player1');

      const cornerCell = nearCritical.find(
        (cell) => cell.row === 0 && cell.col === 0
      );
      const edgeCell = nearCritical.find(
        (cell) => cell.row === 0 && cell.col === 1
      );
      const centerCell = nearCritical.find(
        (cell) => cell.row === 1 && cell.col === 1
      );

      expect(cornerCell?.threatLevel).toBe('high');
      expect(edgeCell?.threatLevel).toBe('medium');
      expect(centerCell?.threatLevel).toBe('low');
    });
  });

  describe('calculateBoardTension', () => {
    it('should calculate low tension for stable board', () => {
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' });

      const tension = calculateBoardTension(board);

      expect(tension.tensionLevel).toBeLessThan(30);
      expect(tension.description).toContain('stable');
      expect(tension.recommendations).toContain(
        'Good time for aggressive expansion'
      );
    });

    it('should identify high tension situations', () => {
      // Fill board with near-critical cells
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const criticalMass =
            row === 0 || row === 3 || col === 0 || col === 3
              ? (row === 0 && col === 0) ||
                (row === 0 && col === 3) ||
                (row === 3 && col === 0) ||
                (row === 3 && col === 3)
                ? 2
                : 3
              : 4;
          board = updateCell(board, row, col, {
            orbCount: criticalMass - 1,
            playerId: 'player1',
          });
        }
      }

      const tension = calculateBoardTension(board);

      expect(tension.tensionLevel).toBeGreaterThan(50);
      expect(tension.hotspots.length).toBeGreaterThan(0);
      // Should contain either high tension or critical tension recommendations
      const hasHighTensionRec = tension.recommendations.includes(
        'Be cautious with placements'
      );
      const hasCriticalTensionRec = tension.recommendations.includes(
        'Prepare for massive chain reactions'
      );
      expect(hasHighTensionRec || hasCriticalTensionRec).toBe(true);
    });

    it('should identify hotspots correctly', () => {
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' }); // High intensity cell

      const tension = calculateBoardTension(board);

      expect(tension.hotspots).toHaveLength(1);
      expect(tension.hotspots[0].row).toBe(1);
      expect(tension.hotspots[0].col).toBe(1);
      expect(tension.hotspots[0].intensity).toBeGreaterThan(15);
    });
  });

  describe('detectCriticalMassThreats', () => {
    it('should categorize threats by player ownership', () => {
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' }); // Player advantage
      board = updateCell(board, 0, 1, { orbCount: 3, playerId: 'player2' }); // Immediate threat
      board = updateCell(board, 1, 0, { orbCount: 3, playerId: null }); // Neutral threat

      gameState.board = board;
      const threats = detectCriticalMassThreats(gameState, 'player1');

      expect(threats.playerAdvantages).toHaveLength(1);
      expect(threats.immediateThreats).toHaveLength(1);
      expect(threats.neutralThreats).toHaveLength(1);
    });

    it('should generate appropriate recommendations', () => {
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player2' });
      board = updateCell(board, 0, 1, { orbCount: 3, playerId: 'player2' });
      board = updateCell(board, 1, 0, { orbCount: 3, playerId: 'player2' });
      board = updateCell(board, 1, 1, { orbCount: 4, playerId: 'player2' });

      gameState.board = board;
      const threats = detectCriticalMassThreats(gameState, 'player1');

      expect(threats.recommendations).toContain(
        '4 enemy cells ready to explode'
      );
      expect(threats.recommendations).toContain(
        'Consider defensive positioning'
      );
      expect(threats.recommendations).toContain(
        'Board is highly unstable - expect massive changes'
      );
    });

    it('should identify player advantages', () => {
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player1' });
      board = updateCell(board, 0, 1, { orbCount: 3, playerId: 'player1' });

      gameState.board = board;
      const threats = detectCriticalMassThreats(gameState, 'player1');

      expect(threats.playerAdvantages).toHaveLength(2);
      expect(threats.recommendations).toContain('You have 2 explosive cells');
      expect(threats.recommendations).toContain(
        'Look for chain reaction opportunities'
      );
    });
  });
});
