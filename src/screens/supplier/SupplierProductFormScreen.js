import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  createProduct, updateProduct, uploadProductImage,
  getCategories, flattenCategories, getDeliveryFeeTiers, getCommissionRate,
  computeDeliveryFee, computePublicPrice, reverseSupplierPrice,
} from '../../services/supplierProductService';
import { getMyBoutiques } from '../../services/supplierService';
import { getProductById } from '../../services/productService';
import { getAllAttributes, createAttribute, addAttributeValue } from '../../services/adminAttributeService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const STEPS = [
  { id: 'info', title: 'Informations', icon: 'information-circle-outline' },
  { id: 'attributes', title: 'Attributs', icon: 'options-outline' },
  { id: 'images', title: 'Images', icon: 'image-outline' },
  { id: 'variants', title: 'Variantes & Prix', icon: 'layers-outline' },
];

const cartesianProduct = (arrays) => arrays.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())), [[]]);

let variantKeySeq = 0;
const nextVariantKey = () => `v${Date.now()}_${variantKeySeq++}`;

export default function SupplierProductFormScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const editingId = route.params?.id || null;
  const { getToken } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [deliveryTiers, setDeliveryTiers] = useState([]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [availableAttributes, setAvailableAttributes] = useState([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [selectedBoutiqueIds, setSelectedBoutiqueIds] = useState([]);
  const [supplierPrice, setSupplierPrice] = useState('');
  const [stock, setStock] = useState('');
  const [supplierNote, setSupplierNote] = useState('');
  const [images, setImages] = useState([]); // {uri or existingUrl, isMain}

  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [selectedValuesMap, setSelectedValuesMap] = useState({});
  const [attrSearchQuery, setAttrSearchQuery] = useState('');
  const [newValueDrafts, setNewValueDrafts] = useState({});
  const [inlineLoading, setInlineLoading] = useState(false);

  const [variants, setVariants] = useState([]);
  const variantsRef = useRef([]);
  useEffect(() => { variantsRef.current = variants; }, [variants]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [catData, boutData, tiersData, rate, attrData] = await Promise.all([
        getCategories().catch(() => []),
        getMyBoutiques(token).catch(() => []),
        getDeliveryFeeTiers(),
        getCommissionRate(),
        getAllAttributes(token).catch(() => []),
      ]);
      setCategories(flattenCategories(catData));
      setBoutiques(boutData || []);
      setDeliveryTiers(tiersData || []);
      setCommissionRate(rate);
      setAvailableAttributes(attrData || []);

      if (editingId) {
        const found = await getProductById(editingId).catch(() => null);
        if (found) {
          setName(found.name || '');
          setDescription(found.description || '');
          setCategory(found.category ? { id: found.category.id, name: found.category.name } : (found.category_id ? { id: found.category_id, name: 'Catégorie actuelle' } : null));
          const primaryBoutique = found.boutique_id ? [found.boutique_id] : [];
          const secondary = Array.isArray(found.secondary_boutique_ids) ? found.secondary_boutique_ids : [];
          setSelectedBoutiqueIds([...primaryBoutique, ...secondary].filter(Boolean));
          setSupplierPrice(found.supplier_price ? String(found.supplier_price) : '');
          setStock(String(found.stock ?? 0));
          setSupplierNote(found.supplier_note || '');
          setImages((found.images || []).map((img, idx) => ({ existingUrl: img.image_url, isMain: img.is_main || idx === 0 })));

          if (found.variants && found.variants.length > 0) {
            const loadedVariants = found.variants.map((v) => ({
              _key: nextVariantKey(),
              combination: v.combination || {},
              sku: v.sku || '',
              supplier_price: v.priceRows?.[0]?.price ? String(reverseSupplierPrice(v.priceRows[0].price, tiersData)) : '',
              stock: String(v.priceRows?.[0]?.stock ?? 0),
              image_url: v.priceRows?.[0]?.image_url || null,
            }));
            variantsRef.current = loadedVariants;
            setVariants(loadedVariants);

            // Reconstruit la sélection d'attributs/valeurs à partir des combinaisons existantes
            const attrs = [];
            const valuesMap = {};
            loadedVariants.forEach((v) => {
              Object.entries(v.combination || {}).forEach(([attrName, val]) => {
                const attr = (attrData || []).find((a) => a.name === attrName);
                if (!attr) return;
                if (!attrs.find((a) => a.id === attr.id)) attrs.push(attr);
                const valueObj = (attr.values || []).find((vv) => vv.value === val);
                if (valueObj) {
                  valuesMap[attr.id] = [...new Set([...(valuesMap[attr.id] || []), valueObj.id])];
                }
              });
            });
            setSelectedAttributes(attrs);
            setSelectedValuesMap(valuesMap);
          } else if (!selectedBoutiqueIds.length && boutData?.length > 0) {
            setSelectedBoutiqueIds([boutData[0].id]);
          }
        }
      } else if (boutData && boutData.length > 0) {
        setSelectedBoutiqueIds([boutData[0].id]);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données du formulaire.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, editingId]);

  useEffect(() => { load(); }, [load]);

  // Génération automatique des variantes dès que chaque attribut sélectionné
  // a au moins une valeur cochée — préserve prix/stock/image déjà saisis.
  useEffect(() => {
    if (selectedAttributes.length === 0) {
      setVariants([]);
      return;
    }
    const allHaveValues = selectedAttributes.every((a) => (selectedValuesMap[a.id] || []).length > 0);
    if (!allHaveValues) {
      setVariants([]);
      return;
    }
    try {
      const combinations = cartesianProduct(selectedAttributes.map((a) => {
        const valIds = selectedValuesMap[a.id] || [];
        const chosenValues = (a.values || []).filter((v) => valIds.includes(v.id));
        return chosenValues.map((v) => ({ attribute: a.name, value: v.value }));
      }));

      const existingVariants = variantsRef.current;
      const newVariants = combinations.map((combo) => {
        const comboObj = {};
        const comboArray = Array.isArray(combo) ? combo : [combo];
        comboArray.forEach((item) => { comboObj[item.attribute] = item.value; });

        const existing = existingVariants.find((v) => JSON.stringify(v.combination) === JSON.stringify(comboObj));
        return existing || {
          _key: nextVariantKey(),
          combination: comboObj,
          sku: '',
          supplier_price: supplierPrice || '',
          stock: '',
          image_url: null,
          uri: null,
        };
      });
      setVariants(newVariants);
    } catch (e) { /* génération silencieuse */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAttributes, selectedValuesMap]);

  const toggleAttribute = (attr) => {
    setSelectedAttributes((prev) => (
      prev.find((a) => a.id === attr.id) ? prev.filter((a) => a.id !== attr.id) : [...prev, attr]
    ));
  };

  const toggleAttrValue = (attrId, valueId) => {
    setSelectedValuesMap((prev) => {
      const current = prev[attrId] || [];
      const next = current.includes(valueId) ? current.filter((id) => id !== valueId) : [...current, valueId];
      return { ...prev, [attrId]: next };
    });
  };

  const handleCreateAttribute = async () => {
    if (!attrSearchQuery.trim()) return;
    setInlineLoading(true);
    try {
      const token = await getToken();
      await createAttribute(attrSearchQuery.trim(), token);
      const updated = await getAllAttributes(token);
      setAvailableAttributes(updated);
      const created = updated.find((a) => a.name.toLowerCase() === attrSearchQuery.trim().toLowerCase());
      if (created) setSelectedAttributes((prev) => [...prev, created]);
      setAttrSearchQuery('');
    } catch (err) {
      Alert.alert('Erreur', "Impossible de créer l'attribut.");
    } finally {
      setInlineLoading(false);
    }
  };

  const handleAddValue = async (attrId) => {
    const value = (newValueDrafts[attrId] || '').trim();
    if (!value) return;
    setInlineLoading(true);
    try {
      const token = await getToken();
      await addAttributeValue({ attribute_id: attrId, value }, token);
      const updated = await getAllAttributes(token);
      setAvailableAttributes(updated);
      setNewValueDrafts((prev) => ({ ...prev, [attrId]: '' }));
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ajouter la valeur.");
    } finally {
      setInlineLoading(false);
    }
  };

  const toggleBoutique = (id) => {
    setSelectedBoutiqueIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          Alert.alert('Boutique requise', 'Au moins une boutique doit être sélectionnée.');
          return prev;
        }
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const pickProductImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour ajouter des images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImages((prev) => [
        ...prev,
        ...result.assets.map((a, idx) => ({ uri: a.uri, isMain: prev.length === 0 && idx === 0 })),
      ]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.isMain && next.length > 0) next[0].isMain = true;
      return next;
    });
  };

  const setMainImage = (index) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isMain: i === index })));
  };

  const pickVariantImage = async (variantKey) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setVariants((prev) => prev.map((v) => (v._key === variantKey ? { ...v, uri: result.assets[0].uri } : v)));
    }
  };

  const updateVariantField = (variantKey, field, value) => {
    setVariants((prev) => prev.map((v) => (v._key === variantKey ? { ...v, [field]: value } : v)));
  };

  const numericSupplierPrice = parseFloat(supplierPrice) || 0;
  const deliveryFee = computeDeliveryFee(numericSupplierPrice, deliveryTiers);
  const publicPrice = computePublicPrice(numericSupplierPrice, deliveryTiers);
  const netGain = Math.round(numericSupplierPrice * (1 - commissionRate / 100));

  const nextStep = () => {
    if (currentStep === 0) {
      if (!name.trim() || !category?.id) {
        Alert.alert('Champs requis', 'Nom et catégorie sont requis.');
        return;
      }
    }
    if (currentStep === 1 && selectedAttributes.length > 0 && variants.length === 0) {
      Alert.alert('Attributs incomplets', 'Sélectionnez au moins une valeur pour chaque attribut choisi.');
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const missing = [];
    if (!name.trim()) missing.push('Nom du produit');
    if (!category?.id) missing.push('Catégorie');
    if (selectedBoutiqueIds.length === 0) missing.push('Boutique de livraison');
    if (images.length === 0) missing.push('Au moins une image');
    if (variants.length === 0) {
      if (!numericSupplierPrice || numericSupplierPrice <= 0) missing.push('Prix de vente souhaité');
      if (stock === '' || isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) missing.push('Stock');
    } else {
      const invalid = variants.some((v) => !v.supplier_price || parseFloat(v.supplier_price) <= 0 || v.stock === '' || v.stock === undefined || isNaN(parseInt(v.stock, 10)));
      if (invalid) missing.push('Prix et stock de chaque variante');
    }

    if (missing.length > 0) {
      Alert.alert('Champs manquants', missing.join(', '));
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();

      const uploadedImages = [];
      for (const img of images) {
        if (img.existingUrl) {
          uploadedImages.push({ url: img.existingUrl, isMain: img.isMain });
        } else if (img.uri) {
          const filename = img.uri.split('/').pop() || 'photo.jpg';
          const ext = filename.split('.').pop()?.toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          const url = await uploadProductImage({ uri: img.uri, name: filename, type: mimeType }, token);
          uploadedImages.push({ url, isMain: img.isMain });
        }
      }
      const mainImageUrl = uploadedImages.find((i) => i.isMain)?.url || uploadedImages[0]?.url || null;

      const processedVariants = [];
      for (const v of variants) {
        let vImageUrl = v.image_url || mainImageUrl;
        if (v.uri) {
          const filename = v.uri.split('/').pop() || 'variant.jpg';
          const ext = filename.split('.').pop()?.toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          vImageUrl = await uploadProductImage({ uri: v.uri, name: filename, type: mimeType }, token);
        }
        const vSupplierPrice = parseFloat(v.supplier_price) || numericSupplierPrice || 0;
        const vPublicPrice = computePublicPrice(vSupplierPrice, deliveryTiers);
        processedVariants.push({
          combination: v.combination,
          sku: v.sku || '',
          stock: parseInt(v.stock, 10) || 0,
          price: vPublicPrice,
          image_url: vImageUrl,
          supplierLinks: [{ supplier_id: 'me', supplier_price: vSupplierPrice, supplier_sku: v.sku || null }],
        });
      }

      let finalSupplierPrice = numericSupplierPrice;
      if (processedVariants.length > 0) {
        const cheapest = processedVariants.reduce((prev, curr) => (prev.price < curr.price ? prev : curr));
        finalSupplierPrice = cheapest.supplierLinks[0].supplier_price;
      }
      const finalPublicPrice = computePublicPrice(finalSupplierPrice, deliveryTiers);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        category_id: parseInt(category.id, 10),
        images: uploadedImages,
        supplier_note: supplierNote.trim(),
        price: finalPublicPrice,
        old_price: 0,
        supplier_price: finalSupplierPrice,
        stock: parseInt(stock, 10) || 0,
        status: 'draft',
        approval_status: 'En attente',
        boutique_id: selectedBoutiqueIds[0] || null,
        secondary_boutique_ids: selectedBoutiqueIds.slice(1),
        variants: processedVariants,
        supplierLinks: processedVariants.length === 0 ? [{ supplier_id: 'me', supplier_price: finalSupplierPrice, supplier_sku: null }] : [],
      };

      if (editingId) {
        await updateProduct(editingId, payload, token);
        Alert.alert('Produit mis à jour', 'Vos modifications ont été envoyées pour validation.');
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
  const filteredAttributes = availableAttributes.filter((a) => a.name.toLowerCase().includes(attrSearchQuery.toLowerCase()));
  const canCreateAttr = attrSearchQuery.trim() && !availableAttributes.find((a) => a.name.toLowerCase() === attrSearchQuery.trim().toLowerCase());

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.stepper}>
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            <Pressable
              disabled={idx > currentStep}
              onPress={() => idx < currentStep && setCurrentStep(idx)}
              style={styles.stepperItem}
            >
              <View style={[styles.stepDot, idx === currentStep && styles.stepDotActive, idx < currentStep && styles.stepDotDone]}>
                {idx < currentStep ? (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                ) : (
                  <Text style={[styles.stepDotText, idx === currentStep && { color: '#fff' }]}>{idx + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, idx === currentStep && styles.stepLabelActive]} numberOfLines={1}>{step.title}</Text>
            </Pressable>
            {idx < STEPS.length - 1 && <View style={[styles.stepLine, idx < currentStep && styles.stepLineDone]} />}
          </React.Fragment>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {STEPS[currentStep].id === 'info' && (
            <>
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
                <Text style={styles.label}>Zones de livraison gratuite (vos boutiques)</Text>
                {boutiques.length === 0 ? (
                  <View style={styles.warningBox}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                    <Text style={styles.warningText}>Créez d'abord une boutique dans "Mes boutiques".</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {boutiques.map((b) => {
                      const checked = selectedBoutiqueIds.includes(b.id);
                      return (
                        <Pressable key={b.id} style={[styles.boutiqueOption, checked && styles.boutiqueOptionActive]} onPress={() => toggleBoutique(b.id)}>
                          <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={18} color={checked ? colors.primary : colors.textFaint} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.boutiqueName}>{b.name}</Text>
                            <Text style={styles.boutiqueSub}>{b.address_line || 'Adresse non spécifiée'}</Text>
                          </View>
                          {b.commune_label && (
                            <View style={styles.communeBadge}><Text style={styles.communeBadgeText}>{b.commune_label}</Text></View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <Text style={styles.helperNote}>Le produit est expédié depuis la première boutique sélectionnée. Les communes de toutes les boutiques sélectionnées bénéficient de la livraison gratuite.</Text>
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
            </>
          )}

          {STEPS[currentStep].id === 'attributes' && (
            <>
              <View style={styles.darkCard}>
                <Text style={styles.darkCardTitle}>Sélection des attributs</Text>
                <Text style={styles.darkCardSubtitle}>Choisissez les attributs (couleur, taille...) puis cochez leurs valeurs pour générer automatiquement les variantes.</Text>

                <View style={styles.attrSearchRow}>
                  <View style={styles.attrSearchInputWrap}>
                    <Ionicons name="search" size={15} color="rgba(255,255,255,0.4)" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.attrSearchInput}
                      value={attrSearchQuery}
                      onChangeText={setAttrSearchQuery}
                      placeholder="Chercher ou créer un attribut..."
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                  {canCreateAttr && (
                    <Pressable style={styles.createAttrBtn} onPress={handleCreateAttribute} disabled={inlineLoading}>
                      <Text style={styles.createAttrBtnText}>{inlineLoading ? '...' : '+ Créer'}</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.chipsRow}>
                  {filteredAttributes.map((attr) => {
                    const isSelected = !!selectedAttributes.find((a) => a.id === attr.id);
                    return (
                      <Pressable key={attr.id} style={[styles.attrChip, isSelected && styles.attrChipActive]} onPress={() => toggleAttribute(attr)}>
                        <Text style={[styles.attrChipText, isSelected && styles.attrChipTextActive]}>{attr.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {selectedAttributes.map((attr) => (
                  <View key={attr.id} style={styles.attrValuesBox}>
                    <Text style={styles.attrValuesTitle}>{attr.name}</Text>
                    <View style={styles.chipsRow}>
                      {(attr.values || []).map((v) => {
                        const checked = (selectedValuesMap[attr.id] || []).includes(v.id);
                        return (
                          <Pressable key={v.id} style={[styles.valueChip, checked && styles.valueChipActive]} onPress={() => toggleAttrValue(attr.id, v.id)}>
                            <Text style={[styles.valueChipText, checked && styles.valueChipTextActive]}>{v.value}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.addValueRow}>
                      <TextInput
                        style={styles.addValueInput}
                        value={newValueDrafts[attr.id] || ''}
                        onChangeText={(t) => setNewValueDrafts((prev) => ({ ...prev, [attr.id]: t }))}
                        placeholder="Nouvelle valeur..."
                        placeholderTextColor="rgba(255,255,255,0.35)"
                      />
                      <Pressable style={styles.addValueBtn} onPress={() => handleAddValue(attr.id)} disabled={inlineLoading}>
                        <Ionicons name="add" size={16} color="#fff" />
                      </Pressable>
                    </View>
                    {(!selectedValuesMap[attr.id] || selectedValuesMap[attr.id].length === 0) && (
                      <Text style={styles.attrWarning}>Choisissez au moins une valeur pour "{attr.name}"</Text>
                    )}
                  </View>
                ))}

                {selectedAttributes.length > 0 && (
                  <View style={styles.variantsSummary}>
                    <Ionicons name="layers-outline" size={14} color={colors.primary} />
                    <Text style={styles.variantsSummaryText}>
                      {variants.length > 0 ? `${variants.length} variante${variants.length > 1 ? 's' : ''} générée${variants.length > 1 ? 's' : ''}` : 'Sélectionnez les valeurs des attributs'}
                    </Text>
                  </View>
                )}
              </View>

              {selectedAttributes.length === 0 && (
                <Text style={styles.helperNote}>Aucun attribut sélectionné : ce produit sera vendu sans variante (un seul prix/stock global).</Text>
              )}
            </>
          )}

          {STEPS[currentStep].id === 'images' && (
            <>
              <View style={styles.imagesHeader}>
                <Text style={styles.sectionTitle}>Photos du produit</Text>
                <Pressable style={styles.addImagesBtn} onPress={pickProductImages}>
                  <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
                  <Text style={styles.addImagesBtnText}>Ajouter</Text>
                </Pressable>
              </View>

              {images.length === 0 ? (
                <View style={styles.imagesEmpty}>
                  <Ionicons name="image-outline" size={40} color={colors.textFaint} />
                  <Text style={styles.imagesEmptyText}>Aucune image ajoutée</Text>
                </View>
              ) : (
                <View style={styles.imagesGrid}>
                  {images.map((img, idx) => (
                    <View key={idx} style={[styles.imageCell, img.isMain && styles.imageCellMain]}>
                      <Image source={{ uri: img.existingUrl ? getThumbnail(img.existingUrl) : img.uri }} style={styles.imageCellPhoto} />
                      {img.isMain && (
                        <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Cover</Text></View>
                      )}
                      <View style={styles.imageCellActions}>
                        {!img.isMain && (
                          <Pressable style={styles.imageCellActionBtn} onPress={() => setMainImage(idx)}>
                            <Ionicons name="star-outline" size={13} color="#fff" />
                          </Pressable>
                        )}
                        <Pressable style={[styles.imageCellActionBtn, { backgroundColor: colors.danger }]} onPress={() => removeImage(idx)}>
                          <Ionicons name="trash-outline" size={13} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {STEPS[currentStep].id === 'variants' && (
            <>
              {variants.length === 0 && (
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
                  <View style={styles.field}>
                    <Text style={styles.label}>Stock disponible</Text>
                    <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="Ex: 20" placeholderTextColor={colors.textFaint} />
                  </View>
                </View>
              )}

              {variants.length > 0 && (
                <View style={{ gap: 12 }}>
                  <Text style={styles.sectionTitle}>Personnalisation des variantes</Text>
                  {variants.map((v) => {
                    const vPrice = parseFloat(v.supplier_price) || 0;
                    const vFee = computeDeliveryFee(vPrice, deliveryTiers);
                    const vPublic = computePublicPrice(vPrice, deliveryTiers);
                    const vPreview = v.uri || (v.image_url ? getThumbnail(v.image_url) : null);
                    return (
                      <View key={v._key} style={styles.variantCard}>
                        <Pressable style={styles.variantImage} onPress={() => pickVariantImage(v._key)}>
                          {vPreview ? (
                            <Image source={{ uri: vPreview }} style={styles.variantImagePhoto} />
                          ) : (
                            <>
                              <Ionicons name="image-outline" size={20} color={colors.textFaint} />
                              <Text style={styles.variantImageText}>Image</Text>
                            </>
                          )}
                        </Pressable>
                        <View style={{ flex: 1, gap: 8 }}>
                          <View style={styles.combinationRow}>
                            {Object.entries(v.combination || {}).map(([a, val], i) => (
                              <View key={i} style={styles.combinationChip}>
                                <Text style={styles.combinationChipText}>{a}: {val}</Text>
                              </View>
                            ))}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text style={styles.variantFieldLabel}>Votre prix souhaité</Text>
                              <TextInput
                                style={styles.variantInput}
                                value={v.supplier_price ? String(v.supplier_price) : ''}
                                onChangeText={(t) => updateVariantField(v._key, 'supplier_price', t)}
                                keyboardType="number-pad"
                                placeholder="Prix"
                                placeholderTextColor={colors.textFaint}
                              />
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text style={styles.variantFieldLabel}>Stock</Text>
                              <TextInput
                                style={styles.variantInput}
                                value={v.stock ? String(v.stock) : ''}
                                onChangeText={(t) => updateVariantField(v._key, 'stock', t)}
                                keyboardType="number-pad"
                                placeholder="Stock"
                                placeholderTextColor={colors.textFaint}
                              />
                            </View>
                          </View>
                          {vPrice > 0 && (
                            <Text style={styles.variantPriceHint}>
                              + {formatPrice(vFee)} F livr. = <Text style={{ color: colors.primary }}>{formatPrice(vPublic)} F public</Text> · Gain net {formatPrice(vPrice)} F
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          <Text style={styles.helperNote}>
            Toute modification substantielle (nom, catégorie, prix...) sera resoumise à validation par l'équipe Vtout.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={[styles.footerBtn, styles.footerBtnGhost, currentStep === 0 && { opacity: 0 }]} disabled={currentStep === 0} onPress={prevStep}>
            <Text style={styles.footerBtnGhostText}>Précédent</Text>
          </Pressable>
          {currentStep < STEPS.length - 1 ? (
            <Pressable style={styles.footerBtnPrimary} onPress={nextStep}>
              <Text style={styles.footerBtnPrimaryText}>Continuer</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
          ) : (
            <Button title={editingId ? 'Enregistrer' : 'Envoyer pour validation'} onPress={handleSubmit} loading={saving} style={{ flex: 1 }} />
          )}
        </View>
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
  stepper: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stepperItem: { alignItems: 'center', gap: 4, width: 62 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepDotText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  stepLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase', textAlign: 'center' },
  stepLabelActive: { color: colors.text },
  stepLine: { flex: 1, height: 1, backgroundColor: colors.border, marginBottom: 16 },
  stepLineDone: { backgroundColor: colors.success },
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
  communeBadge: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  communeBadgeText: { fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  helperNote: { fontSize: 11, color: colors.textFaint, fontWeight: '600', fontStyle: 'italic' },
  darkCard: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 16, gap: 14 },
  darkCardTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  darkCardSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600', marginTop: -8 },
  attrSearchRow: { flexDirection: 'row', gap: 8 },
  attrSearchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, paddingHorizontal: 12, height: 42,
  },
  attrSearchInput: { flex: 1, fontSize: 12, fontWeight: '600', color: '#fff' },
  createAttrBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  createAttrBtnText: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attrChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  attrChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  attrChipText: { fontSize: 10.5, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  attrChipTextActive: { color: '#fff' },
  attrValuesBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 14, gap: 10 },
  attrValuesTitle: { fontSize: 11, fontWeight: '900', color: colors.primary, textTransform: 'uppercase' },
  valueChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  valueChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  valueChipText: { fontSize: 10.5, fontWeight: '700', color: '#fff' },
  valueChipTextActive: { color: '#fff' },
  addValueRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addValueInput: {
    flex: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.sm, paddingHorizontal: 10, fontSize: 11, fontWeight: '600', color: '#fff',
  },
  addValueBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  attrWarning: { fontSize: 10, fontWeight: '700', color: colors.warning },
  variantsSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.md, padding: 12 },
  variantsSummaryText: { fontSize: 11.5, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  imagesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addImagesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
  },
  addImagesBtnText: { fontSize: 10.5, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  imagesEmpty: {
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.lg,
    paddingVertical: 50, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imagesEmptyText: { fontSize: 11, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageCell: { width: '31%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', borderWidth: 3, borderColor: colors.surface, backgroundColor: colors.surface },
  imageCellMain: { borderColor: colors.primary },
  imageCellPhoto: { width: '100%', height: '100%' },
  mainBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  mainBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  imageCellActions: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 4 },
  imageCellActionBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
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
  variantCard: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14,
  },
  variantImage: {
    width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.background,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  variantImagePhoto: { width: '100%', height: '100%' },
  variantImageText: { fontSize: 8, fontWeight: '800', color: colors.textFaint, marginTop: 2, textTransform: 'uppercase' },
  combinationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  combinationChip: { backgroundColor: colors.text, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  combinationChipText: { fontSize: 9, fontWeight: '800', color: colors.surface, textTransform: 'uppercase' },
  variantFieldLabel: { fontSize: 9, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  variantInput: {
    height: 38, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 10, fontSize: 12, fontWeight: '800', color: colors.secondary,
  },
  variantPriceHint: { fontSize: 9.5, fontWeight: '700', color: colors.textFaint },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  footerBtn: { paddingHorizontal: 16, paddingVertical: 14 },
  footerBtnGhost: { backgroundColor: colors.background, borderRadius: radius.md },
  footerBtnGhostText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  footerBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15,
  },
  footerBtnPrimaryText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
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
