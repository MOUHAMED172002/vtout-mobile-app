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
import AdminHubScreen from '../screens/admin/AdminHubScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminProductFormScreen from '../screens/admin/AdminProductFormScreen';
import AdminCategoriesScreen from '../screens/admin/AdminCategoriesScreen';
import AdminAttributesScreen from '../screens/admin/AdminAttributesScreen';
import AdminBoutiquesScreen from '../screens/admin/AdminBoutiquesScreen';
import AdminBadgeManagerScreen from '../screens/admin/AdminBadgeManagerScreen';
import AdminKitsScreen from '../screens/admin/AdminKitsScreen';
import AdminLivreursScreen from '../screens/admin/AdminLivreursScreen';
import AdminControlTowerScreen from '../screens/admin/AdminControlTowerScreen';
import AdminCashControlScreen from '../screens/admin/AdminCashControlScreen';
import AdminBlogScreen from '../screens/admin/AdminBlogScreen';
import AdminBlogFormScreen from '../screens/admin/AdminBlogFormScreen';
import AdminFaqScreen from '../screens/admin/AdminFaqScreen';
import AdminPolicyScreen from '../screens/admin/AdminPolicyScreen';
import AdminConfigScreen from '../screens/admin/AdminConfigScreen';
import AdminGeographyScreen from '../screens/admin/AdminGeographyScreen';
import AdminDeliveryFeeTiersScreen from '../screens/admin/AdminDeliveryFeeTiersScreen';
import AdminDeliveryMultiplierScreen from '../screens/admin/AdminDeliveryMultiplierScreen';
import AdminSalesAnalyticsScreen from '../screens/admin/AdminSalesAnalyticsScreen';
import AdminSearchAnalyticsScreen from '../screens/admin/AdminSearchAnalyticsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS = {
  AdminDashboard: 'grid',
  AdminOrders: 'receipt',
  AdminApprovals: 'checkmark-done',
  AdminUsers: 'people',
  AdminDisputes: 'alert-circle',
  AdminHub: 'apps',
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
      <Tab.Screen name="AdminHub" component={AdminHubScreen} options={{ title: 'Plus' }} />
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
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: 'Tous les produits' }} />
      <Stack.Screen name="AdminProductForm" component={AdminProductFormScreen} options={{ title: 'Produit' }} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} options={{ title: 'Catégories' }} />
      <Stack.Screen name="AdminAttributes" component={AdminAttributesScreen} options={{ title: 'Variantes' }} />
      <Stack.Screen name="AdminBoutiques" component={AdminBoutiquesScreen} options={{ title: 'Catalogue boutiques' }} />
      <Stack.Screen name="AdminBadgeManager" component={AdminBadgeManagerScreen} options={{ title: 'Badge Certifié' }} />
      <Stack.Screen name="AdminKits" component={AdminKitsScreen} options={{ title: 'Kits & packs' }} />
      <Stack.Screen name="AdminLivreurs" component={AdminLivreursScreen} options={{ title: 'Validation livreurs' }} />
      <Stack.Screen name="AdminControlTower" component={AdminControlTowerScreen} options={{ title: 'Tour de contrôle' }} />
      <Stack.Screen name="AdminCashControl" component={AdminCashControlScreen} options={{ title: 'Contrôle cash' }} />
      <Stack.Screen name="AdminBlog" component={AdminBlogScreen} options={{ title: 'Articles de blog' }} />
      <Stack.Screen name="AdminBlogForm" component={AdminBlogFormScreen} options={{ title: 'Article' }} />
      <Stack.Screen name="AdminFaq" component={AdminFaqScreen} options={{ title: 'Questions fréquentes' }} />
      <Stack.Screen name="AdminPolicy" component={AdminPolicyScreen} options={{ title: 'Politiques légales' }} />
      <Stack.Screen name="AdminConfig" component={AdminConfigScreen} options={{ title: 'Configuration' }} />
      <Stack.Screen name="AdminGeography" component={AdminGeographyScreen} options={{ title: 'Géographie' }} />
      <Stack.Screen name="AdminDeliveryFeeTiers" component={AdminDeliveryFeeTiersScreen} options={{ title: 'Frais de livraison' }} />
      <Stack.Screen name="AdminDeliveryMultiplier" component={AdminDeliveryMultiplierScreen} options={{ title: 'Coefficient livreur' }} />
      <Stack.Screen name="AdminSalesAnalytics" component={AdminSalesAnalyticsScreen} options={{ title: 'Analyses des ventes' }} />
      <Stack.Screen name="AdminSearchAnalytics" component={AdminSearchAnalyticsScreen} options={{ title: 'Mots-clés recherchés' }} />
    </Stack.Navigator>
  );
}
