import React, { useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions, TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { Item } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

interface Props {
  item: Item;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}

export default function SwipeCard({ item, onSwipeLeft, onSwipeRight, isTop }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [imageIndex, setImageIndex] = React.useState(0);

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-20, 0, 20], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, 100], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-100, -20], [1, 0], Extrapolation.CLAMP),
  }));

  const imageUri = item.images?.[imageIndex] || null;
  const conditionLabel = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' }[item.condition];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setImageIndex((i) => (i + 1) % Math.max(item.images.length, 1))}
          style={styles.imageContainer}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderIcon}>📦</Text>
            </View>
          )}

          {/* Image dots */}
          {item.images.length > 1 && (
            <View style={styles.dots}>
              {item.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.gradient}
          />
        </TouchableOpacity>

        {/* LIKE / NOPE overlays */}
        <Animated.View style={[styles.likeLabel, likeOpacity]}>
          <Text style={styles.likeLabelText}>TRADE</Text>
        </Animated.View>
        <Animated.View style={[styles.nopeLabel, nopeOpacity]}>
          <Text style={styles.nopeLabelText}>PASS</Text>
        </Animated.View>

        <View style={styles.info}>
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
          {item.profiles && (
            <Text style={styles.owner}>by @{item.profiles.username}</Text>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'absolute',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: { flex: 1 },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 64 },
  dots: { position: 'absolute', top: 12, flexDirection: 'row', alignSelf: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: colors.primary },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text },
  conditionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  conditionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  category: { color: colors.primaryLight, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  owner: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  likeLabel: {
    position: 'absolute',
    top: 50,
    left: 20,
    borderWidth: 3,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '-20deg' }],
  },
  likeLabelText: { color: '#10B981', fontSize: 28, fontWeight: '900' },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    right: 20,
    borderWidth: 3,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '20deg' }],
  },
  nopeLabelText: { color: colors.danger, fontSize: 28, fontWeight: '900' },
});
