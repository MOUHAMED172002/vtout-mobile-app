import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllPayoutRequests, processPayout } from '../../services/adminPayoutService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const getStatusConfig = (colors) => ({
  pending: { label: 'En attente', color: colors.warning },
  approved: { label: 'Approuvé', color: colors.secondary },
  paid: { label: 'Payé', color: colors.success },
  rejected: { label: 'Rejeté', color: colors.danger },
});

const ACTIONS = [
  { status: 'approved', label: 'Approuver', icon: 'checkmark-circle-outline' },
  { status: 'paid', label: 'Marquer payé', icon: 'cash-outline' },
  { status: 'rejected', label: 'Rejeter', icon: 'close-circle-outline' },
];

export default function AdminPayoutsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const STATUS_CONFIG = getStatusConfig(colors);
  const { getToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllPayoutRequests(token);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (status) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const token = await getToken();
      await processPayout(selected.id, { status }, token);
      setSelected(null);
      load();
    } catch (err) {
      // l'admin peut réessayer
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {requests.length === 0 ? (
        <EmptyState icon="cash-outline" title="Aucune demande de retrait" />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: colors.textMuted };
            return (
              <Pressable style={styles.card} onPress={() => setSelected(item)} disabled={item.status !== 'pending' && item.status !== 'approved'}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{item.user?.fullname || 'Utilisateur'}</Text>
                    <Text style={styles.roleText}>{item.role === 'fournisseur' ? 'Vendeur' : 'Livreur'} · {item.payment_method}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${cfg.color}20` }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                {item.payment_details ? <Text style={styles.details} numberOfLines={1}>{item.payment_details}</Text> : null}
                <Text style={styles.amount}>{formatPrice(item.amount)} F</Text>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !updating && setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{selected?.user?.fullname || 'Utilisateur'}</Text>
            <Text style={styles.modalSubtitle}>{selected ? `${formatPrice(selected.amount)} F · ${selected.payment_method}` : ''}</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {ACTIONS.map((a) => (
                <Pressable key={a.status} disabled={updating} onPress={() => handleAction(a.status)} style={styles.actionOption}>
                  <Ionicons name={a.icon} size={18} color={colors.text} />
                  <Text style={styles.actionOptionText}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.modalCancel} onPress={() => setSelected(null)} disabled={updating}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { fontSize: 13, fontWeight: '800', color: colors.text },
  roleText: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  details: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 32,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  actionOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: radius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  actionOptionText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  modalCancel: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
});
