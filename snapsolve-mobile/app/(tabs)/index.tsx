/**
 * Home Screen — Recent fixes history + quick start CTA.
 * No greeting text. Shows past analyses like ChatGPT conversation list.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
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
            style={[s.heroCard, { backgroundColor: isDark ? '#1a1a2e' : '#0f172a' }]}
            onPress={() => router.push('/(tabs)/scan')}
            activeOpacity={0.9}
          >
            <View style={s.heroRow}>
              <View style={s.heroContent}>
                <Text style={s.heroTitle}>Fix something</Text>
                <Text style={s.heroDesc}>
                  Snap two photos and get an AI repair guide.
                </Text>
              </View>
              <View style={s.heroArrow}>
                <ArrowRight size={20} color="#ffffff" strokeWidth={2} />
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
                <Text style={[s.statNum, { color: colors.text }]}>{stats.total}</Text>
                <Text style={[s.statLabel, { color: colors.textMuted }]}>Total fixes</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TrendingUp size={18} color="#16a34a" strokeWidth={2} />
                <Text style={[s.statNum, { color: colors.text }]}>{stats.thisWeek}</Text>
                <Text style={[s.statLabel, { color: colors.textMuted }]}>This week</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Flame size={18} color="#f97316" strokeWidth={2} />
                <Text style={[s.statNum, { color: colors.text }]}>{stats.streak}</Text>
                <Text style={[s.statLabel, { color: colors.textMuted }]}>Day streak</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Recent Fixes ── */}
        <Animated.View style={anim(stats && stats.total > 0 ? 2 : 1)}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderLeft}>
              <Clock size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RECENT FIXES</Text>
            </View>
            {history.length > 0 && (
              <Text style={[s.historyCount, { color: colors.textMuted }]}>{history.length}</Text>
            )}
          </View>

          {history.length === 0 ? (
            /* Empty state */
            <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Wrench size={32} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No fixes yet</Text>
              <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                Your repair history will show up here after your first analysis.
              </Text>
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
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => handleOpenHistory(item)}
                    activeOpacity={0.6}
                  >
                    <View style={s.historyItemContent}>
                      <Text style={[s.historyProblem, { color: colors.text }]} numberOfLines={2}>
                        {item.problem}
                      </Text>
                      <Text style={[s.historyTime, { color: colors.textMuted }]}>
                        {timeAgo(item.timestamp)}
                      </Text>
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
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>QUICK TIPS</Text>
            </View>
          </View>
          <View style={[s.tipsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.tipLine, { color: colors.textSecondary }]}>💡  Good lighting = better AI results</Text>
            <Text style={[s.tipLine, { color: colors.textSecondary }]}>📐  Show the full damage, not just a corner</Text>
            <Text style={[s.tipLine, { color: colors.textSecondary }]}>🧰  Lay materials flat for best detection</Text>
          </View>
        </Animated.View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.textMuted }]}>Powered by Google Gemini AI</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 24 },

  // Hero
  heroCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 18, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19 },
  heroArrow: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 28, marginBottom: 10,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  historyCount: { fontSize: 12, fontWeight: '600' },

  // Empty state
  emptyCard: {
    marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 32,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // History list
  historyList: { marginHorizontal: 20, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  historyItemContent: { flex: 1 },
  historyProblem: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 6 },
  historyTime: { fontSize: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, gap: 4,
  },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },

  // Tips
  tipsCard: {
    marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10,
  },
  tipLine: { fontSize: 13, lineHeight: 18 },

  // Footer
  footer: { alignItems: 'center', paddingTop: 32, paddingBottom: 8 },
  footerText: { fontSize: 12, fontWeight: '500' },
});
