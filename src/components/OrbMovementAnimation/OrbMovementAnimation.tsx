import React, { useEffect, useState } from 'react';
import type { OrbMovementAnimation } from '../../types';
import styles from './OrbMovementAnimation.module.css';

interface OrbMovementAnimationProps {
  movement: OrbMovementAnimation;
  gridSize: { rows: number; cols: number };
  cellSize: number; // Size of each cell in pixels
  onComplete?: () => void;
}

const OrbMovementAnimationComponent: React.FC<OrbMovementAnimationProps> = ({
  movement,
  cellSize,
  onComplete,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [currentPosition, setCurrentPosition] = useState({
    x: 0,
    y: 0,
  });

  // Calculate positions
  const fromPosition = {
    x: movement.fromCell.col * cellSize + cellSize / 2,
    y: movement.fromCell.row * cellSize + cellSize / 2,
  };

  const toPosition = {
    x: movement.toCell.col * cellSize + cellSize / 2,
    y: movement.toCell.row * cellSize + cellSize / 2,
  };

  useEffect(() => {
    // Start from the origin cell
    setCurrentPosition(fromPosition);

    // Animate to destination after a small delay
    const animationTimer = setTimeout(() => {
      setCurrentPosition(toPosition);
    }, 50); // Small delay to ensure smooth start

    // Complete the animation after duration
    const completeTimer = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, movement.duration);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(completeTimer);
    };
  }, [
    movement,
    fromPosition.x,
    fromPosition.y,
    toPosition.x,
    toPosition.y,
    onComplete,
  ]);

  if (!isAnimating) {
    return null;
  }

  return (
    <div
      className={styles.orbAnimation}
      style={
        {
          '--start-x': `${fromPosition.x}px`,
          '--start-y': `${fromPosition.y}px`,
          '--end-x': `${toPosition.x}px`,
          '--end-y': `${toPosition.y}px`,
          '--duration': `${movement.duration}ms`,
          '--orb-color': movement.orbColor,
          transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
          transition: `transform ${movement.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        } as React.CSSProperties
      }
    >
      <div className={styles.orb} />
    </div>
  );
};

export default OrbMovementAnimationComponent;
