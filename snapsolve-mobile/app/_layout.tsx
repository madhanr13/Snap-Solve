/**
 * SnapSolve Root Layout — wraps the app with ThemeProvider.
 */

import { Stack } from 'expo-router';
import { ThemeProvider } from '../utils/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
