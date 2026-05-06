/**
 * Loading Spinner Component - Professional industrial minimalist design.
 * Used during API analysis to indicate "Analyzing mechanical properties..."
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  visible: boolean;
  message?: string;
}

export function LoadingSpinner({ visible, message }: LoadingSpinnerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.spinnerBox}>
        {/* Monochrome spinner - uses platform-specific ActivityIndicator */}
        <ActivityIndicator size="large" color="#1e293b" />
        
        {/* Professional text message */}
        <Text style={styles.message}>
          {message || 'Analyzing mechanical properties...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slight transparency, industrial feel
    zIndex: 1000,
  },
  spinnerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 24,
    fontSize: 16,
    color: '#334155', // Slate-600
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
