import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, RefreshControl, Modal, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAllCampaigns, createCampaign, updateCampaign, deleteCampaign, uploadCampaignCreative,
  getModerationQueue, getPayoutQueue, getSubmissionDetail, approveSubmission, rejectSubmission, requestLiveCheck, markSubmissionPaid,
  getAllDistributors, banDistributor, unbanDistributor,
} from '../../services/adDistributionService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

const TABS = [
  { key: 'campaigns', label: 'Campagnes', icon: 'megaphone-outline' },
  { key: 'queue', label: 'Modération', icon: 'shield-checkmark-outline' },
  { key: 'payouts', label: 'Paiements', icon: 'wallet-outline' },
  { key: 'distributors', label: 'Distributeurs', icon: 'people-outline' },
];

const TRUST_META = {
  new: { label: 'Nouveau', color: 'warning' },
  trusted: { label: 'Confiance', color: 'success' },
  banned: { label: 'Banni', color: 'danger' },
};

const emptyCampaignForm = {
  title: '', description: '', creative_url: '', rate_per_view: '', min_views: '', max_reward_amount: '',
  max_distributors: '', start_date: '', end_date: '',
};

export default function AdminAdDistributionScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [tab, setTab] = useState('campaigns');
  const [refreshing, setRefreshing] = useState(false);

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCampaignForm);
  const [uploadingCreative, setUploadingCreative] = useState(false);
  const [saving, setSaving] = useState(false);

  // Queue
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [viewsInput, setViewsInput] = useState('');

  // Payouts
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);

  // Distributors
  const [distributors, setDistributors] = useState([]);
  const [loadingDistributors, setLoadingDistributors] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const token = await getToken();
      setCampaigns(await getAllCampaigns(token));
    } catch { setCampaigns([]); }
    finally { setLoadingCampaigns(false); setRefreshing(false); }
  }, [getToken]);

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const token = await getToken();
      setQueue(await getModerationQueue(token));
    } catch { setQueue([]); }
    finally { setLoadingQueue(false); setRefreshing(false); }
  }, [getToken]);

  const fetchPayouts = useCallback(async () => {
    setLoadingPayouts(true);
    try {
      const token = await getToken();
      setPayouts(await getPayoutQueue(token));
    } catch { setPayouts([]); }
    finally { setLoadingPayouts(false); setRefreshing(false); }
  }, [getToken]);

  const fetchDistributors = useCallback(async () => {
    setLoadingDistributors(true);
    try {
      const token = await getToken();
      setDistributors(await getAllDistributors(token));
    } catch { setDistributors([]); }
    finally { setLoadingDistributors(false); setRefreshing(false); }
  }, [getToken]);

  const refreshCurrentTab = useCallback(() => {
    if (tab === 'campaigns') fetchCampaigns();
    if (tab === 'queue') fetchQueue();
    if (tab === 'payouts') fetchPayouts();
    if (tab === 'distributors') fetchDistributors();
  }, [tab, fetchCampaigns, fetchQueue, fetchPayouts, fetchDistributors]);

  useEffect(() => { refreshCurrentTab(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkPaid = async (id) => {
    try {
      const token = await getToken();
      await markSubmissionPaid(id, token);
      fetchPayouts();
    } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
  };

  // ── Campaigns CRUD ──
  const openCreate = () => { setEditingId(null); setForm(emptyCampaignForm); setShowForm(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      title: c.title, description: c.description || '', creative_url: c.creative_url,
      rate_per_view: String(c.rate_per_view), min_views: c.min_views != null ? String(c.min_views) : '',
      max_reward_amount: c.max_reward_amount != null ? String(c.max_reward_amount) : '',
      max_distributors: c.max_distributors != null ? String(c.max_distributors) : '',
      start_date: c.start_date?.slice(0, 10) || '', end_date: c.end_date?.slice(0, 10) || '',
    });
    setShowForm(true);
  };

  const handlePickCreative = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingCreative(true);
    try {
      const token = await getToken();
      const filename = asset.uri.split('/').pop() || 'creative.jpg';
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const url = await uploadCampaignCreative({ uri: asset.uri, name: filename, type: mimeType }, token);
      setForm((f) => ({ ...f, creative_url: url }));
    } catch (err) {
      Alert.alert('Erreur', "Échec de l'upload du visuel.");
    } finally {
      setUploadingCreative(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!form.title.trim() || !form.creative_url || !form.rate_per_view || !form.start_date || !form.end_date) {
      Alert.alert('Champs manquants', 'Remplissez tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        creative_url: form.creative_url,
        rate_per_view: Number(form.rate_per_view),
        min_views: form.min_views ? Number(form.min_views) : null,
        max_reward_amount: form.max_reward_amount ? Number(form.max_reward_amount) : null,
        max_distributors: form.max_distributors ? Number(form.max_distributors) : null,
        start_date: form.start_date,
        end_date: form.end_date,
      };
      if (editingId) await updateCampaign(editingId, payload, token);
      else await createCampaign(payload, token);
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c) => {
    try {
      const token = await getToken();
      await updateCampaign(c.id, { status: c.status === 'active' ? 'paused' : 'active' }, token);
      fetchCampaigns();
    } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
  };

  const handleDeleteCampaign = (c) => {
    Alert.alert('Supprimer la campagne', `Supprimer "${c.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            const res = await deleteCampaign(c.id, token);
            if (res?.message?.includes('terminée')) Alert.alert('Info', 'Campagne déjà réclamée : marquée terminée.');
            fetchCampaigns();
          } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
        },
      },
    ]);
  };

  // ── Moderation ──
  const openDetail = async (submission) => {
    setLoadingDetail(true);
    setDetail({ submission, history: [] });
    setRejectReason('');
    setViewsInput(submission.views_reported != null ? String(submission.views_reported) : '');
    try {
      const token = await getToken();
      const data = await getSubmissionDetail(submission.id, token);
      setDetail(data);
      setViewsInput(data.submission?.views_reported != null ? String(data.submission.views_reported) : '');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger le détail.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = await getToken();
      await approveSubmission(id, viewsInput !== '' ? Number(viewsInput) : undefined, token);
      setDetail(null);
      fetchQueue();
    } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
  };

  const handleReject = async (id) => {
    try {
      const token = await getToken();
      await rejectSubmission(id, rejectReason || 'Non conforme', token);
      setDetail(null);
      fetchQueue();
    } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
  };

  const handleLiveCheck = async (id) => {
    try {
      const token = await getToken();
      await requestLiveCheck(id, token);
      setDetail(null);
      fetchQueue();
    } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
  };

  // ── Distributors ──
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState('');
  const openBan = (d) => { setBanTarget(d); setBanReason('Fraude détectée (captures dupliquées)'); };
  const confirmBan = async () => {
    if (!banTarget) return;
    try {
      const token = await getToken();
      await banDistributor(banTarget.id, banReason, token);
      setBanTarget(null);
      fetchDistributors();
    } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
  };
  const handleUnban = async (d) => {
    try {
      const token = await getToken();
      await unbanDistributor(d.id, token);
      fetchDistributors();
    } catch (err) { Alert.alert('Erreur', err?.response?.data?.error || err.message); }
  };

  const estimatedReward = useMemo(() => {
    if (!detail?.submission?.campaign?.rate_per_view) return 0;
    const v = viewsInput !== '' ? Number(viewsInput) : 0;
    let est = v * Number(detail.submission.campaign.rate_per_view);
    if (detail.submission.campaign.max_reward_amount) est = Math.min(est, Number(detail.submission.campaign.max_reward_amount));
    return est;
  }, [viewsInput, detail]);

  const renderTabContent = () => {
    if (tab === 'campaigns') {
      if (loadingCampaigns) return <Loading />;
      return (
        <FlatList
          data={campaigns}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCampaigns(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Pressable style={styles.createBtn} onPress={openCreate}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.createBtnText}>Créer une campagne</Text>
            </Pressable>
          }
          ListEmptyComponent={<EmptyState icon="megaphone-outline" title="Aucune campagne pour le moment" />}
          renderItem={({ item: c }) => (
            <View style={styles.row}>
              <Image source={{ uri: getThumbnail(c.creative_url) }} style={styles.campaignThumb} />
              <View style={{ flex: 1 }}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{c.title}</Text>
                  <View style={[styles.pill, c.status === 'active' ? styles.pillActive : c.status === 'paused' ? styles.pillMuted : styles.pillInfo]}>
                    <Text style={[styles.pillText, c.status === 'active' ? styles.pillTextActive : c.status === 'paused' ? styles.pillTextMuted : styles.pillTextInfo]}>
                      {c.status === 'active' ? 'Active' : c.status === 'paused' ? 'En pause' : 'Terminée'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowSub} numberOfLines={2}>
                  {formatPrice(c.rate_per_view)} F/vue{c.max_reward_amount ? ` (plafond ${formatPrice(c.max_reward_amount)} F)` : ''}
                  {c.min_views ? ` · min. ${c.min_views} vues` : ''} · {c.claimed_count}{c.max_distributors ? `/${c.max_distributors}` : ''} réclamées
                </Text>
                {!!c.stats && (
                  <Text style={styles.rowStats}>
                    ✅ {c.stats.verified} validées · 💸 {c.stats.paid} payées{c.stats.flagged > 0 ? ` · ⚠️ ${c.stats.flagged} flaguée(s)` : ''}
                  </Text>
                )}
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => handleToggleStatus(c)}><Text style={styles.actionText}>{c.status === 'active' ? 'Pause' : 'Activer'}</Text></Pressable>
                  <Pressable onPress={() => openEdit(c)}><Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text></Pressable>
                  <Pressable onPress={() => handleDeleteCampaign(c)}><Ionicons name="trash-outline" size={15} color={colors.danger} /></Pressable>
                </View>
              </View>
            </View>
          )}
        />
      );
    }

    if (tab === 'queue') {
      if (loadingQueue) return <Loading />;
      return (
        <FlatList
          data={queue}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQueue(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="File de modération vide 🎉" />}
          renderItem={({ item: s }) => (
            <Pressable style={styles.row} onPress={() => openDetail(s)}>
              <View style={[styles.queueIcon, s.flagged && styles.queueIconFlagged]}>
                <Ionicons name={s.flagged ? 'shield-outline' : 'time-outline'} size={17} color={s.flagged ? colors.danger : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{s.campaign?.title}</Text>
                  {s.flagged && <View style={styles.pillDanger}><Text style={styles.pillDangerText}>Flaguée</Text></View>}
                  {s.status === 'live_check' && <View style={styles.pillWarn}><Text style={styles.pillWarnText}>Vérif. live</Text></View>}
                </View>
                <Text style={styles.rowSub}>{s.distributor?.user?.fullname || s.distributor?.verified_phone || 'Distributeur'} · confiance : {TRUST_META[s.distributor?.trust_level]?.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          )}
        />
      );
    }

    if (tab === 'payouts') {
      if (loadingPayouts) return <Loading />;
      return (
        <FlatList
          data={payouts}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayouts(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="wallet-outline" title="Aucun paiement en attente" />}
          renderItem={({ item: s }) => {
            const eligible = !s.payout_eligible_at || new Date(s.payout_eligible_at) <= new Date();
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{s.distributor?.user?.fullname || s.distributor?.verified_phone}</Text>
                  <Text style={styles.rowSub}>{s.campaign?.title} · MoMo {s.distributor?.momo_number || s.distributor?.verified_phone || '—'} · <Text style={{ color: colors.primary, fontWeight: '900' }}>{formatPrice(s.reward_amount)} F</Text></Text>
                  {!eligible && <Text style={styles.pendingText}>⏳ Éligible le {new Date(s.payout_eligible_at).toLocaleString('fr-FR')}</Text>}
                </View>
                <Pressable style={[styles.payBtn, !eligible && styles.payBtnDisabled]} disabled={!eligible} onPress={() => handleMarkPaid(s.id)}>
                  <Ionicons name="wallet-outline" size={13} color="#fff" />
                  <Text style={styles.payBtnText}>Payé</Text>
                </Pressable>
              </View>
            );
          }}
        />
      );
    }

    // distributors
    if (loadingDistributors) return <Loading />;
    return (
      <FlatList
        data={distributors}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDistributors(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="people-outline" title="Aucun distributeur inscrit" />}
        renderItem={({ item: d }) => {
          const meta = TRUST_META[d.trust_level] || TRUST_META.new;
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{d.user?.fullname || 'Sans nom'}</Text>
                  <View style={[styles.pill, { backgroundColor: `${colors[meta.color]}1f` }]}>
                    <Text style={[styles.pillText, { color: colors[meta.color] }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.rowSub}>
                  {d.verified_phone || 'Numéro non vérifié'} · {d.total_submissions} soumissions · {d.total_verified} validées · {formatPrice(d.total_paid_amount || 0)} F payés
                  {d.flag_count > 0 ? ` · ${d.flag_count} flag(s)` : ''}
                </Text>
                {!!d.ban_reason && <Text style={styles.pendingText}>Motif : {d.ban_reason}</Text>}
              </View>
              {d.trust_level === 'banned' ? (
                <Pressable onPress={() => handleUnban(d)}><Text style={[styles.actionText, { color: colors.success }]}>Réactiver</Text></Pressable>
              ) : (
                <Pressable style={styles.banBtn} onPress={() => openBan(d)}>
                  <Ionicons name="ban-outline" size={13} color={colors.danger} />
                  <Text style={styles.banBtnText}>Bannir</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon} size={14} color={tab === t.key ? colors.primary : colors.textFaint} />
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
            {t.key === 'queue' && queue.length > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{queue.length}</Text></View>
            )}
          </Pressable>
        ))}
      </View>

      {renderTabContent()}

      {/* Modal création/édition campagne */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Modifier la campagne' : 'Créer une campagne'}</Text>
              <Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.modalLabel}>Visuel à publier en Statut</Text>
                  {form.creative_url ? (
                    <View>
                      <Image source={{ uri: form.creative_url }} style={styles.creativePreview} />
                      <Pressable style={styles.removeCreativeBtn} onPress={() => setForm((f) => ({ ...f, creative_url: '' }))}>
                        <Ionicons name="close" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.creativePicker} onPress={handlePickCreative} disabled={uploadingCreative}>
                      <Ionicons name={uploadingCreative ? 'hourglass-outline' : 'image-outline'} size={22} color={colors.textFaint} />
                      <Text style={styles.creativePickerText}>{uploadingCreative ? 'Envoi…' : 'Choisir une image'}</Text>
                    </Pressable>
                  )}
                </View>

                <View>
                  <Text style={styles.modalLabel}>Titre</Text>
                  <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} placeholder="Ex : Promo rentrée Vtout" placeholderTextColor={colors.textFaint} />
                </View>
                <View>
                  <Text style={styles.modalLabel}>Description (optionnel)</Text>
                  <TextInput style={[styles.input, styles.multiline]} value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline numberOfLines={2} placeholderTextColor={colors.textFaint} />
                </View>

                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Taux par vue (FCFA)</Text>
                    <TextInput style={styles.input} value={form.rate_per_view} onChangeText={(t) => setForm((f) => ({ ...f, rate_per_view: t.replace(/[^0-9.]/g, '') }))} keyboardType="decimal-pad" placeholder="Ex : 5" placeholderTextColor={colors.textFaint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Plafond/soumission</Text>
                    <TextInput style={styles.input} value={form.max_reward_amount} onChangeText={(t) => setForm((f) => ({ ...f, max_reward_amount: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholder="Illimité" placeholderTextColor={colors.textFaint} />
                  </View>
                </View>
                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Vues minimum</Text>
                    <TextInput style={styles.input} value={form.min_views} onChangeText={(t) => setForm((f) => ({ ...f, min_views: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholder="Aucun minimum" placeholderTextColor={colors.textFaint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Places</Text>
                    <TextInput style={styles.input} value={form.max_distributors} onChangeText={(t) => setForm((f) => ({ ...f, max_distributors: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholder="Illimité" placeholderTextColor={colors.textFaint} />
                  </View>
                </View>
                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Début (AAAA-MM-JJ)</Text>
                    <TextInput style={styles.input} value={form.start_date} onChangeText={(t) => setForm((f) => ({ ...f, start_date: t }))} placeholder="2026-08-06" placeholderTextColor={colors.textFaint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Fin (AAAA-MM-JJ)</Text>
                    <TextInput style={styles.input} value={form.end_date} onChangeText={(t) => setForm((f) => ({ ...f, end_date: t }))} placeholder="2026-09-06" placeholderTextColor={colors.textFaint} />
                  </View>
                </View>
                <Text style={styles.modalHelperSmall}>Ces dates ne fixent que la période où de nouveaux distributeurs peuvent rejoindre. Une fois réclamée, chaque soumission a toujours 24h pour être complétée.</Text>

                <Button title={saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer la campagne'} onPress={handleSaveCampaign} loading={saving} disabled={uploadingCreative} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal détail soumission / modération */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetail(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{detail?.submission?.campaign?.title || 'Soumission'}</Text>
              <Pressable onPress={() => setDetail(null)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
            </View>
            {loadingDetail ? (
              <Loading />
            ) : (
              <ScrollView style={{ maxHeight: 480 }}>
                <View style={{ gap: 14 }}>
                  {detail?.submission?.flagged && (
                    <View style={styles.flagBox}>
                      <Ionicons name="shield-outline" size={15} color={colors.danger} />
                      <Text style={styles.flagBoxText}>{detail.submission.flag_reason}</Text>
                    </View>
                  )}

                  <View style={styles.viewsBox}>
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.viewsBoxLabel}>Vues déclarées</Text>
                      <Text style={styles.viewsBoxValue}>{detail?.submission?.views_reported ?? '—'}</Text>
                    </View>
                    <Text style={styles.modalLabel}>Vues retenues (corrigez si besoin)</Text>
                    <TextInput style={styles.input} value={viewsInput} onChangeText={(t) => setViewsInput(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                    {!!detail?.submission?.campaign?.rate_per_view && (
                      <Text style={styles.rewardEstimate}>
                        Récompense estimée : {formatPrice(estimatedReward)} F
                        {detail.submission.campaign.min_views && Number(viewsInput || 0) < detail.submission.campaign.min_views && (
                          <Text style={{ color: colors.danger }}>{'\n'}⚠️ En dessous du minimum requis ({detail.submission.campaign.min_views} vues)</Text>
                        )}
                      </Text>
                    )}
                  </View>

                  <View style={styles.distributorBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{detail?.submission?.distributor?.user?.fullname || 'Distributeur'}</Text>
                      <Text style={styles.rowSub}>{detail?.submission?.distributor?.verified_phone} · {detail?.submission?.distributor?.total_submissions} soumissions · {detail?.submission?.distributor?.flag_count} flag(s)</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: `${colors[TRUST_META[detail?.submission?.distributor?.trust_level]?.color || 'warning']}1f` }]}>
                      <Text style={[styles.pillText, { color: colors[TRUST_META[detail?.submission?.distributor?.trust_level]?.color || 'warning'] }]}>{TRUST_META[detail?.submission?.distributor?.trust_level]?.label}</Text>
                    </View>
                  </View>

                  <View style={styles.screenshotsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Capture précoce</Text>
                      {detail?.submission?.screenshot_early_url ? (
                        <Image source={{ uri: detail.submission.screenshot_early_url }} style={styles.screenshotImg} />
                      ) : (
                        <View style={styles.screenshotMissing}><Text style={styles.screenshotMissingText}>Manquante</Text></View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Capture tardive</Text>
                      {detail?.submission?.screenshot_late_url ? (
                        <Image source={{ uri: detail.submission.screenshot_late_url }} style={styles.screenshotImg} />
                      ) : (
                        <View style={styles.screenshotMissing}><Text style={styles.screenshotMissingText}>Manquante</Text></View>
                      )}
                    </View>
                  </View>
                  {!!detail?.submission?.live_check_screenshot_url && (
                    <View>
                      <Text style={[styles.modalLabel, { color: colors.warning }]}>Capture de vérification live</Text>
                      <Image source={{ uri: detail.submission.live_check_screenshot_url }} style={[styles.screenshotImg, { aspectRatio: undefined, height: 180 }]} />
                    </View>
                  )}

                  {detail?.history?.length > 0 && (
                    <View>
                      <Text style={styles.modalLabel}>Historique de ce distributeur</Text>
                      <View style={styles.historyBox}>
                        {detail.history.map((h) => (
                          <View key={h.id} style={styles.historyRow}>
                            <Text style={styles.historyName} numberOfLines={1}>{h.campaign?.title}</Text>
                            <Text style={[styles.historyStatus, h.flagged && { color: colors.danger }]}>{h.status}{h.flagged ? ' ⚠️' : ''}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View>
                    <Text style={styles.modalLabel}>Motif de rejet (si applicable)</Text>
                    <TextInput style={styles.input} value={rejectReason} onChangeText={setRejectReason} placeholder="Ex : captures dupliquées" placeholderTextColor={colors.textFaint} />
                  </View>
                </View>
              </ScrollView>
            )}
            {!loadingDetail && detail && (
              <View style={styles.detailActionsRow}>
                <Pressable style={[styles.detailActionBtn, styles.liveCheckBtn]} onPress={() => handleLiveCheck(detail.submission.id)}>
                  <Ionicons name="time-outline" size={14} color={colors.warning} />
                  <Text style={[styles.detailActionText, { color: colors.warning }]}>Vérif. live</Text>
                </Pressable>
                <Pressable style={[styles.detailActionBtn, styles.rejectBtn]} onPress={() => handleReject(detail.submission.id)}>
                  <Ionicons name="close" size={14} color={colors.danger} />
                  <Text style={[styles.detailActionText, { color: colors.danger }]}>Rejeter</Text>
                </Pressable>
                <Pressable style={[styles.detailActionBtn, styles.approveBtn]} onPress={() => handleApprove(detail.submission.id)}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={[styles.detailActionText, { color: '#fff' }]}>Valider</Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal motif de bannissement */}
      <Modal visible={!!banTarget} transparent animationType="fade" onRequestClose={() => setBanTarget(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBanTarget(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bannir ce distributeur</Text>
              <Pressable onPress={() => setBanTarget(null)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
            </View>
            <Text style={styles.modalLabel}>Motif</Text>
            <TextInput style={styles.input} value={banReason} onChangeText={setBanReason} />
            <Button title="Bannir" onPress={confirmBan} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 10 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabBtnText: { fontSize: 10.5, fontWeight: '800', color: colors.textFaint },
  tabBtnTextActive: { color: colors.primary },
  tabBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeText: { fontSize: 8.5, fontWeight: '900', color: '#fff' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, marginBottom: 4 },
  createBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  campaignThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.background },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowTitle: { fontSize: 13, fontWeight: '900', color: colors.text, flexShrink: 1 },
  rowSub: { fontSize: 10.5, fontWeight: '600', color: colors.textMuted, marginTop: 3 },
  rowStats: { fontSize: 9.5, fontWeight: '600', color: colors.textFaint, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillActive: { backgroundColor: 'rgba(16,185,129,0.12)' },
  pillMuted: { backgroundColor: colors.background },
  pillInfo: { backgroundColor: 'rgba(59,130,246,0.12)' },
  pillText: { fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase' },
  pillTextActive: { color: colors.success },
  pillTextMuted: { color: colors.textFaint },
  pillTextInfo: { color: colors.secondary },
  pillDanger: { backgroundColor: 'rgba(244,63,94,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillDangerText: { fontSize: 8.5, fontWeight: '900', color: colors.danger, textTransform: 'uppercase' },
  pillWarn: { backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillWarnText: { fontSize: 8.5, fontWeight: '900', color: colors.warning, textTransform: 'uppercase' },
  queueIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: `${colors.primary}1a`, alignItems: 'center', justifyContent: 'center' },
  queueIconFlagged: { backgroundColor: 'rgba(244,63,94,0.12)' },
  pendingText: { fontSize: 9.5, fontWeight: '700', color: colors.warning, marginTop: 3 },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9 },
  payBtnDisabled: { opacity: 0.35 },
  payBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  banBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  banBtnText: { fontSize: 11, fontWeight: '800', color: colors.danger },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 12, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text, flexShrink: 1 },
  modalLabel: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, marginBottom: 6 },
  modalHelperSmall: { fontSize: 9.5, fontWeight: '600', color: colors.textFaint, lineHeight: 13 },
  input: { height: 46, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '700', color: colors.text },
  multiline: { height: 70, paddingTop: 12, textAlignVertical: 'top' },
  rowGap: { flexDirection: 'row', gap: 10 },
  creativePicker: { aspectRatio: 16 / 9, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  creativePickerText: { fontSize: 11, fontWeight: '800', color: colors.textFaint },
  creativePreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.background },
  removeCreativeBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  flagBox: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(244,63,94,0.08)', borderRadius: radius.md, padding: 12 },
  flagBoxText: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.danger },
  viewsBox: { backgroundColor: `${colors.secondary}12`, borderRadius: radius.md, padding: 14, gap: 8 },
  viewsBoxLabel: { fontSize: 10, fontWeight: '900', color: colors.secondary, textTransform: 'uppercase' },
  viewsBoxValue: { fontSize: 18, fontWeight: '900', color: colors.secondary },
  rewardEstimate: { fontSize: 11.5, fontWeight: '800', color: colors.secondary },
  distributorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, borderRadius: radius.md, padding: 12 },
  screenshotsRow: { flexDirection: 'row', gap: 10 },
  screenshotImg: { width: '100%', aspectRatio: 9 / 16, borderRadius: radius.md, backgroundColor: colors.background },
  screenshotMissing: { width: '100%', aspectRatio: 9 / 16, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  screenshotMissingText: { fontSize: 10, fontWeight: '700', color: colors.textFaint },
  historyBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyName: { fontSize: 11, fontWeight: '700', color: colors.text, flexShrink: 1 },
  historyStatus: { fontSize: 10, fontWeight: '800', color: colors.textFaint },
  detailActionsRow: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  detailActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: radius.md },
  liveCheckBtn: { backgroundColor: 'rgba(245,158,11,0.12)' },
  rejectBtn: { backgroundColor: 'rgba(244,63,94,0.12)' },
  approveBtn: { backgroundColor: colors.success },
  detailActionText: { fontSize: 11, fontWeight: '800' },
});
