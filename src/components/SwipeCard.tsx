import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions,
  PanResponder, Animated, TouchableOpacity,
} from 'react-native';
import GradientView from './GradientView';
import { colors } from '../theme/colors';
import { Item } from '../types';
import { haptic } from '../lib/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.32;

interface Props {
  item: Item;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  onOpenDetail?: () => void;
}

export default function SwipeCard({ item, onSwipeLeft, onSwipeRight, isTop, onOpenDetail }: Props) {
  const position = useRef(new Animated.ValueXY()).current;
  const enterScale = useRef(new Animated.Value(isTop ? 1 : 0.95)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const [imageIndex, setImageIndex] = useState(0);
  const crossedRightRef = useRef(false);
  const crossedLeftRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(enterScale, { toValue: isTop ? 1 : 0.95, useNativeDriver: true, damping: 14, stiffness: 140 }),
      Animated.timing(enterOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, []);

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-18deg', '0deg', '18deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [20, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const likeScale = position.x.interpolate({
    inputRange: [20, 120],
    outputRange: [0.85, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-120, -20],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const nopeScale = position.x.interpolate({
    inputRange: [-120, -20],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: (_, g) => isTop && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderGrant: () => {
        crossedRightRef.current = false;
        crossedLeftRef.current = false;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
        if (gesture.dx > 80 && !crossedRightRef.current) {
          crossedRightRef.current = true;
          crossedLeftRef.current = false;
          haptic.soft();
        } else if (gesture.dx < -80 && !crossedLeftRef.current) {
          crossedLeftRef.current = true;
          crossedRightRef.current = false;
          haptic.soft();
        } else if (Math.abs(gesture.dx) < 40) {
          crossedRightRef.current = false;
          crossedLeftRef.current = false;
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          haptic.press();
          Animated.spring(position, {
            toValue: { x: SCREEN_WIDTH * 1.5, y: gesture.dy },
            useNativeDriver: true,
            speed: 18, bounciness: 0,
          }).start(onSwipeRight);
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          haptic.tap();
          Animated.spring(position, {
            toValue: { x: -SCREEN_WIDTH * 1.5, y: gesture.dy },
            useNativeDriver: true,
            speed: 18, bounciness: 0,
          }).start(onSwipeLeft);
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            damping: 14, stiffness: 120,
          }).start();
        }
      },
    })
  ).current;

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
      { scale: enterScale },
    ],
    opacity: enterOpacity,
  };

  const imageUri = item.images?.[imageIndex] || null;
  const conditionLabel = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' }[item.condition];

  return (
    <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          haptic.selection();
          setImageIndex((i) => (i + 1) % Math.max(item.images.length, 1));
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

        {item.images.length > 1 && (
          <View style={styles.dots}>
            {item.images.map((_, i) => (
              <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        <GradientView
          colors={['transparent', 'rgba(0,0,0,0.92)']}
          style={styles.gradient}
        />
      </TouchableOpacity>

      <Animated.View style={[styles.likeLabel, { opacity: likeOpacity, transform: [{ rotate: '-18deg' }, { scale: likeScale }] }]}>
        <Text style={styles.likeLabelText}>TRADE</Text>
      </Animated.View>
      <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity, transform: [{ rotate: '18deg' }, { scale: nopeScale }] }]}>
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
        <Text style={styles.category}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
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
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'absolute',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 10,
  },
  imageContainer: { flex: 1 },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 64 },
  dots: {
    position: 'absolute', top: 14, flexDirection: 'row',
    alignSelf: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dot: { width: 20, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  info: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  conditionBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  conditionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  category: { color: colors.primaryLight, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  ownerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  owner: { color: colors.textMuted, fontSize: 12 },
  detailHint: { color: colors.primaryLight, fontSize: 11, fontWeight: '700' },
  likeLabel: {
    position: 'absolute', top: 56, left: 24,
    borderWidth: 3, borderColor: '#10B981', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  likeLabelText: { color: '#10B981', fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  nopeLabel: {
    position: 'absolute', top: 56, right: 24,
    borderWidth: 3, borderColor: colors.danger, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  nopeLabelText: { color: colors.danger, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
});
