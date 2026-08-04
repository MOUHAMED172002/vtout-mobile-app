import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [promoProducts, setPromoProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [productsRes, categoriesRes, promoRes] = await Promise.all([
        getProducts({ limit: 20 }),
        getCategories().catch(() => []),
        getProducts({ isAnyPromo: 'true', limit: 2 }).catch(() => []),
      ]);
      setProducts(productsRes.products || productsRes || []);
      setCategories((categoriesRes || []).slice(0, 10));
      setPromoProducts(promoRes.products || promoRes || []);
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
      <View style={styles.topBar}>
        <Text style={styles.logoText}>V<Text style={styles.logoTextAccent}>TOUT</Text><Text style={styles.logoTextDim}>.com</Text></Text>
        <NotificationBell />
      </View>

      <Pressable style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <Text style={styles.searchPlaceholder}>Rechercher un produit, une catégorie...</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Promotions')}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.promoHero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoHeroTitle}>Promos exclusives</Text>
            <Text style={styles.promoHeroSubtitle}>Jusqu'à -50%</Text>
            <View style={styles.promoHeroBtn}>
              <Text style={styles.promoHeroBtnText}>Découvrir</Text>
            </View>
          </View>
          {promoProducts.length > 0 && (
            <View style={styles.promoHeroImages}>
              {promoProducts.slice(0, 2).map((p, idx) => {
                const uri = getThumbnail(p.images?.[0]?.image_url || p.image_url);
                if (!uri) return null;
                return (
                  <Image
                    key={p.id}
                    source={{ uri }}
                    style={[styles.promoHeroImage, idx === 1 && styles.promoHeroImageBack]}
                  />
                );
              })}
            </View>
          )}
        </LinearGradient>
      </Pressable>

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
        <View style={styles.eyebrowRow}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={styles.eyebrowText}>Notre sélection</Text>
        </View>
        <Text style={styles.blockTitle}>Produits récents</Text>
        <Pressable style={styles.catalogBtn} onPress={() => navigation.navigate('ProductsList', {})}>
          <Text style={styles.catalogBtnText}>Voir tout le catalogue</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        </Pressable>
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
  safe: { flex: 1, backgroundColor: colors.blush },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
  },
  logoText: { fontSize: 22, fontWeight: '900', color: colors.text },
  logoTextAccent: { color: colors.primary },
  logoTextDim: { fontSize: 14, fontWeight: '700', color: colors.textFaint },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    height: 48, borderRadius: radius.md, paddingHorizontal: 16, marginHorizontal: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  searchPlaceholder: { color: colors.textFaint, fontSize: 13, fontWeight: '600' },
  promoHero: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl,
    paddingVertical: 22, paddingHorizontal: 22, marginHorizontal: 16, marginBottom: 24,
    minHeight: 140, overflow: 'hidden',
  },
  promoHeroTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  promoHeroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700', marginTop: 4 },
  promoHeroBtn: {
    alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: radius.full,
    paddingHorizontal: 18, paddingVertical: 10, marginTop: 14,
  },
  promoHeroBtnText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  promoHeroImages: { width: 96, height: 96, position: 'relative' },
  promoHeroImage: {
    width: 84, height: 84, borderRadius: radius.lg, backgroundColor: '#fff',
    position: 'absolute', right: 0, top: 6,
  },
  promoHeroImageBack: { right: 20, top: -10, opacity: 0.85 },
  section: { marginBottom: 24, gap: 4 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  eyebrowText: { fontSize: 10.5, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  blockTitle: { fontSize: 26, fontWeight: '900', color: colors.wine, paddingHorizontal: 16, marginBottom: 14 },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  sectionLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  categoryChip: { alignItems: 'center', width: 72, gap: 6 },
  categoryImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9' },
  categoryImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
  catalogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46,
    borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  catalogBtnText: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
});
