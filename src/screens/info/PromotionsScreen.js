import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { getProducts } from '../../services/productService';
import ProductCard from '../../components/ProductCard';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const TABS = [
  { key: 'flash', label: 'Ventes flash', filter: { isFlashSale: 'true' } },
  { key: 'reductions', label: 'Réductions', filter: { isPromo: 'true' } },
  { key: 'volume', label: 'Achat groupé', filter: { hasVolumePricing: 'true' } },
];

export default function PromotionsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState('flash');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((key) => {
    setLoading(true);
    const activeTab = TABS.find((t) => t.key === key) || TABS[0];
    getProducts({ ...activeTab.filter, limit: 30 })
      .then((data) => setProducts(data.products || data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <Loading fullScreen={false} />
      ) : products.length === 0 ? (
        <EmptyState icon="flash-outline" title="Aucune offre pour le moment" subtitle="Revenez bientôt pour de nouvelles promotions." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 16 }}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { id: item.id })} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 4 },
  tab: { flex: 1, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textAlign: 'center' },
  tabTextActive: { color: '#fff' },
});
