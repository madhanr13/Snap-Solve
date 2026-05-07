/**
 * Results Screen — "Here's your fix" (Step 3 of 3)
 * Uses useFocusEffect to reload analysis when navigated to from history.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RotateCcw, Share2, Wrench } from 'lucide-react-native';
import { ResultsContent } from '../../components/ResultsContent';
import { useTheme } from '../../utils/ThemeContext';
import type { RepairAnalysis } from '../../utils/api';

export default function ResultsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
      `Viability: ${analysis.viability_score}%\n\n` +
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
            <Wrench size={40} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No fix yet</Text>
          <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>
            Snap a photo of the damage and your materials to get a repair guide.
          </Text>
          <TouchableOpacity
            style={[s.emptyBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/(tabs)/')}
            activeOpacity={0.8}
          >
            <Text style={s.emptyBtnText}>Go home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={[s.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[s.barBtn, { borderColor: colors.border }]} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={15} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[s.barBtnText, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.barBtn, s.barBtnPrimary]} onPress={handleNew} activeOpacity={0.7}>
          <RotateCcw size={15} color="#fff" strokeWidth={2} />
          <Text style={s.barBtnPrimaryText}>New fix</Text>
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
    paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1,
  },
  barBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  barBtnText: { fontSize: 13, fontWeight: '600' },
  barBtnPrimary: { backgroundColor: '#1c1917', borderColor: '#1c1917' },
  barBtnPrimaryText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 21 },
  emptyBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
