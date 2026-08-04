import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../services/adminStatsService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';

const PERIODS = ['7J', '30J', '12M'];
const MAX_BARS = 30;

const buildRoles = (colors) => [
  { key: 'admin', timelineKey: 'adminTimeline', label: 'Admin', sublabel: 'Commissions', icon: 'ribbon', color: colors.warning },
  { key: 'supplier', timelineKey: 'supplierTimeline', label: 'Vendeurs', sublabel: 'Gains', icon: 'storefront', color: colors.success },
  { key: 'deliverer', timelineKey: 'delivererTimeline', label: 'Livreurs', sublabel: 'Gains', icon: 'bicycle', color: colors.secondary },
  { key: 'buyer', timelineKey: 'buyerTimeline', label: 'Acheteurs', sublabel: 'Dépenses', icon: 'cart', color: colors.primary },
];

const sumTimeline = (t) => (t || []).reduce((sum, d) => sum + (Number(d.total) || 0), 0);

const formatDay = (isoDay) => {
  const parts = String(isoDay || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : String(isoDay || '');
};

export default function AdminSalesAnalyticsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ROLES = useMemo(() => buildRoles(colors), [colors]);
  const { getToken } = useAuth();
  const [period, setPeriod] = useState('30J');
  const [activeRole, setActiveRole] = useState('admin');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p = period) => {
    try {
      const token = await getToken();
      const stats = await getDashboardStats(token, p);
      setData(stats);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, period]);

  useEffect(() => { load(period); }, [period]);

  if (loading) return <Loading />;

  const totals = ROLES.map((r) => ({ ...r, total: sumTimeline(data?.[r.timelineKey]) }));
  const totalAll = totals.reduce((s, r) => s + r.total, 0) || 1;
  const active = totals.find((r) => r.key === activeRole) || totals[0];
  const topProducts = data?.topProducts || [];
  const fullTimeline = data?.[active.timelineKey] || [];
  const displayTimeline = fullTimeline.slice(-MAX_BARS);
  const maxValue = Math.max(1, ...displayTimeline.map((d) => Number(d.total) || 0));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(period); }} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Analyses des ventes</Text>
          <View style={styles.periodSwitch}>
            {PERIODS.map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.periodBtn, period === p && styles.periodBtnActive]}>
                <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.statsGrid}>
          {totals.map((r) => (
            <Pressable
              key={r.key}
              style={[styles.roleCard, activeRole === r.key && { borderColor: r.color, borderWidth: 1.5 }]}
              onPress={() => setActiveRole(r.key)}
            >
              <View style={[styles.roleIcon, { backgroundColor: `${r.color}18` }]}>
                <Ionicons name={r.icon} size={18} color={r.color} />
              </View>
              <Text style={styles.roleValue} numberOfLines={1}>{formatPrice(r.total)} F</Text>
              <Text style={styles.roleLabel} numberOfLines={1}>{r.label} · {r.sublabel}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Évolution — {active.label}</Text>
            <View style={[styles.legendDot, { backgroundColor: active.color }]} />
          </View>

          {fullTimeline.length > MAX_BARS && (
            <Text style={styles.hintText}>Affichage des {MAX_BARS} derniers jours de la période</Text>
          )}

          {displayTimeline.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Aucune donnée pour cette période</Text>
            </View>
          ) : (
            <View style={styles.barList}>
              {displayTimeline.map((d) => {
                const value = Number(d.total) || 0;
                const widthPct = Math.max(3, Math.round((value / maxValue) * 100));
                return (
                  <View key={d.day} style={styles.barRow}>
                    <Text style={styles.barDayLabel}>{formatDay(d.day)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: active.color }]} />
                    </View>
                    <Text style={styles.barValue} numberOfLines={1}>{formatPrice(value)} F</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Répartition par rôle</Text>
          <View style={{ gap: 8 }}>
            {totals.map((r) => {
              const pct = Math.round((r.total / totalAll) * 100);
              return (
                <View key={r.key} style={styles.breakdownRow}>
                  <View style={[styles.legendDot, { backgroundColor: r.color }]} />
                  <Text style={styles.breakdownLabel} numberOfLines={1}>{r.label}</Text>
                  <View style={styles.breakdownTrack}>
                    <View style={[styles.breakdownFill, { width: `${Math.max(2, pct)}%`, backgroundColor: r.color }]} />
                  </View>
                  <Text style={styles.breakdownPct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produits les plus vendus</Text>
          {topProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Aucune vente sur cette période</Text>
            </View>
          ) : (
            <View style={styles.topList}>
              {topProducts.map((t, idx) => (
                <View key={t.product_id || idx} style={[styles.topRow, idx === topProducts.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.topRank}>{idx + 1}</Text>
                  {t.product?.image_url ? (
                    <Image source={{ uri: getThumbnail(t.product.image_url) }} style={styles.topImage} />
                  ) : (
                    <View style={[styles.topImage, styles.topImagePlaceholder]}>
                      <Ionicons name="image-outline" size={16} color={colors.textFaint} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName} numberOfLines={1}>{t.product?.name || 'Produit supprimé'}</Text>
                    <Text style={styles.topSold}>{t.sold} vendu{t.sold > 1 ? 's' : ''}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable style={styles.linkCard} onPress={() => navigation.navigate('AdminSearchAnalytics')}>
          <View style={[styles.roleIcon, { backgroundColor: `${colors.secondary}18` }]}>
            <Ionicons name="search-outline" size={18} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkCardTitle}>Mots-clés recherchés sans résultat</Text>
            <Text style={styles.linkCardSubtitle}>Voir ce que les clients cherchent sans rien trouver</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  periodSwitch: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, padding: 3 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  periodBtnActive: { backgroundColor: colors.text },
  periodBtnText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  periodBtnTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  roleIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleValue: { fontSize: 16, fontWeight: '900', color: colors.text },
  roleLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  hintText: { fontSize: 11, fontWeight: '600', color: colors.textFaint, marginTop: -4 },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 16, justifyContent: 'center',
  },
  emptyCardText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  barList: {
    gap: 6, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barDayLabel: { width: 40, fontSize: 10.5, fontWeight: '700', color: colors.textFaint },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { width: 72, textAlign: 'right', fontSize: 10.5, fontWeight: '800', color: colors.text },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  breakdownLabel: { width: 78, fontSize: 12, fontWeight: '700', color: colors.text },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 3 },
  breakdownPct: { width: 36, textAlign: 'right', fontSize: 11, fontWeight: '800', color: colors.textMuted },
  topList: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  topRank: { width: 18, fontSize: 12, fontWeight: '900', color: colors.textFaint, textAlign: 'center' },
  topImage: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.background },
  topImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  topName: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  topSold: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  linkCardTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  linkCardSubtitle: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
});
