import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  SafeAreaView, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Item } from '../../types';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useFocusEffect(useCallback(() => { fetchMyItems(); }, []));

  async function fetchMyItems() {
    if (!user) return;
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyItems(data);
  }

  async function handleAvatarChange() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !user) return;

    setUploadingAvatar(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `avatars/${user.id}.jpg`;
      await supabase.storage.from('items').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Error', 'Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function toggleItemAvailability(item: Item) {
    await supabase.from('items').update({ is_available: !item.is_available }).eq('id', item.id);
    fetchMyItems();
  }

  async function deleteItem(itemId: string) {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('items').delete().eq('id', itemId);
          fetchMyItems();
        },
      },
    ]);
  }

  function renderItem({ item }: { item: Item }) {
    return (
      <View style={styles.itemCard}>
        {item.images?.[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Text style={styles.placeholderIcon}>📦</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[styles.availBtn, item.is_available && styles.availBtnActive]}
            onPress={() => toggleItemAvailability(item)}
          >
            <Text style={styles.availBtnText}>{item.is_available ? 'Listed' : 'Unlisted'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.background, '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleAvatarChange} style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{profile?.username?.[0]?.toUpperCase() ?? '?'}</Text>
              </LinearGradient>
            )}
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}><ActivityIndicator color="#fff" /></View>
            )}
            <View style={styles.cameraBtn}><Text>📷</Text></View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{profile?.full_name ?? profile?.username}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {profile?.location && <Text style={styles.location}>📍 {profile.location}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{myItems.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{myItems.filter((i) => i.is_available).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{myItems.filter((i) => !i.is_available).length}</Text>
            <Text style={styles.statLabel}>Traded</Text>
          </View>
        </View>

        {/* My Items */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Listings</Text>
        </View>

        {myItems.map((item) => (
          <View key={item.id}>{renderItem({ item })}</View>
        ))}

        {myItems.length === 0 && (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyText}>No items listed yet. Add something to trade!</Text>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', gap: 6, marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 4 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.primary,
  },
  avatarInitial: { color: '#fff', fontSize: 38, fontWeight: '700' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  displayName: { fontSize: 22, fontWeight: '700', color: colors.text },
  username: { fontSize: 15, color: colors.primaryLight },
  bio: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  location: { fontSize: 13, color: colors.textMuted },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemImage: { width: 52, height: 52, borderRadius: 10 },
  itemImagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 22 },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemCategory: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  itemActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  availBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  availBtnActive: { backgroundColor: `${colors.primary}33`, borderColor: colors.primary },
  availBtnText: { fontSize: 11, fontWeight: '600', color: colors.primaryLight },
  deleteBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { fontSize: 18 },
  emptyItems: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  signOutBtn: {
    marginTop: 24, padding: 16, borderRadius: 14,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
});
