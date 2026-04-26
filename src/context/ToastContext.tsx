import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';
import { haptic } from '../lib/haptics';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToast({ id, type, message });
    if (type === 'success') haptic.success();
    else if (type === 'error') haptic.error();
    else haptic.tap();
  }, []);

  const success = useCallback((m: string) => show(m, 'success'), [show]);
  const error = useCallback((m: string) => show(m, 'error'), [show]);
  const info = useCallback((m: string) => show(m, 'info'), [show]);

  useEffect(() => {
    if (!toast) return;

    translateY.value = -20;
    opacity.value = 0;
    translateY.value = withSpring(0, { damping: 14 });
    opacity.value = withTiming(1, { duration: 180 });

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      translateY.value = withTiming(-20, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        'worklet';
        if (finished) runOnJS(setToast)(null);
      });
    }, 2400);

    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [toast]);

  const borderColor =
    toast?.type === 'success' ? colors.success :
    toast?.type === 'error' ? colors.danger :
    colors.primary;

  const icon =
    toast?.type === 'success' ? '✓' :
    toast?.type === 'error' ? '✕' : 'ⓘ';

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" style={[styles.wrap, toastStyle]}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 80}
            tint="dark"
            style={[styles.toast, { borderColor }]}
          >
            <View style={[styles.iconBadge, { backgroundColor: borderColor }]}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
          </BlurView>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(20,20,28,0.85)',
    overflow: 'hidden',
    maxWidth: 460,
    width: '100%',
  },
  iconBadge: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  iconText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  message: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500', lineHeight: 19 },
});
