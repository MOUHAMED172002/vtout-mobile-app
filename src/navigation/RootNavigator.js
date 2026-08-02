import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';

import TabNavigator from './TabNavigator';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import ProductsListScreen from '../screens/ProductsListScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AddressesScreen from '../screens/AddressesScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

const headerOptions = {
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '800', fontSize: 16 },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.surface },
};

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Recherche' }} />
      <Stack.Screen name="ProductsList" component={ProductsListScreen} options={{ title: 'Produits' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Ma commande' }} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Mes commandes' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Commande' }} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Mes favoris' }} />
      <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Mes adresses' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Mot de passe oublié' }} />
    </Stack.Navigator>
  );
}
