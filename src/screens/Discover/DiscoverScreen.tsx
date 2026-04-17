import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  SafeAreaView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Item, Match } from '../../types';
import SwipeCard from '../../components/SwipeCard';
import MatchModal from '../../components/MatchModal';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types';

const { width } = Dimensions.get('window');

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Tabs'> };

const CATEGORIES = ['All', 'Clothes', 'Shoes', 'Gadgets', 'Accessories', 'Other'];

export default function DiscoverScreen({ navigation }: Props) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [matchModal, setMatchModal] = useState<{ visible: boolean; match: Match | null }>({ visible: false, match: null });
  const [myItems, setMyItems] = useState<Item[]>([]);

  useEffect(() => { fetchItems(); fetchMyItems(); }, [selectedCategory]);

  async function fetchMyItems() {
    if (!user) return;
    const { data } = await supabase.from('items').select('*').eq('user_id', user.id).eq('is_available', true);
    if (data) setMyItems(data);
  }

  async function fetchItems() {
    if (!user) return;
    setLoading(true);

    // Get already-swiped item IDs
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
    setItems(data ?? []);
    setCurrentIndex(0);
    setLoading(false);
  }

  async function handleSwipe(direction: 'left' | 'right') {
    const item = items[currentIndex];
    if (!item || !user) return;

    await supabase.from('swipes').insert({ swiper_id: user.id, item_id: item.id, direction });

    if (direction === 'right') {
      await checkForMatch(item);
    }
    setCurrentIndex((i) => i + 1);
  }

  async function checkForMatch(theirItem: Item) {
    if (!user || myItems.length === 0) return;

    // Check if the other user has swiped right on any of my items
    const { data: theirSwipe } = await supabase
      .from('swipes')
      .select('item_id')
      .eq('swiper_id', theirItem.user_id)
      .eq('direction', 'right')
      .in('item_id', myItems.map((i) => i.id))
      .limit(1)
      .single();

    if (theirSwipe) {
      const myMatchedItem = myItems.find((i) => i.id === theirSwipe.item_id);
      if (!myMatchedItem) return;

      const { data: match } = await supabase.from('matches').insert({
        user1_id: user.id,
        user2_id: theirItem.user_id,
        item1_id: myMatchedItem.id,
        item2_id: theirItem.id,
      }).select().single();

      if (match) {
        const { data: theirProfile } = await supabase.from('profiles').select('*').eq('id', theirItem.user_id).single();
        setMatchModal({
          visible: true,
          match: { ...match, other_profile: theirProfile, other_item: theirItem, my_item: myMatchedItem },
        });
      }
    }
  }

  const currentItem = items[currentIndex];
  const nextItem = items[currentIndex + 1];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.background, '#0D0D1A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Swipr</Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Card Stack */}
      <View style={styles.cardArea}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
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
            />
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>Check back later for new items</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchItems}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.refreshGradient}>
                <Text style={styles.refreshText}>Refresh</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {currentItem && !loading && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={() => handleSwipe('left')}>
            <Text style={styles.passBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.tradeBtn]} onPress={() => handleSwipe('right')}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.tradeGradient}>
              <Text style={styles.tradeBtnText}>♻</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  logo: { fontSize: 28, fontWeight: '800', color: colors.primaryLight },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexWrap: 'nowrap',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  categoryTextActive: { color: '#fff', fontWeight: '600' },
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
  empty: { alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 15, color: colors.textSecondary },
  refreshButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  refreshGradient: { paddingHorizontal: 32, paddingVertical: 14 },
  refreshText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingBottom: 24,
    paddingTop: 12,
  },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  passBtn: { backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.danger },
  passBtnText: { fontSize: 24, color: colors.danger },
  tradeBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  tradeGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tradeBtnText: { fontSize: 28, color: '#fff' },
});
