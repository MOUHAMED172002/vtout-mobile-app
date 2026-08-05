import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getReferralSettings, updateReferralSettings, getAllReferrals, getReferralStats } from '../../services/referralService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

// Équivalent mobile de frontend/src/component/Admin/Marketing/ReferralAdminManager.jsx
export default function AdminReferralScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();

  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ referrerReward: '', referredReward: '', minOrderAmount: '', validityDays: '' });
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [s, st, list] = await Promise.all([
        getReferralSettings(token),
        getReferralStats(token),
        getAllReferrals(token),
      ]);
      setSettings(s);
      setForm({
        referrerReward: String(s.referrerReward ?? 0),
        referredReward: String(s.referredReward ?? 0),
        minOrderAmount: String(s.minOrderAmount ?? 0),
        validityDays: String(s.validityDays ?? 60),
      });
      setStats(st);
      setReferrals(list);
    } catch (err) {
      // liste vide en cas d'erreur, pas bloquant
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const isActive = settings && (Number(settings.referrerReward) > 0 || Number(settings.referredReward) > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      await updateReferralSettings({
        referrerReward: Number(form.referrerReward) || 0,
        referredReward: Number(form.referredReward) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        validityDays: Number(form.validityDays) || 60,
      }, token);
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={referrals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 4 }}>
            <View style={styles.statusRow}>
              <Text style={styles.title}>Programme de parrainage</Text>
              <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillInactive]}>
                <Text style={[styles.statusPillText, isActive ? styles.statusPillTextActive : styles.statusPillTextInactive]}>
                  {isActive ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Tant que les récompenses sont à 0, le parrainage ne génère aucun coupon.</Text>

            {stats && (
              <View style={styles.statsGrid}>
                <StatCard icon="people-outline" label="Filleuls invités" value={stats.totalInvites} color={colors.secondary} />
                <StatCard icon="gift-outline" label="Récompensés" value={stats.totalRewarded} color={colors.success} />
                <StatCard icon="time-outline" label="En attente" value={stats.totalPending} color={colors.warning} />
                <StatCard icon="wallet-outline" label="Coupons distribués" value={`${formatPrice(stats.estimatedPayout || 0)} F`} color="#8b5cf6" />
              </View>
            )}

            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Réglages des récompenses</Text>
              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Récompense parrain (FCFA)</Text>
                  <TextInput style={styles.input} value={form.referrerReward} onChangeText={(t) => setForm((f) => ({ ...f, referrerReward: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholder="0 = désactivé" placeholderTextColor={colors.textFaint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Récompense filleul (FCFA)</Text>
                  <TextInput style={styles.input} value={form.referredReward} onChangeText={(t) => setForm((f) => ({ ...f, referredReward: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholder="0 = désactivé" placeholderTextColor={colors.textFaint} />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Montant minimum (FCFA)</Text>
                  <TextInput style={styles.input} value={form.minOrderAmount} onChangeText={(t) => setForm((f) => ({ ...f, minOrderAmount: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholderTextColor={colors.textFaint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Validité coupons (jours)</Text>
                  <TextInput style={styles.input} value={form.validityDays} onChangeText={(t) => setForm((f) => ({ ...f, validityDays: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholderTextColor={colors.textFaint} />
                </View>
              </View>
              <Button title={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={handleSave} loading={saving} />
            </View>

            <Text style={styles.listTitle}>Filleuls ({referrals.length})</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="share-social-outline" title="Aucun parrainage pour le moment" />}
        renderItem={({ item: r }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {r.referrer?.fullname || r.referrer?.email || '—'} → {r.referred?.fullname || r.referred?.email || '—'}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {new Date(r.created_at).toLocaleDateString('fr-FR')}
                {r.referrer_coupon_code ? ` · Coupon parrain: ${r.referrer_coupon_code}` : ''}
                {r.referred_coupon_code ? ` · Coupon filleul: ${r.referred_coupon_code}` : ''}
              </Text>
            </View>
            <View style={[styles.statusPill, r.status === 'rewarded' ? styles.statusPillActive : styles.statusPillInactive]}>
              <Text style={[styles.statusPillText, r.status === 'rewarded' ? styles.statusPillTextActive : styles.statusPillTextInactive]}>
                {r.status === 'rewarded' ? 'Récompensé' : 'En attente'}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}1f` }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: -8, lineHeight: 17 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 17, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textFaint },
  settingsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  settingsTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, marginBottom: 6 },
  input: { height: 44, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: colors.text },
  listTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  rowTitle: { fontSize: 12, fontWeight: '800', color: colors.text },
  rowSub: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusPillActive: { backgroundColor: 'rgba(16,185,129,0.12)' },
  statusPillInactive: { backgroundColor: 'rgba(245,158,11,0.12)' },
  statusPillText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusPillTextActive: { color: colors.success },
  statusPillTextInactive: { color: colors.warning },
});
