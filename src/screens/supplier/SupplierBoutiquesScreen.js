import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyBoutiques, createBoutique, updateBoutique, deleteBoutique } from '../../services/supplierService';
import LocationPicker from '../../components/LocationPicker';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function SupplierBoutiquesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyBoutiques(token);
      setBoutiques(Array.isArray(data) ? data : []);
    } catch {
      setBoutiques([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setLocation(null);
    setShowForm(false);
  };

  const startEdit = (boutique) => {
    setEditingId(boutique.id);
    setName(boutique.name || '');
    setPhone(boutique.phone || boutique.whatsapp || '');
    setLocation(
      boutique.commune_id
        ? { commune_id: boutique.commune_id, commune_label: boutique.commune_label, departement_id: boutique.departement_id, departement_label: boutique.departement_label }
        : null
    );
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nom manquant', 'Merci de renseigner le nom de la boutique.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        name: name.trim(),
        phone,
        commune_id: location?.commune_id,
        commune_label: location?.commune_label,
        departement_id: location?.departement_id,
        departement_label: location?.departement_label,
      };
      if (editingId) await updateBoutique(editingId, payload, token);
      else await createBoutique(payload, token);
      resetForm();
      await load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'enregistrer cette boutique.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer cette boutique ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await deleteBoutique(id, token);
            load();
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de supprimer cette boutique.');
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={boutiques}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={!showForm ? <EmptyState icon="storefront-outline" title="Aucune boutique enregistrée" /> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name="storefront" size={18} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.commune_label || 'Zone non définie'}</Text>
              {item.phone ? <Text style={styles.sub}>{item.phone}</Text> : null}
            </View>
            <Pressable onPress={() => startEdit(item)} style={styles.iconBtn}>
              <Ionicons name="pencil" size={16} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            {showForm ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{editingId ? 'Modifier la boutique' : 'Nouvelle boutique'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom de la boutique"
                  placeholderTextColor={colors.textFaint}
                  value={name}
                  onChangeText={setName}
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
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Button title="Annuler" variant="outline" onPress={resetForm} style={{ flex: 1 }} />
                  <Button title="Enregistrer" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Button title="Ajouter une boutique" variant="outline" onPress={() => setShowForm(true)} icon={<Ionicons name="add" size={16} color={colors.text} />} />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  cardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '800', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  iconBtn: { padding: 6 },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  formTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
});
