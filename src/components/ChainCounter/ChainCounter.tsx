import React from 'react';
import styles from './ChainCounter.module.css';

interface ChainCounterProps {
  consecutiveExplosions: number;
  isVisible: boolean;
  className?: string;
}

const ChainCounter: React.FC<ChainCounterProps> = ({
  consecutiveExplosions,
  isVisible,
  className = '',
}) => {
  if (!isVisible || consecutiveExplosions <= 0) {
    return null;
  }

  // Calculate intensity level (1-10 based on consecutive explosions)
  const intensityLevel = Math.min(consecutiveExplosions, 10);

  // Create lightning bolts based on intensity
  const lightningBolts = '⚡'.repeat(intensityLevel);

  // Determine intensity class for styling
  const intensityClass = getIntensityClass(intensityLevel);

  // Show warning for high chain counts
  const showWarning = consecutiveExplosions >= 15;

  return (
    <div
      className={`${styles.chainCounter} ${className} ${intensityClass} ${isVisible ? styles.visible : styles.hidden}`}
    >
      <div className={styles.mainContent}>
        <div className={styles.counter}>
          Chain Reaction: {consecutiveExplosions}
        </div>
        <div
          className={styles.intensity}
          aria-label={`Intensity level ${intensityLevel}`}
        >
          {lightningBolts}
        </div>
      </div>

      {showWarning && (
        <div className={styles.warning}>Maximum chain approaching!</div>
      )}
    </div>
  );
};

/**
 * Gets the appropriate CSS class for the intensity level
 */
const getIntensityClass = (level: number): string => {
  if (level <= 3) return styles.intensityLow;
  if (level <= 6) return styles.intensityMedium;
  if (level <= 8) return styles.intensityHigh;
  return styles.intensityExtreme;
};

export default ChainCounter;
