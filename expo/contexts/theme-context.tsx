import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';

const THEME_KEY = 'hockey_theme_mode';

export interface ThemeColors {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSec: string;
  textTer: string;
  border: string;
  accent: string;
  positive: string;
  negative: string;
  warning: string;
}

const DARK: ThemeColors = {
  bg: '#0a0e1a',
  card: '#12162a',
  cardAlt: '#1a1e32',
  text: '#e8eaed',
  textSec: '#8e8e93',
  textTer: '#636366',
  border: '#1a1e32',
  accent: '#0af',
  positive: '#4cd964',
  negative: '#ff375f',
  warning: '#ffcc00',
};

const LIGHT: ThemeColors = {
  bg: '#f2f2f7',
  card: '#ffffff',
  cardAlt: '#e8e8ed',
  text: '#1c1c1e',
  textSec: '#6c6c70',
  textTer: '#aeaeb2',
  border: '#d1d1d6',
  accent: '#007AFF',
  positive: '#34C759',
  negative: '#FF3B30',
  warning: '#FF9500',
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'light') setIsDark(false);
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const colors = useMemo((): ThemeColors => (isDark ? DARK : LIGHT), [isDark]);

  return useMemo(() => ({ isDark, toggleTheme, colors }), [isDark, toggleTheme, colors]);
});
