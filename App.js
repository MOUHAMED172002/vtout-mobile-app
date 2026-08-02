import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';

import { AuthProvider } from './src/context/AuthContext';
import { SpaceProvider } from './src/context/SpaceContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { CartProvider } from './src/context/CartContext';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import PushNotificationListener from './src/components/PushNotificationListener';
import SupportChatBubble from './src/components/SupportChatBubble';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SpaceProvider>
            <NotificationProvider>
              <CartProvider>
                <NavigationContainer ref={navigationRef}>
                  <StatusBar style="dark" />
                  <RootNavigator />
                  <PushNotificationListener />
                  <SupportChatBubble />
                </NavigationContainer>
              </CartProvider>
            </NotificationProvider>
          </SpaceProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
