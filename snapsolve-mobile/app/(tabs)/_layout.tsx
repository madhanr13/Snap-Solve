/**
 * Tab Layout — 5 tabs: Home, Snap, Materials, Fix, Settings.
 * Step dots only show on the capture/results flow.
 */

import { Tabs, useRouter } from 'expo-router';
import { Home, Camera, Package, CheckCircle, Settings as SettingsIcon, ChevronLeft, Wrench } from 'lucide-react-native';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { ThemedText } from '../../components/ThemedText';
import { AppLogo } from '../../components/AppLogo';

// ── Step progress bar ──
function StepProgress({ current, labels }: { current: number; labels: string[] }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[step.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <View key={n} style={step.item}>
            <View style={[
              step.circle,
              { borderColor: active ? colors.accent : done ? colors.success : colors.border },
              (active || done) && { backgroundColor: done ? colors.success : colors.accent },
            ]}>
              <ThemedText weight="bold" style={[step.circleText, { color: active || done ? '#fff' : colors.textMuted }]}>{n}</ThemedText>
            </View>
            <ThemedText
              weight={active ? 'semibold' : 'medium'}
              style={[step.label, { color: active ? colors.accent : done ? colors.text : colors.textMuted }]}
            >
              {label}
            </ThemedText>
            {n < labels.length && (
              <View style={[step.connector, { backgroundColor: done ? colors.success : colors.border }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const step = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  circleText: { fontSize: 11 },
  label: { fontSize: 12 },
  connector: { width: 24, height: 2, marginHorizontal: 2 },
});

const STEP_LABELS = ['Damage', 'Materials', 'Fix'];

// ── Header ──
function Header({ title, showBack, onBack, stepNum, isHome }: {
  title: string; showBack?: boolean; onBack?: () => void; stepNum?: number; isHome?: boolean;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <View style={[hdr.bar, { backgroundColor: colors.surface, borderBottomColor: stepNum != null ? 'transparent' : colors.border, borderBottomWidth: stepNum != null ? 0 : 1 }]}>
        {showBack ? (
          <TouchableOpacity style={[hdr.btnWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={onBack} activeOpacity={0.6}>
            <ChevronLeft size={20} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : <View style={hdr.btnPlaceholder} />}

        {isHome ? (
          <View style={hdr.brandRow}>
            <AppLogo size={24} color={colors.accent} />
            <ThemedText weight="bold" style={[hdr.brandName, { color: colors.text }]}>SnapSolve</ThemedText>
          </View>
        ) : (
          <ThemedText weight="semibold" style={[hdr.title, { color: colors.text }]}>{title}</ThemedText>
        )}

        <View style={hdr.btnPlaceholder} />
      </View>
      {stepNum != null && <StepProgress current={stepNum} labels={STEP_LABELS} />}
    </View>
  );
}

const hdr = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 17, textAlign: 'center', flex: 1 },
  btnWrap: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  btnPlaceholder: { width: 36, height: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  brandName: { fontSize: 20, letterSpacing: -0.5 },
});

// ── Tabs ──
export default function TabLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { 
        backgroundColor: colors.tabBar, 
        borderTopColor: colors.tabBarBorder, 
        borderTopWidth: 1, 
        paddingBottom: 6, 
        height: 60,
      },
      tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: -2 },
      headerShown: true,
    }}>
      <Tabs.Screen name="index" options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        header: () => <Header title="SnapSolve" isHome />,
      }} />
      <Tabs.Screen name="scan" options={{
        tabBarLabel: 'Snap',
        tabBarIcon: ({ color }) => <Camera size={20} color={color} />,
        header: () => <Header title="What's broken?" showBack onBack={() => router.push('/(tabs)/')} stepNum={1} />,
      }} />
      <Tabs.Screen name="inventory" options={{
        tabBarLabel: 'Materials',
        tabBarIcon: ({ color }) => <Package size={20} color={color} />,
        header: () => <Header title="Your materials" showBack onBack={() => router.push('/(tabs)/scan')} stepNum={2} />,
      }} />
      <Tabs.Screen name="results" options={{
        tabBarLabel: 'Fix',
        tabBarIcon: ({ color }) => <CheckCircle size={20} color={color} />,
        header: () => <Header title="Your fix" showBack onBack={() => router.push('/(tabs)/inventory')} stepNum={3} />,
      }} />
      <Tabs.Screen name="settings" options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color }) => <SettingsIcon size={20} color={color} />,
        header: () => <Header title="Settings" />,
      }} />
    </Tabs>
  );
}
