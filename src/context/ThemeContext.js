import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, radius, spacing } from '../theme/colors';

const STORAGE_KEY = 'vtout_theme_preference'; // 'light' | 'dark' | 'system'

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState('system');
  const [mode, setMode] = useState(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreference(saved);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    const resolve = (systemScheme) => {
      if (preference === 'system') {
        setMode(systemScheme === 'dark' ? 'dark' : 'light');
      } else {
        setMode(preference);
      }
    };
    resolve(Appearance.getColorScheme());
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (preference === 'system') resolve(colorScheme);
    });
    return () => sub.remove();
  }, [preference]);

  const setThemePreference = async (next) => {
    setPreference(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const toggleTheme = () => setThemePreference(mode === 'dark' ? 'light' : 'dark');

  const value = useMemo(() => ({
    mode,
    preference,
    colors: mode === 'dark' ? darkColors : lightColors,
    radius,
    spacing,
    setThemePreference,
    toggleTheme,
  }), [mode, preference]);

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  return ctx;
}
