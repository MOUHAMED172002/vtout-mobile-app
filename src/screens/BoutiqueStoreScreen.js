import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import ProductFilterButton from '../components/ProductFilterButton';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

const activeFilterCount = (f) => Object.entries(f || {}).filter(([k, v]) => v !== undefined && v !== '' && v !== null && k !== 'sort').length;

export default function BoutiqueStoreScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { supplierId, name } = route.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const filterRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: name || 'Boutique' });
  }, [name, navigation]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    if (!supplierId) return;
    setLoading(true);
    const params = { supplier_id: supplierId, limit: 100, ...filters };
    if (debouncedSearch) params.search = debouncedSearch;
    getProducts(params)
      .then((data) => setProducts(data.products || data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [supplierId, filters, debouncedSearch]);

  const activeCount = activeFilterCount(filters);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.textFaint} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher dans cette boutique..."
            placeholderTextColor={colors.textFaint}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.filterBtn} onPress={() => filterRef.current?.open()}>
          <Ionicons name="options-outline" size={19} color={colors.text} />
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState icon="cube-outline" title="Aucun produit trouvé" subtitle={debouncedSearch || activeCount > 0 ? 'Essayez de modifier votre recherche ou vos filtres.' : 'Cette boutique n\'a pas encore de produit.'} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={styles.countRow}>
              <Text style={styles.count}>{products.length} produit{products.length > 1 ? 's' : ''}</Text>
              {products[0]?.supplier?.is_certified && (
                <View style={styles.certifiedPill}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.secondary} />
                  <Text style={styles.certifiedPillText}>Vendeur certifié</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.push('ProductDetail', { id: item.id })} />
          )}
        />
      )}

      <ProductFilterButton ref={filterRef} filters={filters} onApply={setFilters} hideTrigger />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', height: 46, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  filterBtn: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 9.5, fontWeight: '900', color: '#fff' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  count: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  certifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.secondary}1a`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  certifiedPillText: { fontSize: 9, fontWeight: '900', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.3 },
});
