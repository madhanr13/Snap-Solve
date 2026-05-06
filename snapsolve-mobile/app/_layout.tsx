/**
 * SnapSolve - React Native Expo App Entry Point
 * Uses Expo Router for navigation between camera, inventory, and results screens.
 */

import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide default header, implement custom header if needed
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
