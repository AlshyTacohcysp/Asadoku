import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIGHT = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textLight: '#8E8E93',
  primary: '#4A90D9',
  secondary: '#50C878',
  grey: '#E5E5EA',
};

const DARK = {
  background: '#333333',
  surface: '#444444',
  text: '#FFFFFF',
  textLight: '#CCCCCC',
  primary: '#6DB3FF',
  secondary: '#50C878',
  grey: '#555555',
};

const ThemeContext = createContext({
  isDark: false,
  toggle: () => {},
  colors: LIGHT,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then(val => {
      if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggle = async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    await AsyncStorage.setItem('theme', newVal ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle, colors: isDark ? DARK : LIGHT }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);