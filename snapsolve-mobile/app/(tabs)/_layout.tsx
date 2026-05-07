/**
 * Tab Layout — 5 tabs: Home, Snap, Materials, Fix, Settings.
 * Step dots only show on the capture/results flow.
 */

import { Tabs, useRouter } from 'expo-router';
import { Home, Camera, Package, CheckCircle, Settings, ChevronLeft } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';

// ── Minimal step dots ──
function StepDots({ current }: { current: number }) {
  const { colors } = useTheme();
  return (
    <View style={[dots.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          style={[
            dots.dot,
            { backgroundColor: n <= current ? colors.accent : colors.border },
            n === current && { width: 20, backgroundColor: colors.accent },
          ]}
        />
      ))}
    </View>
  );
}
const dots = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ── Header ──
function Header({ title, showBack, onBack, step }: {
  title: string; showBack?: boolean; onBack?: () => void; step?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <View style={[hdr.bar, { backgroundColor: colors.surface }]}>
        {showBack ? (
          <TouchableOpacity style={hdr.btn} onPress={onBack} activeOpacity={0.6}>
            <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        ) : <View style={hdr.btn} />}
        <Text style={[hdr.title, { color: colors.text }]}>{title}</Text>
        <View style={hdr.btn} />
      </View>
      {step != null && <StepDots current={step} />}
    </View>
  );
}
const hdr = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 12, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center', flex: 1 },
  btn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});

// ── Tabs ──
export default function TabLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, borderTopWidth: 1, paddingBottom: 4, height: 56 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      headerShown: true,
    }}>
      <Tabs.Screen name="index" options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <Home size={21} color={color} />,
        header: () => <Header title="SnapSolve" />,
      }} />
      <Tabs.Screen name="scan" options={{
        tabBarLabel: 'Snap',
        tabBarIcon: ({ color }) => <Camera size={21} color={color} />,
        header: () => <Header title="What's broken?" showBack onBack={() => router.push('/(tabs)/')} step={1} />,
      }} />
      <Tabs.Screen name="inventory" options={{
        tabBarLabel: 'Materials',
        tabBarIcon: ({ color }) => <Package size={21} color={color} />,
        header: () => <Header title="Your materials" showBack onBack={() => router.push('/(tabs)/scan')} step={2} />,
      }} />
      <Tabs.Screen name="results" options={{
        tabBarLabel: 'Fix',
        tabBarIcon: ({ color }) => <CheckCircle size={21} color={color} />,
        header: () => <Header title="Your fix" showBack onBack={() => router.push('/(tabs)/inventory')} step={3} />,
      }} />
      <Tabs.Screen name="settings" options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color }) => <Settings size={21} color={color} />,
        header: () => <Header title="Settings" />,
      }} />
    </Tabs>
  );
}
