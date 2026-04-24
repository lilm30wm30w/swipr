import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import GradientView from './GradientView';
import PressableScale from './PressableScale';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { haptic } from '../lib/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const INTEREST_TAGS = [
  'streetwear', 'vintage', 'sneakers', 'tech', 'gaming',
  'designer', 'workwear', 'outdoor', 'skate', 'jewelry',
  'cameras', 'music', 'books', 'art', 'collectibles',
  'minimalist', 'Y2K', 'athleisure',
];

export default function ProfileEditSheet({ visible, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [saving, setSaving] = useState(false);
  const slide = useSharedValue(600);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value }],
  }));

  useEffect(() => {
    if (visible) {
      setBio(profile?.bio ?? '');
      setLocation(profile?.location ?? '');
      setFullName(profile?.full_name ?? '');
      setInterests(profile?.interests ?? []);
      slide.value = withSpring(0, { damping: 18, stiffness: 140 });
    } else {
      slide.value = 600;
    }
  }, [visible, profile]);

  function toggle(t: string) {
    haptic.selection();
    setInterests((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    haptic.tap();
    const { error } = await supabase.from('profiles').update({
      bio: bio.trim() || null,
      location: location.trim() || null,
      full_name: fullName.trim() || null,
      interests,
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    await refreshProfile();
    haptic.success();
    toast.success('Profile updated');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <BlurView intensity={Platform.OS === 'ios' ? 30 : 80} tint="dark" style={StyleSheet.absoluteFill} />
        <PressableScale
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          pressedScale={1}
          hapticOnPressIn="none"
          accessibilityLabel="Close profile editor"
        >
          <View style={{ flex: 1 }} />
        </PressableScale>
        <Animated.View style={[styles.sheet, slideStyle]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.grabber} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
            >
              <Text style={styles.title}>Edit profile</Text>

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.area]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell others what you're into"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={160}
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Interests</Text>
              <View style={styles.tagRow}>
                {INTEREST_TAGS.map((t) => {
                  const on = interests.includes(t);
                  return (
                    <PressableScale
                      key={t}
                      onPress={() => toggle(t)}
                      style={[styles.tag, on && styles.tagOn]}
                      pressedScale={0.94}
                      hapticOnPressIn="none"
                    >
                      <Text style={[styles.tagText, on && styles.tagTextOn]}>{t}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              <PressableScale
                style={styles.cta}
                onPress={save}
                disabled={saving}
                pressedScale={0.96}
                hapticOnPressIn="none"
                accessibilityLabel="Save profile"
                accessibilityRole="button"
              >
                <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.ctaGradient}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Save</Text>}
                </GradientView>
              </PressableScale>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'rgba(15,10,30,0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center', marginTop: 10,
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  label: { ...typography.eyebrow, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: 'rgba(28,28,40,0.85)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.text, fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
  },
  area: { height: 80, textAlignVertical: 'top' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  tag: {
    paddingHorizontal: spacing.sm + 2, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(28,28,40,0.7)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)',
  },
  tagOn: { backgroundColor: colors.primary, borderColor: colors.primaryLight },
  tagText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  tagTextOn: { color: '#fff' },
  cta: { marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  ctaGradient: { paddingVertical: spacing.md, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
