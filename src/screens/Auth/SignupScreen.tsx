import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { AuthStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'> };

export default function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !username || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim(), full_name: fullName.trim() } },
    });
    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else {
      Alert.alert('Check your email', 'We sent you a confirmation link. Please verify your email to continue.');
    }
    setLoading(false);
  }

  return (
    <LinearGradient colors={[colors.background, '#1A0A2E']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>Swipr</Text>
            <Text style={styles.tagline}>Join the trading revolution</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input} placeholder="Full Name"
              placeholderTextColor={colors.textMuted} value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input} placeholder="Username"
              placeholderTextColor={colors.textMuted} value={username}
              onChangeText={setUsername} autoCapitalize="none"
            />
            <TextInput
              style={styles.input} placeholder="Email"
              placeholderTextColor={colors.textMuted} value={email}
              onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
            />
            <TextInput
              style={styles.input} placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.textMuted} value={password}
              onChangeText={setPassword} secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.buttonGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkHighlight}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  inner: { justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60, flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 52, fontWeight: '800', color: colors.primaryLight, letterSpacing: -1 },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  form: { gap: 16 },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  buttonGradient: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: colors.textSecondary, fontSize: 14 },
  linkHighlight: { color: colors.primaryLight, fontWeight: '600' },
});
