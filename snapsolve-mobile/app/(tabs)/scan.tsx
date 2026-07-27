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
  CameraIcon as CamSwitch,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { compressImageToBase64 } from '../../utils/ImageCompressor';
import { useTheme } from '../../utils/ThemeContext';
import { getToolbox, api, saveToHistory } from '../../utils/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';

export default function ScanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
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
            <CameraIcon size={36} color={colors.textMuted} strokeWidth={1.5} />
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
      <SafeAreaView style={styles.container}>
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="contain" />
          <View style={styles.previewOverlay}>
            <View style={styles.previewTop}>
              <View style={styles.previewBadge}>
                <ThemedText weight="bold" style={styles.previewBadgeText}>Looking good?</ThemedText>
              </View>
              <ThemedText style={styles.previewMeta}>
                {previewCompressed.width}×{previewCompressed.height}px
              </ThemedText>
            </View>
            <View style={styles.previewBtns}>
              <TouchableOpacity style={styles.pBtnOutline} onPress={handleRetake} disabled={isSaving} activeOpacity={0.8}>
                <X size={20} color="#000" strokeWidth={2.5} />
                <ThemedText weight="semibold" style={styles.pBtnOutlineText}>Retake</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pBtnFilled, { backgroundColor: colors.success, borderColor: colors.success }]} onPress={handleConfirm} disabled={isSaving} activeOpacity={0.8}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={20} color="#fff" strokeWidth={2.5} />
                    <ThemedText weight="semibold" style={styles.pBtnFilledText}>Use this</ThemedText>
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
              style={[styles.modeToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => setTextMode(false)}
              activeOpacity={0.7}
            >
              <CamSwitch size={16} color={colors.accent} strokeWidth={2} />
              <ThemedText weight="semibold" style={[styles.modeToggleText, { color: colors.accent }]}>Switch to camera</ThemedText>
            </TouchableOpacity>

            <ThemedText weight="bold" style={styles.textModeTitle}>Describe what's broken</ThemedText>
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
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.textConfirmBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={handleTextConfirm}
              activeOpacity={0.8}
            >
              <Check size={20} color="#fff" strokeWidth={2.5} />
              <ThemedText weight="semibold" style={styles.textConfirmBtnText}>Continue to materials</ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Camera ──
  return (
    <SafeAreaView style={styles.container}>
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
                <View style={styles.pillBadge}>
                  <ThemedText weight="bold" style={styles.instrHint}>STEP 1</ThemedText>
                </View>
                <ThemedText weight="bold" style={styles.instrTitle}>What's broken?</ThemedText>
                <ThemedText style={styles.instrSub}>
                  Get the whole thing in frame — the more we can see, the better the fix.
                </ThemedText>
              </View>
              <View style={styles.topBtns}>
                <TouchableOpacity
                  style={[styles.flashBtn, flashEnabled && styles.flashBtnOn]}
                  onPress={() => setFlashEnabled(!flashEnabled)}
                  activeOpacity={0.7}
                >
                  {flashEnabled ? <Zap size={18} color="#000" /> : <ZapOff size={18} color="#fff" />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.textModeBtn}
                  onPress={() => setTextMode(true)}
                  activeOpacity={0.7}
                >
                  <Type size={16} color="#000" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.vf}>
              <View style={[styles.c, styles.cTL]} />
              <View style={[styles.c, styles.cTR]} />
              <View style={[styles.c, styles.cBL]} />
              <View style={[styles.c, styles.cBR]} />
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
                      <CameraIcon size={26} color="#fff" strokeWidth={2} />
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
  container: { flex: 1, backgroundColor: '#000' },
  cameraWrap: { flex: 1, backgroundColor: '#000' },

  // Permission
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permTitle: { fontSize: 20, marginBottom: 10, textAlign: 'center' },
  permDesc: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 21, paddingHorizontal: 20 },
  permBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 8, borderWidth: 1 },
  permBtnText: { color: '#fff', fontSize: 16 },

  // Overlay
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topBtns: { flexDirection: 'column', gap: 8 },
  instrBlock: { flex: 1, marginRight: 12 },
  pillBadge: { backgroundColor: '#60a5fa', paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6, borderWidth: 1, borderColor: '#000' },
  instrHint: {
    fontSize: 11, color: '#000', letterSpacing: 1,
  },
  instrTitle: {
    fontSize: 24, color: '#fff', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  instrSub: {
    fontSize: 13, color: '#e7e5e4', lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  // Flash
  flashBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 0, padding: 10, borderWidth: 1, borderColor: '#fff' },
  flashBtnOn: { backgroundColor: '#fbbf24', borderColor: '#000' },

  // Viewfinder
  vf: { width: '80%', aspectRatio: 3 / 4, alignSelf: 'center' },
  c: { position: 'absolute', width: 28, height: 28, borderColor: '#fff' },
  cTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },

  // Capture
  bottomCol: { alignItems: 'center', gap: 10 },
  capRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4,
    borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  capInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#1c1917', justifyContent: 'center', alignItems: 'center' },
  capHint: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  disabled: { opacity: 0.5 },

  // Preview
  previewWrap: { flex: 1, backgroundColor: '#000' },
  previewImg: { flex: 1, width: '100%' },
  previewOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36,
  },
  previewTop: { alignItems: 'center' },
  previewBadge: { backgroundColor: '#000', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, marginBottom: 4, borderWidth: 1, borderColor: '#fff' },
  previewBadgeText: { fontSize: 16, color: '#fff' },
  previewMeta: { fontSize: 12, color: '#a8a29e' },
  previewBtns: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  pBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 8, minWidth: 120, justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#000',
  },
  pBtnOutlineText: { color: '#000', fontSize: 15 },
  pBtnFilled: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 8, minWidth: 120, justifyContent: 'center', backgroundColor: '#16a34a', borderWidth: 1
  },
  pBtnFilledText: { color: '#fff', fontSize: 15 },

  // Text mode
  textModeBtn: {
    backgroundColor: '#fff', borderRadius: 0, padding: 10,
    borderWidth: 1, borderColor: '#000', alignItems: 'center',
  },
  textModeWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  modeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, marginBottom: 24, borderWidth: 1
  },
  modeToggleText: { fontSize: 13 },
  textModeTitle: { fontSize: 24, marginBottom: 6 },
  textModeDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  textInput: {
    borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 15, lineHeight: 22,
    minHeight: 140, marginBottom: 20,
  },
  textConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 8, borderWidth: 1,
  },
  textConfirmBtnText: { color: '#fff', fontSize: 16 },
});
