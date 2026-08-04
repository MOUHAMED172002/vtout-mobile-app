import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getDeliveryMultiplierTiers, updateDeliveryMultiplierTiers } from '../../services/adminFeeService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

let rowIdCounter = 0;
const nextRowId = () => `row_${rowIdCounter++}`;

export default function AdminDeliveryMultiplierScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const tiers = await getDeliveryMultiplierTiers(token);
      setRows((tiers || []).map((t) => ({ id: nextRowId(), min: String(t.min ?? 0), multiplier: String(t.multiplier ?? 1) })));
    } catch (err) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: nextRowId(), min: '', multiplier: '' }]);
  };

  const removeRow = (id) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Comme pour les tranches de frais : le "max" de chaque palier est déduit
  // du "min" du palier suivant, la dernière tranche restant illimitée.
  const sortedRows = [...rows]
    .map((r) => ({ ...r, minNum: parseFloat(r.min) || 0 }))
    .sort((a, b) => a.minNum - b.minNum);

  const handleSave = async () => {
    for (const r of rows) {
      if (r.min === '' || r.multiplier === '' || isNaN(parseFloat(r.multiplier)) || parseFloat(r.multiplier) <= 0) {
        Alert.alert('Champs invalides', 'Chaque palier doit avoir une quantité minimum et un coefficient (> 0).');
        return;
      }
    }
    const tiers = sortedRows.map((r, idx) => ({
      min: r.minNum,
      max: idx === sortedRows.length - 1 ? null : sortedRows[idx + 1].minNum,
      multiplier: parseFloat(r.multiplier) || 1,
    }));
    setSaving(true);
    try {
      const token = await getToken();
      await updateDeliveryMultiplierTiers(tiers, token);
      Alert.alert('Enregistré', 'Les paliers de coefficient livreur ont été mis à jour.');
      load();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || "Impossible d'enregistrer les paliers.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Coefficient appliqué à la rémunération du livreur selon le nombre total d'articles d'une commande.
          </Text>

          {sortedRows.map((row, idx) => {
            const original = rows.find((r) => r.id === row.id);
            const isLast = idx === sortedRows.length - 1;
            const upper = isLast ? null : sortedRows[idx + 1].minNum;
            return (
              <View key={row.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {row.minNum} article{row.minNum > 1 ? 's' : ''} {isLast ? 'et plus' : `– ${upper}`}
                  </Text>
                  <Pressable onPress={() => removeRow(row.id)} disabled={rows.length <= 1} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={rows.length <= 1 ? colors.textFaint : colors.danger} />
                  </Pressable>
                </View>
                <View style={styles.fieldRow}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Quantité minimum</Text>
                    <TextInput
                      style={styles.input}
                      value={original.min}
                      onChangeText={(v) => updateRow(row.id, 'min', v)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textFaint}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Coefficient (×)</Text>
                    <TextInput
                      style={styles.input}
                      value={original.multiplier}
                      onChangeText={(v) => updateRow(row.id, 'multiplier', v)}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      placeholderTextColor={colors.textFaint}
                    />
                  </View>
                </View>
              </View>
            );
          })}

          <Pressable style={styles.addRowBtn} onPress={addRow}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addRowText}>Ajouter un palier</Text>
          </Pressable>

          <Button title="Enregistrer les paliers" onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  intro: { fontSize: 12, fontWeight: '600', color: colors.textMuted, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  fieldRow: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 6 },
  label: { fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    height: 46, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, fontSize: 14, fontWeight: '700', color: colors.text,
  },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  addRowText: { fontSize: 13, fontWeight: '800', color: colors.primary },
});
