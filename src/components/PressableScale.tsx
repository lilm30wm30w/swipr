import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { haptic } from '../lib/haptics';

type HapticLevel = 'none' | 'tap' | 'press' | 'heavy' | 'selection' | 'success' | 'soft' | 'warning' | 'match';

interface Props extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  hapticOnPress?: HapticLevel;
  hapticOnPressIn?: HapticLevel;
}

export default function PressableScale({
  children,
  style,
  pressedScale = 0.96,
  hapticOnPress = 'none',
  hapticOnPressIn = 'tap',
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  // Subtle brightness flash on press (no Skia needed)
  const flash = useSharedValue(0);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(flash.value, [0, 1], [1, 0.88]),
  }));

  const fire = (level: HapticLevel) => {
    if (level === 'none') return;
    haptic[level]?.();
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withSpring(pressedScale, { damping: 12, stiffness: 440, mass: 0.5 });
    flash.value = withTiming(1, { duration: 60 });
    if (!disabled) fire(hapticOnPressIn);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 10, stiffness: 320, mass: 0.65 });
    flash.value = withTiming(0, { duration: 180 });
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (!disabled) fire(hapticOnPress);
    onPress?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[scaleStyle, style, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
