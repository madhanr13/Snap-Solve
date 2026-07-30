/**
 * Loading Spinner — rotating messages, pulsing ring, smooth animations,
 * and optional live streaming text preview.
 *
 * When `streamingText` is provided, the raw AI tokens are shown in a
 * scrollable mini-preview with a blinking cursor, replacing the
 * rotating fun messages once streaming starts.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
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
  /** Raw streaming tokens from SSE — displayed as a live preview when non-empty. */
  streamingText?: string;
}

export function LoadingSpinner({ visible, message, streamingText }: Props) {
  const { colors, isDark } = useTheme();
  const [msgIndex, setMsgIndex] = useState(0);
  const streamScrollRef = useRef<ScrollView>(null);

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
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  // Cursor blink
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    // Wrench rotation animation
    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    rotate.start();

    // Dots bounce
    const dotAnims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(d, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    dotAnims.forEach((a) => a.start());

    // Pulse ring
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.6, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();

    // Cursor blink
    const cursorBlink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    cursorBlink.start();

    // Cycle messages (only when not streaming)
    const interval = setInterval(() => {
      Animated.timing(msgFade, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setMsgIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
        Animated.timing(msgFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, 2800);

    return () => {
      rotate.stop();
      dotAnims.forEach((a) => a.stop());
      pulse.stop();
      cursorBlink.stop();
      clearInterval(interval);
    };
  }, [visible]);

  // Auto-scroll to bottom when streaming text updates
  useEffect(() => {
    if (streamingText && streamScrollRef.current) {
      streamScrollRef.current.scrollToEnd({ animated: false });
    }
  }, [streamingText]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30deg', '30deg'],
  });

  const isStreaming = !!streamingText;

  return (
    <View style={[s.bg, { backgroundColor: isDark ? 'rgba(10,13,24,0.92)' : 'rgba(248,250,252,0.92)' }]}>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#4f46e5' }]}>
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
            <AppLogo size={32} color={colors.accent} strokeWidth={2.5} />
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

        {isStreaming ? (
          /* ── Streaming live preview ── */
          <>
            <ThemedText weight="semibold" style={[s.msg, { color: colors.accent, marginBottom: 8 }]}>
              AI is generating...
            </ThemedText>
            <View style={[s.streamBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <ScrollView
                ref={streamScrollRef}
                style={s.streamScroll}
                showsVerticalScrollIndicator={false}
              >
                <ThemedText style={[s.streamText, { color: colors.textMuted }]}>
                  {streamingText}
                  <Animated.Text style={{ opacity: cursorOpacity, color: colors.accent }}>▌</Animated.Text>
                </ThemedText>
              </ScrollView>
            </View>
          </>
        ) : (
          /* ── Rotating fun message ── */
          <>
            <Animated.View style={{ opacity: msgFade, minHeight: 28, justifyContent: 'center' }}>
              <ThemedText weight="semibold" style={[s.msg, { color: colors.text }]}>
                {message || FUN_MESSAGES[msgIndex]}
              </ThemedText>
            </Animated.View>
            <ThemedText variant="muted" style={s.hint}>Local AI may take a moment — hang tight</ThemedText>
          </>
        )}
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
    alignItems: 'center', paddingHorizontal: 36, paddingVertical: 40, 
    borderRadius: 16, borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    width: '80%',
    maxWidth: 320,
  },
  iconArea: { justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  pulseRing: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
    borderWidth: 2,
  },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  msg: { fontSize: 16, textAlign: 'center', paddingHorizontal: 10 },
  hint: { fontSize: 12, marginTop: 8, opacity: 0.7 },

  // Streaming preview
  streamBox: {
    width: '100%',
    maxHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  streamScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streamText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
});
