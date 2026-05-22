import React from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * ThemeToggle — Animated sun/moon icon button.
 * Transition 250ms as specified.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className={`relative w-9 h-9 flex items-center justify-center rounded-full
        bg-bg-tertiary hover:bg-bg-elevated border border-border-light
        transition-all duration-250 active:scale-90 ${className}`}
      style={{ transition: 'all 250ms ease' }}
    >
      {/* Sun icon */}
      <svg
        className="absolute w-[18px] h-[18px] text-brand-gold"
        style={{
          transition: 'transform 250ms ease, opacity 250ms ease',
          transform: isDark ? 'rotate(-90deg) scale(0)' : 'rotate(0deg) scale(1)',
          opacity: isDark ? 0 : 1,
        }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon */}
      <svg
        className="absolute w-[18px] h-[18px] text-brand-gold"
        style={{
          transition: 'transform 250ms ease, opacity 250ms ease',
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)',
          opacity: isDark ? 1 : 0,
        }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}
