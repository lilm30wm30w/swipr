import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
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
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, damping: 14, stiffness: 110, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, damping: 8, stiffness: 120, useNativeDriver: true }),
    ]).start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    float.start();

    const pulse = Animated.loop(
      Animated.stagger(800, [
        Animated.timing(ring1, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();

    return () => {
      float.stop();
      pulse.stop();
    };
  }, []);

  const floatY = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const ring1Scale = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] });
  const ring1Opacity = ring1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.25, 0] });
  const ring2Scale = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] });
  const ring2Opacity = ring2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.25, 0] });

  return (
    <Animated.View
      style={[
        compact ? styles.compactContainer : styles.container,
        { opacity: fade, transform: [{ translateY: lift }] },
      ]}
    >
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.ring,
            { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: iconScale }, { translateY: floatY }] }}>
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
  actionButton: {
    marginTop: 18,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
