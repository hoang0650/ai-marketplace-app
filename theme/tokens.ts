export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;

export const radius = {
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
} as const;

export const typography = {
  heading: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  subtitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.4 },
  price: { fontSize: 18, fontWeight: '800' as const, lineHeight: 24 },
};

export const lightColors = {
  text: '#1a1a1a',
  textSecondary: '#7a756d',
  background: '#f7f5f2',
  cardBackground: '#ffffff',
  surface: '#ffffff',
  mist: '#f0eeeb',
  tint: '#c9a961',
  tintText: '#111111',
  tabIconDefault: '#8a847c',
  tabIconSelected: '#c9a961',
  border: '#e5e0d8',
  success: '#3d7a4a',
  danger: '#b42318',
  warning: '#b45309',
  inputBackground: '#ffffff',
  luxDark: '#111111',
  overlay: 'rgba(17,17,17,0.45)',
};

export const darkColors = {
  text: '#f2efe8',
  textSecondary: '#a8a29a',
  background: '#0f0f0f',
  cardBackground: '#1a1a1a',
  surface: '#1a1a1a',
  mist: '#252525',
  tint: '#c9a961',
  tintText: '#111111',
  tabIconDefault: '#8a847c',
  tabIconSelected: '#c9a961',
  border: '#333333',
  success: '#4ade80',
  danger: '#f87171',
  warning: '#fbbf24',
  inputBackground: '#1a1a1a',
  luxDark: '#0a0a0a',
  overlay: 'rgba(0,0,0,0.55)',
};

export type ThemeColors = typeof lightColors;
export type ThemeMode = 'light' | 'dark' | 'system';
