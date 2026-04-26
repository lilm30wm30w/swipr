import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { MatchesProvider } from './src/context/MatchesContext';
import { ToastProvider } from './src/context/ToastContext';
import AnimatedBackground from './src/components/AnimatedBackground';
import AppNavigator from './src/navigation/AppNavigator';

function AppRoot() {
  const { themeMode, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: isDark ? '#050210' : '#EDE9FE' }}>
        <AnimatedBackground mode={themeMode} />
        <AuthProvider>
          <MatchesProvider>
            <ToastProvider>
              <AppNavigator />
            </ToastProvider>
          </MatchesProvider>
        </AuthProvider>
      </View>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppRoot />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
