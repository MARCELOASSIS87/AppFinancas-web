import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themeDark, themeLight } from '../theme/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const esquemaSistema = useColorScheme(); // 'light' | 'dark' | null
  const [modoManual, setModoManual] = useState(null); // 'light' | 'dark' | null = segue o navegador

  useEffect(() => {
    AsyncStorage.getItem('temaModo').then((salvo) => {
      if (salvo === 'light' || salvo === 'dark') setModoManual(salvo);
    });
  }, []);

  const esquemaAtivo = modoManual || esquemaSistema || 'dark';
  const theme = esquemaAtivo === 'light' ? themeLight : themeDark;

  async function alternarTema() {
    const proximo = esquemaAtivo === 'dark' ? 'light' : 'dark';
    setModoManual(proximo);
    await AsyncStorage.setItem('temaModo', proximo);
  }

  return (
    <ThemeContext.Provider value={{ theme, esquemaAtivo, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
