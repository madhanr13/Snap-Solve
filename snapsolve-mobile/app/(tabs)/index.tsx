/**
 * Screen 1: Camera View for Broken Object
 * Prompts user: "Capture the broken object."
 * Uses expo-camera to capture photos and stores as base64.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera as CameraIcon, RotateCcw, Check, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { compressImageToBase64 } from '../../utils/ImageCompressor';

export default function ProblemScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewCompressed, setPreviewCompressed] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Handle permission denial
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            SnapSolve needs access to your camera to analyze repairs.
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
   * Capture photo and show preview.
   */
  const handleCapture = async () => {
    if (isProcessing || !cameraRef.current) return;

    setIsProcessing(true);

    try {
      // Capture the photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
      });

      if (!photo.uri) {
        throw new Error('Failed to capture photo');
      }

      // Compress image to base64
      const compressed = await compressImageToBase64(photo.uri);

      // Store for preview
      setPreviewUri(photo.uri);
      setPreviewCompressed(compressed);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to capture photo';
      Alert.alert('Capture Error', errorMessage);
      console.error('Photo capture error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Confirm the captured image and proceed to inventory.
   */
  const handleConfirmImage = async () => {
    if (!previewCompressed) return;

    setIsSaving(true);
    try {
      // Save the compressed base64 to AsyncStorage
      await AsyncStorage.setItem('problemImageBase64', previewCompressed.base64);

      // Clear preview state
      setPreviewUri(null);
      setPreviewCompressed(null);

      // Navigate to inventory screen
      router.push('/(tabs)/inventory');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save image';
      Alert.alert('Save Error', errorMessage);
      console.error('Failed to save image:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Discard preview and return to camera.
   */
  const handleRetake = () => {
    setPreviewUri(null);
    setPreviewCompressed(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Preview Screen - Show after capture */}
      {previewUri && previewCompressed && (
        <View style={styles.previewContainer}>
          {/* Image Preview */}
          <Image
            source={{ uri: previewUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />

          {/* Preview Overlay */}
          <View style={styles.previewOverlay}>
            {/* Top Section - Title */}
            <View style={styles.previewTop}>
              <Text style={styles.previewTitle}>Review Image</Text>
              <Text style={styles.previewSubtitle}>
                {previewCompressed.width}×{previewCompressed.height}px
              </Text>
            </View>

            {/* Bottom Section - Action Buttons */}
            <View style={styles.previewBottom}>
              {/* Retake Button */}
              <TouchableOpacity
                style={[styles.previewButton, styles.retakeButton]}
                onPress={handleRetake}
                disabled={isSaving}
              >
                <X size={24} color="#64748b" strokeWidth={2} />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.previewButton, styles.confirmButton]}
                onPress={handleConfirmImage}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={24} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.confirmButtonText}>Use Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Camera Screen - Show when no preview */}
      {!previewUri && (
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
                Capture the broken object
              </Text>
              <Text style={styles.instructionSubtext}>
                Position the entire object in frame with good lighting
              </Text>
            </View>

            {/* Capture Button at Bottom */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                disabled={isProcessing}
                style={[
                  styles.captureButton,
                  isProcessing && styles.buttonDisabled,
                ]}
                onPress={handleCapture}
              >
                <CameraIcon size={32} color="#ffffff" strokeWidth={2} />
                <Text style={styles.captureButtonText}>
                  {isProcessing ? 'Processing...' : 'Capture'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      )}
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

  // Permission Box (if camera not granted)
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

  // Camera Overlay
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },

  // Instruction Box
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

  // Button Container
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  // Capture Button
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

  // Reset Button
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Secondary Button (for permissions)
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

  // Preview Screen Styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 32,
  },
  previewTop: {
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  previewBottom: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    minWidth: 120,
  },
  retakeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retakeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
