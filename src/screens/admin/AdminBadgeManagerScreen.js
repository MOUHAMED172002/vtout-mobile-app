import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, RefreshControl, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getBadgePrice, updateBadgePrice, getAllBadgeSubscriptions,
  getCertifiedSuppliers, revokeBadge, grantBadge,
} from '../../services/badgeService';
import { getSuppliers } from '../../services/adminSupplierService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

// Équivalent mobile de frontend/src/component/Admin/Fournisseurs/SellerBadgeManager.jsx
export default function AdminBadgeManagerScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();

  const [price, setPrice] = useState('');
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [priceLoadError, setPriceLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [certified, setCertified] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('certified');

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [grantQuery, setGrantQuery] = useState('');
  const [grantSupplier, setGrantSupplier] = useState(null);
  const [grantDays, setGrantDays] = useState('30');
  const [granting, setGranting] = useState(false);

  const fetchPrice = useCallback(async () => {
    setLoadingPrice(true);
    setPriceLoadError(false);
    try {
      const token = await getToken();
      const data = await getBadgePrice(token);
      setPrice(String(data?.amount ?? ''));
    } catch (err) {
      setPriceLoadError(true);
    } finally {
      setLoadingPrice(false);
    }
  }, [getToken]);

  const fetchLists = useCallback(async () => {
    try {
      const token = await getToken();
      const [certifiedData, subsData] = await Promise.all([
        getCertifiedSuppliers(token),
        getAllBadgeSubscriptions(token),
      ]);
      setCertified(certifiedData);
      setSubscriptions(subsData);
    } catch (err) {
      // liste vide en cas d'erreur, pas bloquant
    } finally {
      setLoadingLists(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchPrice(); fetchLists(); }, [fetchPrice, fetchLists]);

  const handleSavePrice = async () => {
    if (priceLoadError) {
      Alert.alert('Erreur', "Le prix actuel n'a pas pu être chargé — rechargez avant d'enregistrer.");
      return;
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert('Montant invalide', 'Le montant doit être supérieur à 0.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      await updateBadgePrice(numericPrice, token);
      Alert.alert('✅ Enregistré', 'Prix mis à jour avec succès.');
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = (supplierId, supplierName) => {
    Alert.alert('Révoquer le badge', `Révoquer le badge certifié de "${supplierName}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Révoquer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await revokeBadge(supplierId, token);
            fetchLists();
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de révoquer le badge.');
          }
        },
      },
    ]);
  };

  const openGrantModal = async () => {
    setShowGrantModal(true);
    setGrantSupplier(null);
    setGrantQuery('');
    setGrantDays('30');
    if (allSuppliers.length === 0) {
      setLoadingSuppliers(true);
      try {
        const token = await getToken();
        const data = await getSuppliers(token);
        setAllSuppliers(Array.isArray(data) ? data : []);
      } catch (err) {
        Alert.alert('Erreur', 'Impossible de charger la liste des fournisseurs.');
      } finally {
        setLoadingSuppliers(false);
      }
    }
  };

  const handleGrant = async () => {
    if (!grantSupplier) {
      Alert.alert('Sélection requise', 'Sélectionnez un fournisseur.');
      return;
    }
    const numericDays = parseInt(grantDays, 10);
    if (!Number.isFinite(numericDays) || numericDays <= 0) {
      Alert.alert('Durée invalide', 'Merci de saisir une durée valide (en jours).');
      return;
    }
    setGranting(true);
    try {
      const token = await getToken();
      await grantBadge(grantSupplier.id, numericDays, token);
      setShowGrantModal(false);
      fetchLists();
      Alert.alert('🎁 Badge attribué', `${grantSupplier.name} est maintenant certifié.`);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Erreur lors de l'attribution.");
    } finally {
      setGranting(false);
    }
  };

  const gq = grantQuery.trim().toLowerCase();
  const filteredGrantSuppliers = useMemo(() => {
    const list = gq
      ? allSuppliers.filter((s) => s.name?.toLowerCase().includes(gq) || s.email?.toLowerCase().includes(gq))
      : allSuppliers;
    return list.slice(0, 30);
  }, [allSuppliers, gq]);

  const statusMeta = {
    paid: { label: 'Payé', style: styles.statusPillPaid, text: styles.statusPillTextPaid },
    pending: { label: 'En attente', style: styles.statusPillPending, text: styles.statusPillTextPending },
    failed: { label: 'Échoué', style: styles.statusPillFailed, text: styles.statusPillTextFailed },
  };

  if (loadingLists && loadingPrice) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={tab === 'certified' ? certified : subscriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLists(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Badge Vendeur Certifié</Text>
                <Text style={styles.subtitle}>Abonnement mensuel affichant un badge "Certifié" sur les produits du vendeur.</Text>
              </View>
              <Pressable style={styles.grantBtn} onPress={openGrantModal}>
                <Ionicons name="gift-outline" size={16} color="#fff" />
                <Text style={styles.grantBtnText}>Offrir</Text>
              </Pressable>
            </View>

            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Prix mensuel</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceInputWrap}>
                  <TextInput
                    style={styles.priceInput}
                    value={loadingPrice ? '' : price}
                    onChangeText={setPrice}
                    placeholder={loadingPrice ? 'Chargement…' : 'Ex : 5000'}
                    placeholderTextColor={colors.textFaint}
                    editable={!loadingPrice && !priceLoadError}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.priceSuffix}>FCFA / mois</Text>
                </View>
                <Button title={saving ? '...' : 'Enregistrer'} onPress={handleSavePrice} loading={saving} disabled={loadingPrice || priceLoadError} />
              </View>
              <Text style={styles.priceHelper}>Prélevé via FedaPay lorsqu'un fournisseur active ou renouvelle son badge (30 jours / mois).</Text>
            </View>

            <View style={styles.tabsRow}>
              <Pressable style={[styles.tabBtn, tab === 'certified' && styles.tabBtnActive]} onPress={() => setTab('certified')}>
                <Text style={[styles.tabBtnText, tab === 'certified' && styles.tabBtnTextActive]}>Certifiés ({certified.length})</Text>
              </Pressable>
              <Pressable style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]} onPress={() => setTab('history')}>
                <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>Historique</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title={tab === 'certified' ? 'Aucun vendeur certifié pour le moment' : 'Aucun paiement enregistré'}
          />
        }
        renderItem={({ item }) => tab === 'certified' ? (
          <View style={styles.row}>
            <Ionicons name="shield-checkmark" size={18} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.originPill, item.is_admin_granted ? styles.originPillGranted : styles.originPillPaid]}>
                  <Text style={[styles.originPillText, item.is_admin_granted ? styles.originPillTextGranted : styles.originPillTextPaid]}>
                    {item.is_admin_granted ? 'Offert' : 'Payant'}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowSub}>
                Expire le {item.certified_badge_expires_at ? new Date(item.certified_badge_expires_at).toLocaleDateString('fr-FR') : '—'}
              </Text>
            </View>
            <Pressable style={styles.revokeBtn} onPress={() => handleRevoke(item.id, item.name)}>
              <Ionicons name="close-circle-outline" size={15} color={colors.danger} />
              <Text style={styles.revokeBtnText}>Révoquer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.supplier?.name || 'Fournisseur supprimé'}</Text>
                {!!item.granted_by_admin_id && (
                  <View style={[styles.originPill, styles.originPillGranted]}>
                    <Text style={[styles.originPillText, styles.originPillTextGranted]}>Offert par admin</Text>
                  </View>
                )}
              </View>
              <Text style={styles.rowSub}>
                {new Date(item.created_at).toLocaleDateString('fr-FR')} · {item.granted_by_admin_id ? 'Gratuit' : `${formatPrice(item.amount)} F`} · {item.months || 1} mois
              </Text>
            </View>
            {(() => {
              const meta = statusMeta[item.status] || statusMeta.pending;
              return (
                <View style={[styles.statusPill, meta.style]}>
                  <Text style={[styles.statusPillText, meta.text]}>{meta.label}</Text>
                </View>
              );
            })()}
          </View>
        )}
      />

      <Modal visible={showGrantModal} transparent animationType="fade" onRequestClose={() => setShowGrantModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowGrantModal(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attribuer un badge</Text>
              <Pressable onPress={() => setShowGrantModal(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Fournisseur</Text>
            {grantSupplier ? (
              <View style={styles.selectedSupplierBox}>
                <Text style={styles.selectedSupplierText} numberOfLines={1}>{grantSupplier.name}</Text>
                <Pressable onPress={() => setGrantSupplier(null)}><Text style={styles.changeText}>Changer</Text></Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un fournisseur…"
                  placeholderTextColor={colors.textFaint}
                  value={grantQuery}
                  onChangeText={setGrantQuery}
                />
                <View style={styles.supplierList}>
                  {loadingSuppliers ? (
                    <Text style={styles.modalHelper}>Chargement…</Text>
                  ) : filteredGrantSuppliers.length === 0 ? (
                    <Text style={styles.modalHelper}>Aucun fournisseur trouvé.</Text>
                  ) : (
                    <FlatList
                      data={filteredGrantSuppliers}
                      keyExtractor={(s) => s.id}
                      style={{ maxHeight: 160 }}
                      renderItem={({ item: s }) => (
                        <Pressable style={styles.supplierRow} onPress={() => setGrantSupplier(s)}>
                          <Text style={styles.supplierRowName} numberOfLines={1}>{s.name}</Text>
                          <Text style={styles.supplierRowEmail} numberOfLines={1}>{s.email}</Text>
                        </Pressable>
                      )}
                    />
                  )}
                </View>
              </>
            )}

            <Text style={styles.modalLabel}>Durée (jours)</Text>
            <TextInput
              style={styles.searchInput}
              value={grantDays}
              onChangeText={setGrantDays}
              keyboardType="number-pad"
            />
            <Text style={styles.modalHelperSmall}>Ex : 30 jours = 1 mois. Le badge est activé immédiatement, sans paiement.</Text>

            <Button title={granting ? 'Attribution…' : 'Attribuer le badge'} onPress={handleGrant} loading={granting} disabled={!grantSupplier} variant="secondary" icon={<Ionicons name="gift-outline" size={16} color="#fff" />} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 18, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.secondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md },
  grantBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  priceCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  priceLabel: { fontSize: 13, fontWeight: '900', color: colors.text },
  priceRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  priceInputWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  priceInput: { height: 46, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingRight: 90, fontSize: 13, fontWeight: '700', color: colors.text },
  priceSuffix: { position: 'absolute', right: 12, fontSize: 9, fontWeight: '700', color: colors.textFaint },
  priceHelper: { fontSize: 10, fontWeight: '600', color: colors.textFaint, lineHeight: 14 },
  tabsRow: { flexDirection: 'row', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { paddingHorizontal: 4, paddingBottom: 10, marginRight: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: colors.secondary },
  tabBtnText: { fontSize: 12, fontWeight: '800', color: colors.textFaint },
  tabBtnTextActive: { color: colors.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 13, fontWeight: '800', color: colors.text, flexShrink: 1 },
  rowSub: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 3 },
  originPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  originPillPaid: { backgroundColor: 'rgba(16,185,129,0.12)' },
  originPillGranted: { backgroundColor: 'rgba(139,92,246,0.12)' },
  originPillText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  originPillTextPaid: { color: colors.success },
  originPillTextGranted: { color: '#8b5cf6' },
  revokeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
  revokeBtnText: { fontSize: 11, fontWeight: '800', color: colors.danger },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.background },
  statusPillPaid: { backgroundColor: 'rgba(16,185,129,0.12)' },
  statusPillPending: { backgroundColor: 'rgba(245,158,11,0.12)' },
  statusPillFailed: { backgroundColor: 'rgba(244,63,94,0.12)' },
  statusPillText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted },
  statusPillTextPaid: { color: colors.success },
  statusPillTextPending: { color: colors.warning },
  statusPillTextFailed: { color: colors.danger },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  selectedSupplierBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  selectedSupplierText: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
  changeText: { fontSize: 11, fontWeight: '800', color: colors.secondary, marginLeft: 8 },
  searchInput: { height: 46, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '700', color: colors.text },
  supplierList: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  modalHelper: { fontSize: 12, fontWeight: '600', color: colors.textFaint, textAlign: 'center', paddingVertical: 16 },
  modalHelperSmall: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
  supplierRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  supplierRowName: { fontSize: 13, fontWeight: '800', color: colors.text },
  supplierRowEmail: { fontSize: 10, fontWeight: '600', color: colors.textFaint, marginTop: 1 },
});
