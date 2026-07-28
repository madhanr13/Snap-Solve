/**
 * Theme system for SnapSolve.
 * Provides light/dark mode with premium indigo-violet aesthetics.
 * Persists user preference to AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

// Premium Light Design Palette (Indigo & Slate)
export const lightColors = {
  bg: '#F8FAFC',          // Slate 50
  surface: '#FFFFFF',     // Pure White
  surfaceAlt: '#F1F5F9',  // Slate 100
  text: '#0F172A',        // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#64748B',   // Slate 500
  accent: '#4F46E5',      // Indigo 600
  accentSoft: '#EEF2FF',  // Indigo 50
  border: '#E2E8F0',      // Slate 200
  borderLight: '#F1F5F9', // Slate 100
  danger: '#EF4444',      // Red 500
  dangerSoft: '#FEF2F2',  // Red 50
  success: '#10B981',     // Emerald 500
  successSoft: '#ECFDF5', // Emerald 50
  warning: '#F59E0B',     // Amber 500
  warningSoft: '#FEF3C7', // Amber 50
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  overlay: 'rgba(79, 70, 229, 0.08)',
};

// Premium Dark Design Palette (Deep Navy & Indigo)
export const darkColors = {
  bg: '#0A0D18',          // Midnight Slate
  surface: '#141926',     // Rich Deep Blue-Grey
  surfaceAlt: '#1D2436',  // Lighter Deep Blue-Grey
  text: '#F8FAFC',        // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B',   // Slate 500
  accent: '#818CF8',      // Light Indigo 400
  accentSoft: '#1A1E34',  // Deep Indigo tint
  border: '#202738',      // Slate-Blue Border
  borderLight: '#141926', // Matching surface
  danger: '#F87171',      // Red 400
  dangerSoft: '#3F1A1A',  // Dark Red tint
  success: '#34D399',     // Emerald 400
  successSoft: '#12332A', // Dark Emerald tint
  warning: '#FBBF24',     // Amber 400
  warningSoft: '#3D2E14', // Dark Amber tint
  tabBar: '#101420',
  tabBarBorder: '#1D2436',
  overlay: 'rgba(129, 140, 248, 0.05)',
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
