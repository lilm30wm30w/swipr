import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  withDelay,
  withTiming,
  interpolate,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const { width: W, height: H } = Dimensions.get('window');

const PALETTE = [
  colors.primary,
  colors.primaryLight,
  colors.accent,
  '#FACC15',
  '#F472B6',
  '#34D399',
];

interface Props {
  active: boolean;
  count?: number;
  duration?: number;
}

interface Piece {
  left: number;
  size: number;
  color: string;
  rotateStart: number;
  rotateEnd: number;
  delay: number;
  drift: number;
  shape: 'square' | 'rect' | 'circle';
}

function makePieces(n: number): Piece[] {
  return Array.from({ length: n }, () => ({
    left: Math.random() * W,
    size: 6 + Math.random() * 10,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    rotateStart: Math.random() * 360,
    rotateEnd: Math.random() * 720 + 360,
    delay: Math.random() * 300,
    drift: (Math.random() - 0.5) * 160,
    shape: (['square', 'rect', 'circle'] as const)[Math.floor(Math.random() * 3)],
  }));
}

// Sub-component so each piece can legally call useAnimatedStyle
function ConfettiPiece({ progress, piece }: { progress: SharedValue<number>; piece: Piece }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.08, 0.88, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(p, [0, 0.5, 1], [0, piece.drift * 0.5, piece.drift]) },
        { translateY: interpolate(p, [0, 1], [-80, H + 80]) },
        { rotate: `${interpolate(p, [0, 1], [piece.rotateStart, piece.rotateEnd])}deg` },
      ],
    };
  });

  const shapeStyle =
    piece.shape === 'circle'
      ? { width: piece.size, height: piece.size, borderRadius: piece.size / 2 }
      : piece.shape === 'rect'
      ? { width: piece.size * 1.7, height: piece.size * 0.65, borderRadius: 1 }
      : { width: piece.size, height: piece.size, borderRadius: 2 };

  return (
    <Animated.View
      style={[
        styles.piece,
        shapeStyle,
        { left: piece.left, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

export default function Confetti({ active, count = 80, duration = 2800 }: Props) {
  const pieces = useMemo(() => makePieces(count), [count]);
  // makeMutable creates UI-thread shared values without being a hook
  const mutables = useRef(pieces.map(() => makeMutable(0))).current;

  useEffect(() => {
    if (!active) {
      mutables.forEach((m) => { m.value = 0; });
      return;
    }
    mutables.forEach((m, i) => {
      m.value = 0;
      m.value = withDelay(
        pieces[i].delay,
        withTiming(1, {
          duration: duration - pieces[i].delay,
          easing: Easing.bezier(0.25, 0.8, 0.35, 1),
        }),
      );
    });
  }, [active]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} progress={mutables[i]} piece={piece} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
});
