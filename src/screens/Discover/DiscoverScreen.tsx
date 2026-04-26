import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import PressableScale from '../../components/PressableScale';
import SwiprLogo from '../../components/SwiprLogo';
import { useAuth } from '../../context/AuthContext';
import { useMatches } from '../../context/MatchesContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Item, Match } from '../../types';
import SwipeCard from '../../components/SwipeCard';
import MatchModal from '../../components/MatchModal';
import { SwipeCardSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { haptic } from '../../lib/haptics';
import { currentGreeting } from '../../lib/greeting';
import { grantAchievement } from '../../lib/achievements';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../types';

type Props = { navigation: StackNavigationProp<MainStackParamList, 'Tabs'> };

const CATEGORIES = ['All', 'Clothes', 'Shoes', 'Gadgets', 'Accessories', 'Other'];

// Isolated sub-component so useAnimatedStyle is called legally (not inside a conditional)
function UndoPill({ undoAnim, onUndo }: { undoAnim: SharedValue<number>; onUndo: () => void }) {
  const style = useAnimatedStyle(() => ({
    opacity: undoAnim.value,
    transform: [{ translateY: interpolate(undoAnim.value, [0, 1], [14, 0]) }],
  }));
  return (
    <Animated.View pointerEvents="box-none" style={[undoWrapStyle.wrap, style]}>
      <PressableScale style={undoWrapStyle.pill} onPress={onUndo} hapticOnPressIn="soft" pressedScale={0.94}>
        <Text style={undoWrapStyle.icon}>↶</Text>
        <Text style={undoWrapStyle.text}>Undo</Text>
      </PressableScale>
    </Animated.View>
  );
}

const undoWrapStyle = StyleSheet.create({
  wrap: { alignItems: 'center', paddingBottom: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#13131A', borderWidth: 1, borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  icon: { color: '#A78BFA', fontSize: 16, fontWeight: '800' },
  text: { color: '#A78BFA', fontSize: 14, fontWeight: '700' },
});

export default function DiscoverScreen({ navigation }: Props) {
  const { user, profile } = useAuth();
  const { latestNewMatch, clearLatestNewMatch } = useMatches();
  const toast = useToast();
  const greeting = currentGreeting();
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [matchModal, setMatchModal] = useState<{ visible: boolean; match: Match | null }>({ visible: false, match: null });
  const [undoVisible, setUndoVisible] = useState(false);
  const lastSwipeRef = useRef<{ swipeId: string; direction: 'left' | 'right' } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoAnim = useSharedValue(0);

  useEffect(() => { fetchItems(); }, [selectedCategory]);

  useEffect(() => {
    undoAnim.value = withSpring(undoVisible ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [undoVisible]);

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  useEffect(() => {
    if (!latestNewMatch || !user) return;
    let cancelled = false;
    (async () => {
      const isUser1 = latestNewMatch.user1_id === user.id;
      const otherUserId = isUser1 ? latestNewMatch.user2_id : latestNewMatch.user1_id;
      const myItemId = isUser1 ? latestNewMatch.item1_id : latestNewMatch.item2_id;
      const theirItemId = isUser1 ? latestNewMatch.item2_id : latestNewMatch.item1_id;

      const [{ data: theirProfile }, { data: myItem }, { data: theirItem }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherUserId).single(),
        supabase.from('items').select('*').eq('id', myItemId).single(),
        supabase.from('items').select('*').eq('id', theirItemId).single(),
      ]);
      if (cancelled) return;
      haptic.match();
      setMatchModal({
        visible: true,
        match: { ...latestNewMatch, other_profile: theirProfile ?? undefined, my_item: myItem ?? undefined, other_item: theirItem ?? undefined },
      });
      grantAchievement(user.id, 'first_match');
      clearLatestNewMatch();
    })();
    return () => { cancelled = true; };
  }, [latestNewMatch, user, clearLatestNewMatch]);

  async function fetchItems() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('discover_feed', {
        p_category: selectedCategory === 'All' ? null : selectedCategory.toLowerCase(),
        p_limit: 50,
      });

      if (error) {
        throw error;
      }

      const rawItems = (data ?? []).map((item: any) => ({
        id: String(item.id),
        user_id: String(item.user_id),
        title: typeof item.title === 'string' && item.title.trim().length > 0 ? item.title : 'Untitled item',
        description: typeof item.description === 'string' ? item.description : null,
        category: typeof item.category === 'string' && item.category.length > 0 ? item.category : 'other',
        condition:
          item.condition === 'new' || item.condition === 'like_new' || item.condition === 'good' || item.condition === 'fair'
            ? item.condition
            : 'good',
        images: Array.isArray(item.images) ? item.images.filter((image: unknown): image is string => typeof image === 'string' && image.length > 0) : [],
        is_available: item.is_available !== false,
        created_at: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
        profiles: item.profile_id
          ? {
              id: String(item.profile_id),
              username: typeof item.profile_username === 'string' ? item.profile_username : 'unknown',
              full_name: typeof item.profile_full_name === 'string' ? item.profile_full_name : null,
              avatar_url: typeof item.profile_avatar_url === 'string' ? item.profile_avatar_url : null,
            }
          : undefined,
      }));
      const tags = (profile?.interests ?? []).map((t) => t.toLowerCase());
      const ranked = tags.length > 0
        ? [...rawItems].sort((a, b) => {
            const score = (it: Item) => {
              const hay = `${it.title ?? ''} ${it.description ?? ''}`.toLowerCase();
              return tags.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
            };
            return score(b) - score(a);
          })
        : rawItems;

      setItems(ranked as Item[]);
      setCurrentIndex(0);
    } catch {
      setItems([]);
      setCurrentIndex(0);
      toast.error('Unable to load listings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSwipe(direction: 'left' | 'right') {
    const item = items[currentIndex];
    if (!item || !user) return;
    const { data } = await supabase
      .from('swipes')
      .insert({ swiper_id: user.id, item_id: item.id, direction })
      .select('id')
      .single();

    if (data?.id) {
      lastSwipeRef.current = { swipeId: data.id, direction };
      setUndoVisible(true);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => {
        setUndoVisible(false);
        lastSwipeRef.current = null;
      }, 5000);
    }

    setCurrentIndex((i) => i + 1);

    const { count } = await supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('swiper_id', user.id);
    if (count !== null) {
      if (count >= 10) grantAchievement(user.id, 'ten_swipes');
      if (count >= 50) grantAchievement(user.id, 'fifty_swipes');
    }
  }

  async function handleUndo() {
    const last = lastSwipeRef.current;
    if (!last) return;
    haptic.soft();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const { error } = await supabase.from('swipes').delete().eq('id', last.swipeId);
    if (error) {
      toast.error('Unable to undo swipe');
      return;
    }
    setUndoVisible(false);
    lastSwipeRef.current = null;
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  const currentItem = items[currentIndex];
  const nextItem = items[currentIndex + 1];
  const remaining = items.length - currentIndex;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <SwiprLogo size={26} showTrail={false} />
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{remaining > 0 ? remaining : ''}</Text>
          </View>
        </View>
        <Text style={styles.greetLine}>
          {greeting.label}
          {profile?.username ? (
            <Text style={styles.greetName}>, @{profile.username}</Text>
          ) : null}
        </Text>
        <Text style={styles.greetSub}>
          {remaining > 0
            ? `${remaining} item${remaining !== 1 ? 's' : ''} waiting for you`
            : 'Find something worth trading'}
        </Text>
      </MotiView>

      {/* Category chips */}
      <MotiView
        from={{ opacity: 0, translateX: -16 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 80 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categories}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <MotiView
                key={cat}
                animate={{ scale: isActive ? 1.05 : 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 300 }}
              >
                <PressableScale
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                  hapticOnPressIn="selection"
                  pressedScale={0.94}
                >
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat}</Text>
                </PressableScale>
              </MotiView>
            );
          })}
        </ScrollView>
      </MotiView>

      {/* Card area */}
      <View style={styles.cardArea}>
        {loading ? (
          <SwipeCardSkeleton />
        ) : currentItem ? (
          <>
            {nextItem && (
              <MotiView
                from={{ scale: 0.92, opacity: 0.5 }}
                animate={{ scale: 0.95, opacity: 0.72 }}
                transition={{ type: 'spring', damping: 16, stiffness: 120, delay: 60 }}
                style={styles.cardBehind}
              >
                <SwipeCard item={nextItem} onSwipeLeft={() => {}} onSwipeRight={() => {}} isTop={false} />
              </MotiView>
            )}
            <SwipeCard
              key={currentItem.id}
              item={currentItem}
              onSwipeLeft={() => handleSwipe('left')}
              onSwipeRight={() => handleSwipe('right')}
              isTop={true}
              onOpenDetail={() => navigation.navigate('ItemDetail', { itemId: currentItem.id })}
            />
          </>
        ) : (
          <EmptyState
            icon="✨"
            title="You're all caught up!"
            subtitle="You've seen every item in this category. Check back soon — new listings drop all the time."
            actionLabel="Refresh"
            onAction={fetchItems}
          />
        )}
      </View>

      {/* Undo pill */}
      <UndoPill undoAnim={undoAnim} onUndo={handleUndo} />


      <MatchModal
        visible={matchModal.visible}
        myItem={matchModal.match?.my_item ?? null}
        theirItem={matchModal.match?.other_item ?? null}
        theirProfile={matchModal.match?.other_profile ?? null}
        onClose={() => setMatchModal({ visible: false, match: null })}
        onChat={() => {
          setMatchModal({ visible: false, match: null });
          if (matchModal.match?.other_profile) {
            navigation.navigate('Chat', {
              matchId: matchModal.match.id,
              matchedUser: matchModal.match.other_profile,
            });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6, gap: 2 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBadge: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: `${colors.primary}30`,
    borderWidth: 1, borderColor: `${colors.primary}55`,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 8,
  },
  countText: { color: colors.primaryLight, fontSize: 13, fontWeight: '700' },
  greetLine: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 6 },
  greetName: { color: colors.primaryLight, fontWeight: '800' },
  greetSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  categoriesScroll: { flexGrow: 0, maxHeight: 52 },
  categories: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#fff', fontWeight: '700' },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 16, paddingTop: 14 },
  cardBehind: { position: 'absolute' },
});
