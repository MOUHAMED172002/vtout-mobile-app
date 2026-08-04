import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllConfigs, upsertConfig } from '../../services/adminConfigService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

// Ordre d'affichage des groupes connus (voir server/seedConfigs.js). Le
// groupe 'marketplace' (delivery_fee_tiers / delivery_fee_multiplier_tiers)
// est volontairement exclu ici : ces clés ont leurs propres écrans dédiés.
const GROUP_ORDER = ['branding', 'contact', 'social', 'features', 'supplier_landing', 'referral', 'api', 'whatsapp', 'cloudinary'];
const GROUP_LABELS = {
  branding: 'Image de marque',
  contact: 'Contact',
  social: 'Réseaux sociaux',
  features: 'Fonctionnalités',
  supplier_landing: 'Page vendeur',
  referral: 'Parrainage',
  api: 'API & services',
  whatsapp: 'WhatsApp API',
  cloudinary: 'Cloudinary',
  general: 'Général',
};
const EXCLUDED_GROUPS = ['marketplace'];

function isBooleanValue(value) {
  return value === 'true' || value === 'false';
}

export default function AdminConfigScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllConfigs(token);
      setConfigs(Array.isArray(data) ? data : []);
    } catch (err) {
      setConfigs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const sections = useMemo(() => {
    const byGroup = {};
    configs.forEach((cfg) => {
      const group = cfg.group || 'general';
      if (EXCLUDED_GROUPS.includes(group)) return;
      if (!byGroup[group]) byGroup[group] = [];
      byGroup[group].push(cfg);
    });
    const knownGroups = GROUP_ORDER.filter((g) => byGroup[g]);
    const otherGroups = Object.keys(byGroup).filter((g) => !GROUP_ORDER.includes(g)).sort();
    return [...knownGroups, ...otherGroups].map((group) => ({
      group,
      label: GROUP_LABELS[group] || group,
      items: byGroup[group],
    }));
  }, [configs]);

  const saveConfig = async (key, value, group) => {
    setSaving(true);
    try {
      const token = await getToken();
      await upsertConfig({ key, value, group }, token);
      setConfigs((prev) => prev.map((c) => (c.key === key ? { ...c, value } : c)));
      setEditing(null);
    } catch (err) {
      // l'admin peut réessayer
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (cfg) => {
    setEditing(cfg);
    setEditValue(cfg.value ?? '');
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {sections.map((section) => (
          <View key={section.group} style={{ gap: 8 }}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((cfg, idx) => (
                <View key={cfg.key} style={[styles.row, idx < section.items.length - 1 && styles.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{cfg.description || cfg.key}</Text>
                    <Text style={styles.rowKey}>{cfg.key}</Text>
                    {!isBooleanValue(cfg.value) && (
                      <Text style={styles.rowValue} numberOfLines={1}>{cfg.value || '—'}</Text>
                    )}
                  </View>
                  {isBooleanValue(cfg.value) ? (
                    <Switch
                      value={cfg.value === 'true'}
                      onValueChange={(v) => saveConfig(cfg.key, v ? 'true' : 'false', cfg.group)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                      disabled={saving}
                    />
                  ) : (
                    <Pressable style={styles.editBtn} onPress={() => openEditor(cfg)} hitSlop={8}>
                      <Ionicons name="pencil" size={16} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => !saving && setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalBackdrop} onPress={() => !saving && setEditing(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{editing?.description || editing?.key}</Text>
              <Text style={styles.modalSubtitle}>{editing?.key}</Text>
              <TextInput
                style={[styles.input, (editValue || '').length > 60 && styles.inputMultiline]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="Valeur..."
                placeholderTextColor={colors.textFaint}
                multiline={(editValue || '').length > 60}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable style={styles.modalCancel} onPress={() => setEditing(null)} disabled={saving}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Enregistrer"
                    loading={saving}
                    onPress={() => editing && saveConfig(editing.key, editValue, editing.group)}
                  />
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
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, paddingHorizontal: 4 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowKey: { fontSize: 10, fontWeight: '600', color: colors.textFaint, marginTop: 1 },
  rowValue: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 4 },
  editBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 32,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 11, fontWeight: '600', color: colors.textFaint, marginTop: 2, marginBottom: 12 },
  input: {
    minHeight: 50, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  modalCancel: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
});
