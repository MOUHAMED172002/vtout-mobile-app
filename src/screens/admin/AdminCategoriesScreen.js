import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllCategoriesAdmin, createCategory, updateCategory, deleteCategory } from '../../services/adminCategoryService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function AdminCategoriesScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', parentId, category }
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAllCategoriesAdmin();
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const topLevel = categories.filter((c) => !c.parent_id);

  const openCreate = (parentId = null) => {
    setNameInput('');
    setModal({ mode: 'create', parentId });
  };

  const openEdit = (category) => {
    setNameInput(category.name || '');
    setModal({ mode: 'edit', category });
  };

  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Nom requis', 'Merci de saisir un nom de catégorie.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      if (modal.mode === 'create') {
        await createCategory({ name: nameInput.trim(), parent_id: modal.parentId || null }, token);
      } else {
        await updateCategory(modal.category.id, { name: nameInput.trim() }, token);
      }
      closeModal();
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'enregistrer cette catégorie.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (category) => {
    Alert.alert('Supprimer', `Supprimer la catégorie "${category.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await deleteCategory(category.id, token);
            load();
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de supprimer cette catégorie.');
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {topLevel.length === 0 ? (
        <EmptyState icon="grid-outline" title="Aucune catégorie" />
      ) : (
        <FlatList
          data={topLevel}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.group}>
              <View style={styles.row}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Pressable style={styles.iconBtn} onPress={() => openCreate(item.id)}>
                  <Ionicons name="add" size={16} color={colors.secondary} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="pencil" size={14} color={colors.text} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                </Pressable>
              </View>
              {(item.children || []).map((child) => (
                <View key={child.id} style={[styles.row, styles.childRow]}>
                  <Ionicons name="return-down-forward" size={13} color={colors.textFaint} style={{ marginRight: 4 }} />
                  <Text style={styles.rowNameChild} numberOfLines={1}>{child.name}</Text>
                  <Pressable style={styles.iconBtn} onPress={() => openEdit(child)}>
                    <Ionicons name="pencil" size={14} color={colors.text} />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => handleDelete(child)}>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => openCreate(null)}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={() => !saving && closeModal()}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {modal?.mode === 'edit' ? 'Renommer la catégorie' : modal?.parentId ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Nom de la catégorie"
              placeholderTextColor={colors.textFaint}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable style={[styles.modalBtn, styles.modalBtnOutline]} onPress={closeModal} disabled={saving}>
                <Text style={styles.modalBtnOutlineText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.modalBtnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  childRow: { backgroundColor: colors.background, paddingLeft: 20 },
  rowName: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  rowNameChild: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
  iconBtn: { padding: 6 },
  fab: {
    position: 'absolute', right: 16, bottom: 16, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, gap: 14 },
  modalTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  modalInput: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  modalBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  modalBtnOutline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  modalBtnOutlineText: { color: colors.textMuted, fontWeight: '800', fontSize: 13 },
});
