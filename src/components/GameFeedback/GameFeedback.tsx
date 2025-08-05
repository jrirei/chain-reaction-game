import React, { useEffect, useState } from 'react';
import type { OrbPlacementFeedback } from '../../hooks/useOrbPlacement';
import styles from './GameFeedback.module.css';

export interface GameFeedbackProps {
  feedback: OrbPlacementFeedback | null;
  position?: 'top' | 'bottom' | 'center';
  autoHide?: boolean;
}

const GameFeedback: React.FC<GameFeedbackProps> = ({
  feedback,
  position = 'top',
  autoHide = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] =
    useState<OrbPlacementFeedback | null>(null);

  useEffect(() => {
    if (feedback) {
      setCurrentFeedback(feedback);
      setVisible(true);

      if (autoHide) {
        const duration = feedback.duration || 3000;
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [feedback, autoHide]);

  if (!currentFeedback) return null;

  const feedbackClasses = [
    styles.gameFeedback,
    styles[position],
    styles[currentFeedback.type],
    visible ? styles.visible : styles.hidden,
  ]
    .filter(Boolean)
    .join(' ');

  const getIcon = () => {
    switch (currentFeedback.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  return (
    <div className={feedbackClasses} role="alert" aria-live="polite">
      <div className={styles.feedbackContent}>
        <span className={styles.feedbackIcon}>{getIcon()}</span>
        <span className={styles.feedbackMessage}>
          {currentFeedback.message}
        </span>
      </div>
      <div className={styles.feedbackProgress} />
    </div>
  );
};

export default GameFeedback;
