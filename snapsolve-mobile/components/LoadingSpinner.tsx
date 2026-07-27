/**
 * Loading Spinner — fun rotating messages + wrench animation.
 * Feature 3: Makes the wait feel shorter with personality.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { AppLogo } from './AppLogo';
import { useTheme } from '../utils/ThemeContext';
import { ThemedText } from './ThemedText';

const FUN_MESSAGES = [
  'Inspecting the damage...',
  'Consulting the repair manual...',
  'Measuring twice...',
  'Finding the duct tape...',
  'Analyzing materials...',
  'Engineering a solution...',
  'Running stress simulations...',
  'Almost there...',
  'Putting the pieces together...',
  'Channeling inner MacGyver...',
];

interface Props {
  visible: boolean;
  message?: string;
}

export function LoadingSpinner({ visible, message }: Props) {
  const { colors } = useTheme();
  const [msgIndex, setMsgIndex] = useState(0);

  // Wrench rotation
  const rotateAnim = useRef(new Animated.Value(0)).current;
  // Dots bounce
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  // Message fade
  const msgFade = useRef(new Animated.Value(1)).current;
  // Pulse ring
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;

    // Wrench rotation animation
    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    rotate.start();

    // Dots bounce
    const dotAnims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: -10, duration: 350, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    dotAnims.forEach((a) => a.start());

    // Pulse ring
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();

    // Cycle messages
    const interval = setInterval(() => {
      Animated.timing(msgFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMsgIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
        Animated.timing(msgFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2500);

    return () => {
      rotate.stop();
      dotAnims.forEach((a) => a.stop());
      pulse.stop();
      clearInterval(interval);
    };
  }, [visible]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-20deg', '20deg'],
  });

  // Since Animated.Text can't wrap ThemedText directly with custom props easily, 
  // we'll just apply the animated style outside.
  return (
    <View style={[s.bg, { backgroundColor: colors.bg + 'F5' }]}>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Pulsing ring */}
        <View style={s.iconArea}>
          <Animated.View
            style={[
              s.pulseRing,
              {
                borderColor: colors.accent,
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <Animated.View style={[s.iconCircle, { backgroundColor: colors.surfaceAlt, transform: [{ rotate: spin }] }]}>
            <AppLogo size={28} color={colors.accent} strokeWidth={2} />
          </Animated.View>
        </View>

        {/* Bouncing dots */}
        <View style={s.dotsRow}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={[s.dot, { backgroundColor: colors.accent, transform: [{ translateY: d }] }]}
            />
          ))}
        </View>

        {/* Rotating message */}
        <Animated.View style={{ opacity: msgFade }}>
          <ThemedText weight="semibold" style={s.msg}>
            {message || FUN_MESSAGES[msgIndex]}
          </ThemedText>
        </Animated.View>
        <ThemedText variant="muted" style={s.hint}>This usually takes a few seconds</ThemedText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  card: {
    alignItems: 'center', paddingHorizontal: 40, paddingVertical: 36, 
    borderRadius: 8, borderWidth: 1, // Flat design, no shadows
  },
  iconArea: { justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  pulseRing: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 1, // thinner pulse ring
  },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  msg: { fontSize: 16, textAlign: 'center' },
  hint: { fontSize: 12, marginTop: 6 },
});
