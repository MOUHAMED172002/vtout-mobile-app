import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllBoutiquesAdmin } from '../../services/adminBoutiqueService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspendue',
};

export default function AdminBoutiquesScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllBoutiquesAdmin(token);
      setBoutiques(Array.isArray(data) ? data : []);
    } catch (err) {
      setBoutiques([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const filteredBoutiques = boutiques.filter((b) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      b.name?.toLowerCase().includes(q) ||
      b.supplier?.name?.toLowerCase().includes(q) ||
      b.commune_label?.toLowerCase().includes(q)
    );
  });

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textFaint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Nom de boutique, vendeur, zone..."
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
        />
      </View>

      {filteredBoutiques.length === 0 ? (
        <EmptyState icon="storefront-outline" title="Aucune boutique" />
      ) : (
        <FlatList
          data={filteredBoutiques}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const productCount = item.supplier?.products?.length ?? 0;
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('BoutiqueStore', { supplierId: item.supplier_id, name: item.name })}
              >
                <View style={styles.icon}>
                  <Ionicons name="storefront" size={20} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{item.supplier?.name || 'Fournisseur inconnu'}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {[item.quartier_label, item.commune_label].filter(Boolean).join(', ') || 'Zone non précisée'}
                    </Text>
                    <View style={[styles.statusBadge, item.status !== 'active' && styles.statusBadgeInactive]}>
                      <Text style={[styles.statusBadgeText, item.status !== 'active' && styles.statusBadgeTextInactive]}>
                        {STATUS_LABELS[item.status] || item.status || 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{productCount}{productCount === 10 ? '+' : ''}</Text>
                  <Text style={styles.countLabel}>produits</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaText: { fontSize: 10, color: colors.textFaint, fontWeight: '600', flexShrink: 1 },
  statusBadge: { backgroundColor: `${colors.success}18`, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeInactive: { backgroundColor: `${colors.danger}18` },
  statusBadgeText: { fontSize: 9, fontWeight: '800', color: colors.success, textTransform: 'uppercase' },
  statusBadgeTextInactive: { color: colors.danger },
  countBadge: { alignItems: 'center' },
  countText: { fontSize: 14, fontWeight: '900', color: colors.primary },
  countLabel: { fontSize: 8, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
});
