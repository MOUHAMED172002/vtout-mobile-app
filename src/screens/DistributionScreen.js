import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  requestPhoneOtp, verifyPhoneOtp, getMyDistributorProfile, updateMomoNumber,
  getAvailableCampaigns, claimCampaign, getMySubmissions,
  submitEarlyScreenshot, submitLateScreenshot, submitLiveCheckScreenshot,
} from '../services/adDistributionService';
import { formatPrice, getThumbnail } from '../utils/format';
import Loading from '../components/Loading';
import Button from '../components/Button';

const STATUS_META = {
  pending: { label: 'Capture précoce attendue', color: 'warning', icon: 'time-outline' },
  awaiting_late: { label: 'Capture tardive attendue', color: 'warning', icon: 'time-outline' },
  live_check: { label: 'Vérification demandée !', color: 'danger', icon: 'alert-circle-outline' },
  under_review: { label: 'En cours de vérification', color: 'secondary', icon: 'time-outline' },
  verified: { label: 'Validée — paiement en attente', color: 'success', icon: 'checkmark-circle-outline' },
  paid: { label: 'Payée', color: 'success', icon: 'wallet-outline' },
  rejected: { label: 'Rejetée', color: 'textFaint', icon: 'close-circle-outline' },
};

// Sélectionne une image depuis la galerie (le distributeur prend une capture
// d'écran OS de son Statut WhatsApp, puis la choisit ici — pas une photo prise
// avec l'appareil).
async function pickScreenshot() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour envoyer votre capture d'écran.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const filename = asset.uri.split('/').pop() || 'capture.jpg';
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { uri: asset.uri, name: filename, type: mimeType };
}

