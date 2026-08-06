import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { createSupplier } from '../../services/adminSupplierService';
import LocationPicker from '../../components/LocationPicker';
import Button from '../../components/Button';

// Équivalent mobile de frontend/src/component/Admin/Fournisseurs/AddSupplierModal.jsx
// — crée un vrai compte vendeur (email + mot de passe), actif immédiatement,
// avec les mêmes privilèges qu'un vendeur inscrit normalement.
export default function AdminCreateSupplierScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [location, setLocation] = useState(null);
  const [addressLine, setAddressLine] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim() && email.trim() && password.length >= 8 && phone.trim() && location?.quartier_id && addressLine.trim();

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Champs manquants', 'Nom, email, mot de passe (8 caractères min.), téléphone, zone et adresse sont obligatoires.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await createSupplier({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        momo_number: momoNumber.trim() || undefined,
        departement_id: location.departement_id,
        departement_label: location.departement_label,
        commune_id: location.commune_id,
        commune_label: location.commune_label,
        quartier_id: location.quartier_id,
        quartier_label: location.quartier_label,
        address_line: addressLine.trim(),
        status: 'active',
      }, token);
      Alert.alert('Marchand créé', 'Le compte vendeur a été créé avec succès et peut se connecter immédiatement.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.helperText}>Crée un vrai compte vendeur, actif immédiatement, avec accès au portail fournisseur.</Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Nom complet / Raison sociale</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex : Vtout Officiel" placeholderTextColor={colors.textFaint} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Identifiants de connexion</Text>
            <Text style={styles.fieldLabel}>Email de connexion</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="vendeur@exemple.com" placeholderTextColor={colors.textFaint} autoCapitalize="none" keyboardType="email-address" />
            <Text style={styles.fieldLabel}>Mot de passe</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="8 caractères minimum" placeholderTextColor={colors.textFaint} secureTextEntry />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Téléphone de gestion</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+229 00 00 00 00" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
            <Text style={styles.fieldLabel}>WhatsApp (optionnel)</Text>
            <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="+229 00 00 00 00" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
            <Text style={styles.fieldLabel}>Numéro MoMo (pour les retraits, optionnel)</Text>
            <TextInput style={styles.input} value={momoNumber} onChangeText={setMomoNumber} placeholder="01XXXXXXXX" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Siège social / zone principale</Text>
            <LocationPicker value={location} onChange={setLocation} />
            <Text style={styles.fieldLabel}>Adresse du siège</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={addressLine}
              onChangeText={setAddressLine}
              placeholder="Indiquez l'emplacement du siège…"
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={3}
            />
          </View>

          <Button title="Créer le marchand" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} icon={<Ionicons name="checkmark-circle-outline" size={16} color="#fff" />} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  helperText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, lineHeight: 17 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, marginTop: 4 },
  input: { height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text },
  multilineInput: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
});
