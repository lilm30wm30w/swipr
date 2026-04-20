import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import GradientView from './GradientView';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { Achievement } from '../types';
import { ACHIEVEMENT_META, AchievementType } from '../lib/achievements';

interface Props { userId: string | undefined }

export default function AchievementsRow({ userId }: Props) {
  const [earned, setEarned] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });
      if (data) setEarned(data);
    })();
  }, [userId]);

  const earnedTypes = new Set(earned.map((a) => a.type));
  const allTypes = Object.keys(ACHIEVEMENT_META) as AchievementType[];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.count}>{earned.length} / {allTypes.length}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {allTypes.map((t) => {
          const meta = ACHIEVEMENT_META[t];
          const unlocked = earnedTypes.has(t);
          return (
            <View key={t} style={[styles.tile, !unlocked && styles.locked]}>
              {unlocked ? (
                <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.iconBubble}>
                  <Text style={styles.icon}>{meta.icon}</Text>
                </GradientView>
              ) : (
                <View style={[styles.iconBubble, styles.iconBubbleLocked]}>
                  <Text style={[styles.icon, styles.iconLocked]}>{meta.icon}</Text>
                </View>
              )}
              <Text style={[styles.label, !unlocked && styles.labelLocked]}>{meta.label}</Text>
              <Text style={styles.caption} numberOfLines={2}>{meta.caption}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { ...typography.headline, color: colors.text },
  count: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  row: { gap: spacing.sm, paddingRight: spacing.md },
  tile: {
    width: 120,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(28,28,40,0.75)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    gap: 4,
    alignItems: 'center',
  },
  locked: {
    backgroundColor: 'rgba(22,22,32,0.5)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBubble: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  iconBubbleLocked: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  icon: { fontSize: 22 },
  iconLocked: { opacity: 0.35 },
  label: { ...typography.caption, color: colors.text, fontWeight: '800', textAlign: 'center' },
  labelLocked: { color: colors.textMuted },
  caption: { ...typography.micro, color: colors.textMuted, textAlign: 'center', lineHeight: 13 },
});
