import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  assignOrder,
  releaseOrder,
  updateDeliveryStatus,
  generateCashPaymentLink,
  isPickedUp,
  isDelivered,
  isCashOnDelivery,
  hasUnremittedCash,
  getDelivererFee,
  getOrderRef,
} from '../../services/deliveryOrderService';
import { formatPrice } from '../../utils/format';
import { getOrderStatusLabel, getOrderStatusColor } from '../../utils/orderStatus';
import Button from '../../components/Button';

export default function DeliveryDetailScreen({ route, navigation }) {
  const { getToken } = useAuth();
  const initialOrder = route.params?.order;
  const mode = route.params?.mode || 'mine'; // 'available' | 'mine'
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Commande introuvable.</Text>
      </SafeAreaView>
    );
  }

  const statusColor = getOrderStatusColor(order.status);
  const address = order.address || {};
  const customerPhone = address.phone || order.guest_phone;

  const handleCall = () => {
    if (customerPhone) Linking.openURL(`tel:${customerPhone}`);
  };

  const handleAssign = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      await assignOrder(order.id, token);
      Alert.alert('Course assignée', 'La commande vous a été assignée.', [
        { text: 'OK', onPress: () => navigation.replace('MyDeliveries') },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'accepter cette commande.");
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = () => {
    Alert.alert('Libérer la course', 'Voulez-vous vraiment libérer cette commande ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Libérer', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            const token = await getToken();
            await releaseOrder(order.id, token);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de libérer cette course.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleMarkPickedUp = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      const updated = await updateDeliveryStatus(order.id, 'expédiée', null, token);
      setOrder((prev) => ({ ...prev, status: updated?.status || 'expédiée' }));
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de mettre à jour le statut.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (code.trim().length < 3) {
      Alert.alert('Code requis', 'Merci de saisir le code de confirmation donné par le client.');
      return;
    }
    setBusy(true);
    try {
      const token = await getToken();
      const updated = await updateDeliveryStatus(order.id, 'livrée', code.trim(), token);
      setOrder((prev) => ({ ...prev, status: updated?.status || 'livrée' }));
      setShowCodeInput(false);
      Alert.alert('Livraison confirmée', 'La commande a été marquée comme livrée.');
    } catch (err) {
      Alert.alert('Code incorrect', err?.response?.data?.error || 'Le code saisi ne correspond pas à cette commande.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateCashLink = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      const result = await generateCashPaymentLink(order.id, token);
      if (result?.payment_url) Linking.openURL(result.payment_url);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de générer le lien de versement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.orderId}>Réf. #{getOrderRef(order)}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{getOrderStatusLabel(order.status)}</Text>
            </View>
          </View>
          <Text style={styles.fee}>{formatPrice(getDelivererFee(order))} F <Text style={styles.feeLabel}>de gain estimé</Text></Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={styles.rowText}>
              {address.quartier_label ? `${address.quartier_label}, ` : ''}{address.commune_label || 'Adresse inconnue'}
            </Text>
          </View>
          {address.address_line ? (
            <View style={styles.row}>
              <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
              <Text style={styles.rowText}>{address.address_line}</Text>
            </View>
          ) : null}
          {customerPhone ? (
            <Pressable style={styles.row} onPress={handleCall}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={[styles.rowText, { color: colors.primary, fontWeight: '800' }]}>{customerPhone}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Articles ({order.items?.length || 0})</Text>
          {(order.items || []).map((item, idx) => (
            <View key={item.id || idx} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>{item.product?.name || item.name || 'Article'}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>Montant à collecter</Text>
            <Text style={styles.itemTotal}>{isCashOnDelivery(order) ? `${formatPrice(order.total_amount)} F` : 'Déjà payé'}</Text>
          </View>
        </View>

        {showCodeInput && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Code de confirmation</Text>
            <TextInput
              style={styles.input}
              placeholder="Code donné par le client"
              placeholderTextColor={colors.textFaint}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <Button title="Confirmer la livraison" onPress={handleConfirmDelivery} loading={busy} />
          </View>
        )}

        {hasUnremittedCash(order) && (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.warningText}>Cash non reversé pour cette commande.</Text>
            <Button title="Reverser" variant="outline" onPress={handleGenerateCashLink} loading={busy} style={{ marginTop: 8, alignSelf: 'stretch' }} />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {mode === 'available' && (
          <Button title="Prendre en charge" onPress={handleAssign} loading={busy} />
        )}
        {mode === 'mine' && !isDelivered(order) && !isPickedUp(order) && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Libérer" variant="outline" onPress={handleRelease} disabled={busy} style={{ flex: 1 }} />
            <Button title="Colis récupéré" onPress={handleMarkPickedUp} loading={busy} style={{ flex: 1 }} />
          </View>
        )}
        {mode === 'mine' && isPickedUp(order) && !showCodeInput && (
          <Button title="Confirmer la livraison" onPress={() => setShowCodeInput(true)} icon={<Ionicons name="checkmark-circle-outline" size={16} color="#fff" />} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { textAlign: 'center', marginTop: 40, color: colors.textMuted, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 15, fontWeight: '900', color: colors.text },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  fee: { fontSize: 22, fontWeight: '900', color: colors.primary },
  feeLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 13, color: colors.text, fontWeight: '600', flexShrink: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  itemName: { fontSize: 12, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  itemQty: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  itemTotal: { fontSize: 13, fontWeight: '900', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '700', color: colors.text, letterSpacing: 1,
  },
  warningCard: { backgroundColor: '#fef2f2', borderRadius: radius.lg, borderWidth: 1, borderColor: '#fecaca', padding: 16, alignItems: 'center', gap: 6 },
  warningText: { fontSize: 12, fontWeight: '700', color: '#991b1b', textAlign: 'center' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
