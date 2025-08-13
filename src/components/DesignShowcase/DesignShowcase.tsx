import React, { useState, useEffect } from 'react';
import styles from './DesignShowcase.module.css';

const DesignShowcase: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>('dark');

  // Apply theme to document root when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', selectedTheme);
  }, [selectedTheme]);

  const sampleColors = [
    { name: 'Primary Background', var: '--primary-bg', value: '#1a1a1a' },
    { name: 'Secondary Background', var: '--secondary-bg', value: '#2d2d2d' },
    { name: 'Text Primary', var: '--text-primary', value: '#ffffff' },
    { name: 'Text Secondary', var: '--text-secondary', value: '#cccccc' },
    { name: 'Border Color', var: '--border-color', value: '#444444' },
    { name: 'Accent Color', var: '--accent-color', value: '#646cff' },
  ];

  const playerColors = ['#FF0000', '#0000FF', '#008000', '#FFA500'];

  return (
    <div className={styles.showcase} data-theme={selectedTheme}>
      <header className={styles.showcaseHeader}>
        <h1 className={styles.showcaseTitle}>
          Chain Reaction - Design Showcase
        </h1>
        <div className={styles.themeToggle}>
          <label>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={selectedTheme === 'dark'}
              onChange={(e) => setSelectedTheme(e.target.value as 'dark')}
            />
            Dark Theme
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={selectedTheme === 'light'}
              onChange={(e) => setSelectedTheme(e.target.value as 'light')}
            />
            Light Theme
          </label>
        </div>
      </header>

      <main className={styles.showcaseContent}>
        {/* Color Palette Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Color Palette</h2>
          <div className={styles.colorGrid}>
            {sampleColors.map((color) => (
              <div key={color.name} className={styles.colorItem}>
                <div
                  className={styles.colorSwatch}
                  style={{ backgroundColor: `var(${color.var})` }}
                ></div>
                <div className={styles.colorInfo}>
                  <strong>{color.name}</strong>
                  <br />
                  <code>{color.var}</code>
                  <br />
                  <span className={styles.colorValue}>{color.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Player Colors Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Player Colors</h2>
          <div className={styles.playerColorGrid}>
            {playerColors.map((color, index) => (
              <div key={index} className={styles.playerColorItem}>
                <div
                  className={styles.playerColorSwatch}
                  style={{ backgroundColor: color }}
                ></div>
                <span>Player {index + 1}</span>
                <code>{color}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Typography Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Typography</h2>
          <div className={styles.typographyGrid}>
            <div className={styles.typeExample}>
              <h1 style={{ color: 'var(--text-primary)' }}>Game Title (H1)</h1>
              <p>This is how the main "Chain Reaction" title appears</p>
            </div>
            <div className={styles.typeExample}>
              <h2 style={{ color: 'var(--text-primary)' }}>
                Section Headers (H2)
              </h2>
              <p>Used for major sections like "Player Information"</p>
            </div>
            <div className={styles.typeExample}>
              <h3 style={{ color: 'var(--text-primary)' }}>Subsection (H3)</h3>
              <p>Used for player list headers and smaller sections</p>
            </div>
            <div className={styles.typeExample}>
              <p style={{ color: 'var(--text-primary)' }}>Primary Text</p>
              <p style={{ color: 'var(--text-secondary)' }}>Secondary Text</p>
            </div>
          </div>
        </section>

        {/* UI Components Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>UI Components</h2>

          {/* Buttons */}
          <div className={styles.componentGroup}>
            <h3>Buttons</h3>
            <div className={styles.buttonGrid}>
              <button className={styles.primaryButton}>Primary Button</button>
              <button className={styles.secondaryButton}>
                Secondary Button
              </button>
              <button className={styles.dangerButton}>Danger Button</button>
              <button className={styles.primaryButton} disabled>
                Disabled Button
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className={styles.componentGroup}>
            <h3>Cards & Panels</h3>
            <div className={styles.cardGrid}>
              <div className={styles.sampleCard}>
                <h4>Player Card</h4>
                <p>This shows how player information cards appear</p>
                <div className={styles.statItem}>
                  <span>Orbs: </span>
                  <span className={styles.statValue}>5</span>
                </div>
              </div>
              <div className={styles.sampleCard} data-current="true">
                <h4>Current Player Card</h4>
                <p>Highlighted when it's the player's turn</p>
                <div className={styles.statItem}>
                  <span>Moves: </span>
                  <span className={styles.statValue}>3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Cells */}
          <div className={styles.componentGroup}>
            <h3>Game Board Cells</h3>
            <div className={styles.cellGrid}>
              <div className={styles.sampleCell}>
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#FF0000' }}
                ></div>
                <span>Corner (2 max)</span>
              </div>
              <div className={styles.sampleCell}>
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#0000FF' }}
                ></div>
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#0000FF' }}
                ></div>
                <span>Edge (3 max)</span>
              </div>
              <div className={styles.sampleCell}>
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#008000' }}
                ></div>
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#008000' }}
                ></div>
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#008000' }}
                ></div>
                <span>Center (4 max)</span>
              </div>
              <div className={styles.sampleCell} data-critical="true">
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#FFA500' }}
                ></div>
                <div
                  className={styles.orb}
                  style={{ backgroundColor: '#FFA500' }}
                ></div>
                <span>Critical!</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contrast Issues Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contrast Issues to Fix</h2>
          <div className={styles.contrastExamples}>
            <div className={styles.contrastExample}>
              <h3
                style={{
                  color: 'var(--text-primary)',
                  background: 'var(--primary-bg)',
                  padding: '1rem',
                }}
              >
                Title on Primary Background
              </h3>
              <p>How readable is this? Rate the contrast.</p>
            </div>
            <div className={styles.contrastExample}>
              <h3
                style={{
                  color: 'var(--text-primary)',
                  background: 'var(--secondary-bg)',
                  padding: '1rem',
                }}
              >
                Title on Secondary Background
              </h3>
              <p>Better or worse than above?</p>
            </div>
            <div className={styles.contrastExample}>
              <div
                style={{
                  background: 'rgba(78, 205, 196, 0.1)',
                  padding: '1rem',
                }}
              >
                <h3 style={{ color: 'var(--text-primary)' }}>
                  Title on Current Player Background
                </h3>
                <p>
                  This simulates the current player highlight issue you
                  mentioned
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DesignShowcase;
