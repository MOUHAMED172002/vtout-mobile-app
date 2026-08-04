import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, Image, Alert, Modal, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyDisputes, respondToDispute } from '../../services/supplierDisputeService';
import { uploadProductImage } from '../../services/supplierProductService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const STATUS_CONFIG = {
  open: { label: 'Ouvert', icon: 'time-outline' },
  under_review: { label: 'En examen', icon: 'chatbubble-ellipses-outline' },
  resolved: { label: 'Résolu', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Annulé', icon: 'close-circle-outline' },
};
const REASON_LABELS = {
  produit_non_conforme: 'Produit non conforme',
  produit_endommage: 'Produit endommagé',
  commande_incomplete: 'Commande incomplète',
  retard_livraison: 'Retard de livraison',
  autre: 'Autre raison',
};
const FILTER_TABS = ['all', 'open', 'under_review', 'resolved', 'cancelled'];

export default function SupplierDisputesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [evidenceUri, setEvidenceUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const statusColor = (s) => (s === 'open' ? colors.warning : s === 'under_review' ? colors.secondary : s === 'resolved' ? colors.success : colors.textFaint);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyDisputes(token);
      setDisputes(data);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const counts = {
    all: disputes.length,
    open: disputes.filter((d) => d.status === 'open').length,
    under_review: disputes.filter((d) => d.status === 'under_review').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    cancelled: disputes.filter((d) => d.status === 'cancelled').length,
  };
  const filtered = filterStatus === 'all' ? disputes : disputes.filter((d) => d.status === filterStatus);

  const openResponder = (dispute) => {
    setSelected(dispute);
    setResponseText(dispute.supplier_response || '');
    setEvidenceUri(null);
  };

  const pickEvidence = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setEvidenceUri(result.assets[0].uri);
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      Alert.alert('Réponse requise', 'Veuillez rédiger une réponse.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      let evidenceUrl = selected.supplier_evidence_url || null;
      if (evidenceUri) {
        const filename = evidenceUri.split('/').pop() || 'evidence.jpg';
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        evidenceUrl = await uploadProductImage({ uri: evidenceUri, name: filename, type: mimeType }, token);
      }
      await respondToDispute(selected.id, { supplier_response: responseText.trim(), supplier_evidence_url: evidenceUrl }, token);
      setSelected(null);
      load();
    } catch {
      Alert.alert('Erreur', "Erreur lors de l'envoi de la réponse.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <View>
              <Text style={styles.title}>Mes litiges</Text>
              <Text style={styles.subtitle}>Réclamations clients sur vos commandes</Text>
            </View>
            <View style={styles.statsGrid}>
              {[
                { key: 'open', label: 'Ouverts', color: colors.warning },
                { key: 'under_review', label: 'En examen', color: colors.secondary },
                { key: 'resolved', label: 'Résolus', color: colors.success },
                { key: 'cancelled', label: 'Annulés', color: colors.textFaint },
              ].map((s) => (
                <Pressable key={s.key} style={[styles.statCard, { borderColor: filterStatus === s.key ? s.color : colors.border }]} onPress={() => setFilterStatus(s.key)}>
                  <Text style={[styles.statValue, { color: s.color }]}>{counts[s.key]}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {FILTER_TABS.map((s) => (
                <Pressable key={s} style={[styles.tabPill, filterStatus === s && styles.tabPillActive]} onPress={() => setFilterStatus(s)}>
                  <Text style={[styles.tabPillText, filterStatus === s && styles.tabPillTextActive]}>
                    {s === 'all' ? `Tous (${counts.all})` : STATUS_CONFIG[s].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="alert-circle-outline" title="Aucun litige" subtitle={filterStatus === 'all' ? "Vous n'avez pas encore de litiges clients." : 'Aucun litige avec ce statut.'} />}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
          const color = statusColor(item.status);
          const canRespond = ['open', 'under_review'].includes(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={cfg.icon} size={17} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardOrderId} numberOfLines={1}>Commande #{String(item.order_id || item.order?.id || '').slice(-8).toUpperCase()}</Text>
                  <Text style={styles.cardReason} numberOfLines={1}>{REASON_LABELS[item.motif || item.reason] || item.motif || item.reason}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${color}18` }]}>
                  <Text style={[styles.statusPillText, { color }]}>{cfg.label}</Text>
                </View>
              </View>

              {item.description ? <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text> : null}

              <View style={styles.cardMetaRow}>
                {item.user?.fullname && <Text style={styles.cardMeta} numberOfLines={1}>Client : {item.user.fullname}</Text>}
                <Text style={styles.cardMeta}>{new Date(item.created_at || item.createdAt).toLocaleDateString('fr-FR')}</Text>
              </View>

              {item.supplier_response ? (
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Votre réponse</Text>
                  <Text style={styles.responseText} numberOfLines={2}>{item.supplier_response}</Text>
                </View>
              ) : null}

              {canRespond && (
                <Pressable style={styles.respondBtn} onPress={() => openResponder(item)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                  <Text style={styles.respondBtnText}>{item.supplier_response ? 'Modifier ma réponse' : 'Répondre au litige'}</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Répondre au litige</Text>
                <Text style={styles.modalSubtitle}>Commande #{String(selected?.order_id || '').slice(-8).toUpperCase()}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setSelected(null)}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View style={styles.motifBox}>
                <Text style={styles.tinyLabel}>Motif</Text>
                <Text style={styles.motifText}>{REASON_LABELS[selected?.motif || selected?.reason] || selected?.motif}</Text>
                {selected?.description ? <Text style={styles.motifDescription}>{selected.description}</Text> : null}
              </View>

              {selected?.photo_url ? (
                <View>
                  <Text style={styles.tinyLabel}>Photo envoyée par le client</Text>
                  <Image source={{ uri: selected.photo_url }} style={styles.clientPhoto} />
                </View>
              ) : null}

              <TextInput
                style={styles.responseInput}
                value={responseText}
                onChangeText={setResponseText}
                placeholder="Expliquez votre position concernant ce litige..."
                placeholderTextColor={colors.textFaint}
                multiline
                numberOfLines={4}
              />

              <Pressable style={styles.evidenceBtn} onPress={pickEvidence}>
                {evidenceUri ? (
                  <Image source={{ uri: evidenceUri }} style={styles.evidencePreview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.evidenceBtnText}>Ajouter une photo de preuve (optionnel)</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable style={styles.footerBtnGhost} onPress={() => setSelected(null)} disabled={submitting}>
                <Text style={styles.footerBtnGhostText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.footerBtnPrimary} onPress={handleSubmitResponse} disabled={submitting}>
                <Text style={styles.footerBtnPrimaryText}>{submitting ? 'Envoi...' : 'Envoyer'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, padding: 12, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  tabPill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabPillActive: { backgroundColor: colors.text, borderColor: colors.text },
  tabPillText: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  tabPillTextActive: { color: colors.surface },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardOrderId: { fontSize: 13, fontWeight: '900', color: colors.text },
  cardReason: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusPillText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  cardDescription: { fontSize: 12, color: colors.textMuted, fontWeight: '500', backgroundColor: colors.background, borderRadius: radius.md, padding: 10, lineHeight: 17 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta: { fontSize: 9.5, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase' },
  responseBox: { backgroundColor: `${colors.secondary}0d`, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: `${colors.secondary}30` },
  responseLabel: { fontSize: 9, fontWeight: '800', color: colors.secondary, textTransform: 'uppercase' },
  responseText: { fontSize: 11.5, fontWeight: '600', color: colors.text, marginTop: 3 },
  respondBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.text, borderRadius: radius.md, paddingVertical: 12,
  },
  respondBtnText: { fontSize: 10.5, fontWeight: '800', color: colors.surface, textTransform: 'uppercase' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, gap: 14, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 10, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase', marginTop: 2 },
  modalClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tinyLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase', marginBottom: 4 },
  motifBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: 12, gap: 4 },
  motifText: { fontSize: 12, fontWeight: '700', color: colors.text },
  motifDescription: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginTop: 4, lineHeight: 17 },
  clientPhoto: { width: '100%', height: 140, borderRadius: radius.md, marginTop: 2 },
  responseInput: {
    minHeight: 90, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, fontWeight: '600', color: colors.text, textAlignVertical: 'top',
  },
  evidenceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: radius.md, paddingVertical: 14, overflow: 'hidden',
  },
  evidenceBtnText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  evidencePreview: { width: '100%', height: 120 },
  footerBtnGhost: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  footerBtnGhostText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  footerBtnPrimary: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  footerBtnPrimaryText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
});
