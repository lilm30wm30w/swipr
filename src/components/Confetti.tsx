import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
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
    size: 6 + Math.random() * 8,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    rotateStart: Math.random() * 360,
    rotateEnd: Math.random() * 720 + 360,
    delay: Math.random() * 280,
    drift: (Math.random() - 0.5) * 140,
    shape: (['square', 'rect', 'circle'] as const)[Math.floor(Math.random() * 3)],
  }));
}

export default function Confetti({ active, count = 70, duration = 2600 }: Props) {
  const pieces = useMemo(() => makePieces(count), [count]);
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) {
      progress.forEach((p) => p.setValue(0));
      return;
    }
    Animated.stagger(
      12,
      progress.map((p, i) =>
        Animated.timing(p, {
          toValue: 1,
          duration: duration - pieces[i].delay,
          delay: pieces[i].delay,
          easing: Easing.bezier(0.25, 0.8, 0.35, 1),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [active]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, i) => {
        const translateY = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-80, H + 80],
        });
        const translateX = progress[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, piece.drift * 0.5, piece.drift],
        });
        const rotate = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [`${piece.rotateStart}deg`, `${piece.rotateEnd}deg`],
        });
        const opacity = progress[i].interpolate({
          inputRange: [0, 0.1, 0.9, 1],
          outputRange: [0, 1, 1, 0],
        });

        const shapeStyle =
          piece.shape === 'circle'
            ? { width: piece.size, height: piece.size, borderRadius: piece.size / 2 }
            : piece.shape === 'rect'
            ? { width: piece.size * 1.6, height: piece.size * 0.7, borderRadius: 1 }
            : { width: piece.size, height: piece.size, borderRadius: 1 };

        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              shapeStyle,
              {
                left: piece.left,
                backgroundColor: piece.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
});
