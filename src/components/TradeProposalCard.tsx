import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, interpolateColor,
} from 'react-native-reanimated';
import GradientView from './GradientView';
import PressableScale from './PressableScale';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { Item, TradeProposal } from '../types';

interface Props {
  myItem: Item | null;
  theirItem: Item | null;
  proposal: TradeProposal | null;
  iAmProposer: boolean;
  matchCompleted: boolean;
  busy?: boolean;
  onPropose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onWithdraw: () => void;
}

function Thumb({ item, label }: { item: Item | null; label: string }) {
  return (
    <View style={styles.thumbWrap}>
      {item?.images?.[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={{ fontSize: 22 }}>📦</Text>
        </View>
      )}
      <Text style={styles.thumbLabel}>{label}</Text>
      <Text style={styles.thumbTitle} numberOfLines={1}>{item?.title ?? '—'}</Text>
    </View>
  );
}

export default function TradeProposalCard({
  myItem, theirItem, proposal, iAmProposer, matchCompleted, busy,
  onPropose, onAccept, onDecline, onWithdraw,
}: Props) {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (proposal?.status === 'pending') {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400 }),
          withTiming(0, { duration: 1400 }),
        ),
        -1, false,
      );
    } else {
      glow.value = 0;
    }
  }, [proposal?.status]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      glow.value,
      [0, 1],
      ['rgba(167,139,250,0.35)', 'rgba(167,139,250,0.85)'],
    ),
  }));

  const isPending = proposal?.status === 'pending';
  const status = matchCompleted ? 'completed' : proposal?.status;

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.row}>
        <Thumb item={myItem} label="You offer" />
        <View style={styles.swapIcon}>
          <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.swapGradient}>
            <Text style={styles.swapText}>⇄</Text>
          </GradientView>
        </View>
        <Thumb item={theirItem} label="You get" />
      </View>

      {status === 'completed' && (
        <View style={[styles.statusStrip, styles.statusCompleted]}>
          <Text style={styles.statusStripText}>🎉 Trade completed</Text>
        </View>
      )}

      {status === 'declined' && (
        <View style={[styles.statusStrip, styles.statusDeclined]}>
          <Text style={styles.statusStripText}>Proposal declined</Text>
        </View>
      )}

      {!matchCompleted && !proposal && (
        <PressableScale
          onPress={onPropose}
          disabled={busy}
          style={styles.cta}
          hapticOnPressIn="press"
          pressedScale={0.96}
          accessibilityLabel="Propose trade"
        >
          <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.ctaGradient}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Propose trade</Text>}
          </GradientView>
        </PressableScale>
      )}

      {!matchCompleted && isPending && iAmProposer && (
        <View style={styles.ctaRow}>
          <View style={styles.pendingPill}>
            <View style={styles.pendingDot} />
            <Text style={styles.pendingText}>Waiting for response</Text>
          </View>
          <PressableScale
            onPress={onWithdraw}
            disabled={busy}
            style={styles.withdrawBtn}
            hapticOnPressIn="tap"
            pressedScale={0.94}
          >
            <Text style={styles.withdrawText}>Withdraw</Text>
          </PressableScale>
        </View>
      )}

      {!matchCompleted && isPending && !iAmProposer && (
        <View style={styles.ctaRow}>
          <PressableScale
            onPress={onDecline}
            disabled={busy}
            style={styles.declineBtn}
            hapticOnPressIn="tap"
            pressedScale={0.95}
            accessibilityLabel="Decline trade"
          >
            <Text style={styles.declineText}>Decline</Text>
          </PressableScale>
          <PressableScale
            onPress={onAccept}
            disabled={busy}
            style={styles.acceptBtn}
            hapticOnPressIn="press"
            pressedScale={0.95}
            accessibilityLabel="Accept trade"
          >
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.acceptGradient}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept trade</Text>}
            </GradientView>
          </PressableScale>
        </View>
      )}

      {!matchCompleted && proposal?.status === 'declined' && (
        <PressableScale
          onPress={onPropose}
          disabled={busy}
          style={styles.cta}
          hapticOnPressIn="press"
          pressedScale={0.96}
        >
          <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.ctaGradient}>
            <Text style={styles.ctaText}>Propose again</Text>
          </GradientView>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(22,15,40,0.85)',
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  thumbWrap: { flex: 1, alignItems: 'center', gap: 4 },
  thumb: {
    width: 74, height: 74, borderRadius: radius.md,
    backgroundColor: 'rgba(28,28,40,0.8)',
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbLabel: { ...typography.eyebrow, color: colors.primaryLight, marginTop: 4 },
  thumbTitle: { ...typography.caption, color: colors.text, fontWeight: '700', maxWidth: 110 },
  swapIcon: { width: 40, alignItems: 'center' },
  swapGradient: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  swapText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cta: { marginTop: 4, borderRadius: radius.md, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  ctaRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: 4 },
  declineBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  declineText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  acceptBtn: { flex: 1.4, borderRadius: radius.md, overflow: 'hidden' },
  acceptGradient: { paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  pendingPill: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  pendingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
  pendingText: { color: colors.primaryLight, fontSize: 12, fontWeight: '700' },
  withdrawBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  withdrawText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  statusStrip: {
    paddingVertical: 10, borderRadius: radius.md,
    alignItems: 'center',
  },
  statusCompleted: { backgroundColor: 'rgba(16,185,129,0.18)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' },
  statusDeclined: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statusStripText: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
