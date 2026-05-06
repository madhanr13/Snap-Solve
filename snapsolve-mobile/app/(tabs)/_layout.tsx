/**
 * Tab Layout - Navigation structure for SnapSolve using Expo Router tabs.
 * Provides navigation between Camera (Problem), Inventory (Materials), and Results screens.
 */

import { Tabs } from 'expo-router';
import { Camera, Package, CheckCircle } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e293b', // Dark slate for active
        tabBarInactiveTintColor: '#94a3b8', // Slate-400 for inactive
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0', // Slate-200
          borderTopWidth: 1,
          paddingBottom: 4,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomColor: '#e2e8f0',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: '#1e293b',
          fontWeight: '600',
          fontSize: 18,
        },
        headerTintColor: '#1e293b',
      }}
    >
      {/* Camera Screen - Capture Broken Object */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Capture Problem',
          tabBarLabel: 'Problem',
          tabBarIcon: ({ color }) => <Camera size={24} color={color} />,
          headerShown: true,
        }}
      />

      {/* Inventory Screen - Capture Available Materials */}
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Capture Materials',
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color }) => <Package size={24} color={color} />,
          headerShown: true,
        }}
      />

      {/* Results Screen - Display Repair Analysis */}
      <Tabs.Screen
        name="results"
        options={{
          title: 'Repair Guide',
          tabBarLabel: 'Results',
          tabBarIcon: ({ color }) => <CheckCircle size={24} color={color} />,
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
