import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, Dimensions, Animated, Easing,
} from 'react-native';
import GradientView from '../../components/GradientView';
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

const { width } = Dimensions.get('window');

type Props = { navigation: StackNavigationProp<MainStackParamList, 'Tabs'> };

const CATEGORIES = ['All', 'Clothes', 'Shoes', 'Gadgets', 'Accessories', 'Other'];

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
  const undoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchItems(); }, [selectedCategory]);

  useEffect(() => {
    Animated.timing(undoAnim, {
      toValue: undoVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
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

    const { data: swipedData } = await supabase
      .from('swipes')
      .select('item_id')
      .eq('swiper_id', user.id);
    const swipedIds = swipedData?.map((s) => s.item_id) ?? [];

    let query = supabase
      .from('items')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('is_available', true)
      .neq('user_id', user.id);

    if (selectedCategory !== 'All') {
      query = query.eq('category', selectedCategory.toLowerCase());
    }
    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`);
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(50);

    const rawItems = data ?? [];
    const tags = (profile?.interests ?? []).map((t) => t.toLowerCase());
    const ranked = tags.length > 0
      ? [...rawItems].sort((a, b) => {
          const score = (it: any) => {
            const hay = `${it.title ?? ''} ${it.description ?? ''}`.toLowerCase();
            return tags.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
          };
          return score(b) - score(a);
        })
      : rawItems;

    setItems(ranked);
    setCurrentIndex(0);
    setLoading(false);
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
    setUndoVisible(false);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    lastSwipeRef.current = null;
    await supabase.from('swipes').delete().eq('id', last.swipeId);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  const currentItem = items[currentIndex];
  const nextItem = items[currentIndex + 1];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <SwiprLogo size={26} showTrail={false} />
          <Text style={styles.greetIcon}>{greeting.icon}</Text>
        </View>
        <Text style={styles.greetLine}>
          {greeting.label}
          {profile?.username ? (
            <Text style={styles.greetName}>, @{profile.username}</Text>
          ) : null}
        </Text>
        <Text style={styles.greetSub}>
          {items.length > 0
            ? `${items.length - currentIndex} item${items.length - currentIndex !== 1 ? 's' : ''} waiting for you`
            : 'Find something worth trading'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categories}
      >
        {CATEGORIES.map((cat) => (
          <PressableScale
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
            hapticOnPressIn="selection"
            pressedScale={0.94}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
          </PressableScale>
        ))}
      </ScrollView>

      <View style={styles.cardArea}>
        {loading ? (
          <SwipeCardSkeleton />
        ) : currentItem ? (
          <>
            {nextItem && (
              <View style={[styles.cardBehind]}>
                <SwipeCard item={nextItem} onSwipeLeft={() => {}} onSwipeRight={() => {}} isTop={false} />
              </View>
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

      {undoVisible && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.undoWrap,
            {
              opacity: undoAnim,
              transform: [{
                translateY: undoAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
              }],
            },
          ]}
        >
          <PressableScale
            style={styles.undoPill}
            onPress={handleUndo}
            hapticOnPressIn="soft"
            pressedScale={0.94}
          >
            <Text style={styles.undoIcon}>↶</Text>
            <Text style={styles.undoText}>Undo</Text>
          </PressableScale>
        </Animated.View>
      )}

      {currentItem && !loading && (
        <View style={styles.actions}>
          <PressableScale
            style={[styles.actionBtn, styles.passBtn]}
            onPress={() => handleSwipe('left')}
            hapticOnPressIn="tap"
            accessibilityLabel="Pass on this item"
            accessibilityRole="button"
          >
            <Text style={styles.passBtnText}>✕</Text>
          </PressableScale>
          <PressableScale
            style={[styles.actionBtn, styles.tradeBtn]}
            onPress={() => handleSwipe('right')}
            hapticOnPressIn="press"
            pressedScale={0.92}
            accessibilityLabel="Trade for this item"
            accessibilityRole="button"
          >
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.tradeGradient}>
              <Text style={styles.tradeBtnText}>♻</Text>
            </GradientView>
          </PressableScale>
        </View>
      )}

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
  greetIcon: { fontSize: 22 },
  greetLine: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 6 },
  greetName: { color: colors.primaryLight, fontWeight: '800' },
  greetSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  categoriesScroll: { flexGrow: 0, maxHeight: 52 },
  categories: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#fff', fontWeight: '700' },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardBehind: {
    transform: [{ scale: 0.95 }, { translateY: 12 }],
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingBottom: 16,
    paddingTop: 8,
  },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  passBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  passBtnText: { fontSize: 26, color: colors.danger, fontWeight: '700' },
  tradeBtn: {
    width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  tradeGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tradeBtnText: { fontSize: 30, color: '#fff' },
  undoWrap: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  undoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  undoIcon: { color: colors.primaryLight, fontSize: 16, fontWeight: '800' },
  undoText: { color: colors.primaryLight, fontSize: 14, fontWeight: '700' },
});
