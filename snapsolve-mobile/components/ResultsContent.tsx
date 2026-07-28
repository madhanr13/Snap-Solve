/**
 * Results Content — interactive repair guide with:
 * - Difficulty + estimated time badges (Feature 2)
 * - Tappable step checklist with animations (Feature 1)
 * - Celebration banner when all steps complete (Feature 1)
 * - Haptic feedback on step check (Feature 6)
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { AlertTriangle, Zap, Wrench, ListChecks, Clock, Gauge, CheckCircle2, Circle, PartyPopper } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../utils/ThemeContext';
import type { RepairAnalysis } from '../utils/api';
import { ThemedText } from './ThemedText';

interface Props {
  analysis: RepairAnalysis;
}

const DIFFICULTY_CONFIG: Record<string, { color: string; darkColor: string; bg: string; darkBg: string }> = {
  Easy: { color: '#059669', darkColor: '#34D399', bg: '#ECFDF5', darkBg: '#064E3B' },
  Medium: { color: '#D97706', darkColor: '#FBBF24', bg: '#FEF3C7', darkBg: '#78350F' },
  Hard: { color: '#DC2626', darkColor: '#F87171', bg: '#FEF2F2', darkBg: '#7F1D1D' },
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
        <ThemedText weight="bold" style={[s.title, { color: colors.text }]}>Here's your fix</ThemedText>
        <ThemedText variant="secondary" style={s.subtitle}>Based on what we saw, here's what to do</ThemedText>
      </View>

      {/* Difficulty + Time badges */}
      <View style={s.badgesRow}>
        <View style={[s.metaBadge, { backgroundColor: diffBg, borderColor: diffColor + '20' }]}>
          <Gauge size={14} color={diffColor} strokeWidth={2.5} />
          <ThemedText weight="bold" style={[s.metaBadgeText, { color: diffColor }]}>{analysis.difficulty || 'Medium'}</ThemedText>
        </View>
        <View style={[s.metaBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '20' }]}>
          <Clock size={14} color={colors.accent} strokeWidth={2.5} />
          <ThemedText weight="bold" style={[s.metaBadgeText, { color: colors.accent }]}>{analysis.estimated_time || '~15 min'}</ThemedText>
        </View>
      </View>

      {/* What went wrong */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: colors.accentSoft }]}>
            <Zap size={16} color={colors.accent} strokeWidth={2} />
          </View>
          <ThemedText weight="semibold" style={s.cardLabel}>What went wrong</ThemedText>
        </View>
        <ThemedText variant="secondary" style={s.cardBody}>{analysis.problem_identified}</ThemedText>
      </View>

      {/* Heads up */}
      <View style={[s.card, s.warningCard, { backgroundColor: colors.dangerSoft, borderColor: colors.danger, shadowColor: isDark ? '#000' : '#ef4444' }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: isDark ? '#3F1A1A' : '#FEF2F2' }]}>
            <AlertTriangle size={16} color={colors.danger} strokeWidth={2} />
          </View>
          <ThemedText weight="semibold" variant="danger" style={s.cardLabel}>Heads up</ThemedText>
        </View>
        <ThemedText variant="danger" style={s.cardBody}>{analysis.safety_warning}</ThemedText>
      </View>

      {/* You'll need */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: colors.successSoft }]}>
            <ListChecks size={16} color={colors.success} strokeWidth={2} />
          </View>
          <ThemedText weight="semibold" style={s.cardLabel}>You'll need</ThemedText>
        </View>
        {analysis.selected_materials.map((mat, i) => (
          <View key={i} style={s.matRow}>
            <View style={[s.matDot, { backgroundColor: colors.success }]} />
            <ThemedText variant="secondary" style={s.matText}>{mat}</ThemedText>
          </View>
        ))}
      </View>

      {/* Interactive Steps */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
        <View style={s.cardRow}>
          <View style={[s.badge, { backgroundColor: colors.surfaceAlt }]}>
            <Wrench size={16} color={colors.text} strokeWidth={2} />
          </View>
          <ThemedText weight="semibold" style={s.cardLabel}>Here's what to do</ThemedText>
          <ThemedText weight="bold" variant="muted" style={s.progressLabel}>
            {completedCount}/{analysis.steps.length}
          </ThemedText>
        </View>

        {/* Progress bar */}
        <View style={[s.progressTrack, { backgroundColor: colors.borderLight }]}>
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
            activeOpacity={0.7}
          >
            <View style={s.stepLeft}>
              {checked[i] ? (
                <CheckCircle2 size={22} color={colors.success} strokeWidth={2.5} />
              ) : (
                <Circle size={22} color={colors.textMuted} strokeWidth={2} />
              )}
              {i < analysis.steps.length - 1 && (
                <View style={[s.stepLine, { backgroundColor: checked[i] ? colors.success + '40' : colors.border }]} />
              )}
            </View>
            <ThemedText
              variant={checked[i] ? "muted" : "secondary"}
              style={[
                s.stepText,
                checked[i] && s.stepTextDone,
              ]}
            >
              {step}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Celebration banner */}
      {allDone && (
        <Animated.View
          style={[
            s.celebrationCard,
            {
              backgroundColor: colors.successSoft,
              borderColor: colors.success,
              opacity: celebrateAnim,
              transform: [{ scale: celebrateScale }],
            },
          ]}
        >
          <View style={[s.celebrationIconWrap, { backgroundColor: colors.success + '15' }]}>
            <PartyPopper size={28} color={colors.success} strokeWidth={2} />
          </View>
          <View style={s.celebrationText}>
            <ThemedText weight="bold" variant="success" style={s.celebrationTitle}>All done! 🎉</ThemedText>
            <ThemedText variant="success" style={s.celebrationDesc}>
              You've completed all the repair steps. Nice work!
            </ThemedText>
          </View>
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { marginBottom: 16, marginTop: 4 },
  title: { fontSize: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Difficulty + time badges
  badgesRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, borderWidth: 1,
  },
  metaBadgeText: { fontSize: 13 },

  badge: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  card: { 
    borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardLabel: { fontSize: 15, flex: 1 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  warningCard: { borderLeftWidth: 5 },

  matRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  matDot: { width: 6, height: 6, borderRadius: 3, marginRight: 12 },
  matText: { fontSize: 14, flex: 1 },

  // Progress
  progressLabel: { fontSize: 12 },
  progressTrack: { height: 6, borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // Interactive steps
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 2 },
  stepLeft: { alignItems: 'center', marginRight: 14 },
  stepLine: { width: 2, height: 20, marginVertical: 4 },
  stepText: { fontSize: 14, lineHeight: 22, flex: 1, paddingTop: 1, paddingBottom: 16 },
  stepTextDone: { textDecorationLine: 'line-through' },

  // Celebration
  celebrationCard: {
    flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16,
    borderWidth: 1, marginBottom: 16, gap: 16,
  },
  celebrationIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  celebrationText: { flex: 1 },
  celebrationTitle: { fontSize: 16, marginBottom: 2 },
  celebrationDesc: { fontSize: 13, lineHeight: 18 },
});
