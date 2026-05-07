/**
 * Results Content — theme-aware repair guide display.
 * Human copy: "What went wrong", "How likely is this to work?", "Heads up", etc.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { AlertTriangle, CheckCircle2, Zap, Wrench, ShieldAlert, ListChecks } from 'lucide-react-native';
import { useTheme } from '../utils/ThemeContext';
import type { RepairAnalysis } from '../utils/api';

interface Props {
  analysis: RepairAnalysis;
}

export function ResultsContent({ analysis }: Props) {
  const { colors, isDark } = useTheme();

  const getViability = (score: number) => {
    if (score >= 70) return { bg: colors.successSoft, border: colors.success, text: isDark ? '#4ade80' : '#166534', label: 'Looking good', barColor: colors.success };
    if (score >= 40) return { bg: colors.warningSoft, border: colors.warning, text: isDark ? '#fbbf24' : '#854d0e', label: 'Worth a shot', barColor: colors.warning };
    return { bg: colors.dangerSoft, border: colors.danger, text: isDark ? '#f87171' : '#991b1b', label: 'Risky', barColor: colors.danger };
  };

  const v = getViability(analysis.viability_score);

  // Animated progress bar
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, { toValue: analysis.viability_score, duration: 900, useNativeDriver: false }).start();
  }, [analysis.viability_score]);

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.bg }]} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Here's your fix</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>Based on what we saw, here's what to do</Text>
      </View>

      {/* What went wrong */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
            <Zap size={16} color={colors.accent} strokeWidth={2} />
          </View>
          <Text style={[s.cardLabel, { color: colors.text }]}>What went wrong</Text>
        </View>
        <Text style={[s.cardBody, { color: colors.textSecondary }]}>{analysis.problem_identified}</Text>
      </View>

      {/* How likely is this to work? */}
      <View style={[s.card, { backgroundColor: v.bg, borderColor: v.border }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <CheckCircle2 size={16} color={v.text} strokeWidth={2} />
          </View>
          <Text style={[s.cardLabel, { color: v.text }]}>
            How likely is this to work? — {v.label}
          </Text>
        </View>
        <View style={s.scoreRow}>
          <Text style={[s.scoreNum, { color: v.text }]}>{analysis.viability_score}%</Text>
          <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Animated.View
              style={[s.progressFill, { backgroundColor: v.barColor, width: barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
            />
          </View>
        </View>
      </View>

      {/* Heads up */}
      <View style={[s.card, s.warningCard, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
            <AlertTriangle size={16} color={colors.danger} strokeWidth={2} />
          </View>
          <Text style={[s.cardLabel, { color: isDark ? colors.danger : '#991b1b' }]}>Heads up</Text>
        </View>
        <Text style={[s.cardBody, { color: isDark ? '#fca5a5' : '#991b1b' }]}>{analysis.safety_warning}</Text>
      </View>

      {/* You'll need */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: isDark ? '#052e16' : '#f0fdf4' }]}>
            <ListChecks size={16} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={[s.cardLabel, { color: colors.text }]}>You'll need</Text>
        </View>
        {analysis.selected_materials.map((mat, i) => (
          <View key={i} style={s.matRow}>
            <View style={[s.matDot, { backgroundColor: colors.success }]} />
            <Text style={[s.matText, { color: colors.textSecondary }]}>{mat}</Text>
          </View>
        ))}
      </View>

      {/* Here's what to do */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: isDark ? '#2e1065' : '#faf5ff' }]}>
            <Wrench size={16} color={isDark ? '#a78bfa' : '#7c3aed'} strokeWidth={2} />
          </View>
          <Text style={[s.cardLabel, { color: colors.text }]}>Here's what to do</Text>
        </View>
        {analysis.steps.map((step, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepLeft}>
              <View style={[s.stepCircle, { backgroundColor: colors.accent }]}>
                <Text style={s.stepNum}>{i + 1}</Text>
              </View>
              {i < analysis.steps.length - 1 && <View style={[s.stepLine, { backgroundColor: colors.border }]} />}
            </View>
            <Text style={[s.stepText, { color: colors.textSecondary }]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 16, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  badge: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  card: { borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  cardBody: { fontSize: 14, lineHeight: 21 },
  warningCard: { borderLeftWidth: 4 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreNum: { fontSize: 30, fontWeight: '800' },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  matRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  matDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  matText: { fontSize: 14, flex: 1 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepLeft: { alignItems: 'center', marginRight: 12 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepLine: { width: 2, height: 16, marginVertical: 3 },
  stepText: { fontSize: 14, lineHeight: 21, flex: 1, paddingTop: 4, paddingBottom: 14 },
});
