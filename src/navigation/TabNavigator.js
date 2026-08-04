import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CatalogueScreen from '../screens/CatalogueScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Accueil: 'home',
  Categories: 'grid',
  Boutique: 'bag-handle',
  Panier: 'cart',
  Profil: 'person',
};

function CartIcon({ color, size, focused }) {
  const { cartCount } = useCart();
  const { colors } = useTheme();
  return (
    <View>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />
      {cartCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Panier') return <CartIcon color={color} size={size} focused={focused} />;
          const name = ICONS[route.name] || 'ellipse';
          return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Catégories' }} />
      <Tab.Screen name="Boutique" component={CatalogueScreen} />
      <Tab.Screen name="Panier" component={CartScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
