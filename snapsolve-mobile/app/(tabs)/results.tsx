/**
 * Screen 3: Results Dashboard
 * Displays the repair analysis from the backend.
 * Shows problem identification, viability score, safety warning, materials, and step-by-step guide.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RotateCcw } from 'lucide-react-native';
import { ResultsContent } from '../../components/ResultsContent';
import type { RepairAnalysis } from '../../utils/api';

export default function ResultsScreen() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<RepairAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, []);

  /**
   * Load the repair analysis from AsyncStorage.
   * If not found, show empty state.
   */
  const loadAnalysis = async () => {
    try {
      const stored = await AsyncStorage.getItem('repairAnalysis');
      if (stored) {
        setAnalysis(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
      Alert.alert('Error', 'Failed to load repair analysis');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear analysis and return to the first camera screen.
   */
  const handleNewAnalysis = async () => {
    try {
      await AsyncStorage.removeItem('repairAnalysis');
      await AsyncStorage.removeItem('problemImageBase64');
      setAnalysis(null);
      router.push('/(tabs)/index');
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  // Empty state
  if (isLoading || !analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Repair Analysis Yet</Text>
          <Text style={styles.emptyText}>
            Capture a broken object and available materials to generate a repair guide.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/(tabs)/index')}
          >
            <Text style={styles.startButtonText}>Start Analysis</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Repair Guide</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleNewAnalysis}
        >
          <RotateCcw size={20} color="#1e293b" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Results Content Component */}
      <ResultsContent analysis={analysis} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  refreshButton: {
    padding: 8,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
