import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllDisputes, updateDisputeStatus } from '../../services/adminDisputeService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const getStatusConfig = (colors) => ({
  open: { label: 'À traiter', color: colors.warning },
  under_review: { label: 'En examen', color: colors.secondary },
  resolved: { label: 'Résolu', color: colors.success },
  cancelled: { label: 'Annulé', color: colors.textFaint },
});

const STATUS_OPTIONS = ['open', 'under_review', 'resolved', 'cancelled'];

function StatusBadge({ status }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const cfg = getStatusConfig(colors)[status] || { label: status || 'Inconnu', color: colors.textMuted };
  return (
    <View style={[styles.badge, { backgroundColor: `${cfg.color}20` }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

export default function AdminDisputesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const STATUS_CONFIG = getStatusConfig(colors);
  const { getToken } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllDisputes(token);
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      setDisputes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleChangeStatus = async (status) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const token = await getToken();
      await updateDisputeStatus(selected.id, status, token);
      setSelected(null);
      load();
    } catch (err) {
      // ignore, l'admin peut réessayer
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {disputes.length === 0 ? (
        <EmptyState icon="alert-circle-outline" title="Aucun litige" subtitle="Les réclamations clients apparaîtront ici." />
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderRef}>Commande #{String(item.order_id || '').slice(0, 8).toUpperCase()}</Text>
                <StatusBadge status={item.status} />
              </View>
              {item.motif ? <Text style={styles.motif}>{item.motif}</Text> : null}
              {item.description ? <Text style={styles.description} numberOfLines={2}>"{item.description}"</Text> : null}
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={12} color={colors.textFaint} />
                <Text style={styles.metaText} numberOfLines={1}>{item.user?.fullname || 'Client'}</Text>
                {item.supplier?.name ? (
                  <>
                    <Ionicons name="storefront-outline" size={12} color={colors.textFaint} style={{ marginLeft: 8 }} />
                    <Text style={styles.metaText} numberOfLines={1}>{item.supplier.name}</Text>
                  </>
                ) : null}
              </View>
              {item.order?.total_amount ? (
                <Text style={styles.amount}>{formatPrice(item.order.total_amount)} F</Text>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !updating && setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Dossier #{selected ? String(selected.id).slice(0, 8) : ''}</Text>
            <Text style={styles.modalSubtitle}>Changer le statut</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {STATUS_OPTIONS.map((status) => {
                const isCurrent = selected?.status === status;
                const cfg = STATUS_CONFIG[status];
                return (
                  <Pressable
                    key={status}
                    disabled={updating || isCurrent}
                    onPress={() => handleChangeStatus(status)}
                    style={[styles.statusOption, isCurrent && styles.statusOptionCurrent]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                    <Text style={styles.statusOptionText}>{cfg.label}</Text>
                    {isCurrent && <Ionicons name="checkmark" size={16} color={colors.textMuted} />}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.modalNote}>
              Pour un remboursement, traitez ce dossier depuis le back-office web.
            </Text>
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
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderRef: { fontSize: 12, fontWeight: '800', color: colors.text },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  motif: { fontSize: 12, fontWeight: '800', color: colors.secondary },
  description: { fontSize: 12, fontWeight: '500', color: colors.textMuted, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  amount: { fontSize: 13, fontWeight: '900', color: colors.text },
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
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  modalNote: { fontSize: 10, fontWeight: '600', color: colors.textFaint, marginTop: 14, textAlign: 'center' },
  modalCancel: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
});
