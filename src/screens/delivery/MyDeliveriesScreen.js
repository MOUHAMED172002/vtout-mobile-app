import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  getMyDeliveries,
  isPickedUp,
  isDelivered,
  hasUnremittedCash,
  getDelivererFee,
  getOrderRef,
} from '../../services/deliveryOrderService';
import { formatPrice } from '../../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../../utils/orderStatus';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function MyDeliveriesScreen({ navigation }) {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyDeliveries(token);
      setOrders(data.filter((o) => !isDelivered(o) && !['annulee', 'annulée'].includes(o.status)));
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const unremittedAmount = orders.filter(hasUnremittedCash).reduce((s, o) => s + Number(o.total_amount || 0), 0);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {unremittedAmount > 0 && (
        <View style={styles.debtBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.debtText}>Caisse non versée : {formatPrice(unremittedAmount)} F</Text>
        </View>
      )}

      {orders.length === 0 ? (
        <EmptyState icon="bicycle-outline" title="Aucune course en cours" subtitle="Acceptez une commande disponible pour la voir apparaître ici." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const pickedUp = isPickedUp(item);
            const statusColor = getOrderStatusColor(item.status);
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
                onPress={() => navigation.navigate('DeliveryDetail', { order: item, mode: 'mine' })}
              >
                <View style={[styles.cardIcon, { backgroundColor: pickedUp ? '#d1fae5' : '#fef3c7' }]}>
                  <Ionicons name="bicycle" size={20} color={pickedUp ? colors.success : colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.ref}>RÉF. #{getOrderRef(item)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{getOrderStatusLabel(item.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.destination} numberOfLines={1}>
                    {item.address?.quartier_label ? `${item.address.quartier_label}, ` : ''}
                    {item.address?.commune_label || item.address?.city || 'Destination'}
                  </Text>
                  <Text style={styles.fee}>{formatPrice(getDelivererFee(item))} F</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  debtBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  debtText: { fontSize: 11, fontWeight: '700', color: '#991b1b' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ref: { fontSize: 9, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  destination: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 3 },
  fee: { fontSize: 12, fontWeight: '800', color: colors.primary, marginTop: 3 },
});
