import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { MotiView } from 'moti';
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
        {/* Logo + tagline staggered in */}
        <MotiView
          from={{ opacity: 0, translateY: 32, scale: 0.92 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 0 }}
          style={styles.header}
        >
          <SwiprLogo size={56} animated />
          <Text style={styles.tagline}>Trade what you have. Get what you want.</Text>
        </MotiView>

        <View style={styles.form}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 120 }}
          >
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
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 190 }}
          >
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 160, delay: 260 }}
          >
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
          </MotiView>

          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 380 }}
          >
            <PressableScale
              onPress={() => navigation.navigate('Signup')}
              style={styles.link}
              pressedScale={0.98}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
              </Text>
            </PressableScale>
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { alignItems: 'center', marginBottom: 48 },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 22 },
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
