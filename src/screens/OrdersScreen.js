import React, { useEffect, useState, useCallback } from 'react';
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

export default function OrdersScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {orders.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Aucune commande" subtitle="Vos commandes apparaîtront ici." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
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
