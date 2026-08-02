import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getMyAddresses, createAddress, deleteAddress } from '../services/addressService';
import LocationPicker from '../components/LocationPicker';
import Button from '../components/Button';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function AddressesScreen() {
  const { getToken } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [location, setLocation] = useState(null);
  const [addressLine, setAddressLine] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyAddresses(token);
      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setLocation(null);
    setAddressLine('');
    setPhone('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!location?.quartier_id || phone.trim().length < 8) {
      Alert.alert('Champs manquants', 'Sélectionnez un quartier et renseignez un numéro valide.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      await createAddress({
        label: 'Adresse',
        departement_id: location.departement_id,
        departement_label: location.departement_label,
        commune_id: location.commune_id,
        commune_label: location.commune_label,
        quartier_id: location.quartier_id,
        quartier_label: location.quartier_label,
        address_line: addressLine,
        phone,
        is_default: addresses.length === 0,
      }, token);
      resetForm();
      await load();
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer cette adresse.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer cette adresse ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const token = await getToken();
          await deleteAddress(id, token);
          load();
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={!showForm ? <EmptyState icon="location-outline" title="Aucune adresse enregistrée" /> : null}
        renderItem={({ item }) => (
          <View style={styles.addressCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>{item.quartier_label}, {item.commune_label}</Text>
              {item.address_line ? <Text style={styles.addressSub}>{item.address_line}</Text> : null}
              <Text style={styles.addressSub}>{item.phone}</Text>
            </View>
            <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            {showForm ? (
              <View style={styles.formCard}>
                <LocationPicker value={location} onChange={setLocation} />
                <TextInput
                  style={styles.input}
                  placeholder="Détails (rue, repère...) — optionnel"
                  placeholderTextColor={colors.textFaint}
                  value={addressLine}
                  onChangeText={setAddressLine}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Téléphone"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title="Annuler" variant="outline" onPress={resetForm} style={{ flex: 1 }} />
                  <Button title="Enregistrer" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Button title="Ajouter une adresse" variant="outline" onPress={() => setShowForm(true)} icon={<Ionicons name="add" size={16} color={colors.text} />} />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  addressTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  addressSub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  deleteBtn: { padding: 6 },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
});
