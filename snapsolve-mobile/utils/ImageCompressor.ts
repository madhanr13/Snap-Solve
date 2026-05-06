/**
 * Image compression and base64 encoding utility.
 * Uses expo-image-manipulator to resize and compress images to optimal size
 * before sending to the backend (reduces data transfer and API processing time).
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

interface CompressionResult {
  base64: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Compress an image to 800x800 max dimensions with 0.7 quality.
 * Returns base64-encoded string suitable for API transmission.
 *
 * Why compress:
 * - Reduces memory usage during transmission
 * - Speeds up API processing
 * - Minimizes LLM token consumption for image analysis
 * - Prevents timeout issues with large files
 *
 * @param imageUri - Local file URI of the captured image
 * @returns Compressed image as base64 string and metadata
 */
export async function compressImageToBase64(
  imageUri: string
): Promise<CompressionResult> {
  try {
    // Step 1: Resize image to 800x800 max (maintains aspect ratio)
    // ImageManipulator.resize() constrains to the largest dimension specified
    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: 800,
            height: 800,
          },
        },
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Step 2: Read the compressed image as base64
    const base64String = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: 'base64',
    });

    if (!base64String) {
      throw new Error('Failed to encode image to base64');
    }

    return {
      base64: base64String,
      width: resized.width,
      height: resized.height,
      size: base64String.length, // Approximate size in characters
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error(
      `Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
