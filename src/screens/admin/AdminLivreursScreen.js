import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getLivreursList,
  reviewKyc,
  deleteLivreur,
} from '../../services/adminLogisticsService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

const isPendingLivreur = (lp) => !lp.is_verified && lp.kyc_status !== 'rejected';

const getKycConfig = (colors, lp) => {
  if (lp.is_verified) return { label: 'Vérifié', bg: '#d1fae5', color: '#047857' };
  if (lp.kyc_status === 'rejected') return { label: 'Rejeté', bg: '#fee2e2', color: '#b91c1c' };
  if (lp.kyc_status === 'submitted') return { label: 'À examiner', bg: '#fef3c7', color: '#b45309' };
  return { label: 'Incomplet', bg: '#e2e8f0', color: '#475569' };
};

function TabSwitch({ tab, setTab, pendingCount }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.tabSwitch}>
      <Pressable style={[styles.tabBtn, tab === 'pending' && styles.tabBtnActive]} onPress={() => setTab('pending')}>
        <Text style={[styles.tabBtnText, tab === 'pending' && styles.tabBtnTextActive]}>
          En attente {pendingCount > 0 ? `(${pendingCount})` : ''}
        </Text>
      </Pressable>
      <Pressable style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]} onPress={() => setTab('all')}>
        <Text style={[styles.tabBtnText, tab === 'all' && styles.tabBtnTextActive]}>Tous</Text>
      </Pressable>
    </View>
  );
}

export default function AdminLivreursScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [tab, setTab] = useState('pending');
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getLivreursList(token);
      setLivreurs(Array.isArray(data) ? data : []);
    } catch (err) {
      setLivreurs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const pendingLivreurs = livreurs.filter(isPendingLivreur);
  const listData = tab === 'pending' ? pendingLivreurs : livreurs;

  const handleApprove = async (item) => {
    setBusyId(item.id);
    try {
      const token = await getToken();
      await reviewKyc(item.id, { action: 'approve' }, token);
      load();
    } catch (err) {
      // l'admin peut réessayer
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const token = await getToken();
      await reviewKyc(rejectTarget.id, { action: 'reject', rejection_reason: rejectReason }, token);
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      // l'admin peut réessayer
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Supprimer ce livreur ?',
      `${item.profile?.fullname || 'Ce livreur'} sera définitivement retiré de la plateforme.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              const token = await getToken();
              await deleteLivreur(item.id, token);
              load();
            } catch (err) {
              // l'admin peut réessayer
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <TabSwitch tab={tab} setTab={setTab} pendingCount={pendingLivreurs.length} />

      {listData.length === 0 ? (
        <EmptyState
          icon="bicycle-outline"
          title={tab === 'pending' ? 'Aucun dossier en attente' : 'Aucun livreur'}
          subtitle={tab === 'pending' ? 'Tous les dossiers ont été traités.' : ''}
        />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const pending = isPendingLivreur(item);
            const cfg = getKycConfig(colors, item);
            const zones = Array.isArray(item.service_zones) ? item.service_zones.filter(Boolean) : [];
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.profile?.fullname || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.profile?.fullname || 'Livreur'}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{item.profile?.phone || item.whatsapp || item.profile?.email || ''}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="bicycle-outline" size={13} color={colors.textFaint} />
                  <Text style={styles.metaText} numberOfLines={1}>{item.vehicle_type || 'Véhicule non renseigné'}</Text>
                  {zones.length > 0 && (
                    <>
                      <Ionicons name="location-outline" size={13} color={colors.textFaint} style={{ marginLeft: 8 }} />
                      <Text style={styles.metaText} numberOfLines={1}>{zones.join(', ')}</Text>
                    </>
                  )}
                </View>

                {item.kyc_status === 'rejected' && item.kyc_rejection_reason ? (
                  <Text style={styles.rejectionText} numberOfLines={2}>Motif : {item.kyc_rejection_reason}</Text>
                ) : null}

                {pending ? (
                  <View style={styles.actionsRow}>
                    <Button
                      title="Approuver"
                      onPress={() => handleApprove(item)}
                      loading={busyId === item.id}
                      style={styles.actionBtn}
                    />
                    <Button
                      title="Rejeter"
                      variant="outline"
                      onPress={() => { setRejectTarget(item); setRejectReason(''); }}
                      disabled={busyId === item.id}
                      style={styles.actionBtn}
                    />
                  </View>
                ) : (
                  <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item)} disabled={busyId === item.id}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={styles.deleteBtnText}>Supprimer</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRejectTarget(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Motif du rejet</Text>
            <Text style={styles.modalSubtitle}>{rejectTarget?.profile?.fullname}</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex: pièce d'identité illisible, selfie non conforme..."
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.textArea}
            />
            <Button title="Confirmer le rejet" onPress={submitReject} loading={busyId === rejectTarget?.id} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabSwitch: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  tabBtnTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900', color: colors.primary },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  rejectionText: { fontSize: 11, fontWeight: '600', color: colors.danger },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 42 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  deleteBtnText: { fontSize: 12, fontWeight: '800', color: colors.danger },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  textArea: {
    minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: 12, fontSize: 13, color: colors.text, textAlignVertical: 'top',
  },
});
