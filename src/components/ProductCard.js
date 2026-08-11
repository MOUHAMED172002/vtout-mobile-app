import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { checkFavorite, addFavorite, removeFavorite } from '../services/favoriteService';
import { formatPrice, getOptimizedImage, getProductDisplayPrice, isProductOutOfStock } from '../utils/format';
import VerifiedSellerBadge from './VerifiedSellerBadge';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 16 * 2 - 12) / 2;
const CYCLE_INTERVAL = 1200;

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

export default function ProductCard({ product, onPress }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const { isSignedIn, getToken } = useAuth();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!product?.id || !isSignedIn) { setIsFav(false); return; }
    getToken().then((token) => checkFavorite(product.id, token).then(setIsFav).catch(() => {}));
  }, [product?.id, isSignedIn, getToken]);

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
  const { currentPrice, basePrice, isSale, discountPercent } = useMemo(
    () => getProductDisplayPrice(product),
    [product]
  );
  const outOfStock = isProductOutOfStock(product);

  // Web utilise des images 600px pour les cartes (ProductsCard.jsx) — même
  // résolution ici pour un rendu identique.
  const images = useMemo(() => {
    const list = (product?.images || []).map((img) => getOptimizedImage(img.image_url, 600)).filter(Boolean);
    if (list.length === 0) {
      const fallback = getOptimizedImage(product?.image_url, 600);
      return fallback ? [fallback] : [];
    }
    return list;
  }, [product]);

  const [imgIndex, setImgIndex] = useState(0);
  // Comme sur le web (survol souris, ou appui maintenu sur tactile via
  // onTouchStart/onTouchEnd) : le défilement des photos ne tourne que
  // pendant que la carte est pressée, pas en continu.
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused || images.length <= 1) return;
    const interval = setInterval(() => {
      setImgIndex((i) => (i + 1) % images.length);
    }, CYCLE_INTERVAL);
    return () => clearInterval(interval);
  }, [focused, images.length]);

  useEffect(() => {
    if (!focused) setImgIndex(0);
  }, [focused]);

  const salesCount = Number(product?.total_sold || 0);
  const isPopular = salesCount >= 100;

  const variants = useMemo(() => parseVariants(product), [product]);
  const [showAttrModal, setShowAttrModal] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({});

  // Toutes les options de variante (couleur, taille, ...) doivent être
  // choisies avant qu'on considère qu'une variante précise est
  // "sélectionnée" — une sélection partielle ne doit jamais matcher
  // silencieusement la première variante trouvée pour l'attribut déjà choisi.
  const variantAttributeKeys = useMemo(() => getAttributeKeys(variants), [variants]);
  const allVariantAttributesSelected = useMemo(
    () => variantAttributeKeys.length > 0 && variantAttributeKeys.every((k) => selectedAttributes[k] != null),
    [variantAttributeKeys, selectedAttributes]
  );

  const matchedVariant = useMemo(() => {
    if (!variants.length || !allVariantAttributesSelected) return null;
    return variants.find((v) => variantAttributeKeys.every((k) => String(v.combination?.[k]) === String(selectedAttributes[k]))) || null;
  }, [variants, selectedAttributes, allVariantAttributesSelected, variantAttributeKeys]);
  const matchedVariantStock = matchedVariant?.priceRows?.[0]?.available_stock ?? matchedVariant?.priceRows?.[0]?.stock;
  const matchedVariantOutOfStock = matchedVariant != null && (matchedVariantStock ?? 0) <= 0;

  const goToDetail = () => (onPress ? onPress() : navigation.navigate('ProductDetail', { id: product.id }));

  const proceedToCheckout = (variant = null) => {
    const finalPrice = variant ? Number(variant.priceRows?.[0]?.price || currentPrice) : currentPrice;
    const finalImage = variant?.priceRows?.[0]?.image_url || images[0];
    navigation.navigate('Checkout', {
      items: [{
        id: product.id,
        product_id: product.id,
        variant_id: variant?.id || null,
        name: product.name,
        price: finalPrice,
        price_snapshot: finalPrice,
        quantity: 1,
        image_url: finalImage,
        boutique_id: product.boutique_id,
        boutique: product.boutique,
        free_delivery_communes: product.free_delivery_communes,
        selected_attributes: variant?.combination || undefined,
      }],
      total: Number(finalPrice),
    });
  };

  const handleBuyNow = () => {
    if (variants.length > 0) {
      setSelectedAttributes({});
      setShowAttrModal(true);
      return;
    }
    proceedToCheckout();
  };

  const handleConfirmVariantAndCheckout = () => {
    if (!matchedVariant || matchedVariantOutOfStock) return;
    setShowAttrModal(false);
    proceedToCheckout(matchedVariant);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={goToDetail}
        onPressIn={() => setFocused(true)}
        onPressOut={() => setFocused(false)}
      >
        <View style={styles.imageWrap}>
          {images.length > 0 ? (
            <>
              {/* Fond flouté : comble les bords blancs autour de l'image
                  "contain", comme le fond flouté du web. */}
              <Image
                source={{ uri: images[imgIndex] }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={25}
              />
              <View style={styles.blurDarken} />
              <Image source={{ uri: images[imgIndex] }} style={styles.image} contentFit="contain" transition={200} />
            </>
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={28} color={colors.textFaint} />
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.dotsRow}>
              {images.map((_, idx) => (
                <View key={idx} style={[styles.dot, idx === imgIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          <View style={styles.topBadges}>
            {isSale && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discountPercent}%</Text>
              </View>
            )}
          </View>

          <Pressable style={styles.favBtn} onPress={toggleFavorite}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={15} color={isFav ? colors.danger : colors.text} />
          </Pressable>
        </View>

        <View style={styles.info}>
          {product?.review_count > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={10} color={colors.primary} />
              <Text style={styles.ratingText}>{Number(product.average_rating).toFixed(1)}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={2}>{product?.name}</Text>
          {/* Vendeur vérifié — sa propre ligne, juste sous le nom (voir
              frontend/src/component/Products/ProductsCard.jsx) */}
          {product?.supplier?.is_certified && (
            <VerifiedSellerBadge variant="chip" size={10} />
          )}
          {product?.free_delivery_communes?.length > 0 && (
            <View style={styles.deliveryRow}>
              <Ionicons name="location" size={9} color={colors.success} />
              <Text style={styles.deliveryText} numberOfLines={1}>
                Livraison gratuite · {product.free_delivery_communes.join(' · ')}
              </Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(currentPrice)} <Text style={styles.priceCurrency}>F</Text></Text>
            {isSale && <Text style={styles.oldPrice}>{formatPrice(basePrice)} F</Text>}
          </View>

          <View style={styles.salesRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.salesTextRow}>
                <Ionicons name="flash" size={9} color={colors.primary} />
                <Text style={styles.salesText}>{salesCount} vendu{salesCount > 1 ? 's' : ''}</Text>
                {isPopular && <Text style={styles.popularText}>Populaire</Text>}
              </View>
              <View style={styles.salesBarTrack}>
                {isPopular && <View style={[styles.salesBarFill, { width: `${Math.min((salesCount / 100) * 100, 100)}%` }]} />}
              </View>
            </View>

            {/* Bouton d'achat rapide — comme la version mobile du web
                (petite icône éclair à côté de la barre de ventes), pas de
                bouton "Œil" (inatteignable au tactile sur le web aussi). */}
            {!outOfStock && (
              <Pressable style={styles.quickBuyBtn} onPress={handleBuyNow}>
                <Ionicons name="flash" size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>

      <Modal visible={showAttrModal} transparent animationType="fade" onRequestClose={() => setShowAttrModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAttrModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              {images[0] ? <Image source={{ uri: images[0] }} style={styles.modalImage} contentFit="contain" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.modalProductName} numberOfLines={1}>{product?.name}</Text>
                <Text style={styles.modalPrice}>
                  {formatPrice(matchedVariant?.priceRows?.[0]?.price ?? currentPrice)} FCFA
                </Text>
              </View>
              <Pressable onPress={() => setShowAttrModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={16} color={colors.text} />
              </Pressable>
            </View>

            <View style={{ gap: 16 }}>
              {getAttributeKeys(variants).map((key) => (
                <View key={key} style={{ gap: 8 }}>
                  <Text style={styles.modalAttrLabel}>{key}</Text>
                  <View style={styles.modalAttrOptions}>
                    {uniqueAttributeValues(variants, key).map((val) => {
                      const active = selectedAttributes[key] === val;
                      return (
                        <Pressable
                          key={val}
                          style={[styles.modalAttrChip, active && styles.modalAttrChipActive]}
                          onPress={() => setSelectedAttributes((prev) => ({ ...prev, [key]: val }))}
                        >
                          <Text style={[styles.modalAttrChipText, active && styles.modalAttrChipTextActive]}>{val}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            {matchedVariant && matchedVariantOutOfStock && (
              <Text style={styles.modalWarning}>Cette variante est en rupture de stock</Text>
            )}
            {!allVariantAttributesSelected && Object.keys(selectedAttributes).length > 0 && (
              <Text style={styles.modalWarning}>
                Choisissez {variantAttributeKeys.filter((k) => selectedAttributes[k] == null).join(' et ')} pour continuer
              </Text>
            )}
            {allVariantAttributesSelected && !matchedVariant && (
              <Text style={styles.modalWarning}>Cette combinaison n'est pas disponible</Text>
            )}

            <Pressable
              style={[styles.modalConfirm, (!matchedVariant || matchedVariantOutOfStock) && styles.modalConfirmDisabled]}
              disabled={!matchedVariant || matchedVariantOutOfStock}
              onPress={handleConfirmVariantAndCheckout}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.modalConfirmText}>Commander maintenant</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  blurDarken: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 4, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { width: 12, backgroundColor: '#fff' },
  topBadges: { position: 'absolute', top: 8, left: 8, gap: 4 },
  discountBadge: {
    backgroundColor: 'rgba(234,88,12,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  favBtn: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  quickBuyBtn: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: `${colors.primary}18`,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  info: { padding: 10, gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  name: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 17, minHeight: 34 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deliveryText: { fontSize: 9, fontWeight: '800', color: colors.success, textTransform: 'uppercase' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '900', color: colors.text },
  priceCurrency: { fontSize: 10, color: colors.primary, fontWeight: '900' },
  oldPrice: { fontSize: 10, color: colors.textFaint, textDecorationLine: 'line-through', fontWeight: '700' },
  salesRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  salesTextRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  salesText: { fontSize: 9, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  popularText: { fontSize: 9, fontWeight: '800', color: colors.secondary, textTransform: 'uppercase' },
  salesBarTrack: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden', marginTop: 3 },
  salesBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 32, gap: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalImage: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: '#f1f5f9' },
  modalProductName: { fontSize: 14, fontWeight: '800', color: colors.text },
  modalPrice: { fontSize: 15, fontWeight: '900', color: colors.primary, marginTop: 2 },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalAttrLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  modalAttrOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalAttrChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border },
  modalAttrChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(243,112,33,0.08)' },
  modalAttrChipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  modalAttrChipTextActive: { color: colors.primary },
  modalWarning: { fontSize: 11, fontWeight: '700', color: colors.danger, textAlign: 'center' },
  modalConfirm: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

export { CARD_WIDTH };
