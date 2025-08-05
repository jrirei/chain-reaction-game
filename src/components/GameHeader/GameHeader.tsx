import styles from './GameHeader.module.css';

interface GameHeaderProps {
  title?: string;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  title = 'Chain Reaction',
}) => {
  return (
    <header className={styles.gameHeader}>
      <div className={styles.headerContent}>
        <h1 className={styles.gameTitle}>{title}</h1>
        <div className={styles.headerActions}>
          <button className={styles.settingsBtn} aria-label="Game Settings">
            ⚙️
          </button>
          <button className={styles.helpBtn} aria-label="Help">
            ❓
          </button>
        </div>
      </div>
    </header>
  );
};

export default GameHeader;
