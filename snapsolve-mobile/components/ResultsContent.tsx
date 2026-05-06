/**
 * Results Dashboard - Displays the repair analysis from the backend.
 * Shows problem identification, viability score, safety warning, materials, and step-by-step guide.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react-native';
import type { RepairAnalysis } from '../utils/api';

interface ResultsScreenProps {
  analysis: RepairAnalysis;
}

export function ResultsContent({ analysis }: ResultsScreenProps) {
  // Determine viability color based on score
  const getViabilityColor = (score: number) => {
    if (score >= 70) return { bg: '#dcfce7', border: '#22c55e', text: '#166534', label: 'High Viability' };
    if (score >= 40) return { bg: '#fef3c7', border: '#eab308', text: '#854d0e', label: 'Moderate Viability' };
    return { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d', label: 'Low Viability' };
  };

  const viability = getViabilityColor(analysis.viability_score);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Repair Analysis</Text>
        <Text style={styles.subtitle}>Step-by-step temporary fix guide</Text>
      </View>

      {/* Problem Identified Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Zap size={20} color="#1e293b" strokeWidth={2} />
          <Text style={styles.cardTitle}>Problem Identified</Text>
        </View>
        <Text style={styles.cardContent}>{analysis.problem_identified}</Text>
      </View>

      {/* Viability Score Card - Dynamic Color Coding */}
      <View
        style={[
          styles.card,
          styles.viabilityCard,
          { backgroundColor: viability.bg, borderColor: viability.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <CheckCircle2 size={20} color={viability.text} strokeWidth={2} />
          <Text style={[styles.cardTitle, { color: viability.text }]}>
            Viability: {viability.label}
          </Text>
        </View>
        <Text style={[styles.viabilityScore, { color: viability.text }]}>
          {analysis.viability_score}%
        </Text>
      </View>

      {/* Safety Warning Card - Soft Red, Bold Border */}
      <View style={[styles.card, styles.safetyCard]}>
        <View style={styles.cardHeader}>
          <AlertCircle size={20} color="#b91c1c" strokeWidth={2} />
          <Text style={[styles.cardTitle, { color: '#7f1d1d' }]}>
            Safety Warning
          </Text>
        </View>
        <Text style={[styles.cardContent, { color: '#7f1d1d' }]}>
          {analysis.safety_warning}
        </Text>
      </View>

      {/* Selected Materials Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Materials Needed</Text>
        <View style={styles.materialsList}>
          {analysis.selected_materials.map((material, idx) => (
            <View key={`material-${idx}`} style={styles.materialItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.materialText}>{material}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Steps Checklist */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Repair Steps</Text>
        <View style={styles.stepsList}>
          {analysis.steps.map((step, idx) => (
            <View key={`step-${idx}`} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer spacing */}
      <View style={styles.footerSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Very light gray background
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a', // Near black, slate-900
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b', // Slate-500
    marginTop: 4,
  },

  // Card Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1e293b', // Default dark slate
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 10,
  },
  cardContent: {
    fontSize: 14,
    color: '#334155', // Slate-700
    lineHeight: 20,
  },

  // Viability Card
  viabilityCard: {
    borderLeftWidth: 0,
    borderWidth: 2,
  },
  viabilityScore: {
    fontSize: 36,
    fontWeight: '700',
    marginTop: 8,
  },

  // Safety Card
  safetyCard: {
    backgroundColor: '#fef2f2', // Red-50
    borderLeftColor: '#dc2626', // Red-600
  },

  // Materials List
  materialsList: {
    marginTop: 8,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  bulletPoint: {
    fontSize: 18,
    color: '#64748b',
    marginRight: 8,
    fontWeight: '600',
  },
  materialText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },

  // Steps List
  stepsList: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0', // Slate-200
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  stepText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    flex: 1,
    paddingTop: 2,
  },

  // Footer
  footerSpacing: {
    height: 40,
  },
});
