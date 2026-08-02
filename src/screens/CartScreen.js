import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, getThumbnail } from '../utils/format';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';

export default function CartScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { cart, loading, updateQuantity, removeFromCart } = useCart();
  const { isSignedIn } = useAuth();

  const total = cart.reduce((sum, item) => sum + Number(item.price_snapshot || item.price || 0) * (item.quantity || 1), 0);

  const handleCheckout = () => {
    navigation.navigate('Checkout', {
      items: cart.map((it) => ({
        id: it.product_id || it.id,
        product_id: it.product_id || it.id,
        variant_id: it.variant_id || null,
        name: it.name || it.product?.name,
        price: it.price_snapshot || it.price,
        price_snapshot: it.price_snapshot || it.price,
        quantity: it.quantity || 1,
        image_url: it.image_url || it.product?.image_url,
        boutique_id: it.product?.boutique_id || it.boutique_id,
        boutique: it.product?.boutique || it.boutique,
        free_delivery_communes: it.product?.free_delivery_communes || it.free_delivery_communes,
      })),
      total,
    });
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.header}>Mon panier</Text>

      {cart.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="Votre panier est vide"
          subtitle="Ajoutez des produits pour commencer vos achats."
          action={
            <Button title="Découvrir la boutique" onPress={() => navigation.navigate('Tabs', { screen: 'Accueil' })} style={{ marginTop: 16, paddingHorizontal: 32 }} />
          }
        />
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => {
              const imageUrl = getThumbnail(item.image_url || item.product?.image_url);
              const price = Number(item.price_snapshot || item.price || 0);
              return (
                <View style={styles.itemRow}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="contain" />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <Ionicons name="image-outline" size={20} color={colors.textFaint} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name || item.product?.name}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(price)} F</Text>
                    <View style={styles.qtyRow}>
                      <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.id, (item.quantity || 1) - 1)}>
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </Pressable>
                      <Text style={styles.qtyText}>{item.quantity || 1}</Text>
                      <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.id, (item.quantity || 1) + 1)}>
                        <Ionicons name="add" size={14} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>
                  <Pressable onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              );
            }}
          />

          <View style={styles.footer}>
            {!isSignedIn && (
              <Text style={styles.guestNote}>Vous pourrez vous identifier lors du paiement.</Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)} F</Text>
            </View>
            <Button title="Passer la commande" onPress={handleCheckout} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 24, fontWeight: '900', color: colors.text, paddingHorizontal: 16, paddingTop: 12 },
  itemRow: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.surface, padding: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  itemImage: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: '#f1f5f9' },
  itemImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.text },
  itemPrice: { fontSize: 14, fontWeight: '900', color: colors.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 13, fontWeight: '800', color: colors.text, minWidth: 16, textAlign: 'center' },
  removeBtn: { padding: 6 },
  footer: {
    padding: 16, paddingBottom: 20, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface, gap: 10,
  },
  guestNote: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  totalValue: { fontSize: 22, fontWeight: '900', color: colors.text },
});
