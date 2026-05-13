/**
 * Inventory Screen — "What've you got?" (Step 2 of 3)
 *
 * Same camera fix as Scan: useIsFocused() to prevent blank camera.
 * Shows a thumbnail of the damage photo for context.
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
import { Camera as CameraIcon, ArrowLeft, Zap, ZapOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { compressImageToBase64 } from '../../utils/ImageCompressor';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useTheme } from '../../utils/ThemeContext';

export default function InventoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const isFocused = useIsFocused(); // ← Camera fix
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [problemThumb, setProblemThumb] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  // Load previously captured problem image
  useEffect(() => {
    AsyncStorage.getItem('problemImageUri').then((uri) => {
      if (uri) setProblemThumb(uri);
    });
  }, []);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.permBox}>
          <View style={[styles.permIcon, { backgroundColor: colors.surfaceAlt }]}>
            <CameraIcon size={36} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.permTitle, { color: colors.text }]}>Camera access needed</Text>
          <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
            We need your camera to photograph your available materials.
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo.uri) throw new Error('Failed to capture');
      const compressed = await compressImageToBase64(photo.uri);

      // Check if user used text mode or camera mode for the problem
      const problemBase64 = await AsyncStorage.getItem('problemImageBase64');
      const problemText = await AsyncStorage.getItem('problemTextDescription');

      if (!problemBase64 && !problemText) {
        throw new Error('Go back and snap the damage first — we need both photos.');
      }

      setIsLoading(true);
      let analysis;
      if (problemText) {
        // Text-only mode
        analysis = await api.analyzeRepairText(problemText, compressed.base64);
      } else {
        // Camera mode
        analysis = await api.analyzeRepair(problemBase64!, compressed.base64);
      }
      await AsyncStorage.setItem('repairAnalysis', JSON.stringify(analysis));
      // Save to history for the home screen
      const { saveToHistory } = require('../../utils/api');
      await saveToHistory(analysis);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(tabs)/results');
    } catch (error) {
      Alert.alert('Hmm, something went wrong', error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingSpinner visible={isLoading} message="Figuring out your fix..." />

      {isFocused ? (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" autofocus="on" flash={flashEnabled ? 'on' : 'off'} />
          <View style={styles.overlay}>
            <View style={styles.topRow}>
              <View style={styles.instrBlock}>
                <Text style={styles.instrHint}>STEP 2</Text>
                <Text style={styles.instrTitle}>What've you got?</Text>
                <Text style={styles.instrSub}>
                  Lay everything out — tape, glue, wire, string, whatever you can find.
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

            {/* Problem thumbnail reminder */}
            {problemThumb && (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: problemThumb }} style={styles.thumb} resizeMode="cover" />
                <Text style={styles.thumbLabel}>Damage ✓</Text>
              </View>
            )}

            <View style={styles.vf}>
              <View style={[styles.c, styles.cTL]} />
              <View style={[styles.c, styles.cTR]} />
              <View style={[styles.c, styles.cBL]} />
              <View style={[styles.c, styles.cBR]} />
            </View>

            <View style={styles.bottomRow}>
              <TouchableOpacity style={styles.sideBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <ArrowLeft size={20} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  disabled={isProcessing || isLoading}
                  style={[styles.capRing, (isProcessing || isLoading) && styles.disabled]}
                  onPress={handleCapture}
                  activeOpacity={0.7}
                >
                  <View style={styles.capInner}>
                    {isProcessing || isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CameraIcon size={26} color="#fff" strokeWidth={2} />
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
              <View style={styles.sideBtn} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.cameraWrap} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraWrap: { flex: 1, backgroundColor: '#000' },

  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  permDesc: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 21 },
  permBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14 },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  instrBlock: { flex: 1, marginRight: 12 },
  instrHint: {
    fontSize: 11, fontWeight: '700', color: '#fbbf24', letterSpacing: 1, marginBottom: 6,
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

  flashBtn: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 22, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  flashBtnOn: { backgroundColor: 'rgba(251,191,36,0.2)', borderColor: 'rgba(251,191,36,0.5)' },

  thumbWrap: { position: 'absolute', top: 80, right: 20, alignItems: 'center', zIndex: 10 },
  thumb: { width: 52, height: 52, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  thumbLabel: {
    marginTop: 3, fontSize: 9, color: '#fff', fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  vf: { width: '80%', aspectRatio: 3 / 4, alignSelf: 'center' },
  c: { position: 'absolute', width: 28, height: 28, borderColor: 'rgba(255,255,255,0.45)' },
  cTL: { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 10 },
  cTR: { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 10 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 10 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 10 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  sideBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  capRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center',
  },
  capInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#1c1917', justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.5 },
});
