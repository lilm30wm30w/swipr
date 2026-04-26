import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  Image, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import { MatchRowSkeleton } from '../../components/Skeleton';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { useMatches } from '../../context/MatchesContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Match, MainStackParamList } from '../../types';

type NavProp = StackNavigationProp<MainStackParamList, 'Tabs'>;

function MatchRow({ match, index }: { match: Match; index: number }) {
  const navigation = useNavigation<NavProp>();
  const other = match.other_profile;
  const theirItem = match.other_item;

  return (
    <MotiView
      from={{ opacity: 0, translateX: -24, scale: 0.96 }}
      animate={{ opacity: 1, translateX: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 180, delay: index * 55 }}
    >
      <PressableScale
        style={styles.matchCard}
        onPress={() => other && navigation.navigate('Chat', { matchId: match.id, matchedUser: other })}
        hapticOnPressIn="tap"
        pressedScale={0.975}
      >
        <View style={styles.avatarContainer}>
          {other?.avatar_url ? (
            <Image source={{ uri: other.avatar_url }} style={styles.avatar} />
          ) : (
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{other?.username?.[0]?.toUpperCase() ?? '?'}</Text>
            </GradientView>
          )}
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.matchInfo}>
          <Text style={styles.username}>@{other?.username}</Text>
          <Text style={styles.itemName} numberOfLines={1}>{theirItem?.title ?? 'Their item'}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, match.status === 'completed' && styles.statusCompleted]}>
              <Text style={styles.statusText}>{match.status}</Text>
            </View>
          </View>
        </View>

        {theirItem?.images?.[0] ? (
          <Image source={{ uri: theirItem.images[0] }} style={styles.itemThumb} />
        ) : (
          <View style={[styles.itemThumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbIcon}>📦</Text>
          </View>
        )}
      </PressableScale>
    </MotiView>
  );
}

export default function MatchesScreen() {
  const { user } = useAuth();
  const { markAllSeen, latestNewMatch } = useMatches();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchMatches();
    markAllSeen();
  }, [markAllSeen]));

  useEffect(() => { if (latestNewMatch) fetchMatches(); }, [latestNewMatch]);

  async function fetchMatches() {
    if (!user) {
      setMatches([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('matches')
        .select(`
          *,
          profiles_user1:profiles!matches_user1_id_fkey(id, username, full_name, avatar_url),
          profiles_user2:profiles!matches_user2_id_fkey(id, username, full_name, avatar_url),
          items_item1:items!matches_item1_id_fkey(id, title, images),
          items_item2:items!matches_item2_id_fkey(id, title, images)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (data) {
        const enriched = data.map((m: any) => {
          const isUser1 = m.user1_id === user.id;
          return {
            ...m,
            other_profile: isUser1 ? m.profiles_user2 : m.profiles_user1,
            my_item: isUser1 ? m.items_item1 : m.items_item2,
            other_item: isUser1 ? m.items_item2 : m.items_item1,
          };
        });
        setMatches(enriched);
      } else {
        setMatches([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.headerSubtitle}>
          {matches.length} active trade{matches.length !== 1 ? 's' : ''}
        </Text>
      </MotiView>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => <MatchRowSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <MatchRow match={item} index={index} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchMatches(); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🤝"
              title="No matches yet"
              subtitle="Keep swiping — when someone swipes right on your item too, you'll both land here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  matchCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.success, borderWidth: 2.5, borderColor: colors.surfaceElevated,
  },
  matchInfo: { flex: 1, gap: 3 },
  username: { fontSize: 16, fontWeight: '800', color: colors.text },
  itemName: { fontSize: 13, color: colors.textSecondary },
  statusRow: { flexDirection: 'row' },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    backgroundColor: `${colors.primary}33`,
  },
  statusCompleted: { backgroundColor: `${colors.success}33` },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.primaryLight, textTransform: 'capitalize' },
  itemThumb: { width: 60, height: 60, borderRadius: 14 },
  thumbPlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  thumbIcon: { fontSize: 24 },
});
