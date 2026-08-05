import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyBadgeStatus, subscribeToBadge } from '../../services/badgeService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const MONTH_PRESETS = [1, 3, 6, 12];
const MAX_MONTHS = 36;

// Équivalent mobile de supplier-portal/src/pages/SupplierBadge.jsx — badge
// "Vendeur Certifié" (abonnement mensuel payant via FedaPay, affiché
// automatiquement sur tous les produits du fournisseur une fois actif).
export default function SupplierBadgeScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [customMonths, setCustomMonths] = useState('');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyBadgeStatus(token);
      setStatus(data);
    } catch (err) {
      Alert.alert('Erreur', "Impossible de charger le statut du badge.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const token = await getToken();
      const { checkoutUrl } = await subscribeToBadge(selectedMonths, token);
      if (!checkoutUrl) {
        Alert.alert('Erreur', 'Impossible de générer le lien de paiement.');
        return;
      }
      await WebBrowser.openBrowserAsync(checkoutUrl);
      // Le webhook FedaPay active le badge côté serveur à la confirmation ;
      // on recharge le statut au retour du navigateur pour refléter le
      // paiement (peut nécessiter un second rafraîchissement si le webhook
      // n'a pas encore été traité).
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Erreur lors de la création du paiement.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) return <Loading />;

  const isCertified = !!status?.is_certified;
  const expiresAt = status?.certified_badge_expires_at ? new Date(status.certified_badge_expires_at) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  const monthlyPrice = Number(status?.monthly_price || 0);
  const priceNotConfigured = monthlyPrice <= 0;
  const totalPrice = monthlyPrice * (selectedMonths || 0);
  const history = Array.isArray(status?.history) ? status.history : [];

  const handleCustomMonths = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    setCustomMonths(digits);
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n > 0) setSelectedMonths(Math.min(MAX_MONTHS, n));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Carte statut */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.badgeIconWrap, isCertified && styles.badgeIconWrapActive]}>
              <Ionicons name="shield-checkmark" size={24} color={isCertified ? colors.secondary : 'rgba(255,255,255,0.35)'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Badge Vendeur Certifié</Text>
              <Text style={styles.statusTitle}>{isCertified ? 'Votre boutique est certifiée' : 'Pas encore certifié'}</Text>
            </View>
          </View>

          {isCertified ? (
            <>
              <View style={styles.expiresRow}>
                <Ionicons name="time-outline" size={15} color={colors.secondary} />
                <Text style={styles.expiresText}>Actif jusqu'au {expiresAt ? expiresAt.toLocaleDateString('fr-FR') : '—'}</Text>
              </View>
              <View style={styles.daysLeftBox}>
                <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                <Text style={styles.daysLeftText}>
                  {daysLeft} <Text style={styles.daysLeftUnit}>jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}</Text>
                </Text>
              </View>
              <View style={styles.disabledBtn}>
                <Text style={styles.disabledBtnText}>Badge déjà actif</Text>
              </View>
              <Text style={styles.helperText}>Le renouvellement sera possible à l'expiration de votre abonnement actuel.</Text>
            </>
          ) : priceNotConfigured ? (
            <>
              <Text style={styles.pitchText}>
                Activez le badge "Certifié" pour rassurer vos clients et vous démarquer sur tous vos produits.
              </Text>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  L'abonnement n'est pas encore disponible — l'administrateur n'a pas configuré de prix. Réessayez plus tard.
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.pitchText}>
                Activez le badge "Certifié" pour rassurer vos clients et vous démarquer sur tous vos produits.
              </Text>

              <Text style={styles.sectionLabel}>Choisissez la durée</Text>
              <View style={styles.monthsRow}>
                {MONTH_PRESETS.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.monthChip, selectedMonths === m && !customMonths && styles.monthChipActive]}
                    onPress={() => { setSelectedMonths(m); setCustomMonths(''); }}
                  >
                    <Text style={[styles.monthChipText, selectedMonths === m && !customMonths && styles.monthChipTextActive]}>{m} mois</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.customMonthsRow}>
                <Text style={styles.orText}>ou</Text>
                <TextInput
                  style={styles.customMonthsInput}
                  placeholder="Nb"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  value={customMonths}
                  onChangeText={handleCustomMonths}
                />
                <Text style={styles.orText}>mois (max {MAX_MONTHS})</Text>
              </View>

              <Button
                title={subscribing ? 'Redirection…' : `Activer pour ${formatPrice(totalPrice)} FCFA`}
                onPress={handleSubscribe}
                loading={subscribing}
                disabled={!selectedMonths}
                variant="secondary"
                style={{ marginTop: 4 }}
                icon={<Ionicons name="chevron-forward" size={16} color="#fff" />}
              />
              <Text style={styles.helperText}>
                {formatPrice(monthlyPrice)} FCFA / mois × {selectedMonths || 0} mois · Paiement sécurisé via FedaPay
              </Text>
            </>
          )}
        </View>

        {/* Avantages */}
        <View style={styles.perksRow}>
          {[
            { icon: 'shield-checkmark-outline', title: 'Confiance client', desc: 'Le badge rassure les acheteurs et augmente les ventes.' },
            { icon: 'sparkles-outline', title: 'Visible partout', desc: 'Affiché automatiquement sur tous vos produits.' },
            { icon: 'calendar-outline', title: 'Multi-mois', desc: 'Payez pour 1, 3, 6, 12 mois ou plus, en une fois.' },
          ].map((p) => (
            <View key={p.title} style={styles.perkCard}>
              <View style={styles.perkIconWrap}>
                <Ionicons name={p.icon} size={18} color={colors.secondary} />
              </View>
              <Text style={styles.perkTitle}>{p.title}</Text>
              <Text style={styles.perkDesc}>{p.desc}</Text>
            </View>
          ))}
        </View>

        {/* Historique */}
        <View style={{ gap: 10 }}>
          <Text style={styles.historyTitle}>Historique des paiements</Text>
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>Aucun paiement effectué pour le moment.</Text>
            </View>
          ) : (
            history.map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>
                    {new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  <Text style={styles.historySub}>
                    {h.granted_by_admin_id ? 'Offert par admin' : `${formatPrice(h.amount)} FCFA`} · {h.months || 1} mois
                  </Text>
                </View>
                <View style={[
                  styles.statusPill,
                  h.status === 'paid' && styles.statusPillPaid,
                  h.status === 'pending' && styles.statusPillPending,
                  h.status === 'failed' && styles.statusPillFailed,
                ]}>
                  <Text style={[
                    styles.statusPillText,
                    h.status === 'paid' && styles.statusPillTextPaid,
                    h.status === 'pending' && styles.statusPillTextPending,
                    h.status === 'failed' && styles.statusPillTextFailed,
                  ]}>
                    {h.status === 'paid' ? 'Payé' : h.status === 'pending' ? 'En attente' : 'Échoué'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  statusCard: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 20, gap: 12 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  badgeIconWrapActive: { backgroundColor: 'rgba(59,130,246,0.2)' },
  eyebrow: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5 },
  statusTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginTop: 2 },
  expiresRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  expiresText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  daysLeftBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'flex-start' },
  daysLeftText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  daysLeftUnit: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  disabledBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  disabledBtnText: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  helperText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  pitchText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', lineHeight: 19 },
  warningBox: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', borderRadius: radius.md, padding: 14 },
  warningText: { fontSize: 12, fontWeight: '700', color: colors.warning },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  monthsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  monthChipActive: { borderColor: colors.secondary, backgroundColor: 'rgba(59,130,246,0.12)' },
  monthChipText: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 },
  monthChipTextActive: { color: colors.secondary },
  customMonthsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  customMonthsInput: { width: 70, paddingHorizontal: 10, paddingVertical: 10, borderRadius: radius.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '900', fontSize: 12, textAlign: 'center' },
  perksRow: { flexDirection: 'row', gap: 10 },
  perkCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 6 },
  perkIconWrap: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  perkTitle: { fontSize: 11, fontWeight: '900', color: colors.text },
  perkDesc: { fontSize: 10, fontWeight: '600', color: colors.textMuted, lineHeight: 14 },
  historyTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  emptyHistory: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: 28, alignItems: 'center' },
  emptyHistoryText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  historyDate: { fontSize: 12, fontWeight: '800', color: colors.text },
  historySub: { fontSize: 10, fontWeight: '700', color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.background },
  statusPillPaid: { backgroundColor: 'rgba(16,185,129,0.12)' },
  statusPillPending: { backgroundColor: 'rgba(245,158,11,0.12)' },
  statusPillFailed: { backgroundColor: 'rgba(244,63,94,0.12)' },
  statusPillText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted },
  statusPillTextPaid: { color: colors.success },
  statusPillTextPending: { color: colors.warning },
  statusPillTextFailed: { color: colors.danger },
});
