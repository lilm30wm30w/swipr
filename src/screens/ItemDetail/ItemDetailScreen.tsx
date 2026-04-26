import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, Dimensions, ScrollView,
  FlatList, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { Item, MainStackParamList } from '../../types';
import { haptic } from '../../lib/haptics';

type Props = StackScreenProps<MainStackParamList, 'ItemDetail'>;

const { width } = Dimensions.get('window');
const GALLERY_HEIGHT = width * 1.05;

const CONDITION_LABEL = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' };

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [similar, setSimilar] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const scrollY = useSharedValue(0);
  const enter = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    enter.value = 0;
    enter.value = withSpring(1, { damping: 16, stiffness: 120 });
    load();
  }, [itemId]);

  async function load() {
    setLoading(true);
    setLoadError(null);

    try {
      const { data } = await supabase
        .from('items')
        .select('*, profiles(id, username, full_name, avatar_url, bio, location)')
        .eq('id', itemId)
        .single();
      if (!data) {
        setItem(null);
        setSimilar([]);
        setLoadError('Item not found');
        return;
      }

      setItem(data as Item);
      const { data: more } = await supabase
        .from('items')
        .select('id, title, images, category')
        .eq('category', data.category)
        .eq('is_available', true)
        .neq('id', data.id)
        .neq('user_id', user?.id ?? '')
        .limit(6);
      setSimilar((more as Item[]) ?? []);
    } catch {
      setItem(null);
      setSimilar([]);
      setLoadError('Unable to load this item');
    } finally {
      setLoading(false);
    }
  }

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, GALLERY_HEIGHT * 0.55, GALLERY_HEIGHT * 0.8],
      [0, 0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: interpolate(enter.value, [0, 1], [0.94, 1]) }],
  }));

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>{loadError ?? 'Item unavailable'}</Text>
          <PressableScale onPress={load} style={styles.retryBtn} pressedScale={0.96} hapticOnPressIn="tap">
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.retryGradient}>
              <Text style={styles.retryText}>Retry</Text>
            </GradientView>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.stickyHeader, headerStyle]} pointerEvents="none">
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.stickyBorder} />
        </BlurView>
        <SafeAreaView edges={['top']}>
          <Text style={styles.stickyTitle} numberOfLines={1}>{item.title}</Text>
        </SafeAreaView>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <Animated.View style={enterStyle}>
          <View style={styles.gallery}>
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={item.images ?? []}
              keyExtractor={(_, i) => `img-${i}`}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setImageIdx(idx);
                haptic.selection();
              }}
              renderItem={({ item: uri }) => (
                <Image source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
              )}
              ListEmptyComponent={
                <View style={[styles.galleryImage, styles.galleryPlaceholder]}>
                  <Text style={{ fontSize: 64 }}>📦</Text>
                </View>
              }
            />
            <GradientView
              colors={['rgba(0,0,0,0)', 'rgba(5,2,16,0.9)']}
              style={styles.galleryFade}
            />
            {item.images && item.images.length > 1 && (
              <View style={styles.galleryDots}>
                {item.images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === imageIdx && styles.dotOn]}
                  />
                ))}
              </View>
            )}
            <SafeAreaView edges={['top']} style={styles.backRow}>
              <PressableScale
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                pressedScale={0.9}
                hapticOnPressIn="tap"
                accessibilityLabel="Close item detail"
                accessibilityRole="button"
              >
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <Text style={styles.backIcon}>✕</Text>
              </PressableScale>
            </SafeAreaView>
          </View>

          <View style={styles.body}>
            <Text style={styles.eyebrow}>{item.category}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.conditionPill}>
                <Text style={styles.conditionText}>{CONDITION_LABEL[item.condition]}</Text>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : null}

            {item.profiles ? (
              <View style={styles.ownerCard}>
                {item.profiles.avatar_url ? (
                  <Image source={{ uri: item.profiles.avatar_url }} style={styles.ownerAvatar} />
                ) : (
                  <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.ownerAvatar}>
                    <Text style={styles.ownerInitial}>
                      {item.profiles.username?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </GradientView>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.ownerName}>
                    {item.profiles.full_name ?? `@${item.profiles.username}`}
                  </Text>
                  <Text style={styles.ownerHandle}>@{item.profiles.username}</Text>
                  {item.profiles.location ? (
                    <Text style={styles.ownerLocation}>📍 {item.profiles.location}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {similar.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>More in {item.category}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {similar.map((s) => (
                    <PressableScale
                      key={s.id}
                      style={styles.similarCard}
                      onPress={() => navigation.push('ItemDetail', { itemId: s.id })}
                      pressedScale={0.96}
                      hapticOnPressIn="tap"
                    >
                      {s.images?.[0] ? (
                        <Image source={{ uri: s.images[0] }} style={styles.similarImage} />
                      ) : (
                        <View style={[styles.similarImage, styles.galleryPlaceholder]}>
                          <Text style={{ fontSize: 32 }}>📦</Text>
                        </View>
                      )}
                      <Text style={styles.similarTitle} numberOfLines={1}>{s.title}</Text>
                    </PressableScale>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorState: { width: '100%', maxWidth: 320, gap: spacing.md, paddingHorizontal: spacing.lg },
  errorTitle: { ...typography.subhead, color: colors.text, textAlign: 'center' },
  retryBtn: { borderRadius: radius.md, overflow: 'hidden' },
  retryGradient: { paddingVertical: spacing.md, alignItems: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  stickyBorder: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(167,139,250,0.2)',
  },
  stickyTitle: {
    ...typography.subhead, color: colors.text,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  gallery: {
    width,
    height: GALLERY_HEIGHT,
    backgroundColor: 'rgba(28,28,40,0.6)',
  },
  galleryImage: { width, height: GALLERY_HEIGHT },
  galleryPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  galleryFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
  },
  galleryDots: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    flexDirection: 'row', gap: 6,
  },
  dot: {
    width: 22, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotOn: { backgroundColor: '#fff', width: 30 },
  backRow: {
    position: 'absolute', top: 0, left: 0,
    padding: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10,5,20,0.35)',
  },
  backIcon: { color: '#fff', fontSize: 18, fontWeight: '800' },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.primaryLight,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.title, color: colors.text, flex: 1 },
  conditionPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  conditionText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  ownerCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(28,28,40,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ownerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary,
  },
  ownerInitial: { color: '#fff', fontSize: 20, fontWeight: '800' },
  ownerName: { ...typography.subhead, color: colors.text },
  ownerHandle: { ...typography.caption, color: colors.primaryLight },
  ownerLocation: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { ...typography.headline, color: colors.text, marginTop: spacing.md },
  similarCard: { width: 140, gap: 6 },
  similarImage: {
    width: 140, height: 140, borderRadius: radius.md,
    backgroundColor: 'rgba(28,28,40,0.6)',
  },
  similarTitle: { ...typography.caption, color: colors.text, fontWeight: '700' },
});
