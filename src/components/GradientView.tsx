import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  colors: readonly string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
}

export default function GradientView({
  colors,
  style,
  children,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  locations,
}: Props) {
  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      start={start}
      end={end}
      locations={locations as number[] | undefined}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
