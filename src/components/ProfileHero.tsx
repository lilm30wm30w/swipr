import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 180;

export default function ProfileHero() {
  const b1 = useSharedValue(0);
  const b2 = useSharedValue(0);
  const b3 = useSharedValue(0);

  useEffect(() => {
    const mkLoop = (v: ReturnType<typeof useSharedValue<number>>, duration: number) => {
      v.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false,
      );
    };
    mkLoop(b1, 5200);
    mkLoop(b2, 6400);
    mkLoop(b3, 4800);
  }, []);

  // Blob 1 (primary) — top-left
  const b1cx = useDerivedValue(() => interpolate(b1.value, [0, 1], [-40 + 130, -40 + 130 + 30]));
  const b1cy = useDerivedValue(() => interpolate(b1.value, [0, 1], [-60 + 130, -60 + 130 + 12]));

  // Blob 2 (accent) — top-right
  const b2cx = useDerivedValue(() => interpolate(b2.value, [0, 1], [width + 50 - 110, width + 50 - 110 - 24]));
  const b2cy = useDerivedValue(() => interpolate(b2.value, [0, 1], [-30 + 110, -30 + 110 - 8]));

  // Blob 3 (light) — bottom-center
  const b3cx = useDerivedValue(() => interpolate(b3.value, [0, 1], [width / 2 + 12, width / 2 + 12 + 18]));
  const b3cy = useDerivedValue(() => interpolate(b3.value, [0, 1], [HERO_HEIGHT - 40 + 90 + 6, HERO_HEIGHT - 40 + 90 - 14]));

  return (
    <View style={styles.hero} pointerEvents="none">
      <View style={styles.base} />
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={b1cx} cy={b1cy} r={130} color={`${colors.primary}4D`}>
          <BlurMask blur={28} style="normal" />
        </Circle>
        <Circle cx={b2cx} cy={b2cy} r={110} color={`${colors.accent}40`}>
          <BlurMask blur={24} style="normal" />
        </Circle>
        <Circle cx={b3cx} cy={b3cy} r={90} color={`${colors.primaryLight}33`}>
          <BlurMask blur={20} style="normal" />
        </Circle>
      </Canvas>
      <View style={styles.fadeBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.primaryDark}30`,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 80,
    backgroundColor: colors.background,
    opacity: 0.55,
  },
});
