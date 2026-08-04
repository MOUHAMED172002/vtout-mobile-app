import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllFaqsAdmin, createFaq, updateFaq, deleteFaq } from '../../services/adminContentService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function AdminFaqScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllFaqsAdmin(token);
      setFaqs(data);
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, colors, styles]);

  const openCreate = () => {
    setSelected(null);
    setQuestion('');
    setAnswer('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setSelected(item);
    setQuestion(item.question || '');
    setAnswer(item.answer || '');
    setShowModal(true);
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Supprimer la FAQ',
      'Supprimer cette question ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await deleteFaq(item.id, token);
              load();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la FAQ.');
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Champs manquants', 'Question et réponse requises.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = { question: question.trim(), answer: answer.trim() };
      if (selected) {
        await updateFaq(selected.id, payload, token);
      } else {
        await createFaq(payload, token);
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
      {faqs.length === 0 ? (
        <EmptyState icon="help-circle-outline" title="Aucune question" subtitle="Ajoutez votre première question fréquente." />
      ) : (
        <FlatList
          data={faqs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openEdit(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.question} numberOfLines={2}>{item.question}</Text>
                <Text style={styles.answer} numberOfLines={2}>{item.answer}</Text>
              </View>
              <Pressable style={styles.trashButton} onPress={() => handleDelete(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => !saving && setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalBackdrop} onPress={() => !saving && setShowModal(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{selected ? 'Modifier la question' : 'Nouvelle question'}</Text>
              <View style={{ gap: 12, marginTop: 12 }}>
                <View style={styles.field}>
                  <Text style={styles.label}>Question</Text>
                  <TextInput
                    style={styles.input}
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="Ex: Comment suivre ma commande ?"
                    placeholderTextColor={colors.textFaint}
                    multiline
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Réponse</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={answer}
                    onChangeText={setAnswer}
                    placeholder="Réponse détaillée..."
                    placeholderTextColor={colors.textFaint}
                    multiline
                    numberOfLines={5}
                  />
                </View>
              </View>
              <Pressable style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </Pressable>
              <Pressable style={styles.modalCancel} onPress={() => setShowModal(false)} disabled={saving}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  question: { fontSize: 13, fontWeight: '800', color: colors.text },
  answer: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 4 },
  trashButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 32,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    minHeight: 46, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  saveButton: {
    marginTop: 16, height: 50, borderRadius: radius.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalCancel: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
});
