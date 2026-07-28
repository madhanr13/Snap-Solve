/**
 * Results Screen — "Here's your fix" (Step 3 of 3)
 * Uses useFocusEffect to reload analysis when navigated to from history.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RotateCcw, Share2, Wrench } from 'lucide-react-native';
import { ResultsContent } from '../../components/ResultsContent';
import { useTheme } from '../../utils/ThemeContext';
import type { RepairAnalysis } from '../../utils/api';
import { ThemedText } from '../../components/ThemedText';

export default function ResultsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [analysis, setAnalysis] = useState<RepairAnalysis | null>(null);

  // Reload every time this tab gains focus (so history taps work)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('repairAnalysis')
        .then((stored) => setAnalysis(stored ? JSON.parse(stored) : null))
        .catch(() => Alert.alert('Error', 'Failed to load repair guide'));
    }, [])
  );

  const handleShare = async () => {
    if (!analysis) return;
    const text =
      `🔧 SnapSolve Fix\n\n` +
      `Problem: ${analysis.problem_identified}\n` +
      `Difficulty: ${analysis.difficulty || 'Medium'} • ${analysis.estimated_time || '~15 min'}\n\n` +
      `⚠️ ${analysis.safety_warning}\n\n` +
      `You'll need:\n${analysis.selected_materials.map((m) => `• ${m}`).join('\n')}\n\n` +
      `Steps:\n${analysis.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
      `— via SnapSolve`;
    try { await Share.share({ message: text }); } catch (_) {}
  };

  const handleNew = () => {
    Alert.alert('Start fresh?', 'This will clear the current repair guide.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Start over',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['repairAnalysis', 'problemImageBase64', 'problemImageUri']);
          setAnalysis(null);
          router.push('/(tabs)/');
        },
      },
    ]);
  };

  if (!analysis) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={s.empty}>
          <View style={[s.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Wrench size={36} color={colors.accent} strokeWidth={1.5} />
          </View>
          <ThemedText weight="bold" style={[s.emptyTitle, { color: colors.text }]}>No fix yet</ThemedText>
          <ThemedText variant="secondary" style={s.emptyDesc}>
            Snap a photo of the damage and your materials to get a repair guide.
          </ThemedText>
          <TouchableOpacity
            style={[s.emptyBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => router.push('/(tabs)/')}
            activeOpacity={0.8}
          >
            <ThemedText weight="bold" style={s.emptyBtnText}>Go home</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={[s.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[s.barBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={14} color={colors.textSecondary} strokeWidth={2.5} />
          <ThemedText weight="bold" variant="secondary" style={s.barBtnText}>Share</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[s.barBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={handleNew} activeOpacity={0.7}>
          <RotateCcw size={14} color="#fff" strokeWidth={2.5} />
          <ThemedText weight="bold" style={s.barBtnPrimaryText}>New fix</ThemedText>
        </TouchableOpacity>
      </View>
      <ResultsContent analysis={analysis} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bar: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1,
  },
  barBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  barBtnText: { fontSize: 13 },
  barBtnPrimaryText: { fontSize: 13, color: '#fff' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, marginBottom: 10, textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 21, paddingHorizontal: 20 },
  emptyBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  emptyBtnText: { color: '#fff', fontSize: 16 },
});
