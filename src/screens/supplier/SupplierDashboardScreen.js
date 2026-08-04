import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMySupplierProfile, getMyBoutiques } from '../../services/supplierService';
import { getMySupplierProducts } from '../../services/supplierProductService';
import { getMySupplierOrders } from '../../services/supplierOrderService';
import { getMyFinancials } from '../../services/supplierWalletService';
import { formatPrice, getThumbnail } from '../../utils/format';
import { getOrderStatusLabel } from '../../utils/orderStatus';
import Loading from '../../components/Loading';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';

export default function SupplierDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNotSupplier, setIsNotSupplier] = useState(false);
  const [profile, setProfile] = useState(null);
  const [boutiques, setBoutiques] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [balance, setBalance] = useState(0);
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState('all');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      let supplierProfile = null;
      let boutiquesData = [];
      try { supplierProfile = await getMySupplierProfile(token); } catch { supplierProfile = null; }
      try { boutiquesData = await getMyBoutiques(token); } catch { boutiquesData = []; }

      setProfile(supplierProfile);
      setBoutiques(boutiquesData || []);

      const hasSupplierSection = Boolean(supplierProfile || (boutiquesData && boutiquesData.length > 0));
      if (!hasSupplierSection) {
        setIsNotSupplier(true);
        return;
      }
      setIsNotSupplier(false);

      const [productsData, ordersData, financialData] = await Promise.all([
        getMySupplierProducts(token).catch(() => []),
        getMySupplierOrders(token).catch(() => []),
        getMyFinancials(token).catch(() => ({ balance: 0 })),
      ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setBalance(financialData?.balance || 0);
    } catch (err) {
      setIsNotSupplier(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  if (loading) return <Loading />;

  if (isNotSupplier) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <EmptyState
          icon="storefront-outline"
          title="Devenez vendeur sur Vtout"
          subtitle="Créez votre boutique et commencez à vendre vos produits à des milliers d'acheteurs au Bénin."
          action={
            <Button
              title="Devenir vendeur"
              onPress={() => navigation.navigate('SupplierRegister')}
              style={{ marginTop: 16, minWidth: 220 }}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const isActive = profile?.status === 'active';

  const matchesBoutique = (boutiqueId, secondaryIds) => {
    if (selectedBoutiqueId === 'all') return true;
    if (String(boutiqueId) === String(selectedBoutiqueId)) return true;
    const secondaries = Array.isArray(secondaryIds) ? secondaryIds : (typeof secondaryIds === 'string' ? JSON.parse(secondaryIds || '[]') : []);
    return secondaries.some((id) => String(id) === String(selectedBoutiqueId));
  };
  const filteredProducts = products.filter((p) => matchesBoutique(p.boutique_id, p.secondary_boutique_ids));
  const filteredOrders = orders.filter((o) => selectedBoutiqueId === 'all' || String(o.boutique_id) === String(selectedBoutiqueId));

  const approvedCount = filteredProducts.filter((p) => p.approval_status === 'approved').length;
  const pendingCount = filteredProducts.filter((p) => p.approval_status === 'En attente').length;

  const stats = [
    { label: 'Solde portefeuille', value: `${formatPrice(balance)} F`, icon: 'wallet-outline', color: colors.primary },
    { label: 'Produits en ligne', value: approvedCount, icon: 'checkmark-circle-outline', color: colors.success },
    { label: 'En attente', value: pendingCount, icon: 'time-outline', color: colors.warning },
    { label: 'Commandes', value: filteredOrders.length, icon: 'bar-chart-outline', color: colors.secondary },
  ];

  const quickLinks = [
    { label: 'Mes boutiques', icon: 'storefront-outline', onPress: () => navigation.navigate('SupplierBoutiques') },
    { label: 'Mes promotions', icon: 'sparkles-outline', onPress: () => navigation.navigate('SupplierPromotions') },
    { label: 'Mes litiges', icon: 'alert-circle-outline', onPress: () => navigation.navigate('SupplierDisputes') },
    { label: 'Statistiques', icon: 'stats-chart-outline', onPress: () => navigation.navigate('SupplierStats') },
    { label: 'Conditions & politiques', icon: 'document-text-outline', onPress: () => navigation.navigate('SupplierPolicies') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {profile?.status === 'En attente' && (
          <View style={styles.noticeCard}>
            <Ionicons name="time-outline" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Compte en cours de vérification</Text>
              <Text style={styles.noticeSubtitle}>L'admin valide actuellement vos informations. Les ventes sont bloquées temporairement.</Text>
            </View>
          </View>
        )}

        <View>
          <Text style={styles.greeting}>Bonjour, {user?.name?.split(' ')[0] || 'Vendeur'}</Text>
          <Text style={styles.subGreeting}>Console de gestion marchand</Text>
        </View>

        <Button
          title="Ajouter un produit"
          icon={<Ionicons name="add" size={18} color="#fff" />}
          disabled={!isActive}
          onPress={() => navigation.navigate('SupplierProductForm', {})}
        />

        {boutiques.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable style={[styles.boutiquePill, selectedBoutiqueId === 'all' && styles.boutiquePillActive]} onPress={() => setSelectedBoutiqueId('all')}>
              <Text style={[styles.boutiquePillText, selectedBoutiqueId === 'all' && styles.boutiquePillTextActive]}>Toutes les boutiques</Text>
            </Pressable>
            {boutiques.map((b) => (
              <Pressable key={b.id} style={[styles.boutiquePill, selectedBoutiqueId === b.id && styles.boutiquePillActive]} onPress={() => setSelectedBoutiqueId(b.id)}>
                <Text style={[styles.boutiquePillText, selectedBoutiqueId === b.id && styles.boutiquePillTextActive]} numberOfLines={1}>{b.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes produits récents</Text>
            <Pressable onPress={() => navigation.navigate('SupplierProducts')}>
              <Text style={styles.link}>Voir tout</Text>
            </Pressable>
          </View>
          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>Aucun produit pour le moment.</Text>
          ) : (
            filteredProducts.slice(0, 5).map((product) => (
              <Pressable key={product.id} style={styles.productRow} onPress={() => navigation.navigate('SupplierProducts')}>
                {product.images?.[0]?.image_url ? (
                  <Image source={{ uri: getThumbnail(product.images[0].image_url) }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, { backgroundColor: '#f1f5f9' }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productPrice}>{formatPrice(product.supplier_price)} F (gain net)</Text>
                </View>
                <View style={[styles.badge, badgeStyleFor(product.approval_status)]}>
                  <Text style={[styles.badgeText, badgeTextStyleFor(product.approval_status)]}>
                    {approvalLabel(product.approval_status)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={[styles.sectionCard, styles.darkCard]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: '#fff' }]}>Commandes récentes</Text>
            <Pressable onPress={() => navigation.navigate('SupplierOrders')}>
              <Text style={[styles.link, { color: colors.primary }]}>Voir tout</Text>
            </Pressable>
          </View>
          {filteredOrders.length === 0 ? (
            <Text style={styles.emptyTextDark}>Aucune commande pour le moment.</Text>
          ) : (
            filteredOrders.slice(0, 3).map((order) => (
              <Pressable key={order.id} style={styles.orderRowDark} onPress={() => navigation.navigate('SupplierOrderDetail', { id: order.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderIdDark}>Commande #{String(order.id).substring(0, 8)}</Text>
                  <Text style={styles.orderSubDark}>
                    {new Date(order.created_at || order.createdAt).toLocaleDateString('fr-FR')} · {order.items_count || order.items?.length || 0} article(s)
                  </Text>
                </View>
                <Text style={[styles.link, { color: colors.primary }]}>{getOrderStatusLabel(order.status)}</Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={{ gap: 8 }}>
            {quickLinks.map((item) => (
              <Pressable key={item.label} style={styles.quickLinkRow} onPress={item.onPress}>
                <View style={styles.quickLinkIcon}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.quickLinkLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const approvalLabel = (s) => (s === 'approved' ? 'Approuvé' : s === 'rejected' ? 'Rejeté' : 'En attente');
const badgeStyleFor = (s) => ({ backgroundColor: s === 'approved' ? '#d1fae5' : s === 'rejected' ? '#fee2e2' : '#fef3c7' });
const badgeTextStyleFor = (s) => ({ color: s === 'approved' ? '#059669' : s === 'rejected' ? '#dc2626' : '#d97706' });

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  noticeCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fffbeb',
    borderWidth: 1, borderColor: '#fde68a', borderRadius: radius.lg, padding: 14,
  },
  noticeTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  noticeSubtitle: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  greeting: { fontSize: 22, fontWeight: '900', color: colors.text },
  subGreeting: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  boutiquePill: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  boutiquePillActive: { backgroundColor: colors.text, borderColor: colors.text },
  boutiquePillText: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  boutiquePillTextActive: { color: colors.surface },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  darkCard: { backgroundColor: colors.navy, borderColor: colors.navy },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  link: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  emptyText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  emptyTextDark: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  productImage: { width: 44, height: 44, borderRadius: radius.sm },
  productName: { fontSize: 13, fontWeight: '700', color: colors.text },
  productPrice: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  orderRowDark: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md, padding: 12,
  },
  orderIdDark: { fontSize: 13, fontWeight: '800', color: '#fff' },
  orderSubDark: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 2 },
  quickLinkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.background,
    borderRadius: radius.md, padding: 12,
  },
  quickLinkIcon: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLinkLabel: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.text },
});
