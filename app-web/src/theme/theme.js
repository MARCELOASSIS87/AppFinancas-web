import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const themeDark = {
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
    ripple: 'rgba(255,255,255,0.08)',
  },
};

export const themeLight = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
    onPrimary: '#FFFFFF',
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F2F4',
    onSurface: '#111827',
    onSurfaceVariant: '#6B7280',
    outline: '#E2E4E8',
    error: '#DC2626',
  },
  custom: {
    income: '#16A34A',
    expense: '#DC2626',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    cardBg: '#FFFFFF',
    ripple: 'rgba(0,0,0,0.06)',
  },
};

// Mantido para quem ainda importa `theme` direto (equivale ao escuro).
export const theme = themeDark;
