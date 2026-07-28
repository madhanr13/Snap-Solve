/**
 * Scan Screen — "What's broken?" (Step 1 of 3)
 *
 * Camera fix: uses useIsFocused() to unmount/remount the camera when
 * navigating between tabs. This prevents the blank camera issue.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import {
  Camera as CameraIcon,
  Check,
  X,
  Zap,
  ZapOff,
  Type,
  Camera as CamSwitch,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { compressImageToBase64 } from '../../utils/ImageCompressor';
import { useTheme } from '../../utils/ThemeContext';
import { getToolbox, api } from '../../utils/api';
import { ThemedText } from '../../components/ThemedText';

export default function ScanScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused(); // ← Key fix: camera remounts when tab gains focus
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewCompressed, setPreviewCompressed] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textDescription, setTextDescription] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  // Clear old analysis when starting a new scan flow
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.removeItem('repairAnalysis');
    }, [])
  );

  // Permission screen
  if (!permission?.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.permBox}>
          <View style={[styles.permIcon, { backgroundColor: colors.surfaceAlt }]}>
            <CameraIcon size={36} color={colors.accent} strokeWidth={1.5} />
          </View>
          <ThemedText weight="bold" style={styles.permTitle}>Camera access needed</ThemedText>
          <ThemedText variant="secondary" style={styles.permDesc}>
            We need your camera to take photos of the damage and your materials.
          </ThemedText>
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => requestPermission()}
            activeOpacity={0.8}
          >
            <ThemedText weight="bold" style={styles.permBtnText}>Allow Camera</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (isProcessing || !cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo.uri) throw new Error('Failed to capture photo');
      const compressed = await compressImageToBase64(photo.uri);
      setPreviewUri(photo.uri);
      setPreviewCompressed(compressed);
    } catch (error) {
      Alert.alert('Oops', error instanceof Error ? error.message : 'Capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewCompressed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaving(true);
    try {
      await AsyncStorage.setItem('problemImageBase64', previewCompressed.base64);
      await AsyncStorage.setItem('problemImageUri', previewUri || '');
      await AsyncStorage.removeItem('problemTextDescription');

      // Check if user has a saved toolbox
      const toolbox = await getToolbox();
      if (toolbox) {
        Alert.alert(
          'Use saved toolbox?',
          'You have materials saved. Use them instead of taking a new photo?',
          [
            {
              text: 'No, take new photo',
              style: 'cancel',
              onPress: () => {
                setPreviewUri(null);
                setPreviewCompressed(null);
                router.push('/(tabs)/inventory');
              },
            },
            {
              text: 'Yes, use saved',
              onPress: async () => {
                try {
                  // Go straight to analysis
                  await AsyncStorage.setItem('inventoryImageBase64', toolbox);
                  setPreviewUri(null);
                  setPreviewCompressed(null);
                  router.push('/(tabs)/inventory');
                } catch (err) {
                  Alert.alert('Error', 'Failed to use toolbox. Taking new photo instead.');
                  setPreviewUri(null);
                  setPreviewCompressed(null);
                  router.push('/(tabs)/inventory');
                }
              },
            },
          ]
        );
      } else {
        setPreviewUri(null);
        setPreviewCompressed(null);
        router.push('/(tabs)/inventory');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextConfirm = async () => {
    if (!textDescription.trim()) {
      Alert.alert('Describe the problem', 'Tell us what\'s broken so we can help.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('problemTextDescription', textDescription.trim());
    await AsyncStorage.removeItem('problemImageBase64');
    await AsyncStorage.removeItem('problemImageUri');

    // Check for saved toolbox
    const toolbox = await getToolbox();
    if (toolbox) {
      Alert.alert(
        'Use saved toolbox?',
        'Use your saved materials instead of a new photo?',
        [
          { text: 'No, take new photo', style: 'cancel', onPress: () => router.push('/(tabs)/inventory') },
          {
            text: 'Yes, use saved',
            onPress: async () => {
              await AsyncStorage.setItem('inventoryImageBase64', toolbox);
              router.push('/(tabs)/inventory');
            },
          },
        ]
      );
    } else {
      router.push('/(tabs)/inventory');
    }
  };

  const handleRetake = () => {
    setPreviewUri(null);
    setPreviewCompressed(null);
  };

  // ── Preview ──
  if (previewUri && previewCompressed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#05070B' }]}>
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="contain" />
          <View style={styles.previewOverlay}>
            <View style={styles.previewTop}>
              <View style={[styles.previewBadge, { backgroundColor: 'rgba(15,23,42,0.85)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                <ThemedText weight="bold" style={styles.previewBadgeText}>Looking good?</ThemedText>
              </View>
              <ThemedText style={styles.previewMeta}>
                {previewCompressed.width}×{previewCompressed.height}px
              </ThemedText>
            </View>
            <View style={styles.previewBtns}>
              <TouchableOpacity style={styles.pBtnOutline} onPress={handleRetake} disabled={isSaving} activeOpacity={0.8}>
                <X size={18} color="#0F172A" strokeWidth={2.5} />
                <ThemedText weight="bold" style={styles.pBtnOutlineText}>Retake</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pBtnFilled, { backgroundColor: colors.success, borderColor: colors.success }]} onPress={handleConfirm} disabled={isSaving} activeOpacity={0.8}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" strokeWidth={2.5} />
                    <ThemedText weight="bold" style={styles.pBtnFilledText}>Use this</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Text Mode ──
  if (textMode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.textModeWrap}>
            <TouchableOpacity
              style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setTextMode(false)}
              activeOpacity={0.7}
            >
              <CameraIcon size={15} color={colors.accent} strokeWidth={2.5} />
              <ThemedText weight="bold" style={[styles.modeToggleText, { color: colors.accent }]}>Switch to camera</ThemedText>
            </TouchableOpacity>

            <ThemedText weight="bold" style={[styles.textModeTitle, { color: colors.text }]}>Describe what's broken</ThemedText>
            <ThemedText variant="secondary" style={styles.textModeDesc}>
              No camera? No problem. Tell us what needs fixing.
            </ThemedText>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular'
                },
              ]}
              placeholder="e.g. Broken chair leg, clean snap at the joint..."
              placeholderTextColor={colors.textMuted}
              value={textDescription}
              onChangeText={setTextDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.textConfirmBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={handleTextConfirm}
              activeOpacity={0.8}
            >
              <Check size={18} color="#fff" strokeWidth={2.5} />
              <ThemedText weight="bold" style={styles.textConfirmBtnText}>Continue to materials</ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Camera ──
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#05070B' }]}>
      {/* Only mount camera when focused — fixes blank camera on re-navigate */}
      {isFocused ? (
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            autofocus="on"
            flash={flashEnabled ? 'on' : 'off'}
          />
          <View style={styles.overlay}>
            <View style={styles.topRow}>
              <View style={styles.instrBlock}>
                <View style={[styles.pillBadge, { backgroundColor: colors.accent }]}>
                  <ThemedText weight="bold" style={styles.instrHint}>STEP 1</ThemedText>
                </View>
                <ThemedText weight="bold" style={styles.instrTitle}>What's broken?</ThemedText>
                <ThemedText style={styles.instrSub}>
                  Get the whole damage in frame — the more details visible, the better the fix.
                </ThemedText>
              </View>
              <View style={styles.topBtns}>
                <TouchableOpacity
                  style={[styles.flashBtn, flashEnabled && { backgroundColor: '#FBBF24' }]}
                  onPress={() => setFlashEnabled(!flashEnabled)}
                  activeOpacity={0.7}
                >
                  {flashEnabled ? <Zap size={16} color="#000" strokeWidth={2.5} /> : <ZapOff size={16} color="#fff" strokeWidth={2} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.textModeBtn}
                  onPress={() => setTextMode(true)}
                  activeOpacity={0.7}
                >
                  <Type size={16} color="#fff" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.vf}>
              <View style={[styles.c, styles.cTL, { borderColor: colors.accent }]} />
              <View style={[styles.c, styles.cTR, { borderColor: colors.accent }]} />
              <View style={[styles.c, styles.cBL, { borderColor: colors.accent }]} />
              <View style={[styles.c, styles.cBR, { borderColor: colors.accent }]} />
            </View>

            <View style={styles.bottomCol}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  disabled={isProcessing}
                  style={[styles.capRing, isProcessing && styles.disabled]}
                  onPress={handleCapture}
                  activeOpacity={0.7}
                >
                  <View style={styles.capInner}>
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CameraIcon size={24} color="#fff" strokeWidth={2.5} />
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
              <ThemedText weight="medium" style={styles.capHint}>{isProcessing ? 'Processing...' : 'Tap to capture'}</ThemedText>
            </View>
          </View>
        </View>
      ) : (
        /* Placeholder while unfocused — prevents stale camera state */
        <View style={styles.cameraWrap} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraWrap: { flex: 1 },

  // Permission
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permTitle: { fontSize: 20, marginBottom: 10, textAlign: 'center' },
  permDesc: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 22, paddingHorizontal: 20 },
  permBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  permBtnText: { color: '#fff', fontSize: 16 },

  // Overlay
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topBtns: { flexDirection: 'column', gap: 10 },
  instrBlock: { flex: 1, marginRight: 16 },
  pillBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start', marginBottom: 8 },
  instrHint: {
    fontSize: 11, color: '#fff', letterSpacing: 1,
  },
  instrTitle: {
    fontSize: 24, color: '#fff', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  instrSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // Flash
  flashBtn: { backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  textModeBtn: { backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  // Viewfinder
  vf: { width: '80%', aspectRatio: 3 / 4, alignSelf: 'center', justifyContent: 'center' },
  c: { position: 'absolute', width: 32, height: 32 },
  cTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },

  // Capture
  bottomCol: { alignItems: 'center', gap: 10 },
  capRing: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4,
    borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  capInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  capHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  disabled: { opacity: 0.5 },

  // Preview
  previewWrap: { flex: 1 },
  previewImg: { flex: 1, width: '100%' },
  previewOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36,
  },
  previewTop: { alignItems: 'center' },
  previewBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, marginBottom: 6, borderWidth: 1 },
  previewBadgeText: { fontSize: 15, color: '#fff' },
  previewMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  previewBtns: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  pBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12, minWidth: 130, justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3
  },
  pBtnOutlineText: { color: '#0F172A', fontSize: 15 },
  pBtnFilled: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12, minWidth: 130, justifyContent: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3
  },
  pBtnFilledText: { color: '#fff', fontSize: 15 },

  // Text mode
  modeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, marginBottom: 28, borderWidth: 1
  },
  modeToggleText: { fontSize: 13 },
  textModeTitle: { fontSize: 24, marginBottom: 8 },
  textModeDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  textInput: {
    borderWidth: 1, borderRadius: 16, padding: 18, fontSize: 15, lineHeight: 22,
    minHeight: 160, marginBottom: 24,
  },
  textConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2
  },
  textConfirmBtnText: { color: '#fff', fontSize: 16 },
  textModeWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
});
