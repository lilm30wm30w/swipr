import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Animated,
  KeyboardAvoidingView, Platform, ActivityIndicator, Easing,
} from 'react-native';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import SwiprLogo from '../../components/SwiprLogo';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { AuthStackParamList } from '../../types';
import { useToast } from '../../context/ToastContext';

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 14 }),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) toast.error(error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <Animated.View style={[styles.header, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <SwiprLogo size={56} animated />
          <Text style={styles.tagline}>Trade what you have. Get what you want.</Text>
        </Animated.View>

        <Animated.View style={[styles.form, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <PressableScale
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            hapticOnPressIn="press"
          >
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.buttonGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </GradientView>
          </PressableScale>

          <PressableScale
            onPress={() => navigation.navigate('Signup')}
            style={styles.link}
            pressedScale={0.98}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
            </Text>
          </PressableScale>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { alignItems: 'center', marginBottom: 48 },
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
