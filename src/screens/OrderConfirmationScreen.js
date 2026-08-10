import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { confirmPendingPayment } from '../services/orderService';
import Button from '../components/Button';

export default function OrderConfirmationScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { orderId, guestOrder, pendingCheckoutId, transactionId } = route.params || {};
  const { isSignedIn } = useAuth();
  const { refreshCart } = useCart();

  // Paiement en ligne (fedapay) : le navigateur vient tout juste de se
  // fermer sur server/controllers/orderController.js#materializePendingCheckout
  // n'a peut-être pas encore tourné — aucune commande n'existe tant que ce
  // n'est pas confirmé. On confirme/matérialise ici dès l'arrivée sur cet
  // écran (même logique que l'onComplete du widget web dans
  // CheckoutPage.jsx) ; le webhook FedaPay reste le filet de sécurité si cet
  // appel échoue (réseau, onglet fermé trop tôt…) — jamais d'état d'échec
  // affiché pour autant, juste "en cours de finalisation".
  const [confirming, setConfirming] = useState(!!pendingCheckoutId);
  const [confirmedOrderId, setConfirmedOrderId] = useState(orderId || null);
  const [stillProcessing, setStillProcessing] = useState(false);

  useEffect(() => {
    if (!pendingCheckoutId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await confirmPendingPayment(pendingCheckoutId, transactionId);
        if (cancelled) return;
        if (res?.order?.id) {
          await refreshCart();
          setConfirmedOrderId(res.order.id);
        } else {
          setStillProcessing(true);
        }
      } catch (err) {
        if (!cancelled) setStillProcessing(true);
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCheckoutId, transactionId]);

  if (confirming) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.subtitle, { marginTop: 20 }]}>Vérification du paiement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, stillProcessing && { backgroundColor: `${colors.warning}20` }]}>
          <Ionicons name={stillProcessing ? 'time' : 'checkmark'} size={40} color={stillProcessing ? colors.warning : colors.success} />
        </View>
        <Text style={styles.title}>{stillProcessing ? 'Paiement reçu' : 'Félicitations !'}</Text>
        <Text style={styles.subtitle}>
          {stillProcessing
            ? 'Finalisation en cours… Vous recevrez une confirmation sous peu dans « Mes commandes ».'
            : pendingCheckoutId
            ? 'Votre paiement est confirmé et votre commande est enregistrée.'
            : 'Votre commande a été enregistrée avec succès. Vous serez contacté(e) pour la livraison.'}
        </Text>

        <View style={{ width: '100%', gap: 12, marginTop: 32 }}>
          {isSignedIn && !guestOrder && (
            <Button title="Voir mes commandes" onPress={() => navigation.replace('Orders')} />
          )}
          {(guestOrder || pendingCheckoutId) && confirmedOrderId && (
            <Button
              title="Voir ma commande"
              onPress={() => navigation.replace('OrderDetail', { id: confirmedOrderId })}
            />
          )}
          <Button
            title="Continuer mes achats"
            variant="outline"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#ecfdf5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontWeight: '500', marginTop: 10, lineHeight: 20 },
});
