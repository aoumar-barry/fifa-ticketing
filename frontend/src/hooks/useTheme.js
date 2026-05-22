import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'theme';

/**
 * Hook to manage dark/light theme toggle.
 * - Reads from localStorage key 'theme'
 * - Falls back to prefers-color-scheme
 * - Applies data-theme on <html>
 */
export function useTheme() {
  const getInitialTheme = () => {
    // 1. Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    // 2. Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    // 3. Default to dark
    return 'dark';
  };

  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply data-theme attribute + color-scheme on <html>
  const applyTheme = useCallback((newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.style.colorScheme = newTheme;
  }, []);

  // On mount, apply the initial theme
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system preference changes (only when no localStorage value)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Only auto-switch if the user hasn't manually set a preference
      if (!stored) {
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
