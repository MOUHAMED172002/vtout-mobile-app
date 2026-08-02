// Charte graphique Vtout (identique au site web), déclinée en clair et sombre.
export const lightColors = {
  primary: '#f37021', // orange marque
  primaryDark: '#ea580c',
  secondary: '#0054a6', // bleu marque
  secondaryDark: '#003d80',
  navy: '#001e45',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  success: '#10b981',
  danger: '#f43f5e',
  warning: '#f59e0b',
  blush: '#fdeef4',
  wine: '#6b2740',
  wineMuted: '#c98aa0',
};

export const darkColors = {
  primary: '#f37021',
  primaryDark: '#fb8b3f',
  secondary: '#3b82f6',
  secondaryDark: '#2563eb',
  navy: '#001e45',
  background: '#0b1220',
  surface: '#141b2d',
  border: '#243049',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  success: '#22c55e',
  danger: '#fb7185',
  warning: '#fbbf24',
  blush: '#241521',
  wine: '#f4c9d9',
  wineMuted: '#8a6070',
};

// Conservé pour compatibilité : équivaut à la palette claire.
export const colors = lightColors;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

export const spacing = (n) => n * 4;
