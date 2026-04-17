import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Match, Profile, Item, MainStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<MainStackParamList, 'Tabs'>;

export default function MatchesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchMatches(); }, []));

  async function fetchMatches() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
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
    }
    setLoading(false);
    setRefreshing(false);
  }

  function renderMatch({ item: match }: { item: Match }) {
    const other = match.other_profile;
    const theirItem = match.other_item;

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => other && navigation.navigate('Chat', { matchId: match.id, matchedUser: other })}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          {other?.avatar_url ? (
            <Image source={{ uri: other.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{other?.username?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.matchInfo}>
          <Text style={styles.username}>@{other?.username}</Text>
          <Text style={styles.itemName} numberOfLines={1}>{theirItem?.title}</Text>
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
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.background, '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.headerSubtitle}>{matches.length} active trade{matches.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMatches(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🤝</Text>
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySubtitle}>Start swiping to find trade partners!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  matchCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surfaceElevated,
  },
  matchInfo: { flex: 1, gap: 3 },
  username: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemName: { fontSize: 13, color: colors.textSecondary },
  statusRow: { flexDirection: 'row' },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    backgroundColor: `${colors.primary}33`,
  },
  statusCompleted: { backgroundColor: `${colors.success}33` },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.primaryLight, textTransform: 'capitalize' },
  itemThumb: { width: 56, height: 56, borderRadius: 12 },
  thumbPlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  thumbIcon: { fontSize: 24 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
