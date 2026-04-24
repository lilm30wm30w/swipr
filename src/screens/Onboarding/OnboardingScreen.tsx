import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { haptic } from '../../lib/haptics';

const INTEREST_TAGS = [
  'streetwear', 'vintage', 'sneakers', 'tech', 'gaming',
  'designer', 'workwear', 'outdoor', 'skate', 'jewelry',
  'cameras', 'music', 'books', 'art', 'collectibles',
  'minimalist', 'Y2K', 'athleisure',
];

const TOTAL_STEPS = 2;

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const slideY = useSharedValue(24);
  const slideOpacity = useSharedValue(0);

  useEffect(() => {
    slideY.value = 24;
    slideOpacity.value = 0;
    slideY.value = withSpring(0, { damping: 14, stiffness: 120 });
    slideOpacity.value = withSpring(1, { damping: 18, stiffness: 160 });
  }, [step]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: slideOpacity.value,
  }));

  function toggleInterest(tag: string) {
    haptic.selection();
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    haptic.success();
    const { error } = await supabase
      .from('profiles')
      .update({
        interests,
        location: location.trim() || null,
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Something went wrong');
      setSaving(false);
      return;
    }
    await refreshProfile();
    toast.success("You're in — let's find you a trade");
    setSaving(false);
  }

  function next() {
    haptic.tap();
    if (step === 0 && interests.length < 2) {
      toast.info('Pick at least 2 vibes');
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    haptic.tap();
    setStep((s) => Math.max(0, s - 1));
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSeg,
                i <= step && styles.progressSegActive,
              ]}
            />
          ))}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={slideStyle}>
            {step === 0 && (
              <>
                <Text style={styles.eyebrow}>Step 1 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>What are you into?</Text>
                <Text style={styles.subtitle}>
                  Pick a few vibes — we'll tune your feed so you see stuff worth trading.
                </Text>
                <View style={styles.tagGrid}>
                  {INTEREST_TAGS.map((tag) => {
                    const on = interests.includes(tag);
                    return (
                      <PressableScale
                        key={tag}
                        style={[styles.tag, on && styles.tagOn]}
                        onPress={() => toggleInterest(tag)}
                        pressedScale={0.94}
                        hapticOnPressIn="none"
                        accessibilityLabel={`${on ? 'Remove' : 'Add'} ${tag} interest`}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.tagText, on && styles.tagTextOn]}>{tag}</Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </>
            )}

            {step === 1 && (
              <>
                <Text style={styles.eyebrow}>Step 2 of {TOTAL_STEPS}</Text>
                <Text style={styles.title}>Where are you?</Text>
                <Text style={styles.subtitle}>
                  We'll surface trades near you first. Rough city is fine.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Brooklyn, NY"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                  autoCapitalize="words"
                  accessibilityLabel="Your location"
                />
                <Text style={styles.hint}>You can change this anytime in profile.</Text>
              </>
            )}

            <View style={styles.actions}>
              <PressableScale
                style={styles.cta}
                onPress={isLastStep ? finish : next}
                pressedScale={0.96}
                hapticOnPressIn="none"
                disabled={saving}
                accessibilityLabel={isLastStep ? 'Finish onboarding' : 'Continue to next step'}
                accessibilityRole="button"
              >
                <GradientView
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.ctaGradient}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.ctaText}>{isLastStep ? 'Finish' : 'Continue'}</Text>}
                </GradientView>
              </PressableScale>

              {step > 0 && (
                <PressableScale
                  onPress={back}
                  style={styles.backBtn}
                  pressedScale={0.96}
                  hapticOnPressIn="none"
                  accessibilityLabel="Go back"
                >
                  <Text style={styles.backText}>Back</Text>
                </PressableScale>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  progressBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressSegActive: {
    backgroundColor: colors.primaryLight,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(28,28,40,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
  },
  tagOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  tagText: { ...typography.bodyEmphasis, color: colors.textSecondary },
  tagTextOn: { color: '#fff' },
  input: {
    backgroundColor: 'rgba(28,28,40,0.85)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  cta: { borderRadius: radius.lg, overflow: 'hidden' },
  ctaGradient: { paddingVertical: spacing.md + 2, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  backBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  backText: { ...typography.bodyEmphasis, color: colors.textSecondary },
});
