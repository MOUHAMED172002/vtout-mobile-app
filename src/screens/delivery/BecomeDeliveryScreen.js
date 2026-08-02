import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { registerLivreur, uploadKycImage } from '../../services/deliveryOrderService';
import { getAllCommunes } from '../../utils/communes';
import Button from '../../components/Button';

const VEHICLE_TYPES = [
  { key: 'moto', label: 'Moto', icon: 'bicycle' },
  { key: 'velo', label: 'Vélo', icon: 'bicycle-outline' },
  { key: 'voiture', label: 'Voiture', icon: 'car-outline' },
];

const ALL_COMMUNES = getAllCommunes();

export default function BecomeDeliveryScreen({ navigation }) {
  const { getToken } = useAuth();
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('moto');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [idCardUri, setIdCardUri] = useState(null);
  const [zones, setZones] = useState([]);
  const [zoneQuery, setZoneQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pickIdCard = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour ajouter une pièce d'identité.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) setIdCardUri(result.assets[0].uri);
  };

  const toggleZone = (commune) => {
    setZones((prev) => (prev.includes(commune) ? prev.filter((z) => z !== commune) : [...prev, commune]));
  };

  const filteredCommunes = zoneQuery.trim()
    ? ALL_COMMUNES.filter((c) => c.toLowerCase().includes(zoneQuery.trim().toLowerCase()))
    : ALL_COMMUNES.slice(0, 20);

  const canSubmit = fullname.trim().length > 1 && phone.trim().length >= 8 && !!idCardUri && zones.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Champs manquants', 'Merci de renseigner votre identité, votre pièce et au moins une zone de service.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const idCardUrl = await uploadKycImage({
        uri: idCardUri,
        name: 'id-card.jpg',
        type: 'image/jpeg',
      }, token);

      await registerLivreur({
        fullname: fullname.trim(),
        phone,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
        license_plate: licensePlate,
        id_card_url: idCardUrl,
        service_zones: zones,
      }, token);

      Alert.alert('Candidature envoyée', 'Votre dossier est en cours de vérification. Vous serez averti dès son activation.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'envoyer votre candidature.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Devenez livreur Vtout</Text>
        <Text style={styles.subtitle}>Complétez votre dossier pour rejoindre notre flotte de livreurs partenaires.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            placeholderTextColor={colors.textFaint}
            value={fullname}
            onChangeText={setFullname}
          />
          <TextInput
            style={styles.input}
            placeholder="Téléphone"
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Véhicule</Text>
          <View style={styles.chipRow}>
            {VEHICLE_TYPES.map((v) => (
              <Pressable
                key={v.key}
                style={[styles.vehicleChip, vehicleType === v.key && styles.vehicleChipActive]}
                onPress={() => setVehicleType(v.key)}
              >
                <Ionicons name={v.icon} size={16} color={vehicleType === v.key ? '#fff' : colors.textMuted} />
                <Text style={[styles.vehicleChipText, vehicleType === v.key && { color: '#fff' }]}>{v.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Modèle du véhicule (optionnel)"
            placeholderTextColor={colors.textFaint}
            value={vehicleModel}
            onChangeText={setVehicleModel}
          />
          <TextInput
            style={styles.input}
            placeholder="Plaque d'immatriculation (optionnel)"
            placeholderTextColor={colors.textFaint}
            value={licensePlate}
            onChangeText={setLicensePlate}
          />

          <Text style={styles.label}>Pièce d'identité (CNI, permis...)</Text>
          <Pressable style={styles.uploadBox} onPress={pickIdCard}>
            {idCardUri ? (
              <Image source={{ uri: idCardUri }} style={styles.uploadPreview} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={24} color={colors.textFaint} />
                <Text style={styles.uploadText}>Ajouter une photo</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.label}>Zones de service ({zones.length} sélectionnée{zones.length > 1 ? 's' : ''})</Text>
          <TextInput
            style={styles.input}
            placeholder="Rechercher une commune..."
            placeholderTextColor={colors.textFaint}
            value={zoneQuery}
            onChangeText={setZoneQuery}
          />
          <View style={styles.chipRow}>
            {filteredCommunes.map((commune) => {
              const active = zones.includes(commune);
              return (
                <Pressable key={commune} style={[styles.zoneChip, active && styles.zoneChipActive]} onPress={() => toggleZone(commune)}>
                  <Text style={[styles.zoneChipText, active && { color: '#fff' }]}>{commune}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button title="Envoyer ma candidature" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} style={{ marginTop: 12 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 6, marginBottom: 20 },
  form: { gap: 12 },
  label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginTop: 6 },
  input: {
    height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
  },
  vehicleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  uploadBox: {
    height: 140, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden',
  },
  uploadPreview: { width: '100%', height: '100%' },
  uploadText: { fontSize: 12, color: colors.textFaint, fontWeight: '700' },
  zoneChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  zoneChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  zoneChipText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
});
