import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import GradientView from './GradientView';
import { colors } from '../theme/colors';
import { Item } from '../types';
import { haptic } from '../lib/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.70;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.32;
const VELOCITY_THRESHOLD = 900;

interface Props {
  item: Item;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  onOpenDetail?: () => void;
}

export default function SwipeCard({ item, onSwipeLeft, onSwipeRight, isTop, onOpenDetail }: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const cardScale = useSharedValue(isTop ? 1 : 0.95);
  const enterOpacity = useSharedValue(0);
  const [imageIndex, setImageIndex] = useState(0);
  const crossedRight = useSharedValue(false);
  const crossedLeft = useSharedValue(false);

  useEffect(() => {
    enterOpacity.value = withTiming(1, { duration: 300 });
    cardScale.value = withSpring(isTop ? 1 : 0.95, { damping: 14, stiffness: 140 });
    if (isTop) {
      ty.value = 24;
      ty.value = withSpring(0, { damping: 16, stiffness: 120 });
    }
  }, [isTop]);

  const pan = Gesture.Pan()
    .enabled(isTop)
    .activeOffsetX([-6, 6])
    .onBegin(() => {
      crossedRight.value = false;
      crossedLeft.value = false;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.28;

      if (e.translationX > 80 && !crossedRight.value) {
        crossedRight.value = true;
        crossedLeft.value = false;
        runOnJS(haptic.soft)();
      } else if (e.translationX < -80 && !crossedLeft.value) {
        crossedLeft.value = true;
        crossedRight.value = false;
        runOnJS(haptic.soft)();
      } else if (Math.abs(e.translationX) < 40) {
        crossedRight.value = false;
        crossedLeft.value = false;
      }
    })
    .onEnd((e) => {
      const goRight = e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD;
      const goLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD;

      if (goRight) {
        runOnJS(haptic.press)();
        tx.value = withSpring(
          SCREEN_WIDTH * 1.6,
          { velocity: Math.max(e.velocityX, 1200), damping: 18, stiffness: 180 },
          () => runOnJS(onSwipeRight)(),
        );
        ty.value = withTiming(e.translationY, { duration: 280 });
      } else if (goLeft) {
        runOnJS(haptic.tap)();
        tx.value = withSpring(
          -SCREEN_WIDTH * 1.6,
          { velocity: Math.min(e.velocityX, -1200), damping: 18, stiffness: 180 },
          () => runOnJS(onSwipeLeft)(),
        );
        ty.value = withTiming(e.translationY, { duration: 280 });
      } else {
        tx.value = withSpring(0, { damping: 16, stiffness: 130, mass: 0.9 });
        ty.value = withSpring(0, { damping: 16, stiffness: 130, mass: 0.9 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      tx.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-18, 0, 18],
      Extrapolation.CLAMP,
    );
    const rotateY = interpolate(
      tx.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [10, 0, -10],
      Extrapolation.CLAMP,
    );
    return {
      opacity: enterOpacity.value,
      transform: [
        { perspective: 1400 },
        { translateX: tx.value },
        { translateY: ty.value },
        { rotateZ: `${rotate}deg` },
        { rotateY: `${rotateY}deg` },
        { scale: cardScale.value },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, 110], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: '-18deg' },
      { scale: interpolate(tx.value, [20, 110], [0.8, 1], Extrapolation.CLAMP) },
    ],
  }));

  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-110, -20], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '18deg' },
      { scale: interpolate(tx.value, [-110, -20], [1, 0.8], Extrapolation.CLAMP) },
    ],
  }));

  const tradeGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, 140], [0, 0.5], Extrapolation.CLAMP),
  }));

  const passGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-140, -20], [0.5, 0], Extrapolation.CLAMP),
  }));

  const itemImages = Array.isArray(item.images) ? item.images : [];
  const imageUri = itemImages[imageIndex] || null;
  const conditionLabel = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' }[item.condition] ?? 'Good';
  const categoryLabel = item.category
    ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
    : 'Other';

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            haptic.selection();
            setImageIndex((i) => (i + 1) % Math.max(itemImages.length, 1));
          }}
          style={styles.imageContainer}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderIcon}>📦</Text>
            </View>
          )}
          {itemImages.length > 1 && (
            <View style={styles.dots}>
              {itemImages.map((_, i) => (
                <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
              ))}
            </View>
          )}
          <GradientView colors={['transparent', 'rgba(0,0,0,0.94)']} style={styles.gradient} />
        </TouchableOpacity>

        {/* Direction glow overlays */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.tradeGlow, tradeGlowStyle]} pointerEvents="none" />
        <Animated.View style={[StyleSheet.absoluteFill, styles.passGlow, passGlowStyle]} pointerEvents="none" />

        {/* Stamp labels */}
        <Animated.View style={[styles.likeLabel, likeStyle]} pointerEvents="none">
          <Text style={styles.likeLabelText}>TRADE</Text>
        </Animated.View>
        <Animated.View style={[styles.nopeLabel, nopeStyle]} pointerEvents="none">
          <Text style={styles.nopeLabelText}>PASS</Text>
        </Animated.View>

        <TouchableOpacity
          style={styles.info}
          activeOpacity={0.9}
          onPress={() => { haptic.tap(); onOpenDetail?.(); }}
          accessibilityLabel={`See details for ${item.title}`}
          accessibilityRole="button"
        >
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{conditionLabel}</Text>
            </View>
          </View>
          <Text style={styles.category}>{categoryLabel}</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.ownerRow}>
            {item.profiles && (
              <Text style={styles.owner}>by @{item.profiles.username}</Text>
            )}
            {onOpenDetail ? (
              <Text style={styles.detailHint}>Tap for details →</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'absolute',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  tradeGlow: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 28,
  },
  passGlow: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 28,
  },
  imageContainer: { flex: 1 },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 64 },
  dots: {
    position: 'absolute', top: 14, flexDirection: 'row',
    alignSelf: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.38)',
  },
  dot: { width: 22, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 230 },
  info: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  conditionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  conditionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  category: { color: colors.primaryLight, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  ownerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  owner: { color: colors.textMuted, fontSize: 12 },
  detailHint: { color: colors.primaryLight, fontSize: 11, fontWeight: '700' },
  likeLabel: {
    position: 'absolute', top: 56, left: 24,
    borderWidth: 3, borderColor: '#10B981', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  likeLabelText: { color: '#10B981', fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  nopeLabel: {
    position: 'absolute', top: 56, right: 24,
    borderWidth: 3, borderColor: colors.danger, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  nopeLabelText: { color: colors.danger, fontSize: 30, fontWeight: '900', letterSpacing: 2 },
});
