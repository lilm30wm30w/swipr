import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Image, ActivityIndicator, SafeAreaView,
} from 'react-native';
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

  async function uploadImage(uri: string, path: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage.from('items').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    if (!user) return;

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const url = await uploadImage(uri, path);
        uploadedUrls.push(url);
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
      toast.error(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>List an Item</Text>
        <Text style={styles.subtitle}>Add something you want to trade</Text>

        <View style={styles.section}>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="What are you trading?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </View>

        <View style={styles.section}>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => (
              <PressableScale
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
                hapticOnPressIn="selection"
                pressedScale={0.94}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Condition</Text>
          <View style={styles.chips}>
            {CONDITIONS.map((cond) => (
              <PressableScale
                key={cond}
                style={[styles.chip, condition === cond && styles.chipActive]}
                onPress={() => setCondition(cond)}
                hapticOnPressIn="selection"
                pressedScale={0.94}
              >
                <Text style={[styles.chipText, condition === cond && styles.chipTextActive]}>
                  {CONDITION_LABELS[cond]}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

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
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
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
    borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.95)', justifyContent: 'center', alignItems: 'center',
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
