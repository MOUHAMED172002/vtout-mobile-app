import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getHierarchy, createLocation, deleteLocation } from '../../services/adminGeographyService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

const LEVELS = ['department', 'commune', 'arrondissement', 'quartier'];
const LEVEL_LABELS = { department: 'Départements', commune: 'Communes', arrondissement: 'Arrondissements', quartier: 'Quartiers' };
const LEVEL_SINGULAR = { department: 'un département', commune: 'une commune', arrondissement: 'un arrondissement', quartier: 'un quartier' };
const CHILD_KEY = { department: 'communes', commune: 'arrondissements', arrondissement: 'quartiers' };

// Descend dans l'arbre en suivant le chemin choisi et renvoie les items du
// niveau courant (départements à la racine si `path` est vide).
function getCurrentItems(tree, path) {
  let items = tree;
  for (const step of path) {
    const found = (items || []).find((i) => String(i.id) === String(step.id));
    if (!found) return [];
    items = found[CHILD_KEY[step.level]] || [];
  }
  return items || [];
}

export default function AdminGeographyScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [tree, setTree] = useState([]);
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getHierarchy();
      setTree(Array.isArray(data) ? data : []);
    } catch (err) {
      setTree([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentLevel = LEVELS[path.length];
  const currentItems = useMemo(() => getCurrentItems(tree, path), [tree, path]);
  const parent = path.length > 0 ? path[path.length - 1] : null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      await createLocation({ type: currentLevel, parentId: parent?.id, name: newName.trim() }, token);
      setNewName('');
      setShowAddModal(false);
      await load();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ajouter cet élément.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${item.name}" ? Tous les éléments qu'il contient seront aussi supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await deleteLocation(currentLevel, item.id, token);
              await load();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer cet élément.');
            }
          },
        },
      ],
    );
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.breadcrumbBar}>
        {path.length > 0 ? (
          <Pressable style={styles.backBtn} onPress={() => setPath(path.slice(0, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}
        <View style={styles.breadcrumbTrail}>
          <Pressable onPress={() => setPath([])}>
            <Text style={[styles.breadcrumbText, path.length === 0 && styles.breadcrumbTextActive]}>Bénin</Text>
          </Pressable>
          {path.map((step, idx) => (
            <React.Fragment key={step.id}>
              <Text style={styles.breadcrumbSep}> / </Text>
              <Pressable onPress={() => setPath(path.slice(0, idx + 1))}>
                <Text style={[styles.breadcrumbText, idx === path.length - 1 && styles.breadcrumbTextActive]} numberOfLines={1}>
                  {step.name}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      </View>

      <Text style={styles.levelTitle}>{LEVEL_LABELS[currentLevel]}</Text>

      {currentItems.length === 0 ? (
        <EmptyState icon="map-outline" title="Aucun élément" subtitle="Ajoutez-en un avec le bouton +." />
      ) : (
        <FlatList
          data={currentItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const childCount = currentLevel !== 'quartier' ? (item[CHILD_KEY[currentLevel]] || []).length : 0;
            const isLeaf = currentLevel === 'quartier';
            return (
              <Pressable
                style={styles.row}
                disabled={isLeaf}
                onPress={() => setPath([...path, { id: item.id, name: item.name, level: currentLevel }])}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {!isLeaf && <Text style={styles.rowSub}>{childCount} {LEVEL_LABELS[LEVELS[LEVELS.indexOf(currentLevel) + 1]].toLowerCase()}</Text>}
                </View>
                <Pressable style={styles.trashBtn} onPress={() => handleDelete(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </Pressable>
                {!isLeaf && <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => !saving && setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalBackdrop} onPress={() => !saving && setShowAddModal(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Ajouter {LEVEL_SINGULAR[currentLevel]}</Text>
              {parent && <Text style={styles.modalSubtitle}>Dans {parent.name}</Text>}
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Nom..."
                placeholderTextColor={colors.textFaint}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable style={styles.modalCancel} onPress={() => setShowAddModal(false)} disabled={saving}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Button title="Ajouter" loading={saving} onPress={handleAdd} disabled={!newName.trim()} />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  breadcrumbBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 4 },
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  backBtnSpacer: { width: 30, height: 30 },
  breadcrumbTrail: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  breadcrumbText: { fontSize: 12, fontWeight: '700', color: colors.textFaint },
  breadcrumbTextActive: { color: colors.text },
  breadcrumbSep: { fontSize: 12, color: colors.textFaint },
  levelTitle: { fontSize: 18, fontWeight: '900', color: colors.text, paddingHorizontal: 16, paddingTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  rowName: { fontSize: 14, fontWeight: '800', color: colors.text },
  rowSub: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  trashBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', right: 16, bottom: 16, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 32,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 11, fontWeight: '600', color: colors.textFaint, marginTop: 2, marginBottom: 12 },
  input: {
    height: 50, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12,
  },
  modalCancel: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
});
