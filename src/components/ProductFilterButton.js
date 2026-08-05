import React, { useImperativeHandle, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, StyleSheet, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getCategories } from '../services/productService';
import { getHierarchy } from '../services/locationService';

const SORT_OPTIONS = [
  { key: '', label: 'Plus récents' },
  { key: 'price_asc', label: 'Prix croissant' },
  { key: 'price_desc', label: 'Prix décroissant' },
];

const PROMO_OPTIONS = [
  { key: 'all_promos', label: 'Toutes les promotions' },
  { key: 'isPromo', label: 'Réductions directes' },
  { key: 'isFlashSale', label: 'Ventes flash' },
  { key: 'hasVolumePricing', label: 'Prix dégressifs' },
  { key: 'isKit', label: 'Packs & kits' },
  { key: 'none', label: 'Aucune (normal)' },
];

const PRICE_PRESETS = [
  { label: '< 10k', min: 0, max: 10000 },
  { label: '10k - 50k', min: 10000, max: 50000 },
  { label: '> 50k', min: 50000, max: 500000 },
];

const removeAccents = (str) => (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const flattenCategories = (categories = []) => {
  const byParent = {};
  categories.forEach((c) => {
    const key = c.parent_id || 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  });
  const result = [];
  const walk = (parentKey, depth) => {
    (byParent[parentKey] || []).forEach((cat) => {
      result.push({ id: cat.id, name: cat.name, depth });
      walk(cat.id, depth + 1);
    });
  };
  walk('root', 0);
  return result;
};

const flattenLocations = (rawData) => {
  const list = [];
  (rawData || []).forEach((dep) => {
    const depName = dep.name || dep.lib_dep;
    list.push({ type: 'département', displayName: depName, parentInfo: null, commune_label: null, formattedAddress: depName, searchStr: removeAccents(depName) });
    (dep.communes || []).forEach((com) => {
      const comName = com.name || com.lib_com;
      list.push({ type: 'commune', displayName: comName, parentInfo: depName, commune_label: comName, formattedAddress: comName, searchStr: removeAccents(comName) });
      (com.arrondissements || []).forEach((arr) => {
        const arrName = arr.name || arr.lib_arrond;
        list.push({ type: 'arrondissement', displayName: arrName, parentInfo: `${comName}, ${depName}`, commune_label: comName, formattedAddress: `${arrName} (${comName})`, searchStr: removeAccents(`${arrName} ${comName}`) });
        (arr.quartiers || []).forEach((q) => {
          const qName = q.name || q.lib_quart;
          list.push({ type: 'quartier', displayName: qName, parentInfo: `${arrName}, ${comName}`, commune_label: comName, formattedAddress: `${qName} (${arrName}, ${comName})`, searchStr: removeAccents(`${qName} ${arrName} ${comName}`) });
        });
      });
      (com.quartiers || []).forEach((q) => {
        const qName = q.name || q.lib_quart;
        list.push({ type: 'quartier', displayName: qName, parentInfo: comName, commune_label: comName, formattedAddress: `${qName} (${comName})`, searchStr: removeAccents(`${qName} ${comName}`) });
      });
    });
  });
  return list;
};

const activeFilterCount = (f) => Object.entries(f || {}).filter(([k, v]) => v !== undefined && v !== '' && v !== null && k !== 'sort').length;

// Équivalent mobile de FiltersPanelDrawer.jsx + FiltersPanel.jsx (web) :
// bouton "Filtres" ouvrant une feuille avec zone de livraison gratuite,
// promotions, tri, catégorie et prix — mêmes paramètres que GET /products
// (server/controllers/productController.js).
const ProductFilterButton = React.forwardRef(function ProductFilterButton({ filters, onApply, hideTrigger }, ref) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(filters || {});

  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneSearch, setZoneSearch] = useState('');
  const [selectedZoneLabel, setSelectedZoneLabel] = useState(filters?.freeDeliveryCommune || '');

  const open = () => {
    setDraft(filters || {});
    setSelectedZoneLabel(filters?.freeDeliveryCommune || '');
    setVisible(true);
    if (!categoriesLoaded) {
      getCategories().then((data) => { setCategories(data || []); setCategoriesLoaded(true); }).catch(() => setCategoriesLoaded(true));
    }
  };
  const close = () => setVisible(false);
  const apply = () => { onApply(draft); close(); };
  const reset = () => { setDraft({}); setSelectedZoneLabel(''); onApply({}); close(); };

  useImperativeHandle(ref, () => ({ open, close }));

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const filteredCategories = useMemo(
    () => (categorySearch.trim() ? flatCategories.filter((c) => c.name.toLowerCase().includes(categorySearch.trim().toLowerCase())) : flatCategories),
    [flatCategories, categorySearch]
  );
  const selectedCategory = flatCategories.find((c) => String(c.id) === String(draft.category_id));

  const openZoneModal = () => {
    setShowZoneModal(true);
    if (!locationsLoaded) {
      setLocationsLoading(true);
      getHierarchy()
        .then((data) => setLocations(flattenLocations(data)))
        .catch(() => setLocations([]))
        .finally(() => { setLocationsLoading(false); setLocationsLoaded(true); });
    }
  };
  const filteredLocations = useMemo(() => {
    if (!zoneSearch.trim()) return [];
    const q = removeAccents(zoneSearch.trim());
    return locations.filter((l) => l.searchStr.includes(q)).slice(0, 40);
  }, [locations, zoneSearch]);

  const activeCount = activeFilterCount(filters);

  const handlePromoSelect = (key) => {
    if (key === 'all_promos') {
      setDraft((d) => ({ ...d, isPromo: '', isFlashSale: '', isKit: '', hasVolumePricing: '', isAnyPromo: 'true' }));
    } else if (key === 'none') {
      setDraft((d) => ({ ...d, isPromo: '', isFlashSale: '', isKit: '', hasVolumePricing: '', isAnyPromo: '' }));
    } else {
      setDraft((d) => ({
        ...d,
        isPromo: key === 'isPromo' ? 'true' : '',
        isFlashSale: key === 'isFlashSale' ? 'true' : '',
        isKit: key === 'isKit' ? 'true' : '',
        hasVolumePricing: key === 'hasVolumePricing' ? 'true' : '',
        isAnyPromo: '',
      }));
    }
  };
  const isPromoActive = (key) => {
    if (key === 'all_promos') return draft.isAnyPromo === 'true';
    if (key === 'none') return !draft.isPromo && !draft.isFlashSale && !draft.isKit && !draft.hasVolumePricing && !draft.isAnyPromo;
    return draft[key] === 'true';
  };

  return (
    <>
      {!hideTrigger && (
        <Pressable style={styles.fab} onPress={open}>
          <Ionicons name="options-outline" size={17} color="#fff" />
          <Text style={styles.fabText}>Filtres{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
        </Pressable>
      )}

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

            <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.body}>
                  <Text style={styles.sectionLabel}>Livraison gratuite</Text>
                  {selectedZoneLabel ? (
                    <View style={styles.zoneSelectedBox}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.zoneSelectedText} numberOfLines={1}>{selectedZoneLabel}</Text>
                      <Pressable onPress={() => { setSelectedZoneLabel(''); setDraft((d) => ({ ...d, freeDeliveryCommune: '' })); }}>
                        <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.zoneBtn} onPress={openZoneModal}>
                      <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.zoneBtnText}>Choisir une zone (département, commune...)</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    </Pressable>
                  )}

                  <Text style={styles.sectionLabel}>Promotions & offres</Text>
                  <View style={{ gap: 6 }}>
                    {PROMO_OPTIONS.map((opt) => {
                      const active = isPromoActive(opt.key);
                      return (
                        <Pressable key={opt.key} style={[styles.optionRow, active && styles.optionRowActive]} onPress={() => handlePromoSelect(opt.key)}>
                          <Text style={[styles.optionRowText, active && styles.optionRowTextActive]}>{opt.label}</Text>
                          {active && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.sectionLabel}>Vendeur</Text>
                  <Pressable
                    style={[styles.optionRow, draft.isCertified === 'true' && styles.optionRowActive]}
                    onPress={() => setDraft((d) => ({ ...d, isCertified: d.isCertified === 'true' ? '' : 'true' }))}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={draft.isCertified === 'true' ? '#fff' : colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.optionRowText, draft.isCertified === 'true' && styles.optionRowTextActive]}>Vendeur certifié uniquement</Text>
                    {draft.isCertified === 'true' && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </Pressable>

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

                  <Text style={styles.sectionLabel}>Catégorie</Text>
                  <Pressable style={styles.zoneBtn} onPress={() => setShowCategoryModal(true)}>
                    <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.zoneBtnText, selectedCategory && { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                      {selectedCategory ? selectedCategory.name : 'Toutes les catégories'}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  </Pressable>

                  <Text style={styles.sectionLabel}>Prix (FCFA)</Text>
                  <View style={styles.chipsRow}>
                    {PRICE_PRESETS.map((p) => (
                      <Pressable
                        key={p.label}
                        style={styles.presetChip}
                        onPress={() => setDraft((d) => ({ ...d, minPrice: String(p.min), maxPrice: String(p.max) }))}
                      >
                        <Text style={styles.presetChipText}>{p.label}</Text>
                      </Pressable>
                    ))}
                  </View>
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

                  <Pressable onPress={reset} style={styles.resetRow}>
                    <Text style={styles.resetText}>Réinitialiser les filtres</Text>
                  </Pressable>
                </View>
            </ScrollView>

            <Pressable style={styles.applyBtn} onPress={apply}>
              <Ionicons name="options-outline" size={16} color="#fff" />
              <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCategoryModal} animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir une catégorie</Text>
            <Pressable style={styles.closeBtn} onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={colors.textFaint}
              value={categorySearch}
              onChangeText={setCategorySearch}
            />
          </View>
          {draft.category_id ? (
            <Pressable
              style={styles.clearCategoryRow}
              onPress={() => { setDraft((d) => ({ ...d, category_id: '' })); setShowCategoryModal(false); }}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.clearCategoryText}>Effacer la sélection (toutes les catégories)</Text>
            </Pressable>
          ) : null}
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.categoryRow, { paddingLeft: 14 + item.depth * 16 }]}
                onPress={() => { setDraft((d) => ({ ...d, category_id: String(item.id) })); setShowCategoryModal(false); setCategorySearch(''); }}
              >
                <Text style={styles.categoryRowText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <Modal visible={showZoneModal} animationType="slide" onRequestClose={() => setShowZoneModal(false)}>
        <View style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir une zone</Text>
            <Pressable style={styles.closeBtn} onPress={() => setShowZoneModal(false)}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            {locationsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
            )}
            <TextInput
              style={styles.searchInput}
              placeholder="Ex: Cotonou, Akassato, Abomey..."
              placeholderTextColor={colors.textFaint}
              value={zoneSearch}
              onChangeText={setZoneSearch}
              editable={!locationsLoading}
            />
          </View>
          {zoneSearch.trim() === '' ? (
            <View style={styles.zoneEmptyState}>
              <Ionicons name="search" size={22} color={colors.textFaint} />
              <Text style={styles.zoneEmptyText}>Commencez à taper pour chercher</Text>
            </View>
          ) : (
            <FlatList
              data={filteredLocations}
              keyExtractor={(item, idx) => `${item.type}-${item.formattedAddress}-${idx}`}
              contentContainerStyle={{ padding: 16, gap: 4 }}
              ListEmptyComponent={!locationsLoading ? <Text style={styles.zoneEmptyText}>Aucun résultat trouvé.</Text> : null}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.zoneRow}
                  onPress={() => {
                    if (item.commune_label) {
                      setSelectedZoneLabel(item.displayName);
                      setDraft((d) => ({ ...d, freeDeliveryCommune: item.commune_label }));
                    }
                    setShowZoneModal(false);
                    setZoneSearch('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.zoneRowTitle} numberOfLines={1}>{item.displayName}</Text>
                    {item.parentInfo ? <Text style={styles.zoneRowSubtitle} numberOfLines={1}>{item.parentInfo}</Text> : null}
                  </View>
                  <Text style={styles.zoneRowType}>{item.type}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
});

export default ProductFilterButton;

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
    maxHeight: '88%', paddingBottom: 24,
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
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12 },
  zoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: radius.md,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14,
  },
  zoneBtnText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  zoneSelectedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: radius.md,
    backgroundColor: `${colors.success}12`, borderWidth: 1, borderColor: `${colors.success}40`, paddingHorizontal: 14,
  },
  zoneSelectedText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.text },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14,
    paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.background,
  },
  optionRowActive: { backgroundColor: colors.text },
  optionRowText: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
  optionRowTextActive: { color: '#fff' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(243,112,33,0.1)' },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  presetChipText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
  priceDash: { color: colors.textFaint, fontWeight: '700' },
  resetRow: { alignItems: 'center', marginTop: 14 },
  resetText: { fontSize: 12, fontWeight: '800', color: colors.danger, textTransform: 'uppercase' },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52,
    borderRadius: radius.md, backgroundColor: colors.primary, marginHorizontal: 20, marginTop: 18,
  },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalSafe: { flex: 1, backgroundColor: colors.background, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', height: 46, marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  clearCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12 },
  clearCategoryText: { fontSize: 12, fontWeight: '700', color: colors.danger },
  categoryRow: { paddingVertical: 12, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  categoryRowText: { fontSize: 13, fontWeight: '700', color: colors.text },
  zoneEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  zoneEmptyText: { fontSize: 12, fontWeight: '600', color: colors.textFaint, textAlign: 'center' },
  zoneRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12,
  },
  zoneRowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  zoneRowSubtitle: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  zoneRowType: { fontSize: 9, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
});
