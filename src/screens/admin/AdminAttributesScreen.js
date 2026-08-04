import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, RefreshControl, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAllAttributes,
  createAttribute,
  deleteAttribute,
  getAttributeValues,
  addAttributeValue,
  deleteAttributeValue,
} from '../../services/adminAttributeService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function AdminAttributesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();

  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState([]);
  const [valuesLoading, setValuesLoading] = useState(false);

  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [savingAttribute, setSavingAttribute] = useState(false);

  const [newValue, setNewValue] = useState('');
  const [savingValue, setSavingValue] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllAttributes(token);
      setAttributes(Array.isArray(data) ? data : []);
    } catch (err) {
      setAttributes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const loadValues = useCallback(async (attribute) => {
    setValuesLoading(true);
    try {
      const token = await getToken();
      const data = await getAttributeValues(attribute.id, token);
      setValues(Array.isArray(data) ? data : []);
    } catch (err) {
      setValues([]);
    } finally {
      setValuesLoading(false);
    }
  }, [getToken]);

  const openAttribute = (attribute) => {
    setSelected(attribute);
    loadValues(attribute);
  };

  const handleCreateAttribute = async () => {
    const name = newAttributeName.trim();
    if (!name) return;
    setSavingAttribute(true);
    try {
      const token = await getToken();
      const created = await createAttribute(name, token);
      setAttributes((prev) => [...prev, { ...created, values: [] }]);
      setNewAttributeName('');
      setShowAddAttribute(false);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible de créer l'attribut.");
    } finally {
      setSavingAttribute(false);
    }
  };

  const handleDeleteAttribute = (attribute) => {
    Alert.alert('Supprimer l\'attribut', `Supprimer "${attribute.name}" et toutes ses valeurs ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await deleteAttribute(attribute.id, token);
            setAttributes((prev) => prev.filter((a) => a.id !== attribute.id));
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || "Impossible de supprimer l'attribut.");
          }
        },
      },
    ]);
  };

  const handleAddValue = async () => {
    const value = newValue.trim();
    if (!value || !selected) return;
    setSavingValue(true);
    try {
      const token = await getToken();
      const created = await addAttributeValue({ attribute_id: selected.id, value }, token);
      setValues((prev) => [...prev, created]);
      setNewValue('');
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'ajouter la valeur.");
    } finally {
      setSavingValue(false);
    }
  };

  const handleDeleteValue = (value) => {
    Alert.alert('Supprimer la valeur', `Supprimer "${value.value}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await deleteAttributeValue(value.id, token);
            setValues((prev) => prev.filter((v) => v.id !== value.id));
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de supprimer cette valeur.');
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  if (selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.detailHeader}>
          <Pressable style={styles.backBtn} onPress={() => { setSelected(null); setValues([]); setNewValue(''); }}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.detailTitle} numberOfLines={1}>{selected.name}</Text>
        </View>

        {valuesLoading ? (
          <Loading />
        ) : (
          <View style={styles.chipsWrap}>
            {values.length === 0 ? (
              <EmptyState icon="pricetags-outline" title="Aucune valeur" subtitle="Ajoutez une valeur ci-dessous." />
            ) : (
              values.map((v) => (
                <View key={v.id} style={styles.chip}>
                  <Text style={styles.chipText}>{v.value}</Text>
                  <Pressable onPress={() => handleDeleteValue(v)} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textFaint} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.addValueBar}>
          <TextInput
            style={styles.addValueInput}
            placeholder="Nouvelle valeur (ex: Rouge)"
            placeholderTextColor={colors.textFaint}
            value={newValue}
            onChangeText={setNewValue}
            onSubmitEditing={handleAddValue}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.addValueBtn, (!newValue.trim() || savingValue) && styles.addValueBtnDisabled]}
            onPress={handleAddValue}
            disabled={!newValue.trim() || savingValue}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {attributes.length === 0 ? (
        <EmptyState icon="options-outline" title="Aucun attribut" subtitle="Créez un attribut de variante (Couleur, Taille...)." />
      ) : (
        <FlatList
          data={attributes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openAttribute(item)}>
              <View style={styles.icon}>
                <Ionicons name="pricetag-outline" size={18} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.sub}>{(item.values?.length ?? 0)} valeur{(item.values?.length ?? 0) > 1 ? 's' : ''}</Text>
              </View>
              <Pressable style={styles.deleteBtn} onPress={() => handleDeleteAttribute(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowAddAttribute(true)}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>

      <Modal visible={showAddAttribute} animationType="fade" transparent onRequestClose={() => setShowAddAttribute(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvel attribut</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Couleur, Taille..."
              placeholderTextColor={colors.textFaint}
              value={newAttributeName}
              onChangeText={setNewAttributeName}
              autoFocus
              onSubmitEditing={handleCreateAttribute}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => { setShowAddAttribute(false); setNewAttributeName(''); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, (!newAttributeName.trim() || savingAttribute) && styles.addValueBtnDisabled]}
                onPress={handleCreateAttribute}
                disabled={!newAttributeName.trim() || savingAttribute}
              >
                <Text style={styles.modalConfirmText}>Créer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: `${colors.secondary}18`, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  deleteBtn: { padding: 6 },
  fab: {
    position: 'absolute', right: 16, bottom: 16, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalInput: {
    height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  modalConfirm: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.primary },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  detailTitle: { fontSize: 18, fontWeight: '900', color: colors.text, flex: 1 },
  chipsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, alignContent: 'flex-start' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 12,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  addValueBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
  },
  addValueInput: {
    flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
  addValueBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addValueBtnDisabled: { opacity: 0.5 },
});
