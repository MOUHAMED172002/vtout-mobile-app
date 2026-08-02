import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import ProductFilterButton from '../components/ProductFilterButton';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function BoutiqueStoreScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { supplierId, name } = route.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    navigation.setOptions({ title: name || 'Boutique' });
  }, [name, navigation]);

  useEffect(() => {
    if (!supplierId) return;
    setLoading(true);
    getProducts({ supplier_id: supplierId, limit: 100, ...filters })
      .then((data) => setProducts(data.products || data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [supplierId, filters]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {products.length === 0 ? (
        <EmptyState icon="cube-outline" title="Aucun produit dans cette boutique" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 16, paddingBottom: 90 }}
          ListHeaderComponent={
            <Text style={styles.count}>{products.length} produit{products.length > 1 ? 's' : ''}</Text>
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.push('ProductDetail', { id: item.id })} />
          )}
        />
      )}
      <ProductFilterButton filters={filters} onApply={setFilters} />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  count: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 4 },
});
