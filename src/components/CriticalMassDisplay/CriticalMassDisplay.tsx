import React from 'react';
import { useCriticalMassDetection } from '../../hooks/useCriticalMassDetection';
import styles from './CriticalMassDisplay.module.css';

interface CriticalMassDisplayProps {
  showAlerts?: boolean;
  showBoardTension?: boolean;
  showRecommendations?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

const CriticalMassDisplay: React.FC<CriticalMassDisplayProps> = ({
  showAlerts = true,
  showBoardTension = true,
  showRecommendations = true,
  position = 'top-right',
  compact = false,
}) => {
  const {
    alerts,
    boardTension,
    criticalMassState,
    threatAnalysis,
    dismissAlert,
    clearAllAlerts,
    toggleVisualization,
    showVisualization,
    // isStable,
    isVolatile,
    isCritical,
    hasExplosiveCells,
  } = useCriticalMassDetection();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return '💥';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getBoardStabilityIcon = () => {
    if (isCritical) return '🔥';
    if (isVolatile) return '⚡';
    return '✅';
  };

  const getTensionColor = (level: number) => {
    if (level > 80) return '#ff4444';
    if (level > 50) return '#ff8800';
    if (level > 20) return '#ffbb00';
    return '#44bb44';
  };

  const containerClasses = [
    styles.criticalMassDisplay,
    styles[position],
    compact ? styles.compact : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (compact) {
    return (
      <div className={containerClasses}>
        <div className={styles.compactHeader}>
          <span className={styles.stabilityIcon}>
            {getBoardStabilityIcon()}
          </span>
          <span className={styles.tensionLevel}>
            {Math.round(boardTension.tensionLevel)}%
          </span>
          {hasExplosiveCells && (
            <span className={styles.explosiveCount}>
              {criticalMassState.totalExplosiveCells}💥
            </span>
          )}
        </div>

        {alerts.length > 0 && (
          <div className={styles.compactAlerts}>
            {alerts.slice(0, 1).map((alert) => (
              <div
                key={alert.id}
                className={`${styles.alert} ${styles[alert.type]} ${styles.compact}`}
              >
                <span className={styles.alertIcon}>
                  {getAlertIcon(alert.type)}
                </span>
                <span className={styles.alertMessage}>{alert.message}</span>
              </div>
            ))}
            {alerts.length > 1 && (
              <div className={styles.moreAlerts}>+{alerts.length - 1} more</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={styles.header}>
        <h3 className={styles.title}>Critical Mass Monitor</h3>
        <div className={styles.controls}>
          <button
            className={styles.visualizationToggle}
            onClick={toggleVisualization}
            title={
              showVisualization ? 'Hide visualization' : 'Show visualization'
            }
          >
            {showVisualization ? '👁️' : '🔍'}
          </button>
          {alerts.length > 0 && (
            <button
              className={styles.clearAllBtn}
              onClick={clearAllAlerts}
              title="Clear all alerts"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {showBoardTension && (
        <div className={styles.tensionMeter}>
          <div className={styles.tensionHeader}>
            <span className={styles.tensionLabel}>Board Tension</span>
            <span className={styles.tensionValue}>
              {Math.round(boardTension.tensionLevel)}%
            </span>
          </div>
          <div className={styles.tensionBar}>
            <div
              className={styles.tensionFill}
              style={{
                width: `${boardTension.tensionLevel}%`,
                backgroundColor: getTensionColor(boardTension.tensionLevel),
              }}
            />
          </div>
          <div className={styles.tensionDescription}>
            {getBoardStabilityIcon()} {boardTension.description}
          </div>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Critical Cells</span>
          <span className={styles.statValue}>
            {criticalMassState.totalExplosiveCells}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Near Critical</span>
          <span className={styles.statValue}>
            {criticalMassState.nearCriticalCells.length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Hotspots</span>
          <span className={styles.statValue}>
            {boardTension.hotspots.length}
          </span>
        </div>
      </div>

      {showAlerts && alerts.length > 0 && (
        <div className={styles.alertsSection}>
          <h4 className={styles.alertsTitle}>Active Alerts</h4>
          <div className={styles.alertsList}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`${styles.alert} ${styles[alert.type]}`}
              >
                <div className={styles.alertHeader}>
                  <span className={styles.alertIcon}>
                    {getAlertIcon(alert.type)}
                  </span>
                  <span className={styles.alertTitle}>{alert.title}</span>
                  <button
                    className={styles.dismissBtn}
                    onClick={() => dismissAlert(alert.id)}
                    title="Dismiss alert"
                  >
                    ×
                  </button>
                </div>
                <div className={styles.alertMessage}>{alert.message}</div>
                {alert.cells && alert.cells.length > 0 && (
                  <div className={styles.alertCells}>
                    Cells:{' '}
                    {alert.cells
                      .map((cell) => `(${cell.row + 1},${cell.col + 1})`)
                      .join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showRecommendations &&
        threatAnalysis &&
        threatAnalysis.recommendations.length > 0 && (
          <div className={styles.recommendationsSection}>
            <h4 className={styles.recommendationsTitle}>
              Strategic Recommendations
            </h4>
            <ul className={styles.recommendationsList}>
              {threatAnalysis.recommendations.map((recommendation, index) => (
                <li key={index} className={styles.recommendation}>
                  💡 {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

      {boardTension.recommendations.length > 0 && (
        <div className={styles.boardRecommendations}>
          <h4 className={styles.recommendationsTitle}>Board Analysis</h4>
          <ul className={styles.recommendationsList}>
            {boardTension.recommendations.map((recommendation, index) => (
              <li key={index} className={styles.recommendation}>
                📊 {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CriticalMassDisplay;
