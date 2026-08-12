import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';

import { AuthProvider } from './src/context/AuthContext';
import { SpaceProvider } from './src/context/SpaceContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { CartProvider } from './src/context/CartContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import PushNotificationListener from './src/components/PushNotificationListener';
import SupportChatBubble from './src/components/SupportChatBubble';
import EmailVerificationBanner from './src/components/EmailVerificationBanner';

// Deep linking (schéma "vtout://", voir app.json) — pour l'instant limité
// à ce que le widget "Suivi de commande" ouvre directement la bonne
// commande au tap (voir src/widgets/OrderTrackingWidget.js et
// targets/widget/widgets.swift), plutôt que de rouvrir l'app à la racine.
// OrderDetail est un écran de RootNavigator, toujours monté quel que soit
// l'espace actif (client/vendeur/livreur/admin) — pas besoin de gérer de
// bascule d'espace pour ce cas précis.
const linking = {
  prefixes: ['vtout://'],
  config: {
    screens: {
      OrderDetail: 'order/:id',
      Orders: 'orders',
    },
  },
};

function AppContent() {
  const { mode, colors } = useTheme();
  const baseNavTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Au-dessus de toute la navigation, comme le Navbar web — visible sur
          n'importe quel écran tant que l'email n'est pas vérifié. */}
      <EmailVerificationBanner />
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={{
          ...baseNavTheme,
          dark: mode === 'dark',
          colors: {
            ...baseNavTheme.colors,
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
    </View>
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
