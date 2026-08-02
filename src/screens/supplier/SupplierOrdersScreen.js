import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getMySupplierOrders, getEstimatedGain } from '../../services/supplierOrderService';
import { formatPrice } from '../../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../../utils/orderStatus';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'en_attente', label: 'Nouvelle' },
  { key: 'confirmée', label: 'Préparation' },
  { key: 'expédiée', label: 'Expédiée' },
  { key: 'livrée', label: 'Livrée' },
  { key: 'annulée', label: 'Annulée' },
];

const normalize = (s) => {
  const map = { confirmee: 'confirmée', expediee: 'expédiée', livree: 'livrée', annulee: 'annulée' };
  return map[s] || s;
};

export default function SupplierOrdersScreen({ navigation }) {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMySupplierOrders(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
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

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => normalize(o.status) === normalize(filter));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <FlatList
            data={FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(f) => f.key}
            contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setFilter(item.key)}
                style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>{item.label}</Text>
              </Pressable>
            )}
          />
        }
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="Aucune commande" subtitle="Vos commandes reçues apparaîtront ici." />}
        renderItem={({ item }) => {
          const color = getOrderStatusColor(item.status);
          return (
            <Pressable style={styles.row} onPress={() => navigation.navigate('SupplierOrderDetail', { id: item.id })}>
              <View style={[styles.statusIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name="cube-outline" size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>Commande #{String(item.id).substring(0, 8)}</Text>
                <Text style={styles.orderDate}>
                  {new Date(item.created_at || item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {item.items_count || item.items?.length || 0} article(s)
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.gain}>{formatPrice(getEstimatedGain(item))} F</Text>
                <View style={[styles.statusPill, { backgroundColor: `${color}20` }]}>
                  <Text style={[styles.statusText, { color }]}>{getOrderStatusLabel(item.status)}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterChipText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  filterChipTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  statusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  orderId: { fontSize: 14, fontWeight: '800', color: colors.text },
  orderDate: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  gain: { fontSize: 14, fontWeight: '900', color: colors.text },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});
