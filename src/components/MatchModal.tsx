import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Modal, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import GradientView from './GradientView';
import PressableScale from './PressableScale';
import Confetti from './Confetti';
import { colors } from '../theme/colors';
import { Item, Profile } from '../types';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onChat: () => void;
  myItem: Item | null;
  theirItem: Item | null;
  theirProfile: Profile | null;
}

const SPRING_SOFT = { damping: 18, stiffness: 200 };
const SPRING_BOUNCE = { damping: 8, stiffness: 160, mass: 0.8 };

export default function MatchModal({ visible, onClose, onChat, myItem, theirItem, theirProfile }: Props) {
  const overlayOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.6);
  const titleOpacity = useSharedValue(0);
  const myItemX = useSharedValue(-width);
  const theirItemX = useSharedValue(width);
  const swapScale = useSharedValue(0);
  const swapRotate = useSharedValue(-30);
  const buttonsY = useSharedValue(40);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Phase 1: overlay
      overlayOpacity.value = withTiming(1, { duration: 200 });

      // Phase 2: title bounces in
      titleOpacity.value = withDelay(160, withTiming(1, { duration: 200 }));
      titleScale.value = withDelay(160, withSpring(1, SPRING_BOUNCE));

      // Phase 3: item cards fly in
      myItemX.value = withDelay(340, withSpring(0, SPRING_SOFT));
      theirItemX.value = withDelay(340, withSpring(0, SPRING_SOFT));

      // Phase 4: swap icon pops + spins
      swapScale.value = withDelay(520, withSpring(1, { damping: 5, stiffness: 220 }));
      swapRotate.value = withDelay(520, withSpring(0, SPRING_BOUNCE));

      // Phase 5: buttons slide up
      buttonsOpacity.value = withDelay(680, withTiming(1, { duration: 260 }));
      buttonsY.value = withDelay(680, withSpring(0, SPRING_SOFT));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 160 });
      titleScale.value = 0.6;
      titleOpacity.value = 0;
      myItemX.value = -width;
      theirItemX.value = width;
      swapScale.value = 0;
      swapRotate.value = -30;
      buttonsY.value = 40;
      buttonsOpacity.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));
  const myItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: myItemX.value }],
  }));
  const theirItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: theirItemX.value }],
  }));
  const swapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: swapScale.value }, { rotate: `${swapRotate.value}deg` }],
  }));
  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={StyleSheet.absoluteFill} />
        <GradientView colors={['rgba(139,92,246,0.28)', 'rgba(10,10,15,0.8)']} style={StyleSheet.absoluteFill} />
        <Confetti active={visible} count={80} duration={2800} />

        <View style={styles.content}>
          <Animated.View style={[{ alignItems: 'center', gap: 8 }, titleStyle]}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>It's a Match!</Text>
            <Text style={styles.subtitle}>
              You and <Text style={styles.highlight}>@{theirProfile?.username}</Text> both want to trade
            </Text>
          </Animated.View>

          <View style={styles.items}>
            <Animated.View style={[styles.itemCard, myItemStyle]}>
              {myItem?.images?.[0] ? (
                <Image source={{ uri: myItem.images[0] }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.imagePlaceholder]}>
                  <Text style={styles.placeholderIcon}>📦</Text>
                </View>
              )}
              <Text style={styles.itemTitle} numberOfLines={1}>{myItem?.title}</Text>
              <Text style={styles.itemOwner}>Your item</Text>
            </Animated.View>

            <Animated.View style={[styles.swapIcon, swapStyle]}>
              <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.swapGradient}>
                <Text style={styles.swapText}>⇄</Text>
              </GradientView>
            </Animated.View>

            <Animated.View style={[styles.itemCard, theirItemStyle]}>
              {theirItem?.images?.[0] ? (
                <Image source={{ uri: theirItem.images[0] }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.imagePlaceholder]}>
                  <Text style={styles.placeholderIcon}>📦</Text>
                </View>
              )}
              <Text style={styles.itemTitle} numberOfLines={1}>{theirItem?.title}</Text>
              <Text style={styles.itemOwner}>Their item</Text>
            </Animated.View>
          </View>

          <Animated.View style={[{ width: '100%', gap: 6 }, buttonsStyle]}>
            <PressableScale style={styles.chatButton} onPress={onChat} hapticOnPressIn="press">
              <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.chatGradient}>
                <Text style={styles.chatText}>Start Chatting 💬</Text>
              </GradientView>
            </PressableScale>

            <PressableScale onPress={onClose} style={styles.skipButton} pressedScale={0.97}>
              <Text style={styles.skipText}>Keep Swiping</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: {
    backgroundColor: 'rgba(22,20,36,0.94)',
    borderRadius: 32, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 460,
    borderWidth: 1, borderColor: `${colors.primary}66`,
    gap: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 14,
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 34, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  highlight: { color: colors.primaryLight, fontWeight: '800' },
  items: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  itemCard: { flex: 1, alignItems: 'center', gap: 6 },
  itemImage: {
    width: (width - 180) / 2, height: (width - 180) / 2,
    borderRadius: 16, borderWidth: 2, borderColor: `${colors.primary}55`,
  },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 32 },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  itemOwner: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  swapIcon: {
    width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
    shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 14, elevation: 8,
  },
  swapGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  swapText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  chatButton: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  chatGradient: { paddingVertical: 16, alignItems: 'center' },
  chatText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  skipButton: { paddingVertical: 10, alignItems: 'center' },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
