import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import { haptic } from '../lib/haptics';

type HapticLevel = 'none' | 'tap' | 'press' | 'heavy' | 'selection' | 'success';

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
  const scale = useRef(new Animated.Value(1)).current;

  const fire = (level: HapticLevel) => {
    if (level === 'none') return;
    haptic[level]?.();
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: pressedScale,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
    if (!disabled) fire(hapticOnPressIn);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
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
      <Animated.View style={[{ transform: [{ scale }] }, style, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
