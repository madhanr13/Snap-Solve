/**
 * Loading Spinner — animated dots with theme support.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

interface Props {
  visible: boolean;
  message?: string;
}

export function LoadingSpinner({ visible, message }: Props) {
  const { colors } = useTheme();
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    if (!visible) return;
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: -8, duration: 400, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]))
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[s.bg, { backgroundColor: colors.bg + 'F5' }]}>
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <View style={[s.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
        <View style={s.dotsRow}>
          {dots.map((d, i) => (
            <Animated.View key={i} style={[s.dot, { backgroundColor: colors.accent, transform: [{ translateY: d }] }]} />
          ))}
        </View>
        <Text style={[s.msg, { color: colors.text }]}>{message || 'Working on it...'}</Text>
        <Text style={[s.hint, { color: colors.textMuted }]}>This usually takes a few seconds</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  card: {
    alignItems: 'center', paddingHorizontal: 40, paddingVertical: 36, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  msg: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 12, marginTop: 6 },
});
