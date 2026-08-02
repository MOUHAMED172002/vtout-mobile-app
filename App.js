import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';

import { AuthProvider } from './src/context/AuthContext';
import { SpaceProvider } from './src/context/SpaceContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { CartProvider } from './src/context/CartContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import PushNotificationListener from './src/components/PushNotificationListener';
import SupportChatBubble from './src/components/SupportChatBubble';

function AppContent() {
  const { mode, colors } = useTheme();
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: mode === 'dark',
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.danger,
        },
      }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
      <PushNotificationListener />
      <SupportChatBubble />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SpaceProvider>
              <NotificationProvider>
                <CartProvider>
                  <AppContent />
                </CartProvider>
              </NotificationProvider>
            </SpaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
