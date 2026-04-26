import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface Props {
  size?: number;
  animated?: boolean;
  showTrail?: boolean;
}

export default function SwiprLogo({ size = 52, animated = false, showTrail = true }: Props) {
  const trailProgress = useSharedValue(animated ? 0 : 1);
  const letterOpacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    letterOpacity.value = withTiming(1, { duration: 300 });
    trailProgress.value = withDelay(
      300,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  }, [animated]);

  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOpacity.value,
  }));

  const trailStyle = useAnimatedStyle(() => ({
    width: interpolate(trailProgress.value, [0, 1], [0, size * 2.2]),
    bottom: size * 0.12,
  }));

  return (
    <View style={[styles.wrap, { height: size * 1.4 }]}>
      <Animated.Text
        style={[
          styles.text,
          { fontSize: size, textShadowRadius: size / 4 },
          letterStyle,
        ]}
      >
        Swipr
      </Animated.Text>
      {showTrail && (
        <Animated.View style={[styles.trailRow, trailStyle]}>
          <View style={[styles.trailDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.trailLine, { backgroundColor: colors.primaryLight }]} />
          <View style={styles.trailArrow}>
            <Text style={[styles.trailArrowText, { fontSize: size * 0.4 }]}>→</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: {
    fontWeight: '900',
    color: colors.primaryLight,
    letterSpacing: -2,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
  },
  trailRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  trailDot: { width: 5, height: 2, borderRadius: 1 },
  trailLine: { flex: 1, height: 2, borderRadius: 1, opacity: 0.6 },
  trailArrow: { width: 14, alignItems: 'flex-start' },
  trailArrowText: { color: colors.primaryLight, fontWeight: '900', lineHeight: 16 },
});
