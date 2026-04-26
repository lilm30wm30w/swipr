import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import PressableScale from './PressableScale';
import { haptic } from '../lib/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
}

const THEMES: { mode: ThemeMode; label: string; icon: string; desc: string }[] = [
  { mode: 'auto', label: 'Auto', icon: 'A', desc: 'Background shifts with the time of day' },
  { mode: 'dark', label: 'Dark', icon: 'D', desc: 'Deep night palette, always on' },
  { mode: 'light', label: 'Light', icon: 'L', desc: 'Soft lavender palette' },
];

type NotificationPrefs = {
  matches: boolean;
  messages: boolean;
  trades: boolean;
};

const NOTIFICATION_PREFS_KEY = '@swipr_notification_prefs';
const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  matches: true,
  messages: true,
  trades: true,
};

export default function SettingsSheet({ visible, onClose, onEditProfile, onSignOut }: Props) {
  const { themeMode, setThemeMode } = useTheme();
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const slide = useSharedValue(500);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value }],
  }));

  useEffect(() => {
    slide.value = visible
      ? withSpring(0, { damping: 18, stiffness: 140 })
      : 500;
  }, [visible]);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(NOTIFICATION_PREFS_KEY)
      .then((value) => {
        if (!active || !value) return;
        const parsed = JSON.parse(value) as Partial<NotificationPrefs>;
        setNotificationPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...parsed });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  function updateNotificationPref(key: keyof NotificationPrefs, value: boolean) {
    haptic.selection();
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next)).catch(() => {});
  }

  function openProfileEditor() {
    haptic.tap();
    onClose();
    requestAnimationFrame(onEditProfile);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <Animated.View style={[styles.sheet, slideStyle]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Settings</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>Account</Text>
          <PressableScale
            style={styles.option}
            onPress={openProfileEditor}
            hapticOnPressIn="none"
            pressedScale={0.97}
          >
            <Text style={styles.optionIcon}>@</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Edit profile</Text>
              <Text style={styles.optionDesc}>Name, bio, location, interests</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </PressableScale>

          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>New matches</Text>
              <Text style={styles.optionDesc}>Show in-app match alerts</Text>
            </View>
            <Switch
              value={notificationPrefs.matches}
              onValueChange={(value) => updateNotificationPref('matches', value)}
              trackColor={{ false: '#374151', true: '#7C3AED' }}
              thumbColor="#F5F3FF"
            />
          </View>
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Messages</Text>
              <Text style={styles.optionDesc}>Keep chat alerts enabled</Text>
            </View>
            <Switch
              value={notificationPrefs.messages}
              onValueChange={(value) => updateNotificationPref('messages', value)}
              trackColor={{ false: '#374151', true: '#7C3AED' }}
              thumbColor="#F5F3FF"
            />
          </View>
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Trade updates</Text>
              <Text style={styles.optionDesc}>Proposal and completion alerts</Text>
            </View>
            <Switch
              value={notificationPrefs.trades}
              onValueChange={(value) => updateNotificationPref('trades', value)}
              trackColor={{ false: '#374151', true: '#7C3AED' }}
              thumbColor="#F5F3FF"
            />
          </View>
          <View style={[styles.option, styles.optionDisabled]}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Push notifications</Text>
              <Text style={styles.optionDesc}>Requires the push setup that is not merged into this build</Text>
            </View>
            <Text style={styles.statusPill}>Soon</Text>
          </View>

          <Text style={styles.sectionLabel}>Appearance</Text>
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

          <Text style={styles.sectionLabel}>Support</Text>
          <View style={[styles.option, styles.optionDisabled]}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Privacy and safety</Text>
              <Text style={styles.optionDesc}>Block, report, and account controls are planned next</Text>
            </View>
            <Text style={styles.statusPill}>Soon</Text>
          </View>

          <PressableScale
            style={[styles.option, styles.signOutOption]}
            onPress={() => { haptic.warning(); onSignOut(); }}
            hapticOnPressIn="none"
            pressedScale={0.97}
          >
            <View style={styles.optionText}>
              <Text style={styles.signOutText}>Sign out</Text>
            </View>
          </PressableScale>
        </ScrollView>
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
    paddingBottom: 0,
    borderWidth: 1,
    borderColor: '#2A2A3D',
    maxHeight: '88%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#4B5563',
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#F5F3FF', marginBottom: 4 },
  content: { gap: 12, paddingBottom: 52 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 6,
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
  optionDisabled: { opacity: 0.68 },
  optionIcon: { fontSize: 20, fontWeight: '800', color: '#F5F3FF', width: 20, textAlign: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  optionLabelActive: { color: '#F5F3FF' },
  optionDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chevron: { color: '#6B7280', fontSize: 24, fontWeight: '700' },
  statusPill: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    backgroundColor: 'rgba(139,92,246,0.16)',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#8B5CF6',
  },
  signOutOption: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(127,29,29,0.16)' },
  signOutText: { fontSize: 16, fontWeight: '800', color: '#FCA5A5', textAlign: 'center' },
});
