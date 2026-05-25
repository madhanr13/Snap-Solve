/**
 * Register Screen — create a new SnapSolve account.
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
import { UserPlus, User, Lock, AtSign } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../utils/AuthContext';
import { AppLogo } from '../components/AppLogo';

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
            <AppLogo width="100%" height={100} />
            <Text style={[s.appName, { color: colors.text, marginTop: 16 }]}>Join SnapSolve</Text>
            <Text style={[s.tagline, { color: colors.textMuted }]}>
              Create your account to get started
            </Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            {error ? (
              <View style={[s.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
                <Text style={[s.errorText, { color: isDark ? '#fca5a5' : '#991b1b' }]}>{error}</Text>
              </View>
            ) : null}

            <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AtSign size={18} color={colors.textMuted} strokeWidth={2} />
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
              <User size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Display Name (optional)"
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Password (min 6 chars)"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[s.button, { backgroundColor: colors.success }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <UserPlus size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={s.buttonText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={[s.footerLink, { color: colors.accent }]}>Sign In</Text>
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
  logoArea: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 14, marginTop: 4 },

  // Form
  form: { gap: 12 },

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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
