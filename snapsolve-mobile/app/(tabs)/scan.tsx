/**
 * Scan Screen — "What's broken?" (Step 1 of 3)
 *
 * Camera fix: uses useIsFocused() to unmount/remount the camera when
 * navigating between tabs. This prevents the blank camera issue.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import {
  Camera as CameraIcon,
  Check,
  X,
  Zap,
  ZapOff,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { compressImageToBase64 } from '../../utils/ImageCompressor';
import { useTheme } from '../../utils/ThemeContext';

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

  // Permission screen
  if (!permission?.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.permBox}>
          <View style={[styles.permIcon, { backgroundColor: colors.surfaceAlt }]}>
            <CameraIcon size={36} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.permTitle, { color: colors.text }]}>Camera access needed</Text>
          <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
            We need your camera to take photos of the damage and your materials.
          </Text>
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: colors.accent }]}
            onPress={() => requestPermission()}
            activeOpacity={0.8}
          >
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (isProcessing || !cameraRef.current) return;
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
    setIsSaving(true);
    try {
      await AsyncStorage.setItem('problemImageBase64', previewCompressed.base64);
      await AsyncStorage.setItem('problemImageUri', previewUri || '');
      setPreviewUri(null);
      setPreviewCompressed(null);
      router.push('/(tabs)/inventory');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
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
                <Text style={styles.previewBadgeText}>Looking good?</Text>
              </View>
              <Text style={styles.previewMeta}>
                {previewCompressed.width}×{previewCompressed.height}px
              </Text>
            </View>
            <View style={styles.previewBtns}>
              <TouchableOpacity style={styles.pBtnOutline} onPress={handleRetake} disabled={isSaving} activeOpacity={0.8}>
                <X size={20} color="#fff" strokeWidth={2.5} />
                <Text style={styles.pBtnOutlineText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pBtnFilled} onPress={handleConfirm} disabled={isSaving} activeOpacity={0.8}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={20} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.pBtnFilledText}>Use this</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera ──
  return (
    <SafeAreaView style={styles.container}>
      {/* Only mount camera when focused — fixes blank camera on re-navigate */}
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          autofocus="on"
          flash={flashEnabled ? 'on' : 'off'}
        >
          <View style={styles.overlay}>
            <View style={styles.topRow}>
              <View style={styles.instrBlock}>
                <Text style={styles.instrHint}>STEP 1</Text>
                <Text style={styles.instrTitle}>What's broken?</Text>
                <Text style={styles.instrSub}>
                  Get the whole thing in frame — the more we can see, the better the fix.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.flashBtn, flashEnabled && styles.flashBtnOn]}
                onPress={() => setFlashEnabled(!flashEnabled)}
                activeOpacity={0.7}
              >
                {flashEnabled ? <Zap size={18} color="#fbbf24" /> : <ZapOff size={18} color="#a8a29e" />}
              </TouchableOpacity>
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
              <Text style={styles.capHint}>{isProcessing ? 'Processing...' : 'Tap to capture'}</Text>
            </View>
          </View>
        </CameraView>
      ) : (
        /* Placeholder while unfocused — prevents stale camera state */
        <View style={styles.camera} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1, backgroundColor: '#000' },

  // Permission
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  permDesc: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 21, paddingHorizontal: 20 },
  permBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14 },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Overlay
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  instrBlock: { flex: 1, marginRight: 12 },
  instrHint: {
    fontSize: 11, fontWeight: '700', color: '#60a5fa', letterSpacing: 1, marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  instrTitle: {
    fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  instrSub: {
    fontSize: 13, color: '#e7e5e4', lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // Flash
  flashBtn: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 22, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  flashBtnOn: { backgroundColor: 'rgba(251,191,36,0.2)', borderColor: 'rgba(251,191,36,0.5)' },

  // Viewfinder
  vf: { width: '80%', aspectRatio: 3 / 4, alignSelf: 'center' },
  c: { position: 'absolute', width: 28, height: 28, borderColor: 'rgba(255,255,255,0.45)' },
  cTL: { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 10 },
  cTR: { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 10 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 10 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 10 },

  // Capture
  bottomCol: { alignItems: 'center', gap: 10 },
  capRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center',
  },
  capInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#1c1917', justifyContent: 'center', alignItems: 'center' },
  capHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500' },
  disabled: { opacity: 0.5 },

  // Preview
  previewWrap: { flex: 1, backgroundColor: '#000' },
  previewImg: { flex: 1, width: '100%' },
  previewOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36,
  },
  previewTop: { alignItems: 'center' },
  previewBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginBottom: 4 },
  previewBadgeText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  previewMeta: { fontSize: 12, color: '#a8a29e' },
  previewBtns: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  pBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, minWidth: 120, justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  pBtnOutlineText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pBtnFilled: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, minWidth: 120, justifyContent: 'center', backgroundColor: '#16a34a',
  },
  pBtnFilledText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
