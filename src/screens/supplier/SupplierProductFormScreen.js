import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet, Image, Alert, Modal, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getMySupplierProducts, createProduct, updateProduct, uploadProductImage,
  getCategories, flattenCategories, getDeliveryFeeTiers, getCommissionRate,
  computeDeliveryFee, computePublicPrice,
} from '../../services/supplierProductService';
import { getMyBoutiques } from '../../services/supplierService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

export default function SupplierProductFormScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const editingId = route.params?.id || null;
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [deliveryTiers, setDeliveryTiers] = useState([]);
  const [commissionRate, setCommissionRate] = useState(10);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [boutiqueId, setBoutiqueId] = useState(null);
  const [supplierPrice, setSupplierPrice] = useState('');
  const [stock, setStock] = useState('');
  const [supplierNote, setSupplierNote] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [catData, boutData, tiersData, rate] = await Promise.all([
        getCategories().catch(() => []),
        getMyBoutiques(token).catch(() => []),
        getDeliveryFeeTiers(),
        getCommissionRate(),
      ]);
      setCategories(flattenCategories(catData));
      setBoutiques(boutData || []);
      setDeliveryTiers(tiersData || []);
      setCommissionRate(rate);

      if (!boutiqueId && boutData && boutData.length > 0) setBoutiqueId(boutData[0].id);

      if (editingId) {
        const products = await getMySupplierProducts(token);
        const found = (products || []).find((p) => String(p.id) === String(editingId));
        if (found) {
          setName(found.name || '');
          setDescription(found.description || '');
          setCategory(found.category ? { id: found.category.id, name: found.category.name } : (found.category_id ? { id: found.category_id, name: 'Catégorie actuelle' } : null));
          setBoutiqueId(found.boutique_id || (boutData?.[0]?.id ?? null));
          setSupplierPrice(found.supplier_price ? String(found.supplier_price) : '');
          setStock(String(found.stock ?? 0));
          setSupplierNote(found.supplier_note || '');
          setExistingImageUrl(found.images?.[0]?.image_url || null);
        }
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données du formulaire.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, editingId]);

  useEffect(() => { load(); }, [load]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour ajouter une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const numericSupplierPrice = parseFloat(supplierPrice) || 0;
  const deliveryFee = computeDeliveryFee(numericSupplierPrice, deliveryTiers);
  const publicPrice = computePublicPrice(numericSupplierPrice, deliveryTiers);
  const netGain = Math.round(numericSupplierPrice * (1 - commissionRate / 100));

  const handleSubmit = async () => {
    const missing = [];
    if (!name.trim()) missing.push('Nom du produit');
    if (!category?.id) missing.push('Catégorie');
    if (!boutiqueId) missing.push('Boutique');
    if (!imageUri && !existingImageUrl) missing.push('Image du produit');
    if (!numericSupplierPrice || numericSupplierPrice <= 0) missing.push('Prix de vente souhaité');
    if (stock === '' || isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) missing.push('Stock');

    if (missing.length > 0) {
      Alert.alert('Champs manquants', missing.join(', '));
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      let imageUrl = existingImageUrl;
      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        imageUrl = await uploadProductImage({ uri: imageUri, name: filename, type: mimeType }, token);
      }

      const payload = {
        name: name.trim(),
        description: description.trim(),
        category_id: parseInt(category.id, 10),
        images: [{ url: imageUrl, isMain: true }],
        supplier_price: numericSupplierPrice,
        price: publicPrice,
        stock: parseInt(stock, 10) || 0,
        boutique_id: boutiqueId,
        secondary_boutique_ids: [],
        supplier_note: supplierNote.trim(),
        variants: [],
        supplierLinks: [{ supplier_id: 'me', supplier_price: numericSupplierPrice, supplier_sku: null }],
      };

      if (editingId) {
        await updateProduct(editingId, payload, token);
        Alert.alert('Produit mis à jour', "Vos modifications ont été envoyées pour validation.");
      } else {
        await createProduct(payload, token);
        Alert.alert('Produit envoyé', 'Votre produit a été soumis pour validation.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || err.response?.data?.details || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const filteredCategories = categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
  const displayImage = imageUri || (existingImageUrl ? getThumbnail(existingImageUrl) : null);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={28} color={colors.textFaint} />
                <Text style={styles.imagePlaceholderText}>Ajouter une photo</Text>
              </View>
            )}
            <View style={styles.imageEditBadge}>
              <Ionicons name="pencil" size={12} color="#fff" />
            </View>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>Nom du produit</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Ventilateur de bureau" placeholderTextColor={colors.textFaint} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Catégorie</Text>
            <Pressable style={styles.selectBox} onPress={() => setShowCategoryModal(true)}>
              <Text style={category ? styles.selectText : styles.selectPlaceholder}>{category ? category.name : 'Choisir une catégorie...'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Boutique de livraison</Text>
            {boutiques.length === 0 ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.warningText}>Créez d'abord une boutique dans "Mes boutiques".</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {boutiques.map((b) => (
                  <Pressable key={b.id} style={[styles.boutiqueOption, boutiqueId === b.id && styles.boutiqueOptionActive]} onPress={() => setBoutiqueId(b.id)}>
                    <Ionicons name={boutiqueId === b.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={boutiqueId === b.id ? colors.primary : colors.textFaint} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boutiqueName}>{b.name}</Text>
                      <Text style={styles.boutiqueSub}>{b.commune_label || 'Zone non définie'}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.priceCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Votre prix de vente souhaité (FCFA)</Text>
              <TextInput
                style={styles.priceInput}
                value={supplierPrice}
                onChangeText={setSupplierPrice}
                keyboardType="number-pad"
                placeholder="Ex: 7000"
                placeholderTextColor={colors.textFaint}
              />
            </View>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>Frais de livraison</Text>
                <Text style={styles.priceRowValue}>+ {formatPrice(deliveryFee)} F</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>Commission Vtout ({commissionRate}%)</Text>
                <Text style={[styles.priceRowValue, { color: colors.danger }]}>- {formatPrice(Math.round(numericSupplierPrice * (commissionRate / 100)))} F</Text>
              </View>
              <View style={[styles.priceRow, styles.priceRowTotal]}>
                <Text style={styles.priceRowTotalLabel}>Prix affiché aux clients</Text>
                <Text style={styles.priceRowTotalValue}>{formatPrice(publicPrice)} F</Text>
              </View>
              {numericSupplierPrice > 0 && (
                <View style={styles.netGainBox}>
                  <Text style={styles.netGainLabel}>Votre gain net</Text>
                  <Text style={styles.netGainValue}>{formatPrice(netGain)} F</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Stock disponible</Text>
            <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="Ex: 20" placeholderTextColor={colors.textFaint} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Détails du produit..."
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Note pour l'admin (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={supplierNote}
              onChangeText={setSupplierNote}
              placeholder="Ex: Disponible seulement en pack de 10..."
              placeholderTextColor={colors.textFaint}
            />
          </View>

          <Text style={styles.helperNote}>
            Toute modification substantielle (nom, catégorie, prix...) sera resoumise à validation par l'équipe Vtout.
          </Text>

          <Button title={editingId ? 'Enregistrer les modifications' : 'Envoyer pour validation'} onPress={handleSubmit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>

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
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={colors.textFaint}
              value={categorySearch}
              onChangeText={setCategorySearch}
            />
          </View>
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.categoryRow, { paddingLeft: 14 + item.depth * 16 }]}
                onPress={() => { setCategory({ id: item.id, name: item.name }); setShowCategoryModal(false); setCategorySearch(''); }}
              >
                <Text style={styles.categoryRowText}>{item.name}</Text>
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
  imagePicker: { alignSelf: 'center', width: 140, height: 140, borderRadius: radius.lg, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%', height: '100%', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  imagePlaceholderText: { fontSize: 10, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  imageEditBadge: {
    position: 'absolute', bottom: 6, right: 6, width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
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
  warningBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderWidth: 1,
    borderColor: '#fde68a', borderRadius: radius.md, padding: 12,
  },
  warningText: { fontSize: 12, color: colors.text, fontWeight: '600', flex: 1 },
  boutiqueOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.md, padding: 12,
  },
  boutiqueOptionActive: { borderColor: colors.primary, backgroundColor: '#fff7ed' },
  boutiqueName: { fontSize: 13, fontWeight: '700', color: colors.text },
  boutiqueSub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 1 },
  priceCard: { backgroundColor: '#eef2ff', borderRadius: radius.lg, padding: 16, gap: 14 },
  priceInput: {
    height: 54, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16,
    fontSize: 18, fontWeight: '900', color: colors.secondary,
  },
  priceBreakdown: { gap: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceRowLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  priceRowValue: { fontSize: 11, fontWeight: '800', color: colors.secondary },
  priceRowTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#c7d2fe' },
  priceRowTotalLabel: { fontSize: 12, fontWeight: '800', color: colors.text },
  priceRowTotalValue: { fontSize: 16, fontWeight: '900', color: colors.primary },
  netGainBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5',
    borderWidth: 1, borderColor: '#a7f3d0', borderRadius: radius.md, padding: 10, marginTop: 4,
  },
  netGainLabel: { fontSize: 10, fontWeight: '800', color: colors.success, textTransform: 'uppercase' },
  netGainValue: { fontSize: 14, fontWeight: '900', color: colors.success },
  helperNote: { fontSize: 11, color: colors.textFaint, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', height: 46, marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  categoryRow: { paddingVertical: 12, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  categoryRowText: { fontSize: 13, fontWeight: '700', color: colors.text },
});
