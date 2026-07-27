/**
 * Theme system for SnapSolve.
 * Provides light/dark mode with warm stone-based colors.
 * Persists user preference to AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

// Strict Flat Design 2.0 / Neo-brutalism light palette
export const lightColors = {
  bg: '#F8FAFC',          // slate-50
  surface: '#FFFFFF',     // white
  surfaceAlt: '#F1F5F9',  // slate-100
  text: '#0F172A',        // slate-900
  textSecondary: '#475569', // slate-600
  textMuted: '#94A3B8',   // slate-400
  accent: '#0055FF',      // Electric blue (solid)
  accentSoft: '#E6EFFF',  // Electric blue 10%
  border: '#E2E8F0',      // slate-200
  borderLight: '#F1F5F9', // slate-100
  danger: '#DC2626',      // red-600
  dangerSoft: '#FEF2F2',  // red-50
  success: '#16A34A',     // green-600
  successSoft: '#DCFCE7', // green-50
  warning: '#D97706',     // amber-600
  warningSoft: '#FEF3C7', // amber-50
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  overlay: 'rgba(15,23,42,0.1)',
};

export const darkColors = {
  bg: '#020617',          // slate-950
  surface: '#0F172A',     // slate-900
  surfaceAlt: '#1E293B',  // slate-800
  text: '#F8FAFC',        // slate-50
  textSecondary: '#94A3B8', // slate-400
  textMuted: '#64748B',   // slate-500
  accent: '#3377FF',      // Brighter electric blue for dark mode
  accentSoft: '#001A4D',  // Dark blue tint
  border: '#1E293B',      // slate-800
  borderLight: '#0F172A', // slate-900
  danger: '#F87171',      // red-400
  dangerSoft: '#450A0A',  // red-950
  success: '#4ADE80',     // green-400
  successSoft: '#052E16', // green-950
  warning: '#FBBF24',     // amber-400
  warningSoft: '#451A03', // amber-950
  tabBar: '#0F172A',
  tabBarBorder: '#1E293B',
  overlay: 'rgba(255,255,255,0.05)',
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
