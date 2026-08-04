import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getFailedSearches } from '../../services/adminStatsService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function AdminSearchAnalyticsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getFailedSearches(token);
      setSearches(Array.isArray(data) ? data : []);
    } catch {
      setSearches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {searches.length === 0 ? (
        <EmptyState icon="search-outline" title="Aucune recherche sans résultat" subtitle="Tout ce que les clients cherchent est actuellement trouvé." />
      ) : (
        <FlatList
          data={searches}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<Text style={styles.hint}>{searches.length} recherche{searches.length > 1 ? 's' : ''} sans résultat</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="search" size={15} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.query} numberOfLines={1}>"{item.query}"</Text>
                <Text style={styles.meta}>{formatDate(item.created_at || item.createdAt)}</Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{item.results_count ?? 0} résultat{(item.results_count ?? 0) > 1 ? 's' : ''}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hint: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: `${colors.danger}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  query: { fontSize: 13, fontWeight: '800', color: colors.text },
  meta: { fontSize: 10.5, fontWeight: '600', color: colors.textFaint, marginTop: 2 },
  countPill: { backgroundColor: colors.background, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
});
