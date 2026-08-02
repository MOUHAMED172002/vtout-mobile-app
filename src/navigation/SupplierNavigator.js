import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceSwitcherButton from '../components/SpaceSwitcherButton';

import SupplierDashboardScreen from '../screens/supplier/SupplierDashboardScreen';
import SupplierOrdersScreen from '../screens/supplier/SupplierOrdersScreen';
import SupplierOrderDetailScreen from '../screens/supplier/SupplierOrderDetailScreen';
import SupplierProductsScreen from '../screens/supplier/SupplierProductsScreen';
import SupplierProductFormScreen from '../screens/supplier/SupplierProductFormScreen';
import SupplierWalletScreen from '../screens/supplier/SupplierWalletScreen';
import SupplierBoutiquesScreen from '../screens/supplier/SupplierBoutiquesScreen';
import SupplierRegisterScreen from '../screens/supplier/SupplierRegisterScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS = {
  SupplierDashboard: 'grid',
  SupplierOrders: 'receipt',
  SupplierProducts: 'cube',
  SupplierWallet: 'wallet',
};

function SupplierTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerRight: () => <SpaceSwitcherButton />,
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
      <Tab.Screen name="SupplierDashboard" component={SupplierDashboardScreen} options={{ title: 'Tableau de bord' }} />
      <Tab.Screen name="SupplierOrders" component={SupplierOrdersScreen} options={{ title: 'Commandes' }} />
      <Tab.Screen name="SupplierProducts" component={SupplierProductsScreen} options={{ title: 'Produits' }} />
      <Tab.Screen name="SupplierWallet" component={SupplierWalletScreen} options={{ title: 'Portefeuille' }} />
    </Tab.Navigator>
  );
}

export default function SupplierNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="SupplierTabs" component={SupplierTabs} options={{ headerShown: false }} />
      <Stack.Screen name="SupplierOrderDetail" component={SupplierOrderDetailScreen} options={{ title: 'Commande' }} />
      <Stack.Screen name="SupplierProductForm" component={SupplierProductFormScreen} options={{ title: 'Produit' }} />
      <Stack.Screen name="SupplierBoutiques" component={SupplierBoutiquesScreen} options={{ title: 'Mes boutiques' }} />
      <Stack.Screen name="SupplierRegister" component={SupplierRegisterScreen} options={{ title: 'Devenir vendeur' }} />
    </Stack.Navigator>
  );
}
