import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getCashHistory, confirmCashRemitted, getDeliveryStatsAdmin } from '../../services/adminLogisticsService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

// La caisse regroupe deux sources backend distinctes :
// - les créances en attente (getDeliveryStatsAdmin().debts), groupées PAR
//   LIVREUR (montant total + nombre de commandes non versées) ;
// - l'historique des versements déjà confirmés (getCashHistory()), par
//   commande individuelle.
// Le versement se confirme au niveau du livreur (toute sa dette d'un coup),
// pas commande par commande — c'est ainsi que l'endpoint /confirm-cash
// fonctionne côté backend.

const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function AdminCashControlScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [stats, history] = await Promise.all([
        getDeliveryStatsAdmin(token),
        getCashHistory(token),
      ]);

      const debtItems = (stats?.debts || []).map((d) => ({
        key: `debt-${d.delivery_person_id}`,
        kind: 'pending',
        deliveryPersonId: d.delivery_person_id,
        name: d.deliveryPerson?.profile?.fullname || 'Livreur',
        amount: Number(d.total_debt || 0),
        count: Number(d.order_count || 0),
      }));

      const historyItems = (history || []).map((o) => ({
        key: `hist-${o.id}`,
        kind: 'settled',
        name: o.deliveryPerson?.profile?.fullname || 'Livreur',
        amount: Number(o.total_amount || 0),
        date: o.updated_at,
      }));

      setItems([...debtItems, ...historyItems]);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      const token = await getToken();
      await confirmCashRemitted({ deliveryPersonId: selected.deliveryPersonId }, token);
      setSelected(null);
      load();
    } catch (err) {
      // l'admin peut réessayer
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {items.length === 0 ? (
        <EmptyState icon="cash-outline" title="Aucun mouvement de caisse" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const pending = item.kind === 'pending';
            return (
              <Pressable style={styles.card} onPress={() => pending && setSelected(item)} disabled={!pending}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.detail}>
                      {pending ? `${item.count} commande${item.count > 1 ? 's' : ''} non versée${item.count > 1 ? 's' : ''}` : formatDate(item.date)}
                    </Text>
                  </View>
                  <View style={[styles.badge, pending ? styles.badgePending : styles.badgeSettled]}>
                    <Text style={[styles.badgeText, pending ? styles.badgePendingText : styles.badgeSettledText]}>
                      {pending ? 'En attente' : 'Versé'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.amount}>{formatPrice(item.amount)} F</Text>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !confirming && setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Confirmer le versement</Text>
            <Text style={styles.modalSubtitle}>
              {selected ? `Confirmer le versement de ${formatPrice(selected.amount)} F par ${selected.name} ?` : ''}
            </Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              <Button title="Confirmer le versement" onPress={handleConfirm} loading={confirming} />
              <Pressable style={styles.modalCancel} onPress={() => setSelected(null)} disabled={confirming}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '800', color: colors.text },
  detail: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeSettled: { backgroundColor: '#d1fae5' },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  badgePendingText: { color: '#b45309' },
  badgeSettledText: { color: '#047857' },
  amount: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, gap: 4 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
});
