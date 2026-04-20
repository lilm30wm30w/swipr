import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Animated,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Easing,
} from 'react-native';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import SwiprLogo from '../../components/SwiprLogo';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { AuthStackParamList } from '../../types';
import { useToast } from '../../context/ToastContext';

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'Signup'> };

export default function SignupScreen({ navigation }: Props) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 14 }),
    ]).start();
  }, []);

  async function handleSignup() {
    if (!email || !password || !username || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim(), full_name: fullName.trim() } },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created — welcome to Swipr');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.header, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <SwiprLogo size={48} animated />
            <Text style={styles.tagline}>Join the trading revolution</Text>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <TextInput
              style={styles.input} placeholder="Full Name"
              placeholderTextColor={colors.textMuted} value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input} placeholder="Username"
              placeholderTextColor={colors.textMuted} value={username}
              onChangeText={setUsername} autoCapitalize="none" autoCorrect={false}
            />
            <TextInput
              style={styles.input} placeholder="Email"
              placeholderTextColor={colors.textMuted} value={email}
              onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
            />
            <TextInput
              style={styles.input} placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.textMuted} value={password}
              onChangeText={setPassword} secureTextEntry
            />

            <PressableScale
              style={styles.button}
              onPress={handleSignup}
              disabled={loading}
              hapticOnPressIn="press"
            >
              <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.buttonGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
              </GradientView>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.goBack()}
              style={styles.link}
              pressedScale={0.98}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
              </Text>
            </PressableScale>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  inner: { justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60, flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 40 },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
  form: { gap: 14 },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: { borderRadius: 16, overflow: 'hidden', marginTop: 10 },
  buttonGradient: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  link: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: colors.textSecondary, fontSize: 14 },
  linkHighlight: { color: colors.primaryLight, fontWeight: '600' },
});
