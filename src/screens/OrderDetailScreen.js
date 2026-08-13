import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getOrderById, retryOrderPayment } from '../services/orderService';
import { formatPrice, getThumbnail } from '../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../utils/orderStatus';
import Loading from '../components/Loading';
import Button from '../components/Button';
import OrderTrackingMap from '../components/OrderTrackingMap';

const isDelivered = (status) => ['livrée', 'livree'].includes((status || '').toLowerCase());
const normalizeStatus = (status) => (status || '')
  .normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const ONLINE_PAYMENT_METHODS = ['fedapay', 'mobile_money', 'card'];

export default function OrderDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { id } = route.params;
  const { getToken } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const reload = React.useCallback(() => {
    return getToken()
      .then((token) => getOrderById(id, token))
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [id, getToken]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <Loading />;
  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Commande introuvable.</Text>
      </SafeAreaView>
    );
  }

  const statusColor = getOrderStatusColor(order.status);
  const canRetryPayment = ONLINE_PAYMENT_METHODS.includes(order.payment_method)
    && order.payment_status !== 'payé'
    && !['annulee', 'livree', 'retournee'].includes(normalizeStatus(order.status));

  const handleRetryPayment = async () => {
    setRetrying(true);
    try {
      const token = await getToken();
      const res = await retryOrderPayment(order.id, token);
      if (!res.payment_url) {
        Alert.alert('Erreur', "Impossible de générer le lien de paiement.");
        return;
      }
      await WebBrowser.openBrowserAsync(res.payment_url);
      if (res.pending_checkout_id) {
        // Flux différé : aucune commande n'existe encore pour ce nouveau
        // paiement, même logique de confirmation que CheckoutScreen.js.
        navigation.replace('OrderConfirmation', {
          pendingCheckoutId: res.pending_checkout_id,
          transactionId: res.transaction_id,
        });
      } else {
        // Flux legacy (commande déjà créée) : le webhook FedaPay mettra à
        // jour payment_status de façon asynchrone — on recharge simplement.
        Alert.alert('Vérification en cours', 'Actualisation du statut du paiement…');
        reload();
      }
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || 'Erreur lors de la génération du lien de paiement.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.orderId}>Commande #{order.id}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{getOrderStatusLabel(order.status)}</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{new Date(order.created_at || order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>

        {normalizeStatus(order.status) === 'expediee' && (
          <View style={styles.card}>
            <View style={styles.trackingHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="navigate" size={16} color={colors.primary} />
                <Text style={styles.cardTitle}>Suivi en temps réel</Text>
              </View>
              <View style={styles.trackingPill}>
                <Text style={styles.trackingPillText}>Livreur en route</Text>
              </View>
            </View>
            <OrderTrackingMap
              orderId={order.id}
              customerPos={order.address?.lat ? [parseFloat(order.address.lat), parseFloat(order.address.lng)] : null}
              supplierPos={order.supplier?.lat ? [parseFloat(order.supplier.lat), parseFloat(order.supplier.lng)] : null}
            />
          </View>
        )}

        {order.address && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Adresse de livraison</Text>
            <Text style={styles.addressText}>
              {order.address.quartier_label}, {order.address.commune_label}
            </Text>
            {order.address.address_line ? <Text style={styles.addressSub}>{order.address.address_line}</Text> : null}
            {order.address.phone ? <Text style={styles.addressSub}>{order.address.phone}</Text> : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Articles</Text>
          {(order.items || []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              {item.product?.images?.[0]?.image_url || item.product?.image_url ? (
                <Image
                  source={{ uri: getThumbnail(item.product?.images?.[0]?.image_url || item.product?.image_url) }}
                  style={styles.itemImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: '#f1f5f9' }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product?.name || 'Produit'}</Text>
                <Text style={styles.itemQty}>{item.quantity} x {formatPrice(item.price)} F</Text>
                {isDelivered(order.status) && item.product_id && (
                  <Pressable
                    style={styles.reviewLink}
                    onPress={() => navigation.navigate('WriteReview', {
                      orderId: order.id,
                      product: {
                        id: item.product_id,
                        name: item.product?.name || 'Produit',
                        image_url: item.product?.images?.[0]?.image_url || item.product?.image_url,
                      },
                    })}
                  >
                    <Ionicons name="star-outline" size={12} color={colors.primary} />
                    <Text style={styles.reviewLinkText}>Laisser un avis</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.itemTotal}>{formatPrice(item.price * item.quantity)} F</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.total_amount)} F</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paiement</Text>
            <Text style={styles.summaryValueMuted}>
              {order.payment_method === 'delivery' ? 'À la livraison' : 'En ligne'}
              {order.payment_method !== 'delivery' ? (order.payment_status === 'payé' ? ' · Payé' : ' · En attente') : ''}
            </Text>
          </View>
          {canRetryPayment && (
            <Button
              title="Réessayer le paiement"
              onPress={handleRetryPayment}
              loading={retrying}
              icon={<Ionicons name="card-outline" size={16} color="#fff" />}
              style={{ marginTop: 10 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { textAlign: 'center', marginTop: 40, color: colors.textMuted, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 16, fontWeight: '900', color: colors.text },
  orderDate: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 4 },
  trackingHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackingPill: { backgroundColor: `${colors.secondary}18`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  trackingPillText: { fontSize: 9.5, fontWeight: '900', color: colors.secondary, textTransform: 'uppercase' },
  addressText: { fontSize: 13, fontWeight: '700', color: colors.text },
  addressSub: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  itemImage: { width: 48, height: 48, borderRadius: radius.sm },
  itemName: { fontSize: 12, fontWeight: '700', color: colors.text },
  itemQty: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  reviewLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  reviewLinkText: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  itemTotal: { fontSize: 13, fontWeight: '800', color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  summaryValueMuted: { fontSize: 13, fontWeight: '700', color: colors.text },
});
