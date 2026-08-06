import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
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
import BoutiquesScreen from '../screens/BoutiquesScreen';
import WalletScreen from '../screens/WalletScreen';
import InfoHubScreen from '../screens/info/InfoHubScreen';
import AboutScreen from '../screens/info/AboutScreen';
import HowItWorksScreen from '../screens/info/HowItWorksScreen';
import FaqScreen from '../screens/info/FaqScreen';
import PolicyDetailScreen from '../screens/info/PolicyDetailScreen';
import BlogListScreen from '../screens/info/BlogListScreen';
import BlogDetailScreen from '../screens/info/BlogDetailScreen';
import TestimonialsScreen from '../screens/info/TestimonialsScreen';
import ContactScreen from '../screens/info/ContactScreen';
import PromotionsScreen from '../screens/info/PromotionsScreen';
import SupportChatScreen from '../screens/info/SupportChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ReferralScreen from '../screens/ReferralScreen';
import DistributionScreen from '../screens/DistributionScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

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
  const { colors } = useTheme();
  const headerOptions = {
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '800', fontSize: 16 },
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.surface },
  };
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
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ title: 'Parrainage' }} />
      <Stack.Screen name="Distribution" component={DistributionScreen} options={{ title: 'Distribution WhatsApp' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Modifier mon profil' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Mot de passe' }} />
      <Stack.Screen name="ProductReviews" component={ProductReviewsScreen} options={{ title: 'Avis clients' }} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Laisser un avis' }} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} options={{ title: 'Mes avis' }} />
      <Stack.Screen name="BoutiqueStore" component={BoutiqueStoreScreen} options={{ title: 'Boutique' }} />
      <Stack.Screen name="BoutiquesListe" component={BoutiquesScreen} options={{ title: 'Boutiques' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Mon portefeuille' }} />
      <Stack.Screen name="InfoHub" component={InfoHubScreen} options={{ title: 'Aide & À propos' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'À propos de Vtout' }} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} options={{ title: 'Comment ça marche' }} />
      <Stack.Screen name="Faq" component={FaqScreen} options={{ title: 'Questions fréquentes' }} />
      <Stack.Screen name="PolicyDetail" component={PolicyDetailScreen} options={({ route }) => ({ title: route.params?.title || 'Mentions légales' })} />
      <Stack.Screen name="BlogList" component={BlogListScreen} options={{ title: 'Blog' }} />
      <Stack.Screen name="BlogDetail" component={BlogDetailScreen} options={{ title: 'Article' }} />
      <Stack.Screen name="Testimonials" component={TestimonialsScreen} options={{ title: 'Témoignages' }} />
      <Stack.Screen name="Contact" component={ContactScreen} options={{ title: 'Contactez-nous' }} />
      <Stack.Screen name="Promotions" component={PromotionsScreen} options={{ title: 'Promotions' }} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} options={{ title: 'Support Vtout' }} />
    </Stack.Navigator>
  );
}
