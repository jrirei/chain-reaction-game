import { useTheme } from '../../hooks/useTheme';
import styles from './GameHeader.module.css';

interface GameHeaderProps {
  title?: string;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  title = 'Chain Reaction',
}) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <header className={styles.gameHeader}>
      <div className={styles.headerContent}>
        <h1 className={styles.gameTitle}>{title}</h1>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};

export default GameHeader;
