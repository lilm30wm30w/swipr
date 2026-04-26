import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { haptic } from '../../lib/haptics';
import { grantAchievement } from '../../lib/achievements';

const CATEGORIES = ['clothes', 'shoes', 'gadgets', 'accessories', 'other'] as const;
const CONDITIONS = ['new', 'like_new', 'good', 'fair'] as const;
const CONDITION_LABELS = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' };

export default function AddItemScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('clothes');
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>('good');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    if (images.length >= 4) { toast.info('Max 4 photos'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('Photo access needed'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      haptic.success();
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function uploadImage(uri: string, path: string): Promise<{ path: string; url: string }> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage.from('items').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(data.path);
    return { path: data.path, url: publicUrl };
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    if (!user) return;

    setLoading(true);
    const uploadedPaths: string[] = [];
    try {
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const uploaded = await uploadImage(uri, path);
        uploadedPaths.push(uploaded.path);
        uploadedUrls.push(uploaded.url);
      }

      const { error } = await supabase.from('items').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        condition,
        images: uploadedUrls,
        is_available: true,
      });

      if (error) throw error;

      toast.success('Your item has been listed');
      setTitle(''); setDescription(''); setImages([]);
      setCategory('clothes'); setCondition('good');

      const { count } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (count !== null) {
        if (count >= 1) grantAchievement(user.id, 'first_listing');
        if (count >= 5) grantAchievement(user.id, 'curator');
      }
    } catch (e: any) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('items').remove(uploadedPaths);
      }
      toast.error(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        >
          <Text style={styles.title}>List an Item</Text>
          <Text style={styles.subtitle}>Add something you want to trade</Text>
        </MotiView>

        {/* Photos */}
        <MotiView
          from={{ opacity: 0, translateX: -16 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 60 }}
          style={styles.section}
        >
          <Text style={styles.label}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow} contentContainerStyle={{ gap: 10 }}>
            {images.map((uri, i) => (
              <PressableScale
                key={i}
                onPress={() => { haptic.tap(); setImages((prev) => prev.filter((_, j) => j !== i)); }}
                hapticOnPressIn="none"
                pressedScale={0.92}
              >
                <Image source={{ uri }} style={styles.imagePreview} />
                <View style={styles.removeOverlay}><Text style={styles.removeText}>✕</Text></View>
              </PressableScale>
            ))}
            {images.length < 4 && (
              <PressableScale
                style={styles.addImageBtn}
                onPress={pickImage}
                hapticOnPressIn="selection"
                pressedScale={0.94}
              >
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageText}>Add Photo</Text>
              </PressableScale>
            )}
          </ScrollView>
        </MotiView>

        {/* Title */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 120 }}
          style={styles.section}
        >
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="What are you trading?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </MotiView>

        {/* Description */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 180 }}
          style={styles.section}
        >
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Size, brand, any details..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
        </MotiView>

        {/* Category chips */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 240 }}
          style={styles.section}
        >
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat;
              return (
                <MotiView
                  key={cat}
                  animate={{ scale: isActive ? 1.06 : 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 320 }}
                >
                  <PressableScale
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                    hapticOnPressIn="selection"
                    pressedScale={0.94}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </PressableScale>
                </MotiView>
              );
            })}
          </View>
        </MotiView>

        {/* Condition chips */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 300 }}
          style={styles.section}
        >
          <Text style={styles.label}>Condition</Text>
          <View style={styles.chips}>
            {CONDITIONS.map((cond) => {
              const isActive = condition === cond;
              return (
                <MotiView
                  key={cond}
                  animate={{ scale: isActive ? 1.06 : 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 320 }}
                >
                  <PressableScale
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setCondition(cond)}
                    hapticOnPressIn="selection"
                    pressedScale={0.94}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {CONDITION_LABELS[cond]}
                    </Text>
                  </PressableScale>
                </MotiView>
              );
            })}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 16, stiffness: 160, delay: 360 }}
        >
          <PressableScale
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            hapticOnPressIn="press"
          >
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.submitGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>List Item</Text>}
            </GradientView>
          </PressableScale>
        </MotiView>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },
  section: { marginBottom: 22 },
  label: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row' },
  imagePreview: { width: 92, height: 92, borderRadius: 14 },
  removeOverlay: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22,
    borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addImageBtn: {
    width: 92, height: 92, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  addImageIcon: { fontSize: 30, color: colors.primary, fontWeight: '300' },
  addImageText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
});
