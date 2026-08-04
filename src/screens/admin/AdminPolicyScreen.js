import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllPoliciesAdmin, createPolicy, updatePolicy } from '../../services/adminContentService';
import Loading from '../../components/Loading';

const POLICY_TYPES = [
  { type: 'cgv', label: 'CGV', defaultTitle: 'Conditions générales de vente' },
  { type: 'privacy', label: 'Confidentialité', defaultTitle: 'Politique de confidentialité' },
  { type: 'return', label: 'Retours', defaultTitle: 'Politique de retour' },
  { type: 'mentions_legales', label: 'Mentions légales', defaultTitle: 'Mentions légales' },
  { type: 'general', label: 'Générale', defaultTitle: 'Politique générale' },
  { type: 'supplier', label: 'Fournisseur', defaultTitle: 'Politique fournisseur' },
  { type: 'delivery', label: 'Livreur', defaultTitle: 'Politique livreur' },
];

export default function AdminPolicyScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllPoliciesAdmin(token);
      setPolicies(data);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (typeInfo) => {
    const existing = policies.find((p) => p.type === typeInfo.type);
    setSelected({ typeInfo, existing });
    setTitle(existing?.title || typeInfo.defaultTitle);
    setContent(existing?.content || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Champs manquants', 'Titre et contenu requis.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = { title: title.trim(), content: content.trim(), type: selected.typeInfo.type };
      if (selected.existing) {
        await updatePolicy(selected.existing.id, payload, token);
      } else {
        await createPolicy(payload, token);
      }
      setShowModal(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={POLICY_TYPES}
        keyExtractor={(item) => item.type}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const existing = policies.find((p) => p.type === item.type);
          return (
            <Pressable style={styles.card} onPress={() => openEdit(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{existing?.title || item.defaultTitle}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.label}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: existing ? `${colors.success}20` : `${colors.textFaint}20` }]}>
                    <Text style={[styles.badgeText, { color: existing ? colors.success : colors.textMuted }]}>
                      {existing ? 'Publiée' : 'Non définie'}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" onRequestClose={() => !saving && setShowModal(false)}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected?.typeInfo.label}</Text>
              <Pressable onPress={() => setShowModal(false)} style={styles.modalClose} disabled={saving}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.label}>Titre</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Contenu</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Contenu complet de la politique..."
                  placeholderTextColor={colors.textFaint}
                  multiline
                  numberOfLines={20}
                />
              </View>
              <Pressable style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  typeBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full, backgroundColor: `${colors.secondary}20` },
  typeBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', color: colors.secondary },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    minHeight: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  textArea: { height: 320, textAlignVertical: 'top', paddingTop: 12 },
  saveButton: {
    marginTop: 4, height: 50, borderRadius: radius.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
