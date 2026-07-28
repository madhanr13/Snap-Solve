/**
 * Register Screen — create a new SnapSolve account.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, User, Lock, AtSign } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../utils/AuthContext';
import { AppLogo } from '../components/AppLogo';
import { ThemedText } from '../components/ThemedText';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    // Validation
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don\'t match');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register(username.trim(), password, displayName.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
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
          {/* Logo */}
          <View style={s.logoArea}>
            <View style={[s.logoCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppLogo width={64} height={64} color={colors.accent} />
            </View>
            <ThemedText weight="bold" style={[s.appName, { marginTop: 16, color: colors.text }]}>Join SnapSolve</ThemedText>
            <ThemedText variant="muted" style={s.tagline}>
              Create your account to get started
            </ThemedText>
          </View>

          {/* Form */}
          <View style={[s.formCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
            {error ? (
              <View style={[s.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
                <ThemedText weight="medium" variant="danger" style={s.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            <View style={[s.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <AtSign size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text, fontFamily: 'Inter_400Regular' }]}
                placeholder="Username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[s.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <User size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text, fontFamily: 'Inter_400Regular' }]}
                placeholder="Display Name (optional)"
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            <View style={[s.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text, fontFamily: 'Inter_400Regular' }]}
                placeholder="Password (min 6 chars)"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={[s.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text, fontFamily: 'Inter_400Regular' }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[s.button, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <UserPlus size={18} color="#fff" strokeWidth={2} />
                  <ThemedText weight="bold" style={s.buttonText}>Create Account</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={s.footer}>
            <ThemedText variant="muted" style={s.footerText}>
              Already have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <ThemedText weight="bold" variant="accent" style={s.footerLink}>Sign In</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48, 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1
  },
  appName: { fontSize: 26, letterSpacing: -0.5 },
  tagline: { fontSize: 14, marginTop: 6 },

  // Form Card
  formCard: {
    borderRadius: 16, padding: 24, borderWidth: 1, gap: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },

  // Error
  errorBox: {
    padding: 12, borderRadius: 10, borderWidth: 1, borderLeftWidth: 4,
  },
  errorText: { fontSize: 13 },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },

  // Button
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 12, borderWidth: 1, marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2
  },
  buttonText: { color: '#fff', fontSize: 16 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14 },
});
