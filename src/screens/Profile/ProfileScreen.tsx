import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import ProfileHero from '../../components/ProfileHero';
import ProfileEditSheet from '../../components/ProfileEditSheet';
import AchievementsRow from '../../components/AchievementsRow';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Item } from '../../types';
import { haptic } from '../../lib/haptics';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const toast = useToast();
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
    if (status !== 'granted') { toast.error('Photo access needed'); return; }

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
      const path = `${user.id}/avatar.jpg`;
      await supabase.storage.from('items').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshProfile();
      toast.success('Avatar updated');
    } catch (e) {
      toast.error('Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function toggleItemAvailability(item: Item) {
    haptic.selection();
    await supabase.from('items').update({ is_available: !item.is_available }).eq('id', item.id);
    fetchMyItems();
  }

  function confirmDelete(itemId: string) {
    haptic.warning();
    Alert.alert('Delete Item', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('items').delete().eq('id', itemId);
          toast.success('Item deleted');
          fetchMyItems();
        },
      },
    ]);
  }

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  function renderItem(item: Item) {
    return (
      <MotiView
        key={item.id}
        from={{ opacity: 0, translateX: -12 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
      >
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
            <PressableScale
              style={[styles.availBtn, item.is_available && styles.availBtnActive]}
              onPress={() => toggleItemAvailability(item)}
              hapticOnPressIn="none"
              pressedScale={0.92}
            >
              <Text style={[styles.availBtnText, item.is_available && styles.availBtnTextActive]}>
                {item.is_available ? 'Listed' : 'Unlisted'}
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => confirmDelete(item.id)}
              style={styles.deleteBtn}
              hapticOnPressIn="none"
              pressedScale={0.85}
            >
              <Text style={styles.deleteBtnText}>🗑</Text>
            </PressableScale>
          </View>
        </View>
      </MotiView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProfileHero />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar + identity */}
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 16, stiffness: 160 }}
          style={styles.profileHeader}
        >
          <PressableScale onPress={handleAvatarChange} style={styles.avatarContainer} hapticOnPressIn="selection" pressedScale={0.94}>
            {/* Pulse ring */}
            <MotiView
              from={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.18, opacity: 0 }}
              transition={{ type: 'timing', duration: 2000, loop: true, repeatReverse: false }}
              style={styles.avatarPulseRing}
            />
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{profile?.username?.[0]?.toUpperCase() ?? '?'}</Text>
              </GradientView>
            )}
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}><ActivityIndicator color="#fff" /></View>
            )}
            <View style={styles.cameraBtn}><Text style={{ fontSize: 14 }}>📷</Text></View>
          </PressableScale>

          <Text style={styles.displayName}>{profile?.full_name ?? profile?.username}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {profile?.location && <Text style={styles.location}>📍 {profile.location}</Text>}

          <PressableScale
            onPress={() => setEditOpen(true)}
            style={styles.editBtn}
            hapticOnPressIn="tap"
            pressedScale={0.94}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <Text style={styles.editBtnText}>Edit profile</Text>
          </PressableScale>
        </MotiView>

        {/* Stats */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 80 }}
          style={styles.statsRow}
        >
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
        </MotiView>

        <AchievementsRow userId={user?.id} />

        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 300, delay: 160 }}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>My Listings</Text>
          <Text style={styles.sectionCount}>{myItems.length}</Text>
        </MotiView>

        {myItems.map(renderItem)}

        {myItems.length === 0 && (
          <EmptyState
            icon="📭"
            title="No items listed yet"
            subtitle="Tap the + tab to add your first item and start matching with traders."
            compact
          />
        )}

        <PressableScale style={styles.signOutBtn} onPress={confirmSignOut} hapticOnPressIn="tap">
          <Text style={styles.signOutText}>Sign Out</Text>
        </PressableScale>
      </ScrollView>

      <ProfileEditSheet visible={editOpen} onClose={() => setEditOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 96, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', gap: 6, marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 6 },
  avatarPulseRing: {
    position: 'absolute',
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 2, borderColor: colors.primary,
    zIndex: -1,
  },
  avatar: {
    width: 104, height: 104, borderRadius: 52,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  avatarInitial: { color: '#fff', fontSize: 42, fontWeight: '800' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  displayName: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  username: { fontSize: 15, color: colors.primaryLight, fontWeight: '600' },
  bio: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 20, lineHeight: 20 },
  location: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  editBtn: {
    marginTop: 12,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.14)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
  },
  editBtnText: { color: colors.primaryLight, fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    padding: 20, marginBottom: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  sectionCount: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16, padding: 12, alignItems: 'center', gap: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  itemImage: { width: 56, height: 56, borderRadius: 12 },
  itemImagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 22 },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemCategory: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  itemActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  availBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  availBtnActive: { backgroundColor: `${colors.primary}33`, borderColor: colors.primary },
  availBtnText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  availBtnTextActive: { color: colors.primaryLight },
  deleteBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { fontSize: 18 },
  signOutBtn: {
    marginTop: 24, padding: 16, borderRadius: 16,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
