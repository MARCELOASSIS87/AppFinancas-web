import { MD3DarkTheme } from 'react-native-paper';

export const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#3B82F6',
    onPrimary: '#FFFFFF',
    background: '#121212',
    surface: '#1E1E24',
    surfaceVariant: '#1E1E24',
    onSurface: '#F5F5F7',
    onSurfaceVariant: '#9CA3AF',
    outline: '#2A2A32',
    error: '#EF4444',
  },
  custom: {
    income: '#22C55E',
    expense: '#EF4444',
    textPrimary: '#F5F5F7',
    textSecondary: '#9CA3AF',
    cardBg: '#1E1E24',
  },
};
