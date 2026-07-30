/**
 * Inventory Screen — "What've you got?" (Step 2 of 3)
 *
 * Same camera fix as Scan: useIsFocused() to prevent blank camera.
 * Shows a thumbnail of the damage photo for context.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
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
import { api, saveToHistory, getToolbox, saveToolbox } from '../../utils/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useTheme } from '../../utils/ThemeContext';
import { ThemedText } from '../../components/ThemedText';

export default function InventoryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused(); // ← Camera fix
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [problemThumb, setProblemThumb] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
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
            <CameraIcon size={36} color={colors.accent} strokeWidth={1.5} />
          </View>
          <ThemedText weight="bold" style={styles.permTitle}>Camera access needed</ThemedText>
          <ThemedText variant="secondary" style={styles.permDesc}>
            We need your camera to photograph your available materials.
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
      if (!photo.uri) throw new Error('Failed to capture');
      const compressed = await compressImageToBase64(photo.uri);

      // Check if user used text mode or camera mode for the problem
      const problemBase64 = await AsyncStorage.getItem('problemImageBase64');
      const problemText = await AsyncStorage.getItem('problemTextDescription');

      if (!problemBase64 && !problemText) {
        throw new Error('Go back and snap the damage first — we need both photos.');
      }

      setIsLoading(true);
      setStreamingText('');

      // Shared callbacks for SSE streaming
      const onToken = (token: string) => {
        setStreamingText((prev) => prev + token);
      };

      const onDone = async (analysis: any) => {
        try {
          await AsyncStorage.setItem('repairAnalysis', JSON.stringify(analysis));
          await saveToHistory(analysis);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Offer to save materials as toolbox
          const existingToolbox = await getToolbox();
          if (!existingToolbox) {
            Alert.alert(
              'Save as your toolbox?',
              'Save this materials photo so you can skip this step next time.',
              [
                { text: 'No thanks', style: 'cancel', onPress: () => router.push('/(tabs)/results') },
                {
                  text: 'Save it',
                  onPress: async () => {
                    await saveToolbox(compressed.base64);
                    router.push('/(tabs)/results');
                  },
                },
              ]
            );
          } else {
            router.push('/(tabs)/results');
          }
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save analysis');
        } finally {
          setIsProcessing(false);
          setIsLoading(false);
          setStreamingText('');
        }
      };

      const onError = (msg: string) => {
        Alert.alert('Hmm, something went wrong', msg);
        setIsProcessing(false);
        setIsLoading(false);
        setStreamingText('');
      };

      if (problemText) {
        // Text-only mode — streaming
        await api.analyzeRepairTextStream(problemText, compressed.base64, onToken, onDone, onError);
      } else {
        // Camera mode — streaming
        await api.analyzeRepairStream(problemBase64!, compressed.base64, onToken, onDone, onError);
      }
    } catch (error) {
      Alert.alert('Hmm, something went wrong', error instanceof Error ? error.message : 'Analysis failed');
      setIsProcessing(false);
      setIsLoading(false);
      setStreamingText('');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#05070B' }]}>
      <LoadingSpinner visible={isLoading} message="Figuring out your fix..." streamingText={streamingText} />

      {isFocused ? (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" autofocus="on" flash={flashEnabled ? 'on' : 'off'} />
          <View style={styles.overlay}>
            <View style={styles.topRow}>
              <View style={styles.instrBlock}>
                <View style={[styles.pillBadge, { backgroundColor: colors.accent }]}>
                  <ThemedText weight="bold" style={styles.instrHint}>STEP 2</ThemedText>
                </View>
                <ThemedText weight="bold" style={styles.instrTitle}>What've you got?</ThemedText>
                <ThemedText style={styles.instrSub}>
                  Lay everything out — tape, glue, wire, string, whatever you can find.
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.flashBtn, flashEnabled && { backgroundColor: '#FBBF24' }]}
                onPress={() => setFlashEnabled(!flashEnabled)}
                activeOpacity={0.7}
              >
                {flashEnabled ? <Zap size={16} color="#000" strokeWidth={2.5} /> : <ZapOff size={16} color="#fff" strokeWidth={2} />}
              </TouchableOpacity>
            </View>

            {/* Problem thumbnail reminder */}
            {problemThumb && (
              <View style={styles.thumbWrap}>
                <View style={styles.thumbContainer}>
                  <Image source={{ uri: problemThumb }} style={styles.thumb} resizeMode="cover" />
                  <View style={styles.thumbLabelBox}>
                    <ThemedText weight="semibold" style={styles.thumbLabel}>Damage ✓</ThemedText>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.vf}>
              <View style={[styles.c, styles.cTL, { borderColor: colors.accent }]} />
              <View style={[styles.c, styles.cTR, { borderColor: colors.accent }]} />
              <View style={[styles.c, styles.cBL, { borderColor: colors.accent }]} />
              <View style={[styles.c, styles.cBR, { borderColor: colors.accent }]} />
            </View>

            <View style={styles.bottomRow}>
              <TouchableOpacity style={styles.sideBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <ArrowLeft size={18} color="#0F172A" strokeWidth={2.5} />
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
                      <CameraIcon size={24} color="#fff" strokeWidth={2.5} />
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
              <View style={styles.sideBtnPlaceholder} />
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
  container: { flex: 1 },
  cameraWrap: { flex: 1 },

  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permTitle: { fontSize: 20, marginBottom: 10, textAlign: 'center' },
  permDesc: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  permBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  permBtnText: { color: '#fff', fontSize: 16 },

  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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

  flashBtn: { backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  thumbWrap: { position: 'absolute', top: 86, right: 20, zIndex: 10 },
  thumbContainer: {
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3
  },
  thumb: { width: 56, height: 56, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  thumbLabelBox: { marginTop: 4, backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  thumbLabel: { fontSize: 9, color: '#fff' },

  vf: { width: '80%', aspectRatio: 3 / 4, alignSelf: 'center' },
  c: { position: 'absolute', width: 32, height: 32 },
  cTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  sideBtn: {
    width: 44, height: 44, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff', borderRadius: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3
  },
  sideBtnPlaceholder: { width: 44, height: 44 },
  capRing: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4,
    borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  capInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.5 },
});
