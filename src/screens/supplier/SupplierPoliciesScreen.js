import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { getPoliciesByType } from '../../services/contentService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function SupplierPoliciesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getPoliciesByType('supplier');
      setPolicies(data);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View>
          <Text style={styles.title}>Conditions & politiques</Text>
          <Text style={styles.subtitle}>Règlements officiels pour les marchands Vtout</Text>
        </View>

        {policies.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" title="Aucun document publié" subtitle="Aucune politique n'a encore été publiée pour les marchands." />
        ) : (
          policies.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.secondary} />
                </View>
                <Text style={styles.cardTitle}>{p.title}</Text>
              </View>
              <Text style={styles.cardContent}>{p.content}</Text>
              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time-outline" size={12} color={colors.textFaint} />
                  <Text style={styles.cardMeta}>Mis à jour le {new Date(p.updatedAt || p.updated_at).toLocaleDateString('fr-FR')}</Text>
                </View>
                <Text style={styles.cardBadge}>Document officiel</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: `${colors.secondary}18`, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: colors.text, flex: 1 },
  cardContent: { fontSize: 13, color: colors.textMuted, fontWeight: '500', lineHeight: 19 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  cardMeta: { fontSize: 10, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase' },
  cardBadge: { fontSize: 9.5, fontWeight: '800', color: colors.secondary, textTransform: 'uppercase' },
});
