import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import ProductFilterButton from '../components/ProductFilterButton';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function ProductsListScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { categoryId, title } = route.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    navigation.setOptions({ title: title || 'Tous les produits' });
  }, [title, navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const baseFilters = categoryId ? { category_id: categoryId, limit: 60 } : { limit: 60 };
      const data = await getProducts({ ...baseFilters, ...filters });
      setProducts(data.products || data || []);
    } catch (err) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, filters]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {products.length === 0 ? (
        <EmptyState icon="cube-outline" title="Aucun produit trouvé" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 16, paddingBottom: 90 }}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { id: item.id })} />
          )}
        />
      )}
      <ProductFilterButton filters={filters} onApply={setFilters} />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
});