export default function DistributionScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // phone | code
  const [code, setCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [momoInput, setMomoInput] = useState('');
  const [uploadingFor, setUploadingFor] = useState(null);
  const [lateViews, setLateViews] = useState({}); // { [submissionId]: value }

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const p = await getMyDistributorProfile(token);
      setProfile(p);
      setMomoInput(p?.momo_number || '');
      if (p?.verified_phone) {
        const [c, s] = await Promise.all([getAvailableCampaigns(token), getMySubmissions(token)]);
        setCampaigns(c);
        setSubmissions(s);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger cette page.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleRequestOtp = async () => {
    if (!phone.trim()) return Alert.alert('Numéro manquant', 'Entrez votre numéro WhatsApp.');
    setOtpLoading(true);
    try {
      const token = await getToken();
      await requestPhoneOtp(phone, token);
      Alert.alert('Code envoyé', 'Un code de vérification a été envoyé sur WhatsApp.');
      setOtpStep('code');
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Échec de l'envoi du code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!code.trim()) return Alert.alert('Code manquant', 'Entrez le code reçu.');
    setOtpLoading(true);
    try {
      const token = await getToken();
      await verifyPhoneOtp(phone, code, token);
      load();
    } catch (err) {
      Alert.alert('Code invalide', err?.response?.data?.error || 'Ce code est invalide ou expiré.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSaveMomo = async () => {
    if (!momoInput.trim()) return;
    try {
      const token = await getToken();
      await updateMomoNumber(momoInput, token);
      Alert.alert('Enregistré', 'Numéro Mobile Money mis à jour.');
    } catch (err) {
      Alert.alert('Erreur', "Erreur lors de l'enregistrement.");
    }
  };

  const handleClaim = async (campaignId) => {
    try {
      const token = await getToken();
      await claimCampaign(campaignId, token);
      Alert.alert('Campagne réclamée', 'Publiez le visuel en Statut puis envoyez votre 1ère capture.');
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Erreur lors de la réclamation.');
    }
  };

  const handleUpload = async (submission, kind) => {
    const viewsReported = lateViews[submission.id];
    if (kind === 'late' && (!viewsReported || Number(viewsReported) < 0)) {
      Alert.alert('Vues manquantes', "Indiquez le nombre de vues affiché sous votre Statut avant d'envoyer la capture.");
      return;
    }
    const file = await pickScreenshot();
    if (!file) return;
    setUploadingFor(submission.id);
    try {
      const token = await getToken();
      const res = kind === 'early'
        ? await submitEarlyScreenshot(submission.id, file, token)
        : kind === 'late'
          ? await submitLateScreenshot(submission.id, file, Number(viewsReported), token)
          : await submitLiveCheckScreenshot(submission.id, file, token);
      Alert.alert(res.flagged ? 'Envoyée, à vérifier' : 'Envoyée', res.flagged ? 'Capture envoyée, mais signalée pour vérification manuelle.' : 'Capture envoyée !');
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Échec de l'envoi.");
    } finally {
      setUploadingFor(null);
    }
  };

  if (loading) return <Loading />;

  const isVerified = !!profile?.verified_phone;
  const isBanned = profile?.trust_level === 'banned';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="megaphone" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Distribution WhatsApp</Text>
            <Text style={styles.subtitle}>Publiez des campagnes en Statut WhatsApp et soyez payé pour chaque diffusion validée.</Text>
          </View>
        </View>

        {isBanned && (
          <View style={styles.bannedBox}>
            <Ionicons name="close-circle" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannedTitle}>Compte suspendu</Text>
              <Text style={styles.bannedText}>{profile.ban_reason || 'Votre compte a été banni du programme de distribution.'}</Text>
            </View>
          </View>
        )}

        {!isVerified && !isBanned && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Vérifiez votre numéro WhatsApp</Text>
            </View>
            <Text style={styles.helperText}>Obligatoire pour participer — un numéro = un compte distributeur.</Text>
            {otpStep === 'phone' ? (
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={phone} onChangeText={setPhone} placeholder="+229 00 00 00 00" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
                <Button title={otpLoading ? '…' : 'Recevoir le code'} onPress={handleRequestOtp} loading={otpLoading} style={styles.inlineBtn} />
              </View>
            ) : (
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, styles.codeInput, { flex: 1 }]} value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} placeholder="Code reçu" placeholderTextColor={colors.textFaint} keyboardType="number-pad" maxLength={6} />
                <Button title={otpLoading ? '…' : 'Vérifier'} onPress={handleVerifyOtp} loading={otpLoading} style={styles.inlineBtn} />
              </View>
            )}
          </View>
        )}

        {isVerified && !isBanned && (
          <>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Numéro Mobile Money (paiement)</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={momoInput} onChangeText={setMomoInput} keyboardType="phone-pad" placeholderTextColor={colors.textFaint} />
                <Pressable style={styles.saveBtn} onPress={handleSaveMomo}><Text style={styles.saveBtnText}>Enregistrer</Text></Pressable>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Campagnes disponibles</Text>
            {campaigns.length === 0 ? (
              <View style={styles.emptyBox}><Text style={styles.emptyText}>Aucune campagne disponible pour le moment.</Text></View>
            ) : (
              <View style={styles.campaignGrid}>
                {campaigns.map((c) => (
                  <View key={c.id} style={styles.campaignCard}>
                    <Image source={{ uri: getThumbnail(c.creative_url) }} style={styles.campaignImage} />
                    <View style={{ padding: 12, gap: 4 }}>
                      <Text style={styles.campaignTitle} numberOfLines={1}>{c.title}</Text>
                      <Text style={styles.campaignRate}>{formatPrice(c.rate_per_view)} F <Text style={styles.campaignRateUnit}>/ vue</Text></Text>
                      {!!c.min_views && <Text style={styles.campaignMin}>Minimum {c.min_views} vues pour être payé</Text>}
                      {c.already_claimed ? (
                        <Text style={styles.alreadyClaimed}>Déjà réclamée</Text>
                      ) : (
                        <Pressable style={styles.claimBtn} onPress={() => handleClaim(c.id)}>
                          <Text style={styles.claimBtnText}>Participer</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Mes soumissions</Text>
            {submissions.length === 0 ? (
              <View style={styles.emptyBox}><Text style={styles.emptyText}>Aucune soumission pour le moment.</Text></View>
            ) : (
              submissions.map((s) => {
                const meta = STATUS_META[s.status] || STATUS_META.pending;
                const needsEarly = s.status === 'pending';
                const needsLate = s.status === 'awaiting_late';
                const needsLive = s.status === 'live_check';
                const isUploading = uploadingFor === s.id;
                return (
                  <View key={s.id} style={styles.submissionCard}>
                    <View style={styles.submissionHeader}>
                      <Text style={styles.submissionTitle} numberOfLines={1}>{s.campaign?.title}</Text>
                      <View style={[styles.statusPill, { backgroundColor: `${colors[meta.color]}1f` }]}>
                        <Ionicons name={meta.icon} size={11} color={colors[meta.color]} />
                        <Text style={[styles.statusPillText, { color: colors[meta.color] }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.submissionSub}>
                      {s.reward_amount != null ? `${formatPrice(s.reward_amount)} F` : `${formatPrice(s.campaign?.rate_per_view || 0)} F / vue (calculé après vérification)`}
                      {s.status === 'verified' && s.payout_eligible_at && ` · Payable à partir du ${new Date(s.payout_eligible_at).toLocaleString('fr-FR')}`}
                      {s.status === 'rejected' && s.rejection_reason && ` · ${s.rejection_reason}`}
                      {s.claim_deadline_at && (needsEarly || needsLate) && ` · Délai : ${new Date(s.claim_deadline_at).toLocaleString('fr-FR')}`}
                    </Text>

                    {needsLate && (
                      <View>
                        <Text style={styles.fieldLabel}>Nombre de vues affiché sous votre Statut</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="number-pad"
                          value={lateViews[s.id] ?? ''}
                          onChangeText={(t) => setLateViews((v) => ({ ...v, [s.id]: t.replace(/[^0-9]/g, '') }))}
                          placeholder="Ex : 87"
                          placeholderTextColor={colors.textFaint}
                        />
                      </View>
                    )}

                    {(needsEarly || needsLate || needsLive) && (
                      <Pressable
                        style={styles.uploadBtn}
                        disabled={isUploading || (needsLate && !lateViews[s.id])}
                        onPress={() => handleUpload(s, needsEarly ? 'early' : needsLate ? 'late' : 'live')}
                      >
                        <Ionicons name="camera-outline" size={15} color={colors.primary} />
                        <Text style={styles.uploadBtnText}>
                          {isUploading ? 'Envoi…' : needsEarly ? 'Envoyer la capture précoce' : needsLate ? 'Envoyer la capture tardive' : 'Envoyer la capture demandée'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconWrap: { width: 44, height: 44, borderRadius: 16, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  bannedBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)', borderRadius: radius.lg, padding: 16 },
  bannedTitle: { fontSize: 13, fontWeight: '900', color: colors.danger },
  bannedText: { fontSize: 11, fontWeight: '600', color: colors.danger, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  helperText: { fontSize: 11, fontWeight: '600', color: colors.textFaint },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '700', color: colors.text },
  codeInput: { textAlign: 'center', letterSpacing: 4, fontWeight: '900' },
  inlineBtn: { height: 48, paddingHorizontal: 16 },
  saveBtn: { height: 48, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 12, fontWeight: '800', color: colors.text },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 4 },
  emptyBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 12, fontWeight: '700', color: colors.textFaint },
  campaignGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  campaignCard: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  campaignImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.background },
  campaignTitle: { fontSize: 12, fontWeight: '900', color: colors.text },
  campaignRate: { fontSize: 16, fontWeight: '900', color: colors.primary },
  campaignRateUnit: { fontSize: 10, fontWeight: '700', color: colors.textFaint },
  campaignMin: { fontSize: 9, fontWeight: '600', color: colors.textFaint },
  alreadyClaimed: { fontSize: 10, fontWeight: '800', color: colors.textFaint, textAlign: 'center', paddingVertical: 8 },
  claimBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 9, alignItems: 'center', marginTop: 4 },
  claimBtnText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  submissionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  submissionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  submissionTitle: { fontSize: 13, fontWeight: '900', color: colors.text, flexShrink: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  submissionSub: { fontSize: 11, fontWeight: '600', color: colors.textMuted, lineHeight: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, marginBottom: 6 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: `${colors.primary}15`, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  uploadBtnText: { fontSize: 11, fontWeight: '900', color: colors.primary },
});
