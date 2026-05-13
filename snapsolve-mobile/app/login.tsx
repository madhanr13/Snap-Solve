/**
 * Login Screen — clean, theme-aware sign-in page.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, User, Lock, Wrench } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../utils/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please fill in both fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / branding */}
          <View style={s.logoArea}>
            <View style={[s.logoCircle, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
              <Wrench size={36} color={colors.accent} strokeWidth={2} />
            </View>
            <Text style={[s.appName, { color: colors.text }]}>SnapSolve</Text>
            <Text style={[s.tagline, { color: colors.textMuted }]}>
              AI-powered repair guides
            </Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <Text style={[s.formTitle, { color: colors.text }]}>Welcome back</Text>

            {error ? (
              <View style={[s.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
                <Text style={[s.errorText, { color: isDark ? '#fca5a5' : '#991b1b' }]}>{error}</Text>
              </View>
            ) : null}

            <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <User size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[s.button, { backgroundColor: colors.accent }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <LogIn size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={s.buttonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/register')}>
              <Text style={[s.footerLink, { color: colors.accent }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 14, marginTop: 4 },

  // Form
  form: { gap: 14 },
  formTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },

  // Error
  errorBox: {
    padding: 12, borderRadius: 10, borderWidth: 1, borderLeftWidth: 4,
  },
  errorText: { fontSize: 13, fontWeight: '500' },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },

  // Button
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
