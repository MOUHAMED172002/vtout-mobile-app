import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAvailableOrders,
  getMyDeliveries,
  assignOrder,
  getDelivererFee,
  hasUnremittedCash,
  getOrderRef,
} from '../../services/deliveryOrderService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

// Remplace la carte interactive du site web par une liste triable/filtrable
// par commune — pas besoin de mapbox côté mobile.
export default function AvailableOrdersScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [hasDebt, setHasDebt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [communeFilter, setCommuneFilter] = useState('Toutes');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [available, mine] = await Promise.all([
        getAvailableOrders(token),
        getMyDeliveries(token).catch(() => []),
      ]);
      setOrders(available);
      setHasDebt(mine.some(hasUnremittedCash));
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

  const communes = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const c = o.address?.commune_label || o.address?.city;
      if (c) set.add(c);
    });
    return ['Toutes', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (communeFilter !== 'Toutes') {
      list = list.filter((o) => (o.address?.commune_label || o.address?.city) === communeFilter);
    }
    return [...list].sort((a, b) => getDelivererFee(b) - getDelivererFee(a));
  }, [orders, communeFilter]);

  const handleAssign = async (order) => {
    if (hasDebt) {
      Alert.alert('Caisse non versée', "Veuillez d'abord solder votre caisse avec l'administration pour accepter une nouvelle course.");
      return;
    }
    setAssigningId(order.id);
    try {
      const token = await getToken();
      await assignOrder(order.id, token);
      Alert.alert('Course assignée', 'La commande vous a été assignée avec succès.');
      await load();
      navigation.navigate('MyDeliveries');
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'accepter cette commande.");
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {hasDebt && (
        <View style={styles.debtBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.debtText}>Caisse non versée : solde-la pour accepter de nouvelles courses.</Text>
        </View>
      )}

      {communes.length > 2 && (
        <FlatList
          horizontal
          data={communes}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.chip, communeFilter === item && styles.chipActive]}
              onPress={() => setCommuneFilter(item)}
            >
              <Text style={[styles.chipText, communeFilter === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          )}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="cube-outline" title="Aucune commande disponible" subtitle="Revenez plus tard ou consultez vos livraisons en cours." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const itemCount = (item.items || []).reduce((s, i) => s + i.quantity, 0);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="cube" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ref}>RÉF. #{getOrderRef(item)}</Text>
                    <Text style={styles.supplier} numberOfLines={1}>Collecte : {item.supplier?.name || 'Plateforme Centrale'}</Text>
                  </View>
                  <Text style={styles.fee}>{formatPrice(getDelivererFee(item))} F</Text>
                </View>

                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {item.address?.quartier_label ? `${item.address.quartier_label}, ` : ''}
                    {item.address?.commune_label || item.address?.city || 'Quartier inconnu'}
                  </Text>
                </View>
                <Text style={styles.itemsText}>{itemCount} article{itemCount > 1 ? 's' : ''}</Text>

                <View style={styles.actions}>
                  <Pressable style={styles.detailBtn} onPress={() => navigation.navigate('DeliveryDetail', { order: item, mode: 'available' })}>
                    <Text style={styles.detailBtnText}>Détails</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.assignBtn, (assigningId === item.id || hasDebt) && { opacity: 0.6 }]}
                    onPress={() => handleAssign(item)}
                    disabled={assigningId === item.id || hasDebt}
                  >
                    <Text style={styles.assignBtnText}>{assigningId === item.id ? 'Assignation...' : 'Prendre en charge'}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#fff" />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  debtBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  debtText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#991b1b' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: 14, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff1e8', alignItems: 'center', justifyContent: 'center' },
  ref: { fontSize: 9, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  supplier: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 },
  fee: { fontSize: 16, fontWeight: '900', color: colors.primary },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { flex: 1, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  itemsText: { fontSize: 11, color: colors.textFaint, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  detailBtn: {
    paddingHorizontal: 14, height: 40, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  detailBtnText: { fontSize: 11, fontWeight: '800', color: colors.text },
  assignBtn: {
    flex: 1, flexDirection: 'row', gap: 6, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  assignBtnText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
});
