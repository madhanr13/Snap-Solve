/**
 * Screen 2: Inventory Camera View for Available Materials
 * Prompts user: "Capture available materials."
 * After capturing, calls the backend API and displays loading state.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera as CameraIcon, RotateCcw, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { compressImageToBase64 } from '../../utils/ImageCompressor';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export default function InventoryScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            SnapSolve needs access to your camera.
          </Text>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => requestPermission()}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Capture inventory photo, then call backend API.
   * Flow:
   * 1. Capture and compress inventory photo
   * 2. Retrieve stored problem photo from AsyncStorage
   * 3. Send both images to backend for analysis
   * 4. Navigate to results screen with the analysis
   */
  const handleCapture = async () => {
    if (isProcessing || !cameraRef.current) return;

    setIsProcessing(true);

    try {
      // Step 1: Capture and compress inventory photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
      });

      if (!photo.uri) {
        throw new Error('Failed to capture inventory photo');
      }

      const compressedInventory = await compressImageToBase64(photo.uri);

      // Step 2: Retrieve problem image from AsyncStorage
      const problemImageBase64 = await AsyncStorage.getItem('problemImageBase64');
      if (!problemImageBase64) {
        throw new Error('Problem image not found. Please capture the broken object first.');
      }

      // Step 3: Show loading spinner and call backend
      setIsLoading(true);
      const analysis = await api.analyzeRepair(
        problemImageBase64,
        compressedInventory.base64
      );

      // Step 4: Save analysis to AsyncStorage and navigate
      await AsyncStorage.setItem('repairAnalysis', JSON.stringify(analysis));
      router.push('/(tabs)/results');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to analyze repair';
      Alert.alert('Analysis Error', errorMessage);
      console.error('Analysis error:', error);
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  /**
   * Navigate back to problem screen to retake the first photo.
   */
  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Loading Spinner Overlay */}
      <LoadingSpinner visible={isLoading} message="Analyzing mechanical properties..." />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        autofocus="on"
      >
        {/* Camera Overlay - Instructions */}
        <View style={styles.overlay}>
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              Capture available materials
            </Text>
            <Text style={styles.instructionSubtext}>
              Show all items you can use for the repair
            </Text>
          </View>

          {/* Button Container */}
          <View style={styles.buttonContainer}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleGoBack}
            >
              <ArrowLeft size={24} color="#64748b" strokeWidth={2} />
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              disabled={isProcessing || isLoading}
              style={[
                styles.captureButton,
                (isProcessing || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleCapture}
            >
              <CameraIcon size={32} color="#ffffff" strokeWidth={2} />
              <Text style={styles.captureButtonText}>
                {isProcessing || isLoading ? 'Processing...' : 'Capture'}
              </Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View style={styles.spacer} />
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },

  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },

  instructionBox: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  instructionSubtext: {
    fontSize: 14,
    color: '#e2e8f0',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  captureButton: {
    backgroundColor: '#1e293b',
    borderRadius: 50,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  spacer: {
    width: 48,
  },

  buttonSecondary: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
