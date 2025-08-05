import React from 'react';
import type { Cell as CellType } from '../../types';
import { useCriticalMassDetection } from '../../hooks/useCriticalMassDetection';
import { useAudioManager } from '../../hooks/useAudioManager';
import styles from './Cell.module.css';

interface CellProps {
  cell: CellType;
  onClick: (row: number, col: number) => void;
  onMouseEnter?: (row: number, col: number) => void;
  onMouseLeave?: () => void;
  isClickable: boolean;
  playerColor?: string;
  isCurrentPlayerCell: boolean;
  showCriticalMass?: boolean;
  showCriticalMassVisualization?: boolean;
}

const Cell: React.FC<CellProps> = ({
  cell,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isClickable,
  playerColor = '#4ECDC4',
  isCurrentPlayerCell,
  showCriticalMass = false,
  showCriticalMassVisualization = true,
}) => {
  const {
    getCellDangerLevel,
    isCellInExplosionPreview,
    handleCellHover,
    handleCellHoverEnd,
  } = useCriticalMassDetection();

  const { playUIHover, playUIClick } = useAudioManager();
  const handleClick = () => {
    if (isClickable) {
      playUIClick();
      onClick(cell.row, cell.col);
    }
  };

  const handleMouseEnter = () => {
    if (isClickable) {
      playUIHover();
    }
    if (onMouseEnter) {
      onMouseEnter(cell.row, cell.col);
    }
    if (showCriticalMassVisualization) {
      handleCellHover(cell.row, cell.col);
    }
  };

  const handleMouseLeave = () => {
    if (onMouseLeave) {
      onMouseLeave();
    }
    if (showCriticalMassVisualization) {
      handleCellHoverEnd();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      playUIClick();
      onClick(cell.row, cell.col);
    }
  };

  const getCellTypeClass = () => {
    if (cell.criticalMass === 2) return styles.corner;
    if (cell.criticalMass === 3) return styles.edge;
    return styles.interior;
  };

  const renderOrbs = () => {
    const orbs = [];
    for (let i = 0; i < cell.orbCount; i++) {
      orbs.push(
        <div
          key={i}
          className={styles.orb}
          style={{
            backgroundColor: playerColor,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      );
    }
    return orbs;
  };

  // Get critical mass visualization classes
  const dangerLevel = showCriticalMassVisualization
    ? getCellDangerLevel(cell.row, cell.col)
    : 'safe';
  const isInExplosionPreview = showCriticalMassVisualization
    ? isCellInExplosionPreview(cell.row, cell.col)
    : false;

  const cellClasses = [
    styles.cell,
    getCellTypeClass(),
    isClickable ? styles.clickable : '',
    isCurrentPlayerCell ? styles.currentPlayer : '',
    cell.isExploding ? styles.exploding : '',
    cell.orbCount >= cell.criticalMass ? styles.critical : '',
    showCriticalMassVisualization ? styles[`danger-${dangerLevel}`] : '',
    isInExplosionPreview ? styles.explosionPreview : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={cellClasses}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      disabled={!isClickable}
      aria-label={`Cell at row ${cell.row + 1}, column ${cell.col + 1}. ${
        cell.orbCount > 0
          ? `Contains ${cell.orbCount} orb${cell.orbCount > 1 ? 's' : ''}`
          : 'Empty'
      }. Critical mass: ${cell.criticalMass}`}
      data-row={cell.row}
      data-col={cell.col}
      data-orb-count={cell.orbCount}
      data-critical-mass={cell.criticalMass}
    >
      <div className={styles.cellContent}>
        {renderOrbs()}

        {showCriticalMass && (
          <div className={styles.criticalMassIndicator}>
            {cell.criticalMass}
          </div>
        )}

        {cell.orbCount >= cell.criticalMass && (
          <div className={styles.criticalIndicator}>!</div>
        )}
      </div>
    </button>
  );
};

export default Cell;
