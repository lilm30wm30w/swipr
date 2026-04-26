export const darkColors = {
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C28',
  border: '#2A2A3D',
  primary: '#8B5CF6',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',
  accent: '#C084FC',
  text: '#F5F3FF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  overlay: 'rgba(0,0,0,0.7)',
  cardGradientStart: '#1C1C28',
  cardGradientEnd: '#0A0A0F',
};

export const lightColors = {
  background: '#F5F3FF',
  surface: '#EDE9FE',
  surfaceElevated: '#FFFFFF',
  border: '#DDD6FE',
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#8B5CF6',
  accent: '#A855F7',
  text: '#1E1B4B',
  textSecondary: '#4C1D95',
  textMuted: '#7C3AED',
  success: '#059669',
  danger: '#DC2626',
  warning: '#D97706',
  overlay: 'rgba(30,27,75,0.55)',
  cardGradientStart: '#EDE9FE',
  cardGradientEnd: '#F5F3FF',
};

export type Colors = typeof darkColors;

// Default export — all existing static imports keep working (dark theme)
export const colors = darkColors;
