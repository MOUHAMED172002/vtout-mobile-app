import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getDeliveryStatsAdmin } from '../../services/adminLogisticsService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

// Tour de contrôle logistique : vue d'ensemble en lecture seule.
// L'API /delivery/admin/stats ne renvoie que deux agrégats — les créances
// de cash non versées (debts) et les livraisons déjà effectuées aujourd'hui
// (dailyDeliveries), groupées par livreur. Elle n'expose aucun flux de
// commandes "en cours de livraison" en temps réel : on l'indique
// explicitement plutôt que d'inventer une donnée absente.

function StatCard({ label, value, icon, color }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function AdminControlTowerScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const stats = await getDeliveryStatsAdmin(token);
      setData(stats);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  const debts = data?.debts || [];
  const dailyDeliveries = data?.dailyDeliveries || [];
  const totalDebt = debts.reduce((sum, d) => sum + Number(d.total_debt || 0), 0);
  const deliveredToday = dailyDeliveries.reduce((sum, d) => sum + Number(d.count || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.statsGrid}>
          <StatCard label="Livreurs endettés" value={String(debts.length)} icon="alert-circle" color={colors.danger} />
          <StatCard label="Créances totales" value={`${formatPrice(totalDebt)} F`} icon="cash" color={colors.warning} />
          <StatCard label="Livrées aujourd'hui" value={String(deliveredToday)} icon="checkmark-done-circle" color={colors.success} />
          <StatCard label="Livreurs actifs (jour)" value={String(dailyDeliveries.length)} icon="bicycle" color={colors.primary} />
        </View>

        {debts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Créances par livreur</Text>
            <View style={{ gap: 8 }}>
              {debts.map((d) => (
                <View key={d.delivery_person_id} style={styles.row}>
                  <Text style={styles.rowName} numberOfLines={1}>{d.deliveryPerson?.profile?.fullname || 'Livreur'}</Text>
                  <Text style={styles.rowValue}>{formatPrice(d.total_debt)} F</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Livraisons en cours</Text>
          <EmptyState
            icon="navigate-outline"
            title="Suivi temps réel indisponible"
            subtitle="L'API de statistiques ne renvoie pas encore de flux de commandes en cours de livraison. Consultez Commandes pour le détail des courses actives."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  rowName: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.text },
  rowValue: { fontSize: 13, fontWeight: '900', color: colors.text },
});
