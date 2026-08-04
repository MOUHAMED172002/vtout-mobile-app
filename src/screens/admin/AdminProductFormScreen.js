import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getProductById } from '../../services/productService';
import { createProductAdmin, updateProductAdmin } from '../../services/adminProductService';
import { getAllCategoriesAdmin } from '../../services/adminCategoryService';
import { getSuppliers } from '../../services/adminSupplierService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const STATUS_OPTIONS = [
  { key: 'approved', label: 'Approuvé' },
  { key: 'En attente', label: 'En attente' },
  { key: 'rejected', label: 'Rejeté' },
];

export default function AdminProductFormScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const editingId = route.params?.id || null;
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('approved');
  const [isFlashSale, setIsFlashSale] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [cats, sups] = await Promise.all([
        getAllCategoriesAdmin().catch(() => []),
        getSuppliers(await getToken()).catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSuppliers(Array.isArray(sups) ? sups : []);

      if (editingId) {
        const product = await getProductById(editingId);
        setName(product.name || '');
        setDescription(product.description || '');
        if (product.category) setCategory({ id: product.category.id, name: product.category.name });
        if (product.supplier) setSupplier({ id: product.supplier.id, name: product.supplier.name });
        setPrice(product.price != null ? String(product.price) : '');
        setOldPrice(product.old_price != null ? String(product.old_price) : '');
        setStock(product.stock != null ? String(product.stock) : '');
        setImageUrl(product.images?.[0]?.image_url || '');
        setApprovalStatus(product.approval_status || 'approved');
        setIsFlashSale(!!product.is_flash_sale);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données du formulaire.');
    } finally {
      setLoading(false);
    }
  }, [editingId, getToken]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    const missing = [];
    if (!name.trim()) missing.push('Nom du produit');
    if (!supplier) missing.push('Vendeur');
    if (!price || Number(price) <= 0) missing.push('Prix');
    if (!editingId && (stock === '' || isNaN(parseInt(stock, 10)))) missing.push('Stock');

    if (missing.length > 0) {
      Alert.alert('Champs manquants', missing.join(', '));
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category_id: category?.id ? parseInt(category.id, 10) : undefined,
        supplier_id: supplier.id,
        price: Number(price),
        old_price: oldPrice ? Number(oldPrice) : null,
        stock: stock !== '' ? parseInt(stock, 10) : undefined,
        images: imageUrl ? [{ url: imageUrl, isMain: true }] : undefined,
        approval_status: approvalStatus,
        is_flash_sale: isFlashSale,
      };

      if (editingId) {
        await updateProductAdmin(editingId, payload, token);
      } else {
        await createProductAdmin(payload, token);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const filteredCategories = categories.filter((c) => c.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  const filteredSuppliers = suppliers.filter((s) => (s.name || '').toLowerCase().includes(pickerSearch.toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Nom du produit</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Ventilateur de bureau" placeholderTextColor={colors.textFaint} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Vendeur</Text>
          <Pressable style={styles.selectBox} onPress={() => { setPickerSearch(''); setShowSupplierModal(true); }}>
            <Text style={supplier ? styles.selectText : styles.selectPlaceholder}>{supplier ? supplier.name : 'Choisir un vendeur...'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Catégorie</Text>
          <Pressable style={styles.selectBox} onPress={() => { setPickerSearch(''); setShowCategoryModal(true); }}>
            <Text style={category ? styles.selectText : styles.selectPlaceholder}>{category ? category.name : 'Choisir une catégorie...'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Prix (FCFA)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="Ex: 7000" placeholderTextColor={colors.textFaint} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Ancien prix</Text>
            <TextInput style={styles.input} value={oldPrice} onChangeText={setOldPrice} keyboardType="number-pad" placeholder="Optionnel" placeholderTextColor={colors.textFaint} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Stock disponible</Text>
          <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="Ex: 20" placeholderTextColor={colors.textFaint} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Image (URL)</Text>
          <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." placeholderTextColor={colors.textFaint} autoCapitalize="none" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Détails du produit..." placeholderTextColor={colors.textFaint} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Statut d'approbation</Text>
          <View style={styles.chipsRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable key={opt.key} style={[styles.chip, approvalStatus === opt.key && styles.chipActive]} onPress={() => setApprovalStatus(opt.key)}>
                <Text style={[styles.chipText, approvalStatus === opt.key && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={styles.switchRow} onPress={() => setIsFlashSale((v) => !v)}>
          <Ionicons name={isFlashSale ? 'checkbox' : 'square-outline'} size={20} color={isFlashSale ? colors.primary : colors.textFaint} />
          <Text style={styles.switchLabel}>Vente flash</Text>
        </Pressable>

        <Button title={editingId ? 'Enregistrer les modifications' : 'Créer le produit'} onPress={handleSubmit} loading={saving} />
      </ScrollView>

      <Modal visible={showSupplierModal} animationType="slide" onRequestClose={() => setShowSupplierModal(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir un vendeur</Text>
            <Pressable onPress={() => setShowSupplierModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Rechercher..." placeholderTextColor={colors.textFaint} value={pickerSearch} onChangeText={setPickerSearch} />
          </View>
          <FlatList
            data={filteredSuppliers}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            renderItem={({ item }) => (
              <Pressable style={styles.pickerRow} onPress={() => { setSupplier({ id: item.id, name: item.name }); setShowSupplierModal(false); }}>
                <Text style={styles.pickerRowText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showCategoryModal} animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir une catégorie</Text>
            <Pressable onPress={() => setShowCategoryModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Rechercher..." placeholderTextColor={colors.textFaint} value={pickerSearch} onChangeText={setPickerSearch} />
          </View>
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            renderItem={({ item }) => (
              <Pressable style={styles.pickerRow} onPress={() => { setCategory({ id: item.id, name: item.name }); setShowCategoryModal(false); }}>
                <Text style={styles.pickerRowText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  selectBox: {
    height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectText: { fontSize: 14, fontWeight: '700', color: colors.text },
  selectPlaceholder: { fontSize: 14, fontWeight: '600', color: colors.textFaint },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(243,112,33,0.1)' },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', height: 46, marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerRowText: { fontSize: 13, fontWeight: '700', color: colors.text },
});
