import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyDeliveries, isDelivered, getDelivererFee, getOrderRef } from '../../services/deliveryOrderService';
import { formatPrice } from '../../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../../utils/orderStatus';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function DeliveryHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyDeliveries(token);
      const finished = data.filter((o) => isDelivered(o) || ['annulee', 'annulée'].includes(o.status));
      finished.sort((a, b) => new Date(b.updated_at || b.updatedAt || 0) - new Date(a.updated_at || a.updatedAt || 0));
      setOrders(finished);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  const totalEarned = orders.filter(isDelivered).reduce((sum, o) => sum + getDelivererFee(o), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {orders.length === 0 ? (
        <EmptyState icon="time-outline" title="Aucune course terminée" subtitle="Votre historique de livraisons apparaîtra ici." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total gagné (historique)</Text>
              <Text style={styles.summaryValue}>{formatPrice(totalEarned)} F</Text>
            </View>
          }
          renderItem={({ item }) => {
            const delivered = isDelivered(item);
            const statusColor = getOrderStatusColor(item.status);
            return (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate('DeliveryDetail', { order: item, mode: 'mine' })}
              >
                <View style={[styles.cardIcon, { backgroundColor: delivered ? '#d1fae5' : '#fee2e2' }]}>
                  <Ionicons name={delivered ? 'checkmark-done' : 'close'} size={18} color={delivered ? colors.success : colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ref}>RÉF. #{getOrderRef(item)}</Text>
                  <Text style={styles.destination} numberOfLines={1}>
                    {item.address?.commune_label || 'Destination inconnue'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{getOrderStatusLabel(item.status)}</Text>
                  {delivered && <Text style={styles.fee}>+{formatPrice(getDelivererFee(item))} F</Text>}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  summaryCard: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 18, marginBottom: 4 },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ref: { fontSize: 9, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  destination: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 3 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  fee: { fontSize: 12, fontWeight: '800', color: colors.success, marginTop: 3 },
});
