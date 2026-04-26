import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, Colors } from '../theme/colors';

export type ThemeMode = 'auto' | 'dark' | 'light';

function isDayTime(): boolean {
  const h = new Date().getHours();
  return h >= 7 && h < 20;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: Colors;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'auto',
  setThemeMode: () => {},
  isDark: true,
  colors: darkColors,
});

const STORAGE_KEY = '@swipr_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const val = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && (val === 'dark' || val === 'light' || val === 'auto')) {
          setThemeModeState(val);
        }
      } catch {
        // Ignore storage failures and keep the in-memory default.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
      // Keep the UI responsive even if persistence fails.
    });
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'auto' && !isDayTime());
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
