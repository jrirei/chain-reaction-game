import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameState } from './useGameState';
import {
  getBoardCriticalMassState,
  analyzeCellCriticalMass,
  previewExplosion,
  detectNearCriticalCells,
  calculateBoardTension,
  detectCriticalMassThreats,
  type CriticalMassState,
  type CriticalMassInfo,
  type ExplosionPreview,
} from '../utils/criticalMassDetection';
// import type { Cell, PlayerId } from '../types';

export interface CriticalMassAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  cells?: Array<{ row: number; col: number }>;
  duration?: number;
  priority: number;
  timestamp: number;
}

export interface CriticalMassVisualization {
  criticalCells: Set<string>;
  nearCriticalCells: Set<string>;
  hotspots: Array<{ row: number; col: number; intensity: number }>;
  tensionLevel: number;
  showExplosionPreviews: boolean;
}

export const useCriticalMassDetection = () => {
  const { gameState, currentPlayer } = useGameState();
  const [alerts, setAlerts] = useState<CriticalMassAlert[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [showVisualization, setShowVisualization] = useState(true);
  const [explosionPreview, setExplosionPreview] =
    useState<ExplosionPreview | null>(null);

  // Memoized critical mass state
  const criticalMassState = useMemo((): CriticalMassState => {
    return getBoardCriticalMassState(gameState.board);
  }, [gameState.board]);

  // Memoized board tension
  const boardTension = useMemo(() => {
    return calculateBoardTension(gameState.board);
  }, [gameState.board]);

  // Memoized threat analysis
  const threatAnalysis = useMemo(() => {
    if (!currentPlayer) return null;
    return detectCriticalMassThreats(gameState, currentPlayer.id);
  }, [gameState, currentPlayer]);

  // Memoized near-critical cells
  const nearCriticalCells = useMemo(() => {
    if (!currentPlayer) return [];
    return detectNearCriticalCells(gameState.board, currentPlayer.id);
  }, [gameState.board, currentPlayer]);

  // Visualization data
  const visualization = useMemo((): CriticalMassVisualization => {
    const criticalCells = new Set<string>();
    const nearCriticalSet = new Set<string>();

    criticalMassState.criticalCells.forEach((cell) => {
      criticalCells.add(`${cell.row},${cell.col}`);
    });

    criticalMassState.nearCriticalCells.forEach((cell) => {
      nearCriticalSet.add(`${cell.row},${cell.col}`);
    });

    return {
      criticalCells,
      nearCriticalCells: nearCriticalSet,
      hotspots: boardTension.hotspots,
      tensionLevel: boardTension.tensionLevel,
      showExplosionPreviews: showVisualization,
    };
  }, [criticalMassState, boardTension, showVisualization]);

  // Generate alerts based on critical mass state
  const generateAlerts = useCallback(() => {
    const newAlerts: CriticalMassAlert[] = [];
    const timestamp = Date.now();

    // Critical mass alerts
    if (criticalMassState.totalExplosiveCells > 0) {
      newAlerts.push({
        id: `critical-${timestamp}`,
        type: 'critical',
        title: 'Explosive Cells Detected!',
        message: `${criticalMassState.totalExplosiveCells} cell(s) ready to explode`,
        cells: criticalMassState.criticalCells.map((cell) => ({
          row: cell.row,
          col: cell.col,
        })),
        duration: 5000,
        priority: 100,
        timestamp,
      });
    }

    // Board stability alerts
    if (criticalMassState.boardStability === 'critical') {
      newAlerts.push({
        id: `stability-${timestamp}`,
        type: 'warning',
        title: 'Critical Board State',
        message: 'Board is highly unstable - massive chain reactions possible!',
        duration: 4000,
        priority: 90,
        timestamp,
      });
    } else if (criticalMassState.boardStability === 'volatile') {
      newAlerts.push({
        id: `volatile-${timestamp}`,
        type: 'warning',
        title: 'Volatile Situation',
        message: 'Multiple cells approaching critical mass',
        duration: 3000,
        priority: 70,
        timestamp,
      });
    }

    // Tension alerts
    if (boardTension.tensionLevel > 80) {
      newAlerts.push({
        id: `tension-${timestamp}`,
        type: 'critical',
        title: 'High Tension!',
        message: boardTension.description,
        duration: 4000,
        priority: 85,
        timestamp,
      });
    }

    // Player-specific threats
    if (threatAnalysis) {
      if (threatAnalysis.immediateThreats.length > 0) {
        newAlerts.push({
          id: `enemy-threat-${timestamp}`,
          type: 'warning',
          title: 'Enemy Threats',
          message: `${threatAnalysis.immediateThreats.length} enemy explosive cells detected`,
          cells: threatAnalysis.immediateThreats.map((cell) => ({
            row: cell.row,
            col: cell.col,
          })),
          duration: 3000,
          priority: 80,
          timestamp,
        });
      }

      if (threatAnalysis.playerAdvantages.length > 0) {
        newAlerts.push({
          id: `player-advantage-${timestamp}`,
          type: 'info',
          title: 'Strategic Advantage',
          message: `You have ${threatAnalysis.playerAdvantages.length} explosive cells ready`,
          cells: threatAnalysis.playerAdvantages.map((cell) => ({
            row: cell.row,
            col: cell.col,
          })),
          duration: 2000,
          priority: 60,
          timestamp,
        });
      }
    }

    // Update alerts only if they're different
    setAlerts((prevAlerts) => {
      const alertIds = new Set(newAlerts.map((alert) => alert.id));
      const prevAlertIds = new Set(prevAlerts.map((alert) => alert.id));

      const hasChanges =
        newAlerts.length !== prevAlerts.length ||
        !Array.from(alertIds).every((id) => prevAlertIds.has(id));

      return hasChanges
        ? newAlerts.sort((a, b) => b.priority - a.priority)
        : prevAlerts;
    });
  }, [criticalMassState, boardTension, threatAnalysis]);

  // Generate alerts when game state changes
  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  // Auto-remove expired alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAlerts((prevAlerts) =>
        prevAlerts.filter((alert) => {
          const duration = alert.duration || 3000;
          return now - alert.timestamp < duration;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Analyze specific cell
  const analyzeCellForCriticalMass = useCallback(
    (row: number, col: number): CriticalMassInfo => {
      return analyzeCellCriticalMass(gameState.board, row, col);
    },
    [gameState.board]
  );

  // Preview explosion for a cell
  const previewCellExplosion = useCallback(
    (row: number, col: number): ExplosionPreview => {
      return previewExplosion(gameState.board, row, col);
    },
    [gameState.board]
  );

  // Handle cell hover for explosion preview
  const handleCellHover = useCallback(
    (row: number, col: number) => {
      setHoveredCell({ row, col });

      if (showVisualization) {
        const cellInfo = analyzeCellCriticalMass(gameState.board, row, col);
        if (cellInfo.willExplode || cellInfo.isAtCapacity) {
          const preview = previewExplosion(gameState.board, row, col);
          setExplosionPreview(preview);
        } else {
          setExplosionPreview(null);
        }
      }
    },
    [gameState.board, showVisualization]
  );

  // Handle cell hover end
  const handleCellHoverEnd = useCallback(() => {
    setHoveredCell(null);
    setExplosionPreview(null);
  }, []);

  // Dismiss specific alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prevAlerts) =>
      prevAlerts.filter((alert) => alert.id !== alertId)
    );
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Toggle visualization
  const toggleVisualization = useCallback(() => {
    setShowVisualization((prev) => !prev);
  }, []);

  // Get cell danger level for styling
  const getCellDangerLevel = useCallback(
    (row: number, col: number): 'safe' | 'warning' | 'danger' | 'critical' => {
      const cellKey = `${row},${col}`;

      if (visualization.criticalCells.has(cellKey)) {
        return 'critical';
      }

      if (visualization.nearCriticalCells.has(cellKey)) {
        return 'danger';
      }

      const hotspot = visualization.hotspots.find(
        (h) => h.row === row && h.col === col
      );
      if (hotspot && hotspot.intensity > 20) {
        return 'warning';
      }

      return 'safe';
    },
    [visualization]
  );

  // Check if cell is part of current explosion preview
  const isCellInExplosionPreview = useCallback(
    (row: number, col: number): boolean => {
      if (!explosionPreview) return false;

      return (
        (explosionPreview.originCell.row === row &&
          explosionPreview.originCell.col === col) ||
        explosionPreview.affectedCells.some(
          (cell) => cell.row === row && cell.col === col
        )
      );
    },
    [explosionPreview]
  );

  return {
    // State data
    criticalMassState,
    boardTension,
    threatAnalysis,
    nearCriticalCells,
    alerts,
    visualization,
    explosionPreview,
    hoveredCell,
    showVisualization,

    // Analysis functions
    analyzeCellForCriticalMass,
    previewCellExplosion,
    getCellDangerLevel,
    isCellInExplosionPreview,

    // Event handlers
    handleCellHover,
    handleCellHoverEnd,
    dismissAlert,
    clearAllAlerts,
    toggleVisualization,

    // Utilities
    isStable: criticalMassState.boardStability === 'stable',
    isVolatile: criticalMassState.boardStability === 'volatile',
    isCritical: criticalMassState.boardStability === 'critical',
    hasExplosiveCells: criticalMassState.totalExplosiveCells > 0,
    tensionLevel: boardTension.tensionLevel,
  };
};
