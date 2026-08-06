import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
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
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
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
  // La boutique effectivement retenue pour CETTE commande (un vendeur peut en
  // avoir plusieurs, à des adresses différentes) prime sur l'adresse générale
  // du compte fournisseur — voir server/controllers/deliveryController.js.
  const supplier = order.boutique || order.supplier || {};
  const supplierPhone = order.boutique?.phone || order.boutique?.whatsapp || order.supplier?.phone;
  const customerPhone = address.phone || order.guest_phone;

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const hasSupplierCoords = !!(supplier.lat && supplier.lng);
  const hasClientCoords = !!(address.lat && address.lng);
  const supplierAddressText = supplier.address_line || supplier.commune_label;
  const clientAddressText = address.quartier_label ? `${address.quartier_label}, ${address.commune_label}` : (address.commune_label || address.city);

  const supplierMapUrl = hasSupplierCoords
    ? `https://www.google.com/maps?q=${supplier.lat},${supplier.lng}`
    : supplierAddressText ? `https://www.google.com/maps/search/${encodeURIComponent(`${supplierAddressText}, Bénin`)}` : null;
  const clientMapUrl = hasClientCoords
    ? `https://www.google.com/maps?q=${address.lat},${address.lng}`
    : clientAddressText ? `https://www.google.com/maps/search/${encodeURIComponent(`${clientAddressText}, Bénin`)}` : null;
  const routeUrl = hasSupplierCoords && hasClientCoords
    ? `https://www.google.com/maps/dir/${supplier.lat},${supplier.lng}/${address.lat},${address.lng}`
    : (hasClientCoords && supplierAddressText)
      ? `https://www.google.com/maps/dir/${encodeURIComponent(`${supplierAddressText}, Bénin`)}/${address.lat},${address.lng}`
      : clientMapUrl;

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
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneBadge}><Text style={styles.milestoneBadgeText}>1</Text></View>
            <Text style={styles.cardTitle}>Point de collecte</Text>
          </View>
          <Text style={styles.supplierName}>{supplier.name || 'Boutique vendeur'}</Text>
          {(supplier.address_line || supplier.commune_label) ? (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.rowText}>{supplier.address_line || `${supplier.quartier_label ? supplier.quartier_label + ', ' : ''}${supplier.commune_label}`}</Text>
            </View>
          ) : null}
          {supplierPhone ? (
            <Pressable style={styles.row} onPress={() => handleCall(supplierPhone)}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={[styles.rowText, { color: colors.primary, fontWeight: '800' }]}>Appeler : {supplierPhone}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.milestoneHeader}>
            <View style={[styles.milestoneBadge, { backgroundColor: colors.secondary }]}><Text style={styles.milestoneBadgeText}>2</Text></View>
            <Text style={styles.cardTitle}>Lieu de livraison</Text>
          </View>
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
            <Pressable style={styles.row} onPress={() => handleCall(customerPhone)}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={[styles.rowText, { color: colors.primary, fontWeight: '800' }]}>Appeler : {customerPhone}</Text>
            </Pressable>
          ) : null}
        </View>

        {(routeUrl || supplierMapUrl || clientMapUrl) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Itinéraire GPS</Text>
            {routeUrl && (
              <Pressable style={styles.routeBtn} onPress={() => Linking.openURL(routeUrl)}>
                <Ionicons name="navigate" size={18} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeBtnLabel}>Itinéraire complet</Text>
                  <Text style={styles.routeBtnSub}>Voir le trajet sur Google Maps</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {supplierMapUrl && (
                <Pressable style={styles.mapChip} onPress={() => Linking.openURL(supplierMapUrl)}>
                  <Ionicons name="pin" size={14} color={colors.warning} />
                  <Text style={styles.mapChipText}>Fournisseur</Text>
                </Pressable>
              )}
              {clientMapUrl && (
                <Pressable style={styles.mapChip} onPress={() => Linking.openURL(clientMapUrl)}>
                  <Ionicons name="pin" size={14} color={colors.success} />
                  <Text style={styles.mapChipText}>Client</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

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

const createStyles = (colors) => StyleSheet.create({
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
  milestoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneBadge: { width: 20, height: 20, borderRadius: 6, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  milestoneBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  supplierName: { fontSize: 13, fontWeight: '800', color: colors.text },
  routeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primary,
    borderRadius: radius.md, padding: 14,
  },
  routeBtnLabel: { fontSize: 9.5, fontWeight: '800', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' },
  routeBtnSub: { fontSize: 12.5, fontWeight: '800', color: '#fff', marginTop: 1 },
  mapChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: 10,
  },
  mapChipText: { fontSize: 11, fontWeight: '700', color: colors.text },
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
