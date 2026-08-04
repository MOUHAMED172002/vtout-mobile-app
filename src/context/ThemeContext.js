import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, retroColors, valentineColors, radius, spacing } from '../theme/colors';

const STORAGE_KEY = 'vtout_theme_preference'; // 'system' | 'light' | 'dark' | 'retro' | 'valentine'

// Mêmes univers visuels que le site web (light / dark / retro / valentine).
export const THEMES = {
  light: { key: 'light', label: 'Clair', icon: 'sunny-outline', base: 'light', colors: lightColors },
  dark: { key: 'dark', label: 'Sombre', icon: 'moon-outline', base: 'dark', colors: darkColors },
  retro: { key: 'retro', label: 'Rétro', icon: 'film-outline', base: 'light', colors: retroColors },
  valentine: { key: 'valentine', label: 'Saint-Valentin', icon: 'heart-outline', base: 'light', colors: valentineColors },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState('system');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'system' || THEMES[saved]) {
          setPreference(saved);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const setThemePreference = async (next) => {
    setPreference(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const themeKey = preference === 'system' ? systemScheme : preference;
  const activeTheme = THEMES[themeKey] || THEMES.light;

  const toggleTheme = () => setThemePreference(activeTheme.base === 'dark' ? 'light' : 'dark');

  const value = useMemo(() => ({
    mode: activeTheme.base, // 'light' | 'dark' — pour StatusBar / thème de navigation
    themeKey, // 'light' | 'dark' | 'retro' | 'valentine' — univers visuel actif
    preference, // 'system' | 'light' | 'dark' | 'retro' | 'valentine'
    colors: activeTheme.colors,
    themes: THEMES,
    radius,
    spacing,
    setThemePreference,
    toggleTheme,
  }), [activeTheme, themeKey, preference]);

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  return ctx;
}
