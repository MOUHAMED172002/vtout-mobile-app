import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const SORT_OPTIONS = [
  { key: '', label: 'Plus récents' },
  { key: 'price_asc', label: 'Prix croissant' },
  { key: 'price_desc', label: 'Prix décroissant' },
];

// Équivalent mobile de FiltersPanelDrawer.jsx (web) : bouton flottant "Filtres"
// en bas à droite, ouvrant une feuille avec tri / prix / promotions.
export default function ProductFilterButton({ filters, onApply }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(filters || {});

  const open = () => { setDraft(filters || {}); setVisible(true); };
  const close = () => setVisible(false);
  const apply = () => { onApply(draft); close(); };
  const reset = () => { setDraft({}); onApply({}); close(); };

  const activeCount = Object.values(filters || {}).filter((v) => v !== undefined && v !== '' && v !== null).length;

  return (
    <>
      <Pressable style={styles.fab} onPress={open}>
        <Ionicons name="options-outline" size={17} color="#fff" />
        <Text style={styles.fabText}>Filtres{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="options-outline" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Filtres</Text>
                <Text style={styles.headerSubtitle}>Affinez votre recherche</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={close}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.body}>
              <Text style={styles.sectionLabel}>Trier par</Text>
              <View style={styles.chipsRow}>
                {SORT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key || 'recent'}
                    style={[styles.chip, (draft.sort || '') === opt.key && styles.chipActive]}
                    onPress={() => setDraft((d) => ({ ...d, sort: opt.key }))}
                  >
                    <Text style={[styles.chipText, (draft.sort || '') === opt.key && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Prix (FCFA)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  value={draft.minPrice != null ? String(draft.minPrice) : ''}
                  onChangeText={(t) => setDraft((d) => ({ ...d, minPrice: t.replace(/[^0-9]/g, '') }))}
                />
                <Text style={styles.priceDash}>—</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  value={draft.maxPrice != null ? String(draft.maxPrice) : ''}
                  onChangeText={(t) => setDraft((d) => ({ ...d, maxPrice: t.replace(/[^0-9]/g, '') }))}
                />
              </View>

              <Text style={styles.sectionLabel}>Offres</Text>
              <View style={styles.chipsRow}>
                <Pressable
                  style={[styles.chip, draft.isPromo === 'true' && styles.chipActive]}
                  onPress={() => setDraft((d) => ({ ...d, isPromo: d.isPromo === 'true' ? '' : 'true' }))}
                >
                  <Text style={[styles.chipText, draft.isPromo === 'true' && styles.chipTextActive]}>En promotion</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, draft.isFlashSale === 'true' && styles.chipActive]}
                  onPress={() => setDraft((d) => ({ ...d, isFlashSale: d.isFlashSale === 'true' ? '' : 'true' }))}
                >
                  <Text style={[styles.chipText, draft.isFlashSale === 'true' && styles.chipTextActive]}>Vente flash</Text>
                </Pressable>
              </View>

              <Pressable onPress={reset} style={styles.resetRow}>
                <Text style={styles.resetText}>Réinitialiser les filtres</Text>
              </Pressable>
            </View>

            <Pressable style={styles.applyBtn} onPress={apply}>
              <Ionicons name="options-outline" size={16} color="#fff" />
              <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  fab: {
    position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 48, paddingHorizontal: 18, borderRadius: radius.full, backgroundColor: colors.primary,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: '85%', paddingBottom: 24,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerIconWrap: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  headerSubtitle: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(243,112,33,0.1)' },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
  priceDash: { color: colors.textFaint, fontWeight: '700' },
  resetRow: { alignItems: 'center', marginTop: 10 },
  resetText: { fontSize: 12, fontWeight: '800', color: colors.danger, textTransform: 'uppercase' },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52,
    borderRadius: radius.md, backgroundColor: colors.primary, marginHorizontal: 20, marginTop: 18,
  },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});
