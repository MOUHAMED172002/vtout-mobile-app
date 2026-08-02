import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { getBoutiques } from '../services/boutiqueService';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function BoutiquesScreen({ navigation }) {
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback((query) => {
    setLoading(true);
    getBoutiques(query ? { search: query } : {})
      .then(setBoutiques)
      .catch(() => setBoutiques([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => load(search.trim()), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.header}>Boutiques</Text>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une boutique..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <Loading fullScreen={false} />
      ) : boutiques.length === 0 ? (
        <EmptyState icon="storefront-outline" title="Aucune boutique trouvée" subtitle="Essayez une autre recherche." />
      ) : (
        <FlatList
          data={boutiques}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('BoutiqueStore', { supplierId: item.supplier_id, name: item.name })}
            >
              <View style={styles.icon}>
                <Ionicons name="storefront" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {[item.quartier_label, item.commune_label].filter(Boolean).join(', ') || 'Zone non précisée'}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.product_count ?? 0}</Text>
                <Text style={styles.countLabel}>produits</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 24, fontWeight: '900', color: colors.text, paddingHorizontal: 16, paddingTop: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    height: 48, borderRadius: radius.md, paddingHorizontal: 16, marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  countBadge: { alignItems: 'center' },
  countText: { fontSize: 14, fontWeight: '900', color: colors.primary },
  countLabel: { fontSize: 8, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
});
