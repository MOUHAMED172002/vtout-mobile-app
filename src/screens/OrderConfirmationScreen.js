import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

export default function OrderConfirmationScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { pendingPayment, guestOrder } = route.params || {};
  const { isSignedIn } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark" size={40} color={colors.success} />
        </View>
        <Text style={styles.title}>Félicitations !</Text>
        <Text style={styles.subtitle}>
          {pendingPayment
            ? 'Votre commande est enregistrée. Finalisez le paiement dans le navigateur qui vient de s\'ouvrir.'
            : 'Votre commande a été enregistrée avec succès. Vous serez contacté(e) pour la livraison.'}
        </Text>

        <View style={{ width: '100%', gap: 12, marginTop: 32 }}>
          {isSignedIn && !guestOrder && (
            <Button title="Voir mes commandes" onPress={() => navigation.replace('Orders')} />
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
