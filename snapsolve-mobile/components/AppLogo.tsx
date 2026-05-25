/**
 * Centralized App Logo Component
 * 
 * To change the logo globally across the app:
 * 1. Swap the `<Wrench>` icon below with another Lucide icon.
 * OR
 * 2. Replace it with an image:
 *    return <Image source={require('../assets/my-logo.png')} style={{ width: size, height: size }} />
 */

import React from 'react';
import { Wrench } from 'lucide-react-native';
import { Image } from 'react-native';

export interface AppLogoProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  color?: string;
  strokeWidth?: number;
}

export function AppLogo({ size = 24, width, height, color = '#000', strokeWidth = 2 }: AppLogoProps) {
  return (
    <Image 
      source={require('../assets/logo.png')} 
      style={{ width: width ?? size, height: height ?? size }} 
      resizeMode="contain"
    />
  );
}
