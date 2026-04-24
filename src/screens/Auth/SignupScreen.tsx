import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
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

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'Signup'> };

const FIELDS = [
  { key: 'fullName', placeholder: 'Full Name', secure: false, keyboard: undefined, capitalize: 'words' },
  { key: 'username', placeholder: 'Username', secure: false, keyboard: undefined, capitalize: 'none' },
  { key: 'email', placeholder: 'Email', secure: false, keyboard: 'email-address', capitalize: 'none' },
  { key: 'password', placeholder: 'Password (min 6 characters)', secure: true, keyboard: undefined, capitalize: 'none' },
] as const;

export default function SignupScreen({ navigation }: Props) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const values: Record<string, string> = { fullName, username, email, password };
  const setters: Record<string, (v: string) => void> = { fullName: setFullName, username: setUsername, email: setEmail, password: setPassword };

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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim(), full_name: fullName.trim() } },
    });
    if (error) {
      toast.error(error.message);
    } else if (!data.session) {
      toast.info('Account created. Check your email to confirm before signing in.');
    } else {
      toast.success('Account created - welcome to Swipr');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <MotiView
            from={{ opacity: 0, translateY: 28, scale: 0.92 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 0 }}
            style={styles.header}
          >
            <SwiprLogo size={48} animated />
            <Text style={styles.tagline}>Join the trading revolution</Text>
          </MotiView>

          <View style={styles.form}>
            {FIELDS.map((field, i) => (
              <MotiView
                key={field.key}
                from={{ opacity: 0, translateY: 18 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 100 + i * 70 }}
              >
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={values[field.key]}
                  onChangeText={setters[field.key]}
                  secureTextEntry={field.secure}
                  keyboardType={field.keyboard as any}
                  autoCapitalize={field.capitalize as any}
                  autoCorrect={false}
                />
              </MotiView>
            ))}

            <MotiView
              from={{ opacity: 0, translateY: 14 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 16, stiffness: 160, delay: 400 }}
            >
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
            </MotiView>

            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 400, delay: 500 }}
            >
              <PressableScale
                onPress={() => navigation.goBack()}
                style={styles.link}
                pressedScale={0.98}
              >
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
                </Text>
              </PressableScale>
            </MotiView>
          </View>
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
