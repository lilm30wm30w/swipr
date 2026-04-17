import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Image, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

const CATEGORIES = ['clothes', 'shoes', 'gadgets', 'accessories', 'other'] as const;
const CONDITIONS = ['new', 'like_new', 'good', 'fair'] as const;
const CONDITION_LABELS = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' };

export default function AddItemScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('clothes');
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>('good');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    if (images.length >= 4) { Alert.alert('Max 4 images'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to add images'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
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
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title'); return; }
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

      Alert.alert('Success', 'Your item has been listed!', [
        { text: 'OK', onPress: () => { setTitle(''); setDescription(''); setImages([]); setCategory('clothes'); setCondition('good'); } },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.background, '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>List an Item</Text>
        <Text style={styles.subtitle}>Add something you want to trade</Text>

        {/* Image picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {images.map((uri, i) => (
              <TouchableOpacity key={i} onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <View style={styles.removeOverlay}><Text style={styles.removeText}>✕</Text></View>
              </TouchableOpacity>
            ))}
            {images.length < 4 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Title */}
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

        {/* Description */}
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

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Condition */}
        <View style={styles.section}>
          <Text style={styles.label}>Condition</Text>
          <View style={styles.chips}>
            {CONDITIONS.map((cond) => (
              <TouchableOpacity
                key={cond}
                style={[styles.chip, condition === cond && styles.chipActive]}
                onPress={() => setCondition(cond)}
              >
                <Text style={[styles.chipText, condition === cond && styles.chipTextActive]}>
                  {CONDITION_LABELS[cond]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.submitGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>List Item</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 0 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  imagePreview: { width: 90, height: 90, borderRadius: 12, marginRight: 10 },
  removeOverlay: {
    position: 'absolute', top: 4, right: 14, width: 22, height: 22,
    borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.9)', justifyContent: 'center', alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addImageBtn: {
    width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  addImageIcon: { fontSize: 28, color: colors.primary, fontWeight: '300' },
  addImageText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
