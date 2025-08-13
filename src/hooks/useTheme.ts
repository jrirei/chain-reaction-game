import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  // Check for saved theme preference or default to dark
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('chain-reaction-theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Remove any existing theme attributes
    root.removeAttribute('data-theme');

    if (theme === 'system') {
      // Let CSS media queries handle system theme
      localStorage.removeItem('chain-reaction-theme');
    } else {
      // Apply manual theme override
      root.setAttribute('data-theme', theme);
      localStorage.setItem('chain-reaction-theme', theme);
    }
  }, [theme]);

  return { theme, setTheme };
}
