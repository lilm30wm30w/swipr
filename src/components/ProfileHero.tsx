import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 180;

export default function ProfileHero() {
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const blob3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mk = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const loops = [mk(blob1, 5200), mk(blob2, 6400), mk(blob3, 4800)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  const t1x = blob1.interpolate({ inputRange: [0, 1], outputRange: [-20, 30] });
  const t1y = blob1.interpolate({ inputRange: [0, 1], outputRange: [-10, 12] });
  const t2x = blob2.interpolate({ inputRange: [0, 1], outputRange: [20, -24] });
  const t2y = blob2.interpolate({ inputRange: [0, 1], outputRange: [10, -8] });
  const t3x = blob3.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] });
  const t3y = blob3.interpolate({ inputRange: [0, 1], outputRange: [6, -14] });

  return (
    <View style={styles.hero} pointerEvents="none">
      <View style={styles.base} />
      <Animated.View
        style={[
          styles.blob,
          styles.blobPrimary,
          { transform: [{ translateX: t1x }, { translateY: t1y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobAccent,
          { transform: [{ translateX: t2x }, { translateY: t2y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobLight,
          { transform: [{ translateX: t3x }, { translateY: t3y }] },
        ]}
      />
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
  blob: {
    position: 'absolute',
    borderRadius: 500,
  },
  blobPrimary: {
    width: 260, height: 260,
    top: -60, left: -40,
    backgroundColor: `${colors.primary}4D`,
  },
  blobAccent: {
    width: 220, height: 220,
    top: -30, right: -50,
    backgroundColor: `${colors.accent}40`,
  },
  blobLight: {
    width: 180, height: 180,
    bottom: -40,
    left: width / 2 - 90,
    backgroundColor: `${colors.primaryLight}33`,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 80,
    backgroundColor: colors.background,
    opacity: 0.55,
  },
});
