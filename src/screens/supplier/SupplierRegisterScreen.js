import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { registerSupplier } from '../../services/supplierService';
import LocationPicker from '../../components/LocationPicker';
import Button from '../../components/Button';

export default function SupplierRegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken, refreshProfile } = useAuth();
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = shopName.trim().length > 1 && phone.trim().length >= 8 && !!location?.commune_id;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Champs manquants', 'Merci de renseigner le nom de la boutique, votre téléphone et votre zone.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await registerSupplier({
        shop_name: shopName.trim(),
        phone,
        commune_id: location.commune_id,
        commune_label: location.commune_label,
        departement_id: location.departement_id,
        departement_label: location.departement_label,
      }, token);
      await refreshProfile?.();
      Alert.alert('Demande envoyée', 'Votre inscription vendeur a bien été enregistrée. Un membre de notre équipe va la valider.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'envoyer votre inscription.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="storefront" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>Devenez vendeur Vtout</Text>
        <Text style={styles.subtitle}>Renseignez les informations de votre boutique pour commencer à vendre.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nom de la boutique"
            placeholderTextColor={colors.textFaint}
            value={shopName}
            onChangeText={setShopName}
          />
          <TextInput
            style={styles.input}
            placeholder="Téléphone / WhatsApp"
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <LocationPicker value={location} onChange={setLocation} />
          <Button title="Envoyer ma candidature" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} style={{ marginTop: 8 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, alignItems: 'center' },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff1e8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  form: { width: '100%', gap: 12 },
  input: {
    height: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: colors.text,
  },
});
