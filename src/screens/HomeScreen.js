import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getProducts, getCategories } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import NotificationBell from '../components/NotificationBell';
import { getThumbnail } from '../utils/format';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        getProducts({ limit: 20 }),
        getCategories().catch(() => []),
      ]);
      setProducts(productsRes.products || productsRes || []);
      setCategories((categoriesRes || []).slice(0, 10));
    } catch (err) {
      console.error('HomeScreen load error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const ListHeader = (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🇧🇯 Marketplace N°1 du Bénin</Text>
          </View>
          <NotificationBell dark />
        </View>
        <Text style={styles.heroTitle}>Achetez et faites{'\n'}livrer <Text style={styles.heroTitleAccent}>partout</Text>.</Text>
        <Pressable style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <Text style={styles.searchPlaceholder}>Rechercher un produit...</Text>
        </Pressable>
      </View>

      {categories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Catégories</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.sectionLink}>Voir tout</Text>
            </Pressable>
          </View>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.categoryChip}
                onPress={() => navigation.navigate('ProductsList', { categoryId: item.id, title: item.name })}
              >
                {item.image_url ? (
                  <Image source={{ uri: getThumbnail(item.image_url) }} style={styles.categoryImage} />
                ) : (
                  <View style={[styles.categoryImage, styles.categoryImagePlaceholder]}>
                    <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.categoryLabel} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <View style={[styles.section, { paddingHorizontal: 16 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Notre sélection</Text>
          <Pressable onPress={() => navigation.navigate('ProductsList', {})}>
            <Text style={styles.sectionLink}>Tout le catalogue</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { id: item.id })} />
        )}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    marginBottom: 20,
    gap: 14,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(243,112,33,0.18)', borderWidth: 1, borderColor: 'rgba(243,112,33,0.4)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  heroBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 32 },
  heroTitleAccent: { color: colors.primary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    height: 48, borderRadius: radius.md, paddingHorizontal: 16, marginTop: 4,
  },
  searchPlaceholder: { color: colors.textFaint, fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 20, gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  sectionLink: { fontSize: 12, fontWeight: '800', color: colors.primary },
  categoryChip: { alignItems: 'center', width: 72, gap: 6 },
  categoryImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9' },
  categoryImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
