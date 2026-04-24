import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import GradientView from './GradientView';
import PressableScale from './PressableScale';
import { colors } from '../theme/colors';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction, compact }: Props) {
  const fade = useSharedValue(0);
  const lift = useSharedValue(20);
  const iconScale = useSharedValue(0.6);
  const iconFloat = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 360 });
    lift.value = withSpring(0, { damping: 14, stiffness: 110 });
    iconScale.value = withSpring(1, { damping: 8, stiffness: 120 });

    iconFloat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );

    // Staggered pulse rings
    ring1.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
      -1, false,
    );
    ring2.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1, false,
      ),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: lift.value }],
  }));

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { translateY: interpolate(iconFloat.value, [0, 1], [0, -6]) },
    ],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [0.6, 1.8]) }],
    opacity: interpolate(ring1.value, [0, 0.5, 1], [0.5, 0.25, 0]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [0.6, 1.8]) }],
    opacity: interpolate(ring2.value, [0, 0.5, 1], [0.5, 0.25, 0]),
  }));

  return (
    <Animated.View style={[compact ? styles.compactContainer : styles.container, containerStyle]}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.ring, ring1Style]} />
        <Animated.View style={[styles.ring, ring2Style]} />
        <Animated.View style={iconWrapStyle}>
          <GradientView colors={[`${colors.primary}44`, `${colors.primaryDark}22`]} style={styles.iconCircle}>
            <Text style={styles.icon}>{icon}</Text>
          </GradientView>
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {actionLabel && onAction ? (
        <PressableScale
          style={styles.actionButton}
          onPress={onAction}
          hapticOnPressIn="press"
          pressedScale={0.96}
        >
          <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.actionGradient}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </GradientView>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 10,
  },
  compactContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 8,
  },
  iconWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
  },
  icon: { fontSize: 44 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionButton: { marginTop: 18, borderRadius: 14, overflow: 'hidden' },
  actionGradient: { paddingHorizontal: 28, paddingVertical: 13 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});
