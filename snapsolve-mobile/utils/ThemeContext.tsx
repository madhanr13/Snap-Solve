/**
 * Theme system for SnapSolve.
 * Provides light/dark mode with warm stone-based colors.
 * Persists user preference to AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

// Warm stone palette — avoids the cold, corporate "AI look" of pure slate
export const lightColors = {
  bg: '#fafaf9',
  surface: '#ffffff',
  surfaceAlt: '#f5f5f4',
  text: '#1c1917',
  textSecondary: '#57534e',
  textMuted: '#a8a29e',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  border: '#e7e5e4',
  borderLight: '#f5f5f4',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  tabBar: '#ffffff',
  tabBarBorder: '#e7e5e4',
  overlay: 'rgba(0,0,0,0.04)',
};

export const darkColors = {
  bg: '#0c0a09',
  surface: '#1c1917',
  surfaceAlt: '#292524',
  text: '#fafaf9',
  textSecondary: '#a8a29e',
  textMuted: '#78716c',
  accent: '#60a5fa',
  accentSoft: '#1e3a5f',
  border: '#292524',
  borderLight: '#1c1917',
  danger: '#f87171',
  dangerSoft: '#450a0a',
  success: '#4ade80',
  successSoft: '#052e16',
  warning: '#fbbf24',
  warningSoft: '#451a03',
  tabBar: '#1c1917',
  tabBarBorder: '#292524',
  overlay: 'rgba(255,255,255,0.04)',
};

export type ThemeColors = typeof lightColors;

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  isDark: false,
  colors: lightColors,
  toggle: () => {},
});

const STORAGE_KEY = '@snapsolve_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light') setMode(stored);
    });
  }, []);

  const toggle = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value: ThemeContextType = {
    mode,
    isDark: mode === 'dark',
    colors: mode === 'dark' ? darkColors : lightColors,
    toggle,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
