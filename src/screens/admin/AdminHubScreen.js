import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

const SECTIONS = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Analyses des ventes', icon: 'stats-chart-outline', route: 'AdminSalesAnalytics' },
      { label: 'Mots-clés recherchés', icon: 'search-outline', route: 'AdminSearchAnalytics' },
    ],
  },
  {
    label: 'Produits',
    items: [
      { label: 'Tous les produits', icon: 'cube-outline', route: 'AdminProducts' },
      { label: 'Ajouter un produit', icon: 'add-circle-outline', route: 'AdminProductForm' },
      { label: 'Gestion des catégories', icon: 'grid-outline', route: 'AdminCategories' },
      { label: 'Gestion des variantes', icon: 'options-outline', route: 'AdminAttributes' },
    ],
  },
  {
    label: 'Fournisseurs',
    items: [
      { label: 'Validation vendeurs & produits', icon: 'checkmark-done-outline', tabRoute: 'AdminApprovals' },
      { label: 'Catalogue boutiques', icon: 'storefront-outline', route: 'AdminBoutiques' },
      { label: 'Badge Certifié', icon: 'shield-checkmark-outline', route: 'AdminBadgeManager' },
    ],
  },
  {
    label: 'Commandes',
    items: [
      { label: 'Toutes les commandes', icon: 'receipt-outline', tabRoute: 'AdminOrders' },
      { label: 'Retours & litiges', icon: 'alert-circle-outline', tabRoute: 'AdminDisputes' },
    ],
  },
  {
    label: 'Logistique',
    items: [
      { label: 'Validation livreurs', icon: 'bicycle-outline', route: 'AdminLivreurs' },
      { label: 'Tour de contrôle', icon: 'pulse-outline', route: 'AdminControlTower' },
      { label: 'Contrôle cash', icon: 'cash-outline', route: 'AdminCashControl' },
    ],
  },
  {
    label: 'Utilisateurs',
    items: [
      { label: 'Liste des utilisateurs', icon: 'people-outline', tabRoute: 'AdminUsers' },
    ],
  },
  {
    label: 'Contenu & Blog',
    items: [
      { label: 'Articles de blog', icon: 'newspaper-outline', route: 'AdminBlog' },
      { label: 'Questions fréquentes', icon: 'help-circle-outline', route: 'AdminFaq' },
      { label: 'Politiques légales', icon: 'document-text-outline', route: 'AdminPolicy' },
    ],
  },
  {
    label: 'Promotions',
    items: [
      { label: 'Kits & packs', icon: 'gift-outline', route: 'AdminKits' },
      { label: 'Codes promo', icon: 'pricetag-outline', route: 'AdminCoupons' },
      { label: 'Parrainage', icon: 'share-social-outline', route: 'AdminReferral' },
    ],
  },
  {
    label: 'Finances',
    items: [
      { label: 'Retraits partenaires', icon: 'wallet-outline', route: 'AdminPayouts' },
    ],
  },
  {
    label: 'Paramètres',
    items: [
      { label: 'Configuration', icon: 'settings-outline', route: 'AdminConfig' },
      { label: 'Géographie', icon: 'map-outline', route: 'AdminGeography' },
      { label: 'Messages support', icon: 'chatbox-ellipses-outline', route: 'AdminSupport' },
      { label: 'Frais de livraison', icon: 'car-outline', route: 'AdminDeliveryFeeTiers' },
      { label: 'Coefficient livreur', icon: 'trending-up-outline', route: 'AdminDeliveryMultiplier' },
    ],
  },
];

export default function AdminHubScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const openItem = (item) => {
    if (item.tabRoute) {
      navigation.navigate('AdminTabs', { screen: item.tabRoute });
    } else {
      navigation.navigate(item.route);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
        {SECTIONS.map((section) => (
          <View key={section.label} style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  style={[styles.row, idx === section.items.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => openItem(item)}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon} size={17} color={colors.primary} />
                  </View>
                  <Text style={styles.label}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(243,112,33,0.1)', alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.text },
});
