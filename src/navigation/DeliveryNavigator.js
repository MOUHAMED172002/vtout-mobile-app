import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import SpaceSwitcherButton from '../components/SpaceSwitcherButton';
import NotificationBell from '../components/NotificationBell';

import DeliveryHomeScreen from '../screens/delivery/DeliveryHomeScreen';
import AvailableOrdersScreen from '../screens/delivery/AvailableOrdersScreen';
import MyDeliveriesScreen from '../screens/delivery/MyDeliveriesScreen';
import DeliveryDetailScreen from '../screens/delivery/DeliveryDetailScreen';
import DeliveryHistoryScreen from '../screens/delivery/DeliveryHistoryScreen';
import BecomeDeliveryScreen from '../screens/delivery/BecomeDeliveryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS = {
  DeliveryHome: 'home',
  AvailableOrders: 'cube',
  MyDeliveries: 'bicycle',
};

function DeliveryTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <NotificationBell />
            <SpaceSwitcherButton />
          </View>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => {
          const name = ICONS[route.name] || 'ellipse';
          return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
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
    </Stack.Navigator>
  );
}
