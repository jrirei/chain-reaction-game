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
      </div>
    </header>
  );
};

export default GameHeader;
