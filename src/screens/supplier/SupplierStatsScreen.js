import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getSupplierPerformance } from '../../services/supplierStatsService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';

const formatMonth = (ym) => {
  const [y, m] = String(ym || '').split('-');
  if (!y || !m) return ym || '';
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'short' });
};

export default function SupplierStatsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const stats = await getSupplierPerformance(token);
      setData(stats);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  const revenue = data?.revenue || 0;
  const orderCount = data?.orderCount || 0;
  const lowStock = data?.lowStock || [];
  const monthlyRevenue = data?.monthlyRevenue || [];
  const topProducts = data?.topProducts || [];
  const maxMonthly = Math.max(1, ...monthlyRevenue.map((m) => Number(m.total) || 0));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View>
          <Text style={styles.title}>Pilotage & performance</Text>
          <Text style={styles.subtitle}>Analysez vos ventes des 30 derniers jours</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.success}18` }]}>
              <Ionicons name="cash-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{formatPrice(revenue)} F</Text>
            <Text style={styles.statLabel}>Chiffre d'affaires (30j)</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.secondary}18` }]}>
              <Ionicons name="bag-handle-outline" size={18} color={colors.secondary} />
            </View>
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>Commandes (30j)</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${lowStock.length > 0 ? colors.danger : colors.textFaint}18` }]}>
              <Ionicons name="alert-circle-outline" size={18} color={lowStock.length > 0 ? colors.danger : colors.textFaint} />
            </View>
            <Text style={styles.statValue}>{lowStock.length}</Text>
            <Text style={styles.statLabel}>Alertes stock</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution du chiffre d'affaires (6 mois)</Text>
          {monthlyRevenue.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyCardText}>Aucune donnée disponible</Text></View>
          ) : (
            <View style={styles.barList}>
              {monthlyRevenue.map((m) => {
                const value = Number(m.total) || 0;
                const widthPct = Math.max(3, Math.round((value / maxMonthly) * 100));
                return (
                  <View key={m.month} style={styles.barRow}>
                    <Text style={styles.barMonthLabel}>{formatMonth(m.month)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${widthPct}%` }]} />
                    </View>
                    <Text style={styles.barValue}>{formatPrice(value)} F</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top ventes</Text>
          {topProducts.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyCardText}>Aucune vente sur cette période</Text></View>
          ) : (
            <View style={styles.darkCard}>
              {topProducts.map((item, idx) => (
                <View key={idx} style={[styles.topRow, idx === topProducts.length - 1 && { borderBottomWidth: 0 }]}>
                  {item.product?.images?.[0]?.image_url ? (
                    <Image source={{ uri: getThumbnail(item.product.images[0].image_url) }} style={styles.topImage} />
                  ) : (
                    <View style={[styles.topImage, styles.topImagePlaceholder]}>
                      <Ionicons name="cube-outline" size={16} color="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName} numberOfLines={1}>{item.product?.name || 'Produit'}</Text>
                    <Text style={styles.topSold}>{item.sold} unité{item.sold > 1 ? 's' : ''} vendue{item.sold > 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.topRank}>#{idx + 1}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertes de stock critiques (&lt; 5 unités)</Text>
          {lowStock.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.emptyCardText}>Toutes vos boutiques sont bien approvisionnées</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {lowStock.map((product) => {
                const remaining = product.total_stock !== undefined ? product.total_stock : product.stock;
                return (
                  <View key={product.id} style={styles.stockRow}>
                    <View style={styles.stockIcon}>
                      <Ionicons name="cube" size={18} color={colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stockName} numberOfLines={1}>{product.name}</Text>
                      <View style={styles.stockTrack}>
                        <View style={[styles.stockFill, { width: `${Math.min(100, (remaining / 5) * 100)}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.stockValue}>{remaining} restants</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexBasis: '30%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 15, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 9.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 16, justifyContent: 'center',
  },
  emptyCardText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  barList: { gap: 6, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barMonthLabel: { width: 32, fontSize: 10.5, fontWeight: '700', color: colors.textFaint, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.secondary },
  barValue: { width: 76, textAlign: 'right', fontSize: 10.5, fontWeight: '800', color: colors.text },
  darkCard: { backgroundColor: colors.navy, borderRadius: radius.lg, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  topImage: { width: 40, height: 40, borderRadius: radius.sm },
  topImagePlaceholder: { backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  topName: { fontSize: 12.5, fontWeight: '700', color: '#fff' },
  topSold: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  topRank: { fontSize: 13, fontWeight: '900', color: colors.primary },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12 },
  stockIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: `${colors.danger}15`, alignItems: 'center', justifyContent: 'center' },
  stockName: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  stockTrack: { height: 5, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden', marginTop: 6 },
  stockFill: { height: '100%', borderRadius: 3, backgroundColor: colors.danger },
  stockValue: { fontSize: 10.5, fontWeight: '800', color: colors.danger },
});
