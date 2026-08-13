import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import SpaceSwitcherButton from '../components/SpaceSwitcherButton';
import NotificationBell from '../components/NotificationBell';
import TourHelpButton from '../components/TourHelpButton';
import TourAnchor from '../tour/TourAnchor';
import { DELIVERY_TOUR_STEPS } from '../tour/tourSteps';

import DeliveryHomeScreen from '../screens/delivery/DeliveryHomeScreen';
import AvailableOrdersScreen from '../screens/delivery/AvailableOrdersScreen';
import MyDeliveriesScreen from '../screens/delivery/MyDeliveriesScreen';
import DeliveryDetailScreen from '../screens/delivery/DeliveryDetailScreen';
import DeliveryHistoryScreen from '../screens/delivery/DeliveryHistoryScreen';
import BecomeDeliveryScreen from '../screens/delivery/BecomeDeliveryScreen';
import DeliveryWalletScreen from '../screens/delivery/DeliveryWalletScreen';
import DeliveryProfileScreen from '../screens/delivery/DeliveryProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS = {
  DeliveryHome: 'home',
  AvailableOrders: 'cube',
  MyDeliveries: 'bicycle',
};

const TAB_ANCHORS = {
  DeliveryHome: 'tour-delivery-tab-home',
  AvailableOrders: 'tour-delivery-tab-available',
  MyDeliveries: 'tour-delivery-tab-mine',
};

function DeliveryTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TourHelpButton steps={DELIVERY_TOUR_STEPS} />
            <NotificationBell />
            <SpaceSwitcherButton />
          </View>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { height: 60 + insets.bottom, paddingBottom: Math.max(8, insets.bottom), paddingTop: 6, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        // Ancres de la visite guidée (voir src/tour/tourSteps.js#DELIVERY_TOUR_STEPS).
        tabBarIcon: ({ color, size, focused }) => {
          const name = ICONS[route.name] || 'ellipse';
          const icon = <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
          const anchorId = TAB_ANCHORS[route.name];
          return anchorId ? <TourAnchor id={anchorId}>{icon}</TourAnchor> : icon;
        },
      })}
    >
      <Tab.Screen name="DeliveryHome" component={DeliveryHomeScreen} options={{ title: 'Accueil' }} />
      <Tab.Screen name="AvailableOrders" component={AvailableOrdersScreen} options={{ title: 'Disponibles' }} />
      <Tab.Screen name="MyDeliveries" component={MyDeliveriesScreen} options={{ title: 'Mes livraisons' }} />
    </Tab.Navigator>
  );
}

export default function DeliveryNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="DeliveryTabs" component={DeliveryTabs} options={{ headerShown: false }} />
      <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} options={{ title: 'Livraison' }} />
      <Stack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} options={{ title: 'Historique' }} />
      <Stack.Screen name="BecomeDelivery" component={BecomeDeliveryScreen} options={{ title: 'Candidature livreur' }} />
      <Stack.Screen name="DeliveryWallet" component={DeliveryWalletScreen} options={{ title: 'Portefeuille' }} />
      <Stack.Screen name="DeliveryProfile" component={DeliveryProfileScreen} options={{ title: 'Zones & véhicule' }} />
    </Stack.Navigator>
  );
}
