import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getProducts, getCategories } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import NotificationBell from '../components/NotificationBell';
import { getThumbnail } from '../utils/format';
import { resolveCategoryIcon } from '../utils/categoryIcon';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { isSignedIn, isSupplier, isDelivery, isAdmin } = useAuth();
  const showOpportunities = isSignedIn && !isAdmin && (!isSupplier || !isDelivery);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeParentId, setActiveParentId] = useState(null);
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
      const cats = categoriesRes || [];
      setCategories(cats);
      const firstParent = cats.find((c) => !c.parent_id);
      if (firstParent) setActiveParentId(firstParent.id);
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

  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const activeParent = useMemo(
    () => parentCategories.find((c) => c.id === activeParentId) || parentCategories[0] || null,
    [parentCategories, activeParentId]
  );
  const activeChildren = useMemo(
    () => (activeParent ? categories.filter((c) => c.parent_id === activeParent.id) : []),
    [categories, activeParent]
  );

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

      {parentCategories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Catégories</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.sectionLink}>Voir tout</Text>
            </Pressable>
          </View>

          <FlatList
            data={parentCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
            renderItem={({ item }) => {
              const isActive = activeParent?.id === item.id;
              const { isEmoji, emoji, IconComponent } = resolveCategoryIcon(item.icon, 'LayoutPanelTop');
              return (
                <Pressable
                  style={[styles.parentChip, isActive && styles.parentChipActive]}
                  onPress={() => setActiveParentId(item.id)}
                >
                  {isEmoji ? (
                    <Text style={styles.parentChipEmoji}>{emoji}</Text>
                  ) : (
                    <IconComponent size={24} color={isActive ? '#fff' : colors.primary} strokeWidth={2} />
                  )}
                  <Text style={[styles.parentChipLabel, isActive && styles.parentChipLabelActive]} numberOfLines={1}>{item.name}</Text>
                </Pressable>
              );
            }}
          />

          {activeChildren.length > 0 ? (
            <FlatList
              data={activeChildren}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}
              renderItem={({ item }) => {
                const { isEmoji, emoji, IconComponent } = resolveCategoryIcon(item.icon, 'ArrowRightCircle');
                return (
                  <Pressable
                    style={styles.childCard}
                    onPress={() => navigation.navigate('ProductsList', { categoryId: item.id, title: item.name })}
                  >
                    <View style={styles.childCardIcon}>
                      {isEmoji ? (
                        <Text style={styles.childCardEmoji}>{emoji}</Text>
                      ) : (
                        <IconComponent size={16} color={colors.primary} strokeWidth={2} />
                      )}
                    </View>
                    <Text style={styles.childCardLabel} numberOfLines={1}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
          ) : activeParent && (
            <Pressable
              style={styles.exploreParentBtn}
              onPress={() => navigation.navigate('ProductsList', { categoryId: activeParent.id, title: activeParent.name })}
            >
              <Text style={styles.exploreParentBtnText} numberOfLines={1}>Explorer tout dans {activeParent.name}</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </Pressable>
          )}
        </View>
      )}

      {showOpportunities && (
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <View style={styles.opportunityRow}>
            {!isSupplier && (
              <Pressable
                style={[styles.opportunityCard, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('SupplierRegister')}
              >
                <Ionicons name="storefront" size={22} color="#fff" />
                <Text style={styles.opportunityCardTitle}>Devenir vendeur</Text>
                <Text style={styles.opportunityCardSubtitle}>Ouvrez votre boutique</Text>
              </Pressable>
            )}
            {!isDelivery && (
              <Pressable
                style={[styles.opportunityCard, { backgroundColor: colors.secondary }]}
                onPress={() => navigation.navigate('BecomeDelivery')}
              >
                <Ionicons name="bicycle" size={22} color="#fff" />
                <Text style={styles.opportunityCardTitle}>Devenir livreur</Text>
                <Text style={styles.opportunityCardSubtitle}>Livrez et soyez payé</Text>
              </Pressable>
            )}
          </View>
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
  opportunityRow: { flexDirection: 'row', gap: 10 },
  opportunityCard: { flex: 1, borderRadius: radius.lg, padding: 14, gap: 4 },
  opportunityCardTitle: { color: '#fff', fontSize: 13.5, fontWeight: '900', marginTop: 6 },
  opportunityCardSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontWeight: '700' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  eyebrowText: { fontSize: 10.5, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  blockTitle: { fontSize: 26, fontWeight: '900', color: colors.wine, paddingHorizontal: 16, marginBottom: 14 },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  sectionLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  parentChip: {
    width: 78, minHeight: 84, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 8, gap: 8,
  },
  parentChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  parentChipEmoji: { fontSize: 24 },
  parentChipLabel: { fontSize: 10.5, fontWeight: '800', color: colors.text, textAlign: 'center' },
  parentChipLabelActive: { color: '#fff' },
  childCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, paddingHorizontal: 12, minWidth: 150,
  },
  childCardIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  childCardEmoji: { fontSize: 16 },
  childCardLabel: { fontSize: 12, fontWeight: '700', color: colors.text, flexShrink: 1 },
  exploreParentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46,
    borderRadius: radius.full, backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 12,
  },
  exploreParentBtnText: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  catalogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46,
    borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  catalogBtnText: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
});
