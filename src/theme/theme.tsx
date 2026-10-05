import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'learn.theme';

type ThemeValue = {
  palette: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

/** Sáng / Tối / Tự động — giống Cài đặt của web; lựa chọn lưu trên máy này. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      // Không đọc được kho thì dùng mặc định "Tự động" — không có gì để báo người dùng.
      .catch(() => undefined);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const resolved = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      palette: resolved === 'dark' ? dark : light,
      preference,
      setPreference: (p) => {
        setPref(p);
        AsyncStorage.setItem(KEY, p).catch(() => undefined);
      },
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme phải nằm trong <ThemeProvider>.');
  return ctx;
}

export function usePalette(): Palette {
  return useTheme().palette;
}
