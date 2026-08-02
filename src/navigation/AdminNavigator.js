import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import SpaceSwitcherButton from '../components/SpaceSwitcherButton';
import NotificationBell from '../components/NotificationBell';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminSupplierApprovalScreen from '../screens/admin/AdminSupplierApprovalScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminDisputesScreen from '../screens/admin/AdminDisputesScreen';
import AdminSupportScreen from '../screens/admin/AdminSupportScreen';
import AdminSupportChatScreen from '../screens/admin/AdminSupportChatScreen';
import AdminPayoutsScreen from '../screens/admin/AdminPayoutsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS = {
  AdminDashboard: 'grid',
  AdminOrders: 'receipt',
  AdminApprovals: 'checkmark-done',
  AdminUsers: 'people',
  AdminDisputes: 'alert-circle',
};

function AdminTabs() {
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => {
          const name = ICONS[route.name] || 'ellipse';
          return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Accueil' }} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Commandes' }} />
      <Tab.Screen name="AdminApprovals" component={AdminSupplierApprovalScreen} options={{ title: 'Validations' }} />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Utilisateurs' }} />
      <Tab.Screen name="AdminDisputes" component={AdminDisputesScreen} options={{ title: 'Litiges' }} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
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
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AdminSupport" component={AdminSupportScreen} options={{ title: 'Support client' }} />
      <Stack.Screen name="AdminSupportChat" component={AdminSupportChatScreen} options={{ title: 'Conversation' }} />
      <Stack.Screen name="AdminPayouts" component={AdminPayoutsScreen} options={{ title: 'Retraits partenaires' }} />
    </Stack.Navigator>
  );
}
