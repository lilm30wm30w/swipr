import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Modal, Dimensions, Animated, Platform, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
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

export default function MatchModal({ visible, onClose, onChat, myItem, theirItem, theirProfile }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.7)).current;
  const myItemX = useRef(new Animated.Value(-width)).current;
  const theirItemX = useRef(new Animated.Value(width)).current;
  const swapScale = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(40)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(titleScale, { toValue: 1, damping: 9, stiffness: 140, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(myItemX, { toValue: 0, damping: 14, stiffness: 110, useNativeDriver: true }),
          Animated.spring(theirItemX, { toValue: 0, damping: 14, stiffness: 110, useNativeDriver: true }),
        ]),
        Animated.spring(swapScale, { toValue: 1, damping: 6, stiffness: 200, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(buttonsY, { toValue: 0, damping: 14, useNativeDriver: true }),
          Animated.timing(buttonsOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      titleOpacity.setValue(0);
      titleScale.setValue(0.7);
      myItemX.setValue(-width);
      theirItemX.setValue(width);
      swapScale.setValue(0);
      buttonsY.setValue(40);
      buttonsOpacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={StyleSheet.absoluteFill} />
        <GradientView colors={['rgba(139,92,246,0.25)', 'rgba(10,10,15,0.75)']} style={StyleSheet.absoluteFill} />
        <Confetti active={visible} count={80} duration={2800} />

        <View style={styles.content}>
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>It's a Match!</Text>
            <Text style={styles.subtitle}>
              You and <Text style={styles.highlight}>@{theirProfile?.username}</Text> both want to trade
            </Text>
          </Animated.View>

          <View style={styles.items}>
            <Animated.View style={[styles.itemCard, { transform: [{ translateX: myItemX }] }]}>
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

            <Animated.View style={[styles.swapIcon, { transform: [{ scale: swapScale }] }]}>
              <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.swapGradient}>
                <Text style={styles.swapText}>⇄</Text>
              </GradientView>
            </Animated.View>

            <Animated.View style={[styles.itemCard, { transform: [{ translateX: theirItemX }] }]}>
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

          <Animated.View
            style={{ width: '100%', gap: 6, opacity: buttonsOpacity, transform: [{ translateY: buttonsY }] }}
          >
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
    backgroundColor: 'rgba(28,28,40,0.92)',
    borderRadius: 32, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 460,
    borderWidth: 1, borderColor: `${colors.primary}66`,
    gap: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: 34, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  highlight: { color: colors.primaryLight, fontWeight: '800' },
  items: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  itemCard: { flex: 1, alignItems: 'center', gap: 6 },
  itemImage: {
    width: (width - 180) / 2, height: (width - 180) / 2,
    borderRadius: 16,
    borderWidth: 2, borderColor: `${colors.primary}55`,
  },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 32 },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  itemOwner: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  swapIcon: {
    width: 42, height: 42, borderRadius: 21, overflow: 'hidden',
    shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 12, elevation: 6,
  },
  swapGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  swapText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  chatButton: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  chatGradient: { paddingVertical: 16, alignItems: 'center' },
  chatText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  skipButton: { paddingVertical: 10, alignItems: 'center' },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
