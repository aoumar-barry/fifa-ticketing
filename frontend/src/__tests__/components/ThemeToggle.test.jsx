/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '../../components/ThemeToggle';

// Mock the useTheme hook
const mockToggleTheme = jest.fn();
let mockTheme = 'dark';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: mockToggleTheme,
    setTheme: jest.fn(),
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockTheme = 'dark';
    mockToggleTheme.mockClear();
  });

  test('renders the toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /mode/i });
    expect(button).toBeInTheDocument();
  });

  test('has correct aria-label in dark mode', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Passer en mode clair');
  });

  test('has correct aria-label in light mode', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Passer en mode sombre');
  });

  test('calls toggleTheme when clicked', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  test('has id "theme-toggle"', () => {
    render(<ThemeToggle />);
    const button = document.getElementById('theme-toggle');
    expect(button).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<ThemeToggle className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });
});
