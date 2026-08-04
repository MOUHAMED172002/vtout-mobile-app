import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getMyOrders } from '../services/orderService';
import { formatPrice } from '../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../utils/orderStatus';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

const STATUS_FILTERS = [
  { key: 'all', label: 'Toutes', statuses: null },
  { key: 'pending', label: 'En attente', statuses: ['en_attente', 'pending_payment'] },
  { key: 'confirmed', label: 'Confirmées', statuses: ['confirmée', 'confirmee'] },
  { key: 'shipped', label: 'Expédiées', statuses: ['expédiée', 'expediee'] },
  { key: 'delivered', label: 'Livrées', statuses: ['livrée', 'livree'] },
  { key: 'cancelled', label: 'Annulées', statuses: ['annulée', 'annulee'] },
];

export default function OrdersScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(route.params?.initialStatus || 'all');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyOrders(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const filteredOrders = useMemo(() => {
    const filter = STATUS_FILTERS.find((f) => f.key === activeFilter);
    if (!filter?.statuses) return orders;
    return orders.filter((o) => filter.statuses.includes(o.status));
  }, [orders, activeFilter]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.filterRow}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}
          renderItem={({ item }) => {
            const active = activeFilter === item.key;
            return (
              <Pressable
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(item.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {filteredOrders.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Aucune commande" subtitle="Vos commandes apparaîtront ici." />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>Commande #{item.id}</Text>
                <Text style={styles.orderDate}>{new Date(item.created_at || item.createdAt).toLocaleDateString('fr-FR')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.orderTotal}>{formatPrice(item.total_amount)} F</Text>
                <View style={[styles.statusPill, { backgroundColor: `${getOrderStatusColor(item.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getOrderStatusColor(item.status) }]}>{getOrderStatusLabel(item.status)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filterRow: { borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: {
    height: 34, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  filterChipTextActive: { color: colors.surface },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  orderId: { fontSize: 14, fontWeight: '800', color: colors.text },
  orderDate: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: '900', color: colors.text },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});
