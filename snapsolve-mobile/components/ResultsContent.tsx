/**
 * Results Content — interactive repair guide with:
 * - Difficulty + estimated time badges (Feature 2)
 * - Tappable step checklist with animations (Feature 1)
 * - Celebration banner when all steps complete (Feature 1)
 * - Haptic feedback on step check (Feature 6)
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { AlertTriangle, Zap, Wrench, ListChecks, Clock, Gauge, CheckCircle2, Circle, PartyPopper } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../utils/ThemeContext';
import type { RepairAnalysis } from '../utils/api';

interface Props {
  analysis: RepairAnalysis;
}

const DIFFICULTY_CONFIG: Record<string, { color: string; darkColor: string; bg: string; darkBg: string }> = {
  Easy: { color: '#16a34a', darkColor: '#4ade80', bg: '#f0fdf4', darkBg: '#052e16' },
  Medium: { color: '#d97706', darkColor: '#fbbf24', bg: '#fffbeb', darkBg: '#451a03' },
  Hard: { color: '#dc2626', darkColor: '#f87171', bg: '#fef2f2', darkBg: '#450a0a' },
};

export function ResultsContent({ analysis }: Props) {
  const { colors, isDark } = useTheme();
  const [checked, setChecked] = useState<boolean[]>(new Array(analysis.steps.length).fill(false));
  const completedCount = checked.filter(Boolean).length;
  const allDone = completedCount === analysis.steps.length && analysis.steps.length > 0;

  // Celebration animation
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (allDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(celebrateAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.spring(celebrateScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }),
      ]).start();
    } else {
      celebrateAnim.setValue(0);
      celebrateScale.setValue(0.8);
    }
  }, [allDone]);

  const toggleStep = (index: number) => {
    const next = [...checked];
    next[index] = !next[index];
    setChecked(next);
    if (next[index]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const diff = DIFFICULTY_CONFIG[analysis.difficulty] || DIFFICULTY_CONFIG.Medium;
  const diffColor = isDark ? diff.darkColor : diff.color;
  const diffBg = isDark ? diff.darkBg : diff.bg;

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.bg }]} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Here's your fix</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>Based on what we saw, here's what to do</Text>
      </View>

      {/* Difficulty + Time badges */}
      <View style={s.badgesRow}>
        <View style={[s.metaBadge, { backgroundColor: diffBg, borderColor: diffColor + '30' }]}>
          <Gauge size={14} color={diffColor} strokeWidth={2.5} />
          <Text style={[s.metaBadgeText, { color: diffColor }]}>{analysis.difficulty || 'Medium'}</Text>
        </View>
        <View style={[s.metaBadge, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff', borderColor: colors.accent + '30' }]}>
          <Clock size={14} color={colors.accent} strokeWidth={2.5} />
          <Text style={[s.metaBadgeText, { color: colors.accent }]}>{analysis.estimated_time || '~15 min'}</Text>
        </View>
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

      {/* Interactive Steps */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: isDark ? '#2e1065' : '#faf5ff' }]}>
            <Wrench size={16} color={isDark ? '#a78bfa' : '#7c3aed'} strokeWidth={2} />
          </View>
          <Text style={[s.cardLabel, { color: colors.text }]}>Here's what to do</Text>
          <Text style={[s.progressLabel, { color: colors.textMuted }]}>
            {completedCount}/{analysis.steps.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View
            style={[
              s.progressFill,
              {
                backgroundColor: allDone ? colors.success : colors.accent,
                width: `${analysis.steps.length > 0 ? (completedCount / analysis.steps.length) * 100 : 0}%`,
              },
            ]}
          />
        </View>

        {analysis.steps.map((step, i) => (
          <TouchableOpacity
            key={i}
            style={s.stepRow}
            onPress={() => toggleStep(i)}
            activeOpacity={0.6}
          >
            <View style={s.stepLeft}>
              {checked[i] ? (
                <CheckCircle2 size={24} color={colors.success} strokeWidth={2} />
              ) : (
                <Circle size={24} color={colors.textMuted} strokeWidth={1.5} />
              )}
              {i < analysis.steps.length - 1 && (
                <View style={[s.stepLine, { backgroundColor: checked[i] ? colors.success + '40' : colors.border }]} />
              )}
            </View>
            <Text
              style={[
                s.stepText,
                { color: checked[i] ? colors.textMuted : colors.textSecondary },
                checked[i] && s.stepTextDone,
              ]}
            >
              {step}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Celebration banner */}
      {allDone && (
        <Animated.View
          style={[
            s.celebrationCard,
            {
              backgroundColor: isDark ? '#052e16' : '#f0fdf4',
              borderColor: colors.success,
              opacity: celebrateAnim,
              transform: [{ scale: celebrateScale }],
            },
          ]}
        >
          <PartyPopper size={28} color={colors.success} strokeWidth={2} />
          <View style={s.celebrationText}>
            <Text style={[s.celebrationTitle, { color: isDark ? '#4ade80' : '#166534' }]}>All done! 🎉</Text>
            <Text style={[s.celebrationDesc, { color: isDark ? '#86efac' : '#15803d' }]}>
              You've completed all the repair steps. Nice work!
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 12, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Difficulty + time badges
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  metaBadgeText: { fontSize: 13, fontWeight: '700' },

  badge: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  card: { borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  cardBody: { fontSize: 14, lineHeight: 21 },
  warningCard: { borderLeftWidth: 4 },

  matRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  matDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  matText: { fontSize: 14, flex: 1 },

  // Progress
  progressLabel: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  // Interactive steps
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 2 },
  stepLeft: { alignItems: 'center', marginRight: 12 },
  stepLine: { width: 2, height: 16, marginVertical: 3 },
  stepText: { fontSize: 14, lineHeight: 21, flex: 1, paddingTop: 2, paddingBottom: 14 },
  stepTextDone: { textDecorationLine: 'line-through', opacity: 0.6 },

  // Celebration
  celebrationCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14,
    borderWidth: 1, marginBottom: 10, gap: 14,
  },
  celebrationText: { flex: 1 },
  celebrationTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  celebrationDesc: { fontSize: 13, lineHeight: 18 },
});
