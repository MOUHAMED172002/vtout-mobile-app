import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSpace } from '../../context/SpaceContext';
import { registerSupplier, getMySupplierProfile } from '../../services/supplierService';
import { getPoliciesByType } from '../../services/contentService';
import LocationPicker from '../../components/LocationPicker';
import Button from '../../components/Button';

const DEFAULT_TERMS = [
  "Vous vous engagez à ne pas divulguer les prix d'achat, les marges de la plateforme, ni les informations des clients finaux.",
  'Vous garantissez que les produits respectent les normes en vigueur.',
  'Les paiements sont effectués sur le numéro Mobile Money renseigné, après confirmation de livraison.',
  'Vous vous engagez à tenir votre stock à jour pour éviter les commandes annulées.',
  "En vous inscrivant, vous acceptez que l'administrateur modère vos produits et fixe le prix de vente final.",
];

export default function SupplierRegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken, refreshProfile } = useAuth();
  const { switchSpace } = useSpace();

  const [checkingExisting, setCheckingExisting] = useState(true);
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [location, setLocation] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [policies, setPolicies] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const existing = await getMySupplierProfile(token);
        if (existing) {
          await refreshProfile?.();
          switchSpace('supplier');
          navigation.popToTop();
          return;
        }
      } catch (err) {
        // pas encore fournisseur, ou erreur réseau — on affiche simplement le formulaire
      } finally {
        setCheckingExisting(false);
      }
    })();
    getPoliciesByType('supplier').then(setPolicies).catch(() => setPolicies([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = shopName.trim().length > 1
    && phone.trim().length >= 8
    && momoNumber.trim().length >= 8
    && addressLine.trim().length > 3
    && !!location?.quartier_id
    && termsAccepted
    && signature.trim().length > 1;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Champs manquants', "Merci de renseigner tous les champs, de préciser votre adresse jusqu'au quartier, et d'accepter les conditions en signant.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await registerSupplier({
        shopName: shopName.trim(),
        phone: phone.trim(),
        whatsapp: phone.trim(),
        momoNumber: momoNumber.trim(),
        address_line: addressLine.trim(),
        departement_id: location.departement_id,
        departement_label: location.departement_label,
        commune_id: location.commune_id,
        commune_label: location.commune_label,
        quartier_id: location.quartier_id,
        quartier_label: location.quartier_label,
        termsAccepted,
        electronicSignature: signature.trim(),
      }, token);
      await refreshProfile?.();
      switchSpace('supplier');
      Alert.alert('Bienvenue chez Vtout !', 'Votre boutique a été créée. Un membre de notre équipe va valider votre compte.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'envoyer votre inscription.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingExisting) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Ionicons name="storefront" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>Devenez vendeur Vtout</Text>
        <Text style={styles.subtitle}>Renseignez les informations de votre boutique pour commencer à vendre.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nom de la boutique</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ma Belle Boutique"
            placeholderTextColor={colors.textFaint}
            value={shopName}
            onChangeText={setShopName}
          />

          <Text style={styles.label}>Téléphone / WhatsApp</Text>
          <TextInput
            style={styles.input}
            placeholder="Recevez vos alertes commandes ici"
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Numéro Mobile Money (MoMo)</Text>
          <TextInput
            style={styles.input}
            placeholder="Pour recevoir vos paiements après livraison"
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            value={momoNumber}
            onChangeText={setMomoNumber}
          />

          <Text style={styles.label}>Zone</Text>
          <LocationPicker value={location} onChange={setLocation} />

          <Text style={styles.label}>Description précise de l'adresse</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Face pharmacie du peuple, 1er bâtiment rouge"
            placeholderTextColor={colors.textFaint}
            value={addressLine}
            onChangeText={setAddressLine}
          />

          <View style={styles.termsBox}>
            <Text style={styles.termsTitle}>Conditions du programme Fournisseur</Text>
            {policies.length > 0 ? (
              policies.map((p) => (
                <View key={p.id} style={{ marginBottom: 10 }}>
                  <Text style={styles.termsItemTitle}>{p.title}</Text>
                  <Text style={styles.termsText}>{p.content}</Text>
                </View>
              ))
            ) : (
              DEFAULT_TERMS.map((t, idx) => (
                <Text key={idx} style={styles.termsText}>• {t}</Text>
              ))
            )}
          </View>

          <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted((v) => !v)}>
            <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
              {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>J'ai lu et j'accepte les termes du contrat ci-dessus.</Text>
          </Pressable>

          <Text style={styles.label}>Signature électronique</Text>
          <TextInput
            style={styles.input}
            placeholder="Tapez votre nom complet pour signer..."
            placeholderTextColor={colors.textFaint}
            value={signature}
            onChangeText={setSignature}
          />

          <Button title="Envoyer ma candidature" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} style={{ marginTop: 8 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, alignItems: 'center', paddingBottom: 48 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff1e8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  form: { width: '100%', gap: 10 },
  label: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6, marginBottom: 2 },
  input: {
    height: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  termsBox: {
    marginTop: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, maxHeight: 220,
  },
  termsTitle: { fontSize: 12.5, fontWeight: '900', color: colors.text, marginBottom: 8, textTransform: 'uppercase' },
  termsItemTitle: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 2 },
  termsText: { fontSize: 11.5, color: colors.textMuted, fontWeight: '600', lineHeight: 17, marginBottom: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.text },
});
