import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LocationPicker from '../components/LocationPicker';
import Button from '../components/Button';
import { formatPrice, getThumbnail } from '../utils/format';
import { createAddress } from '../services/addressService';
import { createOrder } from '../services/orderService';
import { validateCoupon } from '../services/couponService';
import { getAllConfigs } from '../services/configService';
import { getMyFinancials } from '../services/walletService';

export default function CheckoutScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const items = route.params?.items || [];
  const subtotal = route.params?.total || 0;
  const { isSignedIn, getToken } = useAuth();
  const { refreshCart } = useCart();

  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [location, setLocation] = useState(null);
  const [addressLine, setAddressLine] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('delivery');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feesConfig, setFeesConfig] = useState({ intra: 500, inter: 1000, crossing: {} });
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getToken();
        const data = await getMyFinancials(token);
        setWalletBalance(Number(data?.balance || 0));
      } catch {
        setWalletBalance(0);
      }
    })();
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (items.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits avant de passer commande.');
      navigation.goBack();
    }
  }, [items, navigation]);

  useEffect(() => {
    getAllConfigs()
      .then((data) => {
        const map = (data || []).reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});
        let crossing = {};
        try { crossing = map.crossing_fees ? JSON.parse(map.crossing_fees) : {}; } catch {}
        setFeesConfig({
          intra: parseFloat(map.intra_department_fee ?? 500),
          inter: parseFloat(map.inter_department_fee ?? 1000),
          crossing,
        });
      })
      .catch(() => {});
  }, []);

  const deliveryFee = useMemo(() => {
    if (!location) return 0;

    const boutiques = {};
    items.forEach((it) => {
      const bId = it.boutique_id || it.boutique?.id || 'default';
      if (!boutiques[bId] && it.boutique) boutiques[bId] = it.boutique;
    });

    const normalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    let total = 0;

    Object.entries(boutiques).forEach(([bId, boutique]) => {
      const boutiqueItems = items.filter((it) => String(it.boutique_id || it.boutique?.id || 'default') === String(bId));
      const freeCommunes = new Set();
      boutiqueItems.forEach((it) => (it.free_delivery_communes || []).forEach((c) => freeCommunes.add(normalize(c))));

      const isFreeZone = freeCommunes.has(normalize(location.commune_label)) || String(boutique.commune_id) === String(location.commune_id);

      if (isFreeZone) return;
      if (String(boutique.departement_id) === String(location.departement_id)) {
        total += feesConfig.intra;
      } else {
        const key = `${boutique.departement_id}-${location.departement_id}`;
        const reverseKey = `${location.departement_id}-${boutique.departement_id}`;
        if (feesConfig.crossing[key] !== undefined) total += parseFloat(feesConfig.crossing[key]);
        else if (feesConfig.crossing[reverseKey] !== undefined) total += parseFloat(feesConfig.crossing[reverseKey]);
        else total += feesConfig.inter;
      }
    });

    return total;
  }, [location, items, feesConfig]);

  const isZoneMismatch = deliveryFee > 0;
  const finalTotal = Math.max(0, subtotal - discount + deliveryFee);

  useEffect(() => {
    if (isZoneMismatch && paymentMethod === 'delivery') setPaymentMethod('fedapay');
  }, [isZoneMismatch, paymentMethod]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await validateCoupon(couponCode, subtotal);
      setAppliedCoupon(res);
      setDiscount(res.discount || 0);
    } catch (err) {
      Alert.alert('Code promo invalide', err.response?.data?.error || 'Ce code promo n\'est pas valide.');
      setAppliedCoupon(null);
      setDiscount(0);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const isGuest = !isSignedIn;
  const canSubmit = !!location?.quartier_id
    && phone.trim().length >= 8
    && (!isGuest || (guestInfo.name.trim() && guestInfo.email.trim()));

  const handleConfirmOrder = async () => {
    if (!canSubmit) {
      Alert.alert('Informations manquantes', 'Merci de renseigner votre adresse et votre téléphone.');
      return;
    }
    setSubmitting(true);
    try {
      const token = isGuest ? null : await getToken();

      const addrRow = await createAddress({
        label: 'Adresse de livraison',
        departement_id: location.departement_id,
        departement_label: location.departement_label,
        commune_id: location.commune_id,
        commune_label: location.commune_label,
        quartier_id: location.quartier_id,
        quartier_label: location.quartier_label,
        address_line: addressLine,
        phone,
        is_default: !isGuest,
      }, token);

      const response = await createOrder({
        total_amount: finalTotal,
        status: paymentMethod === 'fedapay' ? 'pending_payment' : 'en_attente',
        payment_method: paymentMethod,
        address_id: addrRow.id,
        guest_name: isGuest ? guestInfo.name : undefined,
        guest_email: isGuest ? guestInfo.email : undefined,
        guest_phone: isGuest ? (guestInfo.phone || phone) : undefined,
        items: items.map((it) => ({
          product_id: it.product_id || it.id,
          variant_id: it.variant_id || null,
          quantity: Number(it.quantity) || 1,
          price: Number(it.price_snapshot || it.price) || 0,
        })),
        coupon_code: appliedCoupon?.code || undefined,
      }, token);

      if (paymentMethod === 'fedapay' && response.payment_url) {
        await refreshCart();
        await WebBrowser.openBrowserAsync(response.payment_url);
        navigation.replace('OrderConfirmation', { orderId: response.order?.id, pendingPayment: true });
        return;
      }

      await refreshCart();
      navigation.replace('OrderConfirmation', {
        orderId: response.order?.id,
        guestOrder: isGuest,
      });
    } catch (err) {
      console.error('[Checkout Error]', err?.response?.data || err?.message);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de valider la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {isGuest && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vos coordonnées</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor={colors.textFaint}
              value={guestInfo.name}
              onChangeText={(t) => setGuestInfo((p) => ({ ...p, name: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={guestInfo.email}
              onChangeText={(t) => setGuestInfo((p) => ({ ...p, email: t }))}
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Où livrer ?</Text>
          <LocationPicker value={location} onChange={setLocation} />
          {location && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Détails (rue, repère...) — optionnel"
                placeholderTextColor={colors.textFaint}
                value={addressLine}
                onChangeText={setAddressLine}
              />
              <TextInput
                style={styles.input}
                placeholder="Téléphone (ex: 61000000)"
                placeholderTextColor={colors.textFaint}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coupon de réduction</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="ENTRER LE CODE"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={(t) => setCouponCode(t.toUpperCase())}
            />
            <Pressable style={styles.couponBtn} onPress={handleApplyCoupon} disabled={validatingCoupon || !couponCode}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </Pressable>
          </View>
          {discount > 0 && <Text style={styles.couponActive}>Réduction appliquée : -{formatPrice(discount)} F</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mode de paiement</Text>
          <Pressable
            style={[styles.paymentOption, paymentMethod === 'delivery' && styles.paymentOptionActive, isZoneMismatch && styles.paymentOptionDisabled]}
            onPress={() => !isZoneMismatch && setPaymentMethod('delivery')}
          >
            <Ionicons name="cash-outline" size={20} color={paymentMethod === 'delivery' ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>À la livraison</Text>
              <Text style={styles.paymentSubtitle}>{isZoneMismatch ? 'Indisponible pour votre zone' : 'Payez en espèces à réception'}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.paymentOption, paymentMethod === 'fedapay' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('fedapay')}
          >
            <Ionicons name="card-outline" size={20} color={paymentMethod === 'fedapay' ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Paiement en ligne</Text>
              <Text style={styles.paymentSubtitle}>MTN, Moov, Carte bancaire</Text>
            </View>
          </Pressable>
          {isSignedIn && walletBalance > 0 && (
            <Pressable
              style={[
                styles.paymentOption,
                paymentMethod === 'wallet' && styles.paymentOptionActive,
                walletBalance < finalTotal && styles.paymentOptionDisabled,
              ]}
              onPress={() => walletBalance >= finalTotal && setPaymentMethod('wallet')}
            >
              <Ionicons name="wallet-outline" size={20} color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Portefeuille Vtout</Text>
                <Text style={styles.paymentSubtitle}>
                  {walletBalance < finalTotal ? 'Solde insuffisant' : `Solde disponible : ${formatPrice(walletBalance)} F`}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Articles ({items.length})</Text>
          {items.map((it, idx) => {
            const freeCommunes = it.free_delivery_communes || [];
            const shippedFrom = [it.boutique?.commune_label, ...freeCommunes].filter((v, i, a) => v && a.indexOf(v) === i);
            return (
              <View key={idx} style={styles.itemRow}>
                <Image source={{ uri: getThumbnail(it.image_url) }} style={styles.itemImage} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.itemQty}>{it.quantity} x {formatPrice(it.price_snapshot || it.price)} F</Text>
                  {shippedFrom.length > 0 && (
                    <Text style={styles.itemShipped} numberOfLines={1}>Expédié depuis : {shippedFrom.join(', ')}</Text>
                  )}
                  {freeCommunes.length > 0 && (
                    <Text style={styles.itemFreeDelivery} numberOfLines={1}>Livraison offerte dans : {freeCommunes.join(', ')}</Text>
                  )}
                </View>
                <Text style={styles.itemTotal}>{formatPrice((it.price_snapshot || it.price) * it.quantity)} F</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Résumé</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)} F</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>Réduction</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>-{formatPrice(discount)} F</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Livraison</Text>
            <Text style={styles.summaryValue}>{deliveryFee === 0 ? 'Gratuite' : `${formatPrice(deliveryFee)} F`}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalValue}>{formatPrice(finalTotal)} F</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Confirmer la commande" onPress={handleConfirmOrder} loading={submitting} disabled={!canSubmit} />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  itemImage: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.background },
  itemName: { fontSize: 12, fontWeight: '800', color: colors.text },
  itemQty: { fontSize: 10, fontWeight: '700', color: colors.textMuted, marginTop: 1 },
  itemShipped: { fontSize: 9, fontWeight: '700', color: colors.textFaint, marginTop: 2 },
  itemFreeDelivery: { fontSize: 9, fontWeight: '800', color: colors.success, marginTop: 1, textTransform: 'uppercase' },
  itemTotal: { fontSize: 12, fontWeight: '900', color: colors.text },
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4,
  },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  couponActive: { fontSize: 12, fontWeight: '800', color: colors.success },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.border,
  },
  paymentOptionActive: { borderColor: colors.primary, backgroundColor: 'rgba(243,112,33,0.06)' },
  paymentOptionDisabled: { opacity: 0.5 },
  paymentTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  paymentSubtitle: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 13, color: colors.text, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  totalLabel: { fontSize: 13, fontWeight: '900', color: colors.primary, textTransform: 'uppercase' },
  totalValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
