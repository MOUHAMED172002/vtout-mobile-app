import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../services/adminStatsService';
import { formatPrice } from '../../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../../utils/orderStatus';
import Loading from '../../components/Loading';

const PERIODS = ['7J', '30J'];

function StatCard({ label, value, icon, color }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function QuickAction({ label, icon, onPress }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [period, setPeriod] = useState('30J');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p = period) => {
    try {
      const token = await getToken();
      const stats = await getDashboardStats(token, p);
      setData(stats);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, period]);

  useEffect(() => { load(period); }, [period]);

  if (loading) return <Loading />;

  const stats = data?.stats || {};
  const lowStock = data?.lowStock || [];
  const recentOrders = data?.recentOrders || [];

  const lowStockLabel = (item) => {
    const productName = item.variant?.product?.name || 'Produit';
    return productName;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(period); }} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tableau de bord</Text>
          <View style={styles.periodSwitch}>
            {PERIODS.map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.periodBtn, period === p && styles.periodBtnActive]}>
                <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Ventes" value={`${formatPrice(stats.revenue)} F`} icon="trending-up" color={colors.secondary} />
          <StatCard label="Commandes livrées" value={String(stats.orders || 0)} icon="cube" color={colors.primary} />
          <StatCard label="Clients" value={String(stats.customers || 0)} icon="people" color={colors.success} />
          <StatCard label="Stock bas" value={String(lowStock.length)} icon="alert-circle" color={colors.danger} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={styles.quickActions}>
            <QuickAction label="Commandes" icon="receipt-outline" onPress={() => navigation.navigate('AdminOrders')} />
            <QuickAction label="Validations vendeurs & produits" icon="checkmark-done-outline" onPress={() => navigation.navigate('AdminApprovals')} />
            <QuickAction label="Utilisateurs" icon="people-outline" onPress={() => navigation.navigate('AdminUsers')} />
            <QuickAction label="Litiges" icon="alert-circle-outline" onPress={() => navigation.navigate('AdminDisputes')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertes stock ({lowStock.length})</Text>
          {lowStock.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={styles.emptyCardText}>Aucun produit critique</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {lowStock.map((item) => (
                <View key={item.id} style={styles.alertRow}>
                  <View style={[styles.alertDot, { backgroundColor: item.stock === 0 ? colors.danger : colors.warning }]} />
                  <Text style={styles.alertText} numberOfLines={1}>{lowStockLabel(item)}</Text>
                  <Text style={[styles.alertStock, { color: item.stock === 0 ? colors.danger : colors.warning }]}>{item.stock} en stock</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          {recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Aucune commande récente</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {recentOrders.map((o) => (
                <Pressable key={o.id} style={styles.orderRow} onPress={() => navigation.navigate('AdminOrders')}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderRef}>#{String(o.id).slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.orderCustomer} numberOfLines={1}>{o.user?.fullname || 'Client'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.orderAmount}>{formatPrice(o.total_amount)} F</Text>
                    <View style={[styles.statusPill, { backgroundColor: `${getOrderStatusColor(o.status)}20` }]}>
                      <Text style={[styles.statusText, { color: getOrderStatusColor(o.status) }]}>{getOrderStatusLabel(o.status)}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  periodSwitch: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, padding: 3 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  periodBtnActive: { backgroundColor: colors.text },
  periodBtnText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  periodBtnTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  quickActions: { gap: 8 },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  quickActionIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 16, justifyContent: 'center',
  },
  emptyCardText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.text },
  alertStock: { fontSize: 11, fontWeight: '800' },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  orderRef: { fontSize: 12, fontWeight: '900', color: colors.text },
  orderCustomer: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  orderAmount: { fontSize: 13, fontWeight: '900', color: colors.text },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});
