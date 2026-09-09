import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppPalette,
  DARK_PALETTE,
  LIGHT_PALETTE,
  ThemeMode,
} from '../constants/theme';

const STORAGE_KEY = 'theme_pref';
export type ThemePref = ThemeMode | 'system';

interface ThemeContextValue {
  /** Préférence mémorisée ('light' | 'dark' | 'system'). */
  pref: ThemePref;
  /** Résolution effective (dépend du mode système quand pref = 'system'). */
  isDark: boolean;
  colors: AppPalette;
  /** Choix explicite de l'utilisateur. */
  setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  pref: 'system',
  isDark: false,
  colors: LIGHT_PALETTE,
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  // Restaure la préférence mémorisée (avec migration de l'ancienne clé 'theme').
  useEffect(() => {
    (async () => {
      try {
        const [stockee, heritage] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem('theme'),
        ]);
        let valeur: ThemePref | null = null;
        if (stockee === 'light' || stockee === 'dark' || stockee === 'system') {
          valeur = stockee;
        } else if (heritage === 'dark' || heritage === 'light') {
          valeur = heritage;
        } else if (heritage === 'true') {
          valeur = 'dark'; // ancien format booléen
        } else if (heritage === 'false') {
          valeur = 'system';
        }
        if (valeur) {
          setPrefState(valeur);
          if (heritage !== null) {
            await AsyncStorage.setItem(STORAGE_KEY, valeur).catch(() => {});
            await AsyncStorage.removeItem('theme').catch(() => {});
          }
        }
      } catch {
        // Lecture seule : on reste sur 'system' en cas d'échec.
      }
    })();
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const isDark = pref === 'dark' || (pref === 'system' && systemScheme === 'dark');

  const value = useMemo<ThemeContextValue>(
    () => ({
      pref,
      isDark,
      colors: isDark ? DARK_PALETTE : LIGHT_PALETTE,
      setPref,
    }),
    [pref, isDark, setPref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook principal : { colors, isDark, pref, setPref }. */
export const useTheme = () => useContext(ThemeContext);

/** Raccourci pour ne récupérer que la palette. */
export function useThemeColors(): AppPalette {
  return useContext(ThemeContext).colors;
}

/**
 * Construit une feuille de styles dépendante du thème, mémoïsée.
 * `createStyles` doit être déclaré au niveau du module (référence stable).
 */
export function useAppStyles<T>(createStyles: (colors: AppPalette) => T): T {
  const colors = useThemeColors();
  // La palette a une identité stable (module-level), le useMemo est donc sûr.
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
