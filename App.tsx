import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { MatchesProvider } from './src/context/MatchesContext';
import { ToastProvider } from './src/context/ToastContext';
import AnimatedBackground from './src/components/AnimatedBackground';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#050210' }}>
          <AnimatedBackground />
          <AuthProvider>
            <MatchesProvider>
              <ToastProvider>
                <AppNavigator />
              </ToastProvider>
            </MatchesProvider>
          </AuthProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
