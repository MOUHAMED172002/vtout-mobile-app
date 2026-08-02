import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMySupplierOrders, updateOrderStatus, getEstimatedGain } from '../../services/supplierOrderService';
import { formatPrice, getThumbnail } from '../../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../../utils/orderStatus';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const FLOW = ['en_attente', 'confirmée', 'expédiée'];

export default function SupplierOrderDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { id } = route.params;
  const { getToken } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const orders = await getMySupplierOrders(token);
      const found = (orders || []).find((o) => String(o.id) === String(id));
      setOrder(found || null);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    const currentIndex = FLOW.indexOf(order.status);
    if (currentIndex === -1 || currentIndex >= FLOW.length - 1) return;
    const nextStatus = FLOW[currentIndex + 1];
    setUpdating(true);
    try {
      const token = await getToken();
      await updateOrderStatus(order.id, nextStatus, token);
      await load();
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = () => {
    Alert.alert('Annuler la commande', 'Voulez-vous vraiment annuler cette commande ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive', onPress: async () => {
          setUpdating(true);
          try {
            const token = await getToken();
            await updateOrderStatus(order.id, 'annulée', token);
            await load();
          } catch {
            Alert.alert('Erreur', "Impossible d'annuler la commande.");
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;
  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Commande introuvable.</Text>
      </SafeAreaView>
    );
  }

  const color = getOrderStatusColor(order.status);
  const boutiqueNames = Array.from(new Set((order.items || []).map((i) => i.boutique?.name).filter(Boolean)));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.orderId}>Commande #{String(order.id).substring(0, 8)}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.statusText, { color }]}>{getOrderStatusLabel(order.status)}</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            {new Date(order.created_at || order.createdAt).toLocaleString('fr-FR')}
          </Text>

          {boutiqueNames.length > 0 && (
            <View style={styles.boutiqueRow}>
              {boutiqueNames.map((name) => (
                <View key={name} style={styles.boutiqueTag}>
                  <Ionicons name="storefront-outline" size={11} color={colors.secondary} />
                  <Text style={styles.boutiqueTagText}>{name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ marginTop: 10, gap: 10 }}>
            {order.status === 'en_attente' && (
              <Button title="Accepter et préparer" onPress={advance} loading={updating} />
            )}
            {order.status === 'confirmée' && (
              <Button title="Marquer expédiée" onPress={advance} loading={updating} />
            )}
            {order.status === 'en_attente' && (
              <Button title="Annuler cette commande" variant="outline" onPress={cancelOrder} disabled={updating} />
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Articles ({order.items?.length || 0})</Text>
          {(order.items || []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              {item.product?.images?.[0]?.image_url ? (
                <Image source={{ uri: getThumbnail(item.product.images[0].image_url) }} style={styles.itemImage} resizeMode="contain" />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: '#f1f5f9' }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product?.name || 'Produit inconnu'}</Text>
                <Text style={styles.itemQty}>Qté : {item.quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>{formatPrice(parseFloat(item.price) * item.quantity)} F</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gain estimé</Text>
            <Text style={styles.summaryValue}>{formatPrice(getEstimatedGain(order))} F</Text>
          </View>
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
  boutiqueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  boutiqueTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff',
    borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm,
  },
  boutiqueTagText: { fontSize: 10, fontWeight: '800', color: colors.secondary },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  itemImage: { width: 48, height: 48, borderRadius: radius.sm },
  itemName: { fontSize: 12, fontWeight: '700', color: colors.text },
  itemQty: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '800', color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: colors.secondary },
});
