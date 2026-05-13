/**
 * SnapSolve Root Layout — wraps with ThemeProvider + AuthProvider.
 * Handles auth-gated navigation: if not logged in → login screen.
 */

import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemeProvider } from '../utils/ThemeContext';
import { AuthProvider, useAuth } from '../utils/AuthContext';

function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Still loading saved auth

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      // Not logged in and trying to access protected pages → redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Logged in but on auth pages → redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <Slot />;
}

const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafaf9' },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}
