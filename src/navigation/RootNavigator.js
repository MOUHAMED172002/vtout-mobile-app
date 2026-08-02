import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useSpace } from '../context/SpaceContext';

import TabNavigator from './TabNavigator';
import SupplierNavigator from './SupplierNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import AdminNavigator from './AdminNavigator';
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
import SupplierRegisterScreen from '../screens/supplier/SupplierRegisterScreen';
import BecomeDeliveryScreen from '../screens/delivery/BecomeDeliveryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProductReviewsScreen from '../screens/ProductReviewsScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import MyReviewsScreen from '../screens/MyReviewsScreen';
import BoutiqueStoreScreen from '../screens/BoutiqueStoreScreen';

const Stack = createNativeStackNavigator();

const headerOptions = {
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '800', fontSize: 16 },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.surface },
};

// Racine affichée sous "Tabs" : dépend de l'espace actif (client / vendeur /
// livreur / admin). Un compte qui cumule plusieurs rôles peut basculer via
// le bouton SpaceSwitcherButton présent dans l'en-tête de chaque espace.
function SpaceRoot() {
  const { space } = useSpace();
  if (space === 'supplier') return <SupplierNavigator />;
  if (space === 'delivery') return <DeliveryNavigator />;
  if (space === 'admin') return <AdminNavigator />;
  return <TabNavigator />;
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Tabs" component={SpaceRoot} options={{ headerShown: false }} />
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
      <Stack.Screen name="SupplierRegister" component={SupplierRegisterScreen} options={{ title: 'Devenir vendeur' }} />
      <Stack.Screen name="BecomeDelivery" component={BecomeDeliveryScreen} options={{ title: 'Candidature livreur' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="ProductReviews" component={ProductReviewsScreen} options={{ title: 'Avis clients' }} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Laisser un avis' }} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} options={{ title: 'Mes avis' }} />
      <Stack.Screen name="BoutiqueStore" component={BoutiqueStoreScreen} options={{ title: 'Boutique' }} />
    </Stack.Navigator>
  );
}
