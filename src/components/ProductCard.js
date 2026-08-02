import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { formatPrice, getThumbnail, getProductDisplayPrice, isProductOutOfStock } from '../utils/format';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 16 * 2 - 12) / 2;

export default function ProductCard({ product, onPress }) {
  const { currentPrice, basePrice, isSale, discountPercent } = useMemo(
    () => getProductDisplayPrice(product),
    [product]
  );
  const outOfStock = isProductOutOfStock(product);
  const imageUrl = getThumbnail(product?.images?.[0]?.image_url || product?.image_url);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" transition={150} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color={colors.textFaint} />
          </View>
        )}
        {isSale && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}
        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Rupture de stock</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        {product?.review_count > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={10} color={colors.primary} />
            <Text style={styles.ratingText}>{Number(product.average_rating).toFixed(1)}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={2}>{product?.name}</Text>
        {product?.free_delivery_communes?.length > 0 && (
          <View style={styles.deliveryRow}>
            <Ionicons name="location" size={9} color={colors.success} />
            <Text style={styles.deliveryText} numberOfLines={1}>Livraison gratuite</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(currentPrice)} <Text style={styles.priceCurrency}>F</Text></Text>
          {isSale && <Text style={styles.oldPrice}>{formatPrice(basePrice)} F</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(234,88,12,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  outOfStockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
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
});

export { CARD_WIDTH };
