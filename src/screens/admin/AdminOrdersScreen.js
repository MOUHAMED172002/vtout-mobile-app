import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getAllOrders, updateOrderStatus } from '../../services/adminOrderService';
import { formatPrice } from '../../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../../utils/orderStatus';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'en_attente', label: 'En attente' },
  { id: 'confirmee', label: 'Confirmées' },
  { id: 'expediee', label: 'Expédiées' },
  { id: 'livree', label: 'Livrées' },
  { id: 'annulee', label: 'Annulées' },
];

const STATUS_OPTIONS = ['en_attente', 'confirmee', 'expediee', 'livree', 'annulee'];

const normalize = (s) => {
  if (!s) return '';
  const v = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (v.startsWith('en_attent') || v === 'attente') return 'en_attente';
  if (v.startsWith('confirm')) return 'confirmee';
  if (v.startsWith('expedi')) return 'expediee';
  if (v.startsWith('livr')) return 'livree';
  if (v.startsWith('annul')) return 'annulee';
  return v;
};

export default function AdminOrdersScreen() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllOrders(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => normalize(o.status) === filter);

  const handleChangeStatus = async (status) => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      const token = await getToken();
      await updateOrderStatus(selectedOrder.id, status, token);
      setSelectedOrder(null);
      load();
    } catch (err) {
      // silently ignore, l'admin peut réessayer
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {FILTERS.map((f) => (
          <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filterChip, filter === f.id && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filter === f.id && styles.filterChipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredOrders.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Aucune commande" subtitle="Aucune commande ne correspond à ce filtre." />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setSelectedOrder(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>#{String(item.id).slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.orderCustomer} numberOfLines={1}>
                  {item.guest_name || item.customer_name || item.user?.fullname || 'Client'}
                </Text>
                <Text style={styles.orderDate}>{new Date(item.created_at || item.createdAt).toLocaleDateString('fr-FR')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.orderTotal}>{formatPrice(item.total_amount)} F</Text>
                <View style={[styles.statusPill, { backgroundColor: `${getOrderStatusColor(item.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getOrderStatusColor(item.status) }]}>{getOrderStatusLabel(item.status)}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selectedOrder} animationType="fade" transparent onRequestClose={() => setSelectedOrder(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !updating && setSelectedOrder(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              Commande #{selectedOrder ? String(selectedOrder.id).slice(0, 8).toUpperCase() : ''}
            </Text>
            <Text style={styles.modalSubtitle}>Choisir le nouveau statut</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {STATUS_OPTIONS.map((status) => {
                const isCurrent = selectedOrder && normalize(selectedOrder.status) === status;
                return (
                  <Pressable
                    key={status}
                    disabled={updating || isCurrent}
                    onPress={() => handleChangeStatus(status)}
                    style={[styles.statusOption, isCurrent && styles.statusOptionCurrent]}
                  >
                    <View style={[styles.statusOptionDot, { backgroundColor: getOrderStatusColor(status) }]} />
                    <Text style={styles.statusOptionText}>{getOrderStatusLabel(status)}</Text>
                    {isCurrent && <Ionicons name="checkmark" size={16} color={colors.textMuted} />}
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.modalCancel} onPress={() => setSelectedOrder(null)} disabled={updating}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filters: { flexGrow: 0, paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  filterChipTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  orderId: { fontSize: 14, fontWeight: '800', color: colors.text },
  orderCustomer: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  orderDate: { fontSize: 11, color: colors.textFaint, fontWeight: '600', marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: '900', color: colors.text },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 32,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: radius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  statusOptionCurrent: { opacity: 0.5 },
  statusOptionDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  modalCancel: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
});
