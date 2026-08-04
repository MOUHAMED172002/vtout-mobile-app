import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getProductById, getRelatedProducts } from '../services/productService';
import { checkFavorite, addFavorite, removeFavorite } from '../services/favoriteService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice, getOptimizedImage, getProductDisplayPrice, isProductOutOfStock } from '../utils/format';
import Button from '../components/Button';
import Loading from '../components/Loading';
import ProductCard from '../components/ProductCard';

const { width } = Dimensions.get('window');

function parseVariants(product) {
  return (product?.variants || []).map((v) => ({
    ...v,
    combination: typeof v.combination === 'string' ? JSON.parse(v.combination) : v.combination || {},
  }));
}

function getAttributeKeys(variants) {
  const keys = new Set();
  variants.forEach((v) => Object.keys(v.combination || {}).forEach((k) => keys.add(k)));
  return Array.from(keys);
}

function uniqueAttributeValues(variants, attr) {
  const s = new Set();
  variants.forEach((v) => { if (v.combination?.[attr] != null) s.add(String(v.combination[attr])); });
  return Array.from(s);
}

export default function ProductDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { id } = route.params;
  const { isSignedIn, getToken } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProductById(id)
      .then((data) => {
        setProduct(data);
        setActiveImage(0);
        setSelectedAttributes({});
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
    getRelatedProducts(id).then((data) => setRelated(data || [])).catch(() => setRelated([]));
  }, [id]);

  useEffect(() => {
    if (!product?.id || !isSignedIn) { setIsFav(false); return; }
    getToken().then((token) => checkFavorite(product.id, token).then(setIsFav).catch(() => {}));
  }, [product?.id, isSignedIn, getToken]);

  const variants = useMemo(() => parseVariants(product), [product]);
  const images = useMemo(() => {
    const base = (product?.images || []).map((img) => img.image_url);
    if (base.length === 0 && product?.image_url) base.push(product.image_url);
    return base;
  }, [product]);

  const matchedVariant = useMemo(() => {
    if (!variants.length || !Object.keys(selectedAttributes).length) return null;
    return variants.find((v) => Object.entries(selectedAttributes).every(([k, val]) => String(v.combination?.[k]) === String(val))) || null;
  }, [variants, selectedAttributes]);

  const { currentPrice, basePrice, isSale, discountPercent } = useMemo(
    () => getProductDisplayPrice(product),
    [product]
  );

  const displayPrice = matchedVariant?.priceRows?.[0]?.price ?? currentPrice;
  const outOfStock = variants.length > 0
    ? (matchedVariant ? (matchedVariant.priceRows?.[0]?.stock || 0) <= 0 : false)
    : isProductOutOfStock(product);

  const toggleFavorite = async () => {
    if (!isSignedIn) {
      navigation.navigate('Login');
      return;
    }
    const next = !isFav;
    setIsFav(next);
    try {
      const token = await getToken();
      if (next) await addFavorite(product.id, token);
      else await removeFavorite(product.id, token);
    } catch {
      setIsFav((s) => !s);
    }
  };

  const requireVariantChoice = () => {
    if (variants.length === 0) return false;
    const keys = getAttributeKeys(variants);
    return keys.some((k) => !selectedAttributes[k]);
  };

  const handleAddToCart = useCallback(async () => {
    if (requireVariantChoice()) {
      Alert.alert('Choisissez vos options', 'Merci de sélectionner toutes les options du produit.');
      return;
    }
    setAddingToCart(true);
    try {
      await addToCart({
        id: product.id,
        product_id: product.id,
        variant_id: matchedVariant?.id || null,
        name: product.name,
        price: displayPrice,
        price_snapshot: displayPrice,
        image_url: matchedVariant?.priceRows?.[0]?.image_url || images[0],
        selected_attributes: matchedVariant?.combination || undefined,
      }, 1);
      Alert.alert('Ajouté', 'Le produit a été ajouté à votre panier.');
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ajouter ce produit au panier.");
    } finally {
      setAddingToCart(false);
    }
  }, [product, matchedVariant, displayPrice, images, addToCart, selectedAttributes]);

  const handleBuyNow = () => {
    if (requireVariantChoice()) {
      Alert.alert('Choisissez vos options', 'Merci de sélectionner toutes les options du produit.');
      return;
    }
    navigation.navigate('Checkout', {
      items: [{
        id: product.id,
        product_id: product.id,
        variant_id: matchedVariant?.id || null,
        name: product.name,
        price: displayPrice,
        price_snapshot: displayPrice,
        quantity: 1,
        image_url: matchedVariant?.priceRows?.[0]?.image_url || images[0],
        boutique_id: product.boutique_id,
        boutique: product.boutique,
        free_delivery_communes: product.free_delivery_communes,
        selected_attributes: matchedVariant?.combination || undefined,
      }],
      total: Number(displayPrice),
    });
  };

  if (loading) return <Loading />;
  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Produit introuvable.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.imageWrap}>
          {images.length > 0 ? (
            <Image source={{ uri: getOptimizedImage(images[activeImage], 800) }} style={styles.mainImage} contentFit="contain" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={48} color={colors.textFaint} />
            </View>
          )}
          <Pressable style={styles.favButton} onPress={toggleFavorite}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? colors.danger : colors.text} />
          </Pressable>
          {isSale && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPercent}%</Text>
            </View>
          )}
        </View>

        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
            {images.map((img, idx) => (
              <Pressable key={idx} onPress={() => setActiveImage(idx)} style={[styles.thumb, activeImage === idx && styles.thumbActive]}>
                <Image source={{ uri: getOptimizedImage(img, 150) }} style={styles.thumbImage} contentFit="contain" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.content}>
          {product.category?.name && <Text style={styles.category}>{product.category.name}</Text>}
          <Text style={styles.name}>{product.name}</Text>

          {product.review_count > 0 && (
            <Pressable style={styles.ratingRow} onPress={() => navigation.navigate('ProductReviews', { productId: product.id })}>
              <Ionicons name="star" size={13} color={colors.primary} />
              <Text style={styles.ratingText}>{Number(product.average_rating).toFixed(1)} · {product.review_count} avis</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.textFaint} />
            </Pressable>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(displayPrice)} <Text style={styles.priceCurrency}>FCFA</Text></Text>
            {isSale && <Text style={styles.oldPrice}>{formatPrice(basePrice)} F</Text>}
          </View>

          {product.free_delivery_communes?.length > 0 && (
            <View style={styles.freeDeliveryBox}>
              <Ionicons name="car-outline" size={14} color={colors.success} />
              <Text style={styles.freeDeliveryText}>
                Livraison gratuite : {product.free_delivery_communes.join(', ')}
              </Text>
            </View>
          )}

          {product.supplier_id && (
            <Pressable
              style={styles.boutiqueRow}
              onPress={() => navigation.navigate('BoutiqueStore', { supplierId: product.supplier_id, name: product.boutique?.name })}
            >
              <View style={styles.boutiqueIcon}>
                <Ionicons name="storefront" size={16} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.boutiqueLabel}>Vendu par</Text>
                <Text style={styles.boutiqueName} numberOfLines={1}>{product.boutique?.name || 'Cette boutique'}</Text>
              </View>
              <Text style={styles.boutiqueLink}>Voir la boutique</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          )}

          {variants.length > 0 && getAttributeKeys(variants).map((key) => (
            <View key={key} style={styles.attrGroup}>
              <Text style={styles.attrLabel}>{key}</Text>
              <View style={styles.attrOptions}>
                {uniqueAttributeValues(variants, key).map((val) => {
                  const active = selectedAttributes[key] === val;
                  return (
                    <Pressable
                      key={val}
                      style={[styles.attrChip, active && styles.attrChipActive]}
                      onPress={() => setSelectedAttributes((prev) => ({ ...prev, [key]: val }))}
                    >
                      <Text style={[styles.attrChipText, active && styles.attrChipTextActive]}>{val}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {outOfStock && (
            <View style={styles.outOfStockBanner}>
              <Text style={styles.outOfStockBannerText}>Rupture de stock</Text>
            </View>
          )}

          {product.description ? (
            <View style={styles.descriptionBlock}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {related.length > 0 && (
            <View style={styles.relatedBlock}>
              <Text style={styles.sectionTitle}>Produits similaires</Text>
              <View style={styles.relatedGrid}>
                {related.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} onPress={() => navigation.push('ProductDetail', { id: p.id })} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.addToCartBtn} onPress={handleAddToCart} disabled={outOfStock || addingToCart}>
          {addingToCart ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="cart-outline" size={20} color={outOfStock ? colors.textFaint : colors.primary} />}
        </Pressable>
        <Button
          title={outOfStock ? 'Indisponible' : 'Acheter maintenant'}
          onPress={handleBuyNow}
          disabled={outOfStock}
          style={{ flex: 1 }}
          icon={<Ionicons name="flash" size={16} color="#fff" />}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { textAlign: 'center', marginTop: 40, color: colors.textMuted, fontWeight: '700' },
  imageWrap: { width, aspectRatio: 1, backgroundColor: '#f1f5f9', position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  favButton: {
    position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  discountBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  discountText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  thumbRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, overflow: 'hidden' },
  thumbActive: { borderColor: colors.primary },
  thumbImage: { width: '100%', height: '100%' },
  content: { paddingHorizontal: 16, gap: 12 },
  category: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 20, fontWeight: '900', color: colors.text, lineHeight: 26 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  price: { fontSize: 26, fontWeight: '900', color: colors.text },
  priceCurrency: { fontSize: 13, color: colors.primary, fontWeight: '800' },
  oldPrice: { fontSize: 14, color: colors.textFaint, textDecorationLine: 'line-through', fontWeight: '700' },
  freeDeliveryBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfdf5', padding: 10, borderRadius: radius.sm },
  freeDeliveryText: { fontSize: 11, fontWeight: '800', color: colors.success, flexShrink: 1 },
  boutiqueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12,
  },
  boutiqueIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  boutiqueLabel: { fontSize: 9, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  boutiqueName: { fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 1 },
  boutiqueLink: { fontSize: 10, fontWeight: '800', color: colors.secondary, textTransform: 'uppercase' },
  attrGroup: { gap: 8 },
  attrLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  attrOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attrChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border },
  attrChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(243,112,33,0.08)' },
  attrChipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  attrChipTextActive: { color: colors.primary },
  outOfStockBanner: { backgroundColor: '#fef2f2', padding: 10, borderRadius: radius.sm, alignItems: 'center' },
  outOfStockBannerText: { color: colors.danger, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  descriptionBlock: { gap: 6, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  description: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  relatedBlock: { gap: 10, marginTop: 12 },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  footer: {
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 24,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  addToCartBtn: {
    width: 52, height: 52, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
