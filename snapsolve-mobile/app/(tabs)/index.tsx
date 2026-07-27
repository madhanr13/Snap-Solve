/**
 * Home Screen — Recent fixes history + quick start CTA.
 * No greeting text. Shows past analyses like ChatGPT conversation list.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowRight,
  Sparkles,
  ChevronRight,
  Clock,
  Wrench,
  Trophy,
  Flame,
  TrendingUp,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../utils/ThemeContext';
import { getHistory, getRepairStats } from '../../utils/api';
import type { HistoryItem, RepairStats } from '../../utils/api';
import { ThemedText } from '../../components/ThemedText';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<RepairStats | null>(null);

  // Reload history every time the home tab gains focus
  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
      getRepairStats().then(setStats);
    }, [])
  );

  // Entrance animations
  const fadeValues = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const slideValues = useRef([...Array(3)].map(() => new Animated.Value(20))).current;

  useEffect(() => {
    const anims = fadeValues.map((fade, i) =>
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 450, delay: i * 80, useNativeDriver: true }),
        Animated.timing(slideValues[i], { toValue: 0, duration: 450, delay: i * 80, useNativeDriver: true }),
      ])
    );
    Animated.parallel(anims).start();
  }, []);

  const anim = (i: number) => ({
    opacity: fadeValues[i],
    transform: [{ translateY: slideValues[i] }],
  });

  /** Load a past analysis into results and navigate there. */
  const handleOpenHistory = async (item: HistoryItem) => {
    await AsyncStorage.setItem('repairAnalysis', JSON.stringify(item.analysis));
    router.push('/(tabs)/results');
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Quick Start Card ── */}
        <Animated.View style={anim(0)}>
          <TouchableOpacity
            style={[s.heroCard, { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => router.push('/(tabs)/scan')}
            activeOpacity={0.9}
          >
            <View style={s.heroRow}>
              <View style={s.heroContent}>
                <ThemedText weight="bold" style={s.heroTitle}>Fix something</ThemedText>
                <ThemedText style={s.heroDesc}>
                  Snap two photos and get an AI repair guide.
                </ThemedText>
              </View>
              <View style={s.heroArrow}>
                <ArrowRight size={20} color={colors.bg} strokeWidth={2} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Repair Stats ── */}
        {stats && stats.total > 0 && (
          <Animated.View style={anim(1)}>
            <View style={[s.statsRow, { marginHorizontal: 20, marginTop: 16 }]}>
              <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Trophy size={18} color={colors.accent} strokeWidth={2} />
                <ThemedText weight="bold" style={s.statNum}>{stats.total}</ThemedText>
                <ThemedText weight="semibold" variant="muted" style={s.statLabel}>Total fixes</ThemedText>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TrendingUp size={18} color={colors.success} strokeWidth={2} />
                <ThemedText weight="bold" style={s.statNum}>{stats.thisWeek}</ThemedText>
                <ThemedText weight="semibold" variant="muted" style={s.statLabel}>This week</ThemedText>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Flame size={18} color={colors.danger} strokeWidth={2} />
                <ThemedText weight="bold" style={s.statNum}>{stats.streak}</ThemedText>
                <ThemedText weight="semibold" variant="muted" style={s.statLabel}>Day streak</ThemedText>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Recent Fixes ── */}
        <Animated.View style={anim(stats && stats.total > 0 ? 2 : 1)}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderLeft}>
              <Clock size={14} color={colors.textMuted} strokeWidth={2} />
              <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>RECENT FIXES</ThemedText>
            </View>
            {history.length > 0 && (
              <ThemedText weight="semibold" variant="muted" style={s.historyCount}>{history.length}</ThemedText>
            )}
          </View>

          {history.length === 0 ? (
            /* Empty state */
            <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Wrench size={32} color={colors.textMuted} strokeWidth={1.5} />
              <ThemedText weight="semibold" style={s.emptyTitle}>No fixes yet</ThemedText>
              <ThemedText variant="muted" style={s.emptyDesc}>
                Your repair history will show up here after your first analysis.
              </ThemedText>
            </View>
          ) : (
            /* History list */
            <View style={[s.historyList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {history.map((item, idx) => {
                const isLast = idx === history.length - 1;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      s.historyItem,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                    onPress={() => handleOpenHistory(item)}
                    activeOpacity={0.6}
                  >
                    <View style={s.historyItemContent}>
                      <ThemedText weight="medium" style={s.historyProblem} numberOfLines={2}>
                        {item.problem}
                      </ThemedText>
                      <ThemedText variant="muted" style={s.historyTime}>
                        {timeAgo(item.timestamp)}
                      </ThemedText>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* ── Quick Tips ── */}
        <Animated.View style={anim(2)}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderLeft}>
              <Sparkles size={14} color={colors.textMuted} strokeWidth={2} />
              <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>QUICK TIPS</ThemedText>
            </View>
          </View>
          <View style={[s.tipsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText variant="secondary" style={s.tipLine}>💡  Good lighting = better AI results</ThemedText>
            <ThemedText variant="secondary" style={s.tipLine}>📐  Show the full damage, not just a corner</ThemedText>
            <ThemedText variant="secondary" style={s.tipLine}>🧰  Lay materials flat for best detection</ThemedText>
          </View>
        </Animated.View>

        <View style={s.footer}>
          <ThemedText weight="medium" variant="muted" style={s.footerText}>Powered by Google Gemini AI</ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 24 },

  // Hero
  heroCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: 20, color: '#fff', marginBottom: 6 },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  heroArrow: {
    width: 40, height: 40, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 28, marginBottom: 10,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2 },
  historyCount: { fontSize: 12 },

  // Empty state
  emptyCard: {
    marginHorizontal: 20, borderRadius: 8, borderWidth: 1, padding: 32,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, marginTop: 14, marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // History list
  historyList: { marginHorizontal: 20, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  historyItemContent: { flex: 1 },
  historyProblem: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  historyTime: { fontSize: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 8,
    borderWidth: 1, gap: 4,
  },
  statNum: { fontSize: 22 },
  statLabel: { fontSize: 10, letterSpacing: 0.5 },

  // Tips
  tipsCard: {
    marginHorizontal: 20, borderRadius: 8, borderWidth: 1, padding: 16, gap: 10,
  },
  tipLine: { fontSize: 13, lineHeight: 18 },

  // Footer
  footer: { alignItems: 'center', paddingTop: 32, paddingBottom: 8 },
  footerText: { fontSize: 12 },
});
