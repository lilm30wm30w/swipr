import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import PressableScale from './PressableScale';
import { haptic } from '../lib/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const THEMES: { mode: ThemeMode; label: string; icon: string; desc: string }[] = [
  { mode: 'auto', label: 'Auto', icon: 'A', desc: 'Background shifts with the time of day' },
  { mode: 'dark', label: 'Dark', icon: 'D', desc: 'Deep night palette, always on' },
  { mode: 'light', label: 'Light', icon: 'L', desc: 'Soft lavender palette' },
];

export default function SettingsSheet({ visible, onClose }: Props) {
  const { themeMode, setThemeMode } = useTheme();
  const slide = useSharedValue(500);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value }],
  }));

  useEffect(() => {
    slide.value = visible
      ? withSpring(0, { damping: 18, stiffness: 140 })
      : 500;
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <Animated.View style={[styles.sheet, slideStyle]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>Theme</Text>
        {THEMES.map(({ mode, label, icon, desc }) => {
          const active = themeMode === mode;
          return (
            <PressableScale
              key={mode}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => { haptic.selection(); setThemeMode(mode); }}
              hapticOnPressIn="none"
              pressedScale={0.97}
            >
              <Text style={styles.optionIcon}>{icon}</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{label}</Text>
                <Text style={styles.optionDesc}>{desc}</Text>
              </View>
              {active && <View style={styles.activeDot} />}
            </PressableScale>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#1C1C28',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 52,
    borderWidth: 1,
    borderColor: '#2A2A3D',
    gap: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#4B5563',
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#F5F3FF', marginBottom: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#13131A', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#2A2A3D',
  },
  optionActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  optionIcon: { fontSize: 20, fontWeight: '800', color: '#F5F3FF', width: 20, textAlign: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  optionLabelActive: { color: '#F5F3FF' },
  optionDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  activeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#8B5CF6',
  },
});
