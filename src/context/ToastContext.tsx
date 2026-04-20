import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setToast(null));
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
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
        >
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
