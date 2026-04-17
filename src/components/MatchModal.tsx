import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSpring(1);
      scale.value = withDelay(100, withSpring(1, { damping: 12 }));
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, containerStyle]}>
        <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(10,10,15,0.98)']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>It's a Match!</Text>
          <Text style={styles.subtitle}>
            You and <Text style={styles.highlight}>@{theirProfile?.username}</Text> both want to trade!
          </Text>

          <View style={styles.items}>
            <View style={styles.itemCard}>
              {myItem?.images?.[0] ? (
                <Image source={{ uri: myItem.images[0] }} style={styles.itemImage} />
              ) : <View style={[styles.itemImage, styles.imagePlaceholder]}><Text style={styles.placeholderIcon}>📦</Text></View>}
              <Text style={styles.itemTitle} numberOfLines={1}>{myItem?.title}</Text>
              <Text style={styles.itemOwner}>Your item</Text>
            </View>

            <View style={styles.swapIcon}>
              <Text style={styles.swapText}>⇄</Text>
            </View>

            <View style={styles.itemCard}>
              {theirItem?.images?.[0] ? (
                <Image source={{ uri: theirItem.images[0] }} style={styles.itemImage} />
              ) : <View style={[styles.itemImage, styles.imagePlaceholder]}><Text style={styles.placeholderIcon}>📦</Text></View>}
              <Text style={styles.itemTitle} numberOfLines={1}>{theirItem?.title}</Text>
              <Text style={styles.itemOwner}>Their item</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.chatButton} onPress={onChat}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.chatGradient}>
              <Text style={styles.chatText}>Start Chatting 💬</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.skipButton}>
            <Text style={styles.skipText}>Keep Swiping</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 16,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 32, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  highlight: { color: colors.primaryLight, fontWeight: '700' },
  items: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  itemCard: { flex: 1, alignItems: 'center', gap: 8 },
  itemImage: { width: (width - 160) / 2, height: (width - 160) / 2, borderRadius: 14 },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 32 },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  itemOwner: { color: colors.textMuted, fontSize: 11 },
  swapIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  swapText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatButton: { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  chatGradient: { paddingVertical: 16, alignItems: 'center' },
  chatText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipButton: { paddingVertical: 8 },
  skipText: { color: colors.textSecondary, fontSize: 15 },
});
