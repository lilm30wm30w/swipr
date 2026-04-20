import { TextStyle, Platform } from 'react-native';

const family = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  display: {
    fontFamily: family,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: family,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: family,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  subhead: {
    fontFamily: family,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: family,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  bodyEmphasis: {
    fontFamily: family,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: family,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  eyebrow: {
    fontFamily: family,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  micro: {
    fontFamily: family,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof typography;
