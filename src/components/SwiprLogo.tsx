import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  size?: number;
  animated?: boolean;
  showTrail?: boolean;
}

export default function SwiprLogo({ size = 52, animated = false, showTrail = true }: Props) {
  const trailWidth = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const letterOpacity = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) return;
    Animated.sequence([
      Animated.timing(letterOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(trailWidth, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [animated]);

  const trailW = trailWidth.interpolate({ inputRange: [0, 1], outputRange: [0, size * 2.2] });

  return (
    <View style={[styles.wrap, { height: size * 1.4 }]}>
      <Animated.Text
        style={[
          styles.text,
          {
            fontSize: size,
            opacity: letterOpacity,
            textShadowRadius: size / 4,
          },
        ]}
      >
        Swipr
      </Animated.Text>
      {showTrail && (
        <Animated.View style={[styles.trailRow, { width: trailW, bottom: size * 0.12 }]}>
          <View style={[styles.trailDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.trailLine, { backgroundColor: colors.primaryLight }]} />
          <View style={[styles.trailArrow]}>
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
