import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, FlatList, Pressable, TextInput, StyleSheet, Image, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getMySupplierProducts, updateProduct, getDeliveryFeeTiers, computePublicPrice, reverseSupplierPrice,
} from '../../services/supplierProductService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const TABS = [
  { id: 'all', label: 'Toutes' },
  { id: 'promo', label: 'Réductions' },
  { id: 'flash', label: 'Flash' },
  { id: 'volume', label: 'Dégressifs' },
  { id: 'kit', label: 'Kits' },
];

const hasPromoFlag = (p) => !!(p.old_price && parseFloat(p.old_price) > parseFloat(p.price));
const productPromoFlags = (p) => ({
  flash: !!p.is_flash_sale,
  volume: !!p.volume_pricing,
  kit: !!p.is_kit,
  promo: hasPromoFlag(p),
});

const emptyPromoForm = (product = null) => ({
  is_flash_sale: false,
  flash_sale_end: '',
  is_kit: false,
  kit_items: [],
  volume_pricing_enabled: false,
  volume_pricing: [{ qty: '3', discount: '10' }, { qty: '5', discount: '20' }],
  is_promo: false,
  old_supplier_price: product?.supplier_price ? String(product.supplier_price) : '',
  discount_percent: '',
  supplier_price: product?.supplier_price ? String(product.supplier_price) : '',
});

export default function SupplierPromotionsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();

  const [products, setProducts] = useState([]);
  const [deliveryTiers, setDeliveryTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [activePromoProduct, setActivePromoProduct] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [promoForm, setPromoForm] = useState(emptyPromoForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [list, tiers] = await Promise.all([
        getMySupplierProducts(token).catch(() => []),
        getDeliveryFeeTiers(),
      ]);
      setProducts(Array.isArray(list) ? list : []);
      setDeliveryTiers(tiers || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const promoProducts = useMemo(() => products.filter((p) => {
    const flags = productPromoFlags(p);
    const hasAny = flags.flash || flags.volume || flags.kit || flags.promo;
    if (activeTab === 'flash' && !flags.flash) return false;
    if (activeTab === 'volume' && !flags.volume) return false;
    if (activeTab === 'kit' && !flags.kit) return false;
    if (activeTab === 'promo' && !flags.promo) return false;
    if (activeTab === 'all' && !hasAny) return false;
    if (search) return p.name?.toLowerCase().includes(search.toLowerCase());
    return true;
  }), [products, activeTab, search]);

  const eligibleProducts = useMemo(
    () => products.filter((p) => p.name?.toLowerCase().includes(productSearch.toLowerCase())),
    [products, productSearch]
  );

  const stats = useMemo(() => ({
    total: products.filter((p) => { const f = productPromoFlags(p); return f.flash || f.volume || f.kit || f.promo; }).length,
    promo: products.filter((p) => productPromoFlags(p).promo).length,
    flash: products.filter((p) => p.is_flash_sale).length,
    volume: products.filter((p) => p.volume_pricing).length,
    kit: products.filter((p) => p.is_kit).length,
  }), [products]);

  const selectedKitProducts = useMemo(() => {
    if (!activePromoProduct) return [];
    return products.filter((p) => p.id !== activePromoProduct.id && promoForm.kit_items.includes(p.id));
  }, [activePromoProduct, promoForm.kit_items, products]);

  const kitBundleValue = useMemo(
    () => selectedKitProducts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0),
    [selectedKitProducts]
  );

  const handleStartNewPromo = () => {
    setIsAddMode(true);
    setModalStep(1);
    setActivePromoProduct(null);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleEditPromo = (product) => {
    setIsAddMode(false);
    setActivePromoProduct(product);

    let volumeTiers = [{ qty: '3', discount: '10' }, { qty: '5', discount: '20' }];
    if (product.volume_pricing) {
      try {
        const raw = typeof product.volume_pricing === 'string' ? JSON.parse(product.volume_pricing) : product.volume_pricing;
        volumeTiers = raw.map((t) => ({ qty: String(t.qty ?? t.min_qty ?? t.min ?? 1), discount: String(t.discount ?? 0) }));
      } catch { /* garde défaut */ }
    }
    let kitItems = [];
    if (product.kit_items) {
      try { kitItems = typeof product.kit_items === 'string' ? JSON.parse(product.kit_items) : product.kit_items; } catch { /* ignore */ }
    }

    const currentSupPrice = parseFloat(product.supplier_price) || 0;
    const isPromoActive = hasPromoFlag(product);
    const oldSupPrice = isPromoActive ? (reverseSupplierPrice(product.old_price, deliveryTiers) || currentSupPrice) : currentSupPrice;
    let discountPercent = '';
    if (isPromoActive && oldSupPrice > currentSupPrice && currentSupPrice > 0) {
      const pct = Math.round(((oldSupPrice - currentSupPrice) / oldSupPrice) * 100);
      if (pct > 0) discountPercent = String(pct);
    }

    setPromoForm({
      is_flash_sale: !!product.is_flash_sale,
      flash_sale_end: product.flash_sale_end ? new Date(product.flash_sale_end).toISOString().substring(0, 16) : '',
      is_kit: !!product.is_kit,
      kit_items: kitItems || [],
      volume_pricing_enabled: !!product.volume_pricing,
      volume_pricing: volumeTiers,
      is_promo: isPromoActive,
      old_supplier_price: String(oldSupPrice || ''),
      discount_percent: discountPercent,
      supplier_price: product.supplier_price ? String(product.supplier_price) : '',
    });
    setModalStep(2);
    setIsModalOpen(true);
  };

  const handleSelectProduct = (product) => {
    const flags = productPromoFlags(product);
    if (flags.flash || flags.volume || flags.kit || flags.promo) {
      handleEditPromo(product);
      return;
    }
    setActivePromoProduct(product);
    setPromoForm(emptyPromoForm(product));
    setModalStep(2);
  };

  const updatePromoOldPriceAndDiscount = (field, value) => {
    setPromoForm((prev) => {
      const next = { ...prev, [field]: value };
      const oldV = parseFloat(field === 'old_supplier_price' ? value : prev.old_supplier_price) || 0;
      const pct = parseFloat(field === 'discount_percent' ? value : prev.discount_percent) || 0;
      if (oldV > 0 && pct > 0 && pct < 100) {
        next.supplier_price = String(Math.round(oldV * (1 - pct / 100)));
      }
      return next;
    });
  };

  const handleSavePromo = async () => {
    if (!activePromoProduct) return;
    if (!promoForm.is_flash_sale && !promoForm.volume_pricing_enabled && !promoForm.is_kit && !promoForm.is_promo) {
      Alert.alert('Aucune promotion', 'Veuillez activer au moins un type de promotion.');
      return;
    }
    if (promoForm.is_flash_sale) {
      if (!promoForm.flash_sale_end) return Alert.alert('Vente flash', 'Veuillez définir une date de fin.');
      if (new Date(promoForm.flash_sale_end) <= new Date()) return Alert.alert('Vente flash', 'La date de fin doit être dans le futur.');
    }
    if (promoForm.is_promo) {
      const oldSup = parseFloat(promoForm.old_supplier_price) || 0;
      const newSup = parseFloat(promoForm.supplier_price) || 0;
      if (oldSup <= 0) return Alert.alert('Réduction', "Veuillez saisir l'ancien prix vendeur.");
      if (newSup <= 0) return Alert.alert('Réduction', 'Veuillez saisir le prix vendeur promo.');
      if (oldSup <= newSup) return Alert.alert('Réduction', "L'ancien prix doit être supérieur au prix promo.");
    }
    if (promoForm.is_flash_sale && !promoForm.is_promo) {
      const promoSup = parseFloat(promoForm.supplier_price) || 0;
      const originalSup = parseFloat(activePromoProduct.supplier_price) || 0;
      if (promoSup <= 0) return Alert.alert('Vente flash', 'Veuillez saisir le prix vendeur promo.');
      if (promoSup >= originalSup) return Alert.alert('Vente flash', 'Le prix vendeur flash doit être inférieur au prix original.');
    }
    if (promoForm.is_kit && !promoForm.is_promo) {
      const promoSup = parseFloat(promoForm.supplier_price) || 0;
      if (promoSup <= 0) return Alert.alert('Pack kit', 'Veuillez saisir le prix vendeur du kit.');
    }
    if (promoForm.volume_pricing_enabled) {
      const tiers = promoForm.volume_pricing;
      for (let i = 0; i < tiers.length; i++) {
        const qty = parseInt(tiers[i].qty, 10) || 0;
        const disc = parseInt(tiers[i].discount, 10) || 0;
        if (qty < 1) return Alert.alert('Dégressif', `Palier ${i + 1} : la quantité minimum doit être ≥ 1.`);
        if (disc <= 0 || disc >= 100) return Alert.alert('Dégressif', `Palier ${i + 1} : la remise doit être entre 1% et 99%.`);
      }
      if (tiers.length > 1 && (parseInt(tiers[0].qty, 10) || 0) >= (parseInt(tiers[1].qty, 10) || 0)) {
        return Alert.alert('Dégressif', 'Le palier 1 doit avoir une quantité inférieure au palier 2.');
      }
    }

    setSaving(true);
    try {
      const token = await getToken();
      let finalSupplierPrice = parseFloat(promoForm.supplier_price) || activePromoProduct.supplier_price;
      let finalPrice = activePromoProduct.price;
      let finalOldPrice = 0;

      if (promoForm.is_promo) {
        const oldSup = parseFloat(promoForm.old_supplier_price) || 0;
        if (oldSup > 0) {
          finalOldPrice = computePublicPrice(oldSup, deliveryTiers);
          finalPrice = computePublicPrice(finalSupplierPrice, deliveryTiers);
        }
      } else if (promoForm.is_flash_sale || promoForm.is_kit) {
        finalOldPrice = promoForm.is_kit ? kitBundleValue : activePromoProduct.price;
        finalPrice = computePublicPrice(finalSupplierPrice, deliveryTiers);
      } else {
        finalSupplierPrice = activePromoProduct.supplier_price;
        finalPrice = activePromoProduct.price;
      }

      const payload = {
        name: activePromoProduct.name,
        description: activePromoProduct.description,
        category_id: activePromoProduct.category_id,
        price: finalPrice,
        old_price: finalOldPrice || 0,
        supplier_price: finalSupplierPrice,
        stock: activePromoProduct.stock,
        boutique_id: activePromoProduct.boutique_id,
        secondary_boutique_ids: activePromoProduct.secondary_boutique_ids,
        variants: activePromoProduct.variants,
        supplierLinks: activePromoProduct.supplierLinks,
        is_flash_sale: promoForm.is_flash_sale,
        flash_sale_end: promoForm.is_flash_sale ? promoForm.flash_sale_end : null,
        is_kit: promoForm.is_kit,
        kit_items: promoForm.is_kit ? promoForm.kit_items : null,
        preserve_approval: true,
        volume_pricing: promoForm.volume_pricing_enabled
          ? promoForm.volume_pricing.map((t) => ({ min_qty: parseInt(t.qty, 10) || 1, discount: parseInt(t.discount, 10) || 0 }))
          : null,
      };

      await updateProduct(activePromoProduct.id, payload, token);
      Alert.alert('Succès', isAddMode ? 'Promotion ajoutée avec succès !' : 'Promotion mise à jour !');
      setIsModalOpen(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePromo = (product) => {
    Alert.alert('Désactiver les promotions', `Désactiver toutes les promotions sur "${product.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Désactiver', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await updateProduct(product.id, {
              ...product,
              old_price: 0,
              is_flash_sale: false,
              flash_sale_end: null,
              is_kit: false,
              kit_items: null,
              volume_pricing: null,
              preserve_approval: true,
            }, token);
            load();
          } catch {
            Alert.alert('Erreur', 'Erreur lors de la désactivation.');
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={promoProducts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <View>
              <Text style={styles.title}>Mes promotions</Text>
              <Text style={styles.subtitle}>Boostez vos ventes avec des ventes flash, remises, prix dégressifs et packs.</Text>
            </View>

            <View style={styles.statsGrid}>
              {[
                { key: 'total', label: 'Total actives', icon: 'sparkles', color: colors.primary },
                { key: 'promo', label: 'Réductions', icon: 'pricetag', color: colors.secondary },
                { key: 'flash', label: 'Ventes flash', icon: 'flame', color: colors.danger },
                { key: 'volume', label: 'Dégressifs', icon: 'trending-down', color: colors.warning },
                { key: 'kit', label: 'Packs & kits', icon: 'gift', color: colors.success },
              ].map((s) => (
                <View key={s.key} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                    <Ionicons name={s.icon} size={16} color={s.color} />
                  </View>
                  <Text style={styles.statValue}>{stats[s.key]}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
              <TextInput style={styles.searchInput} placeholder="Rechercher une promotion..." placeholderTextColor={colors.textFaint} value={search} onChangeText={setSearch} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {TABS.map((t) => (
                <Pressable key={t.id} style={[styles.tabPill, activeTab === t.id && styles.tabPillActive]} onPress={() => setActiveTab(t.id)}>
                  <Text style={[styles.tabPillText, activeTab === t.id && styles.tabPillTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="sparkles-outline" title="Aucune promotion active" subtitle="Créez votre première promotion pour booster vos ventes." />
        }
        renderItem={({ item }) => {
          const flags = productPromoFlags(item);
          return (
            <View style={styles.promoCard}>
              <View style={styles.promoCardTop}>
                {item.images?.[0]?.image_url ? (
                  <Image source={{ uri: getThumbnail(item.images[0].image_url) }} style={styles.promoImage} />
                ) : (
                  <View style={[styles.promoImage, styles.promoImagePlaceholder]}>
                    <Ionicons name="image-outline" size={20} color={colors.textFaint} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoName} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.promoPrice}>{formatPrice(item.price)} F</Text>
                    {flags.promo && <Text style={styles.promoOldPrice}>{formatPrice(item.old_price)} F</Text>}
                  </View>
                </View>
              </View>

              <View style={styles.badgeRow}>
                {flags.promo && <View style={[styles.badge, { backgroundColor: `${colors.secondary}18` }]}><Ionicons name="pricetag" size={11} color={colors.secondary} /><Text style={[styles.badgeText, { color: colors.secondary }]}>Réduction</Text></View>}
                {flags.flash && <View style={[styles.badge, { backgroundColor: `${colors.danger}18` }]}><Ionicons name="flame" size={11} color={colors.danger} /><Text style={[styles.badgeText, { color: colors.danger }]}>Flash</Text></View>}
                {flags.volume && <View style={[styles.badge, { backgroundColor: `${colors.warning}18` }]}><Ionicons name="trending-down" size={11} color={colors.warning} /><Text style={[styles.badgeText, { color: colors.warning }]}>Dégressif</Text></View>}
                {flags.kit && <View style={[styles.badge, { backgroundColor: `${colors.success}18` }]}><Ionicons name="gift" size={11} color={colors.success} /><Text style={[styles.badgeText, { color: colors.success }]}>Kit</Text></View>}
              </View>

              <View style={styles.promoActions}>
                <Pressable style={styles.promoActionBtn} onPress={() => handleEditPromo(item)}>
                  <Ionicons name="create-outline" size={15} color={colors.text} />
                  <Text style={styles.promoActionText}>Modifier</Text>
                </Pressable>
                <Pressable style={[styles.promoActionBtn, styles.promoActionBtnDanger]} onPress={() => handleRemovePromo(item)}>
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={handleStartNewPromo}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>

      <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            {modalStep === 2 && isAddMode && (
              <Pressable style={styles.modalBackBtn} onPress={() => setModalStep(1)}>
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{isAddMode ? 'Nouvelle promotion' : 'Modifier la promotion'}</Text>
              <Text style={styles.modalSubtitle}>{modalStep === 1 ? 'Étape 1 : choix du produit' : 'Étape 2 : configuration'}</Text>
            </View>
            <Pressable style={styles.modalClose} onPress={() => setIsModalOpen(false)}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {modalStep === 1 && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
                <TextInput style={styles.searchInput} placeholder="Rechercher un produit..." placeholderTextColor={colors.textFaint} value={productSearch} onChangeText={setProductSearch} />
              </View>
              <FlatList
                data={eligibleProducts}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ padding: 16, gap: 10 }}
                ListEmptyComponent={<EmptyState icon="cube-outline" title="Aucun produit trouvé" />}
                renderItem={({ item }) => {
                  const flags = productPromoFlags(item);
                  const hasAny = flags.flash || flags.volume || flags.kit || flags.promo;
                  return (
                    <Pressable style={styles.pickRow} onPress={() => handleSelectProduct(item)}>
                      {item.images?.[0]?.image_url ? (
                        <Image source={{ uri: getThumbnail(item.images[0].image_url) }} style={styles.pickImage} />
                      ) : (
                        <View style={[styles.pickImage, styles.promoImagePlaceholder]}>
                          <Ionicons name="image-outline" size={18} color={colors.textFaint} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.promoName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.pickPrice}>{formatPrice(item.price)} F</Text>
                        {hasAny && <Text style={styles.pickEditHint}>Modifier la promo</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    </Pressable>
                  );
                }}
              />
            </View>
          )}

          {modalStep === 2 && activePromoProduct && (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
              <View style={styles.pickRow}>
                {activePromoProduct.images?.[0]?.image_url ? (
                  <Image source={{ uri: getThumbnail(activePromoProduct.images[0].image_url) }} style={styles.pickImage} />
                ) : (
                  <View style={[styles.pickImage, styles.promoImagePlaceholder]}>
                    <Ionicons name="image-outline" size={18} color={colors.textFaint} />
                  </View>
                )}
                <View>
                  <Text style={styles.tinyLabel}>Produit sélectionné</Text>
                  <Text style={styles.promoName}>{activePromoProduct.name}</Text>
                </View>
              </View>

              <View style={styles.toggleGrid}>
                {[
                  { key: 'is_promo', label: 'Réduction', sub: 'Prix barré simple', icon: 'pricetag', color: colors.secondary },
                  { key: 'is_flash_sale', label: 'Vente flash', sub: 'Durée limitée', icon: 'flame', color: colors.danger },
                  { key: 'volume_pricing_enabled', label: 'Dégressif', sub: 'Prix par quantité', icon: 'trending-down', color: colors.warning },
                  { key: 'is_kit', label: 'Pack kit', sub: 'Vente groupée', icon: 'gift', color: colors.success },
                ].map((t) => {
                  const active = promoForm[t.key];
                  return (
                    <Pressable
                      key={t.key}
                      style={[styles.toggleCard, active && { borderColor: t.color, backgroundColor: `${t.color}0d` }]}
                      onPress={() => setPromoForm((prev) => ({ ...prev, [t.key]: !prev[t.key] }))}
                    >
                      <View style={[styles.toggleIcon, active && { backgroundColor: t.color }]}>
                        <Ionicons name={t.icon} size={18} color={active ? '#fff' : colors.textFaint} />
                      </View>
                      <Text style={styles.toggleLabel}>{t.label}</Text>
                      <Text style={styles.toggleSub}>{t.sub}</Text>
                      <Ionicons name={active ? 'checkbox' : 'square-outline'} size={16} color={active ? t.color : colors.textFaint} style={{ position: 'absolute', top: 10, right: 10 }} />
                    </Pressable>
                  );
                })}
              </View>

              {(promoForm.is_promo || promoForm.is_flash_sale || promoForm.is_kit) && (
                <View style={[styles.settingsBox, { borderColor: `${colors.secondary}30` }]}>
                  <Text style={[styles.settingsTitle, { color: colors.secondary }]}>Configuration du prix promo</Text>
                  {promoForm.is_promo && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.tinyLabel}>Ancien prix vendeur</Text>
                        <TextInput style={styles.smallInput} keyboardType="number-pad" value={promoForm.old_supplier_price} onChangeText={(t) => updatePromoOldPriceAndDiscount('old_supplier_price', t)} placeholder="Ex: 10000" placeholderTextColor={colors.textFaint} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.tinyLabel}>Remise (%)</Text>
                        <TextInput style={styles.smallInput} keyboardType="number-pad" value={promoForm.discount_percent} onChangeText={(t) => updatePromoOldPriceAndDiscount('discount_percent', t)} placeholder="Ex: 15" placeholderTextColor={colors.textFaint} />
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.tinyLabel}>Prix vendeur promo</Text>
                      <TextInput style={[styles.smallInput, { color: colors.success }]} keyboardType="number-pad" value={promoForm.supplier_price} onChangeText={(t) => setPromoForm((p) => ({ ...p, supplier_price: t }))} placeholder="Ex: 8500" placeholderTextColor={colors.textFaint} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.tinyLabel}>Prix public estimé</Text>
                      <View style={[styles.smallInput, styles.readonlyBox]}>
                        <Text style={styles.readonlyText}>{formatPrice(computePublicPrice(parseFloat(promoForm.supplier_price) || activePromoProduct?.supplier_price || 0, deliveryTiers))} F</Text>
                      </View>
                    </View>
                  </View>
                  {promoForm.is_promo && parseFloat(promoForm.old_supplier_price) > 0 && (
                    <View style={styles.previewBox}>
                      <Text style={styles.tinyLabel}>Aperçu du prix sur l'application</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={styles.previewOld}>{formatPrice(computePublicPrice(parseFloat(promoForm.old_supplier_price) || 0, deliveryTiers))} F</Text>
                        <Text style={styles.previewNew}>{formatPrice(computePublicPrice(parseFloat(promoForm.supplier_price) || 0, deliveryTiers))} F</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {promoForm.is_flash_sale && (
                <View style={[styles.settingsBox, { borderColor: `${colors.danger}30` }]}>
                  <Text style={[styles.settingsTitle, { color: colors.danger }]}>Configuration vente flash</Text>
                  <Text style={styles.tinyLabel}>Date et heure de fin (AAAA-MM-JJTHH:MM)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={promoForm.flash_sale_end}
                    onChangeText={(t) => setPromoForm((p) => ({ ...p, flash_sale_end: t }))}
                    placeholder="2026-08-15T20:00"
                    placeholderTextColor={colors.textFaint}
                  />
                </View>
              )}

              {promoForm.volume_pricing_enabled && (
                <View style={[styles.settingsBox, { borderColor: `${colors.warning}30` }]}>
                  <Text style={[styles.settingsTitle, { color: colors.warning }]}>Configuration prix dégressif</Text>
                  {[0, 1].map((idx) => (
                    <View key={idx} style={styles.tierRow}>
                      <Text style={styles.tinyLabel}>Palier {idx + 1}</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={styles.tinyLabel}>Quantité min.</Text>
                          <TextInput
                            style={styles.smallInput}
                            keyboardType="number-pad"
                            value={promoForm.volume_pricing[idx]?.qty || ''}
                            onChangeText={(t) => setPromoForm((p) => {
                              const tiers = [...p.volume_pricing];
                              tiers[idx] = { ...tiers[idx], qty: t };
                              return { ...p, volume_pricing: tiers };
                            })}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={styles.tinyLabel}>Remise (%)</Text>
                          <TextInput
                            style={styles.smallInput}
                            keyboardType="number-pad"
                            value={promoForm.volume_pricing[idx]?.discount || ''}
                            onChangeText={(t) => setPromoForm((p) => {
                              const tiers = [...p.volume_pricing];
                              tiers[idx] = { ...tiers[idx], discount: t };
                              return { ...p, volume_pricing: tiers };
                            })}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {promoForm.is_kit && (
                <View style={[styles.settingsBox, { borderColor: `${colors.success}30` }]}>
                  <Text style={[styles.settingsTitle, { color: colors.success }]}>Produits complémentaires (kit)</Text>
                  <View style={{ gap: 8 }}>
                    {products.filter((p) => p.id !== activePromoProduct.id).map((item) => {
                      const checked = promoForm.kit_items.includes(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          style={[styles.kitRow, checked && { borderColor: colors.success, backgroundColor: `${colors.success}0d` }]}
                          onPress={() => setPromoForm((p) => ({
                            ...p,
                            kit_items: checked ? p.kit_items.filter((id) => id !== item.id) : [...p.kit_items, item.id],
                          }))}
                        >
                          <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={17} color={checked ? colors.success : colors.textFaint} />
                          <Text style={styles.promoName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.pickPrice}>{formatPrice(item.price)} F</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {promoForm.kit_items.length > 0 && (
                    <View style={styles.previewBox}>
                      <Text style={styles.tinyLabel}>Valeur totale du kit</Text>
                      <Text style={styles.previewNew}>{formatPrice(kitBundleValue)} F</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {modalStep === 2 && activePromoProduct && (
            <View style={styles.modalFooter}>
              <Pressable style={styles.footerBtnGhost} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.footerBtnGhostText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.footerBtnPrimary} onPress={handleSavePromo} disabled={saving}>
                <Text style={styles.footerBtnPrimaryText}>{saving ? 'Enregistrement...' : 'Sauvegarder la promotion'}</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flexBasis: '18.5%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: 10, gap: 6, minWidth: 68,
  },
  statIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 15, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 8.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', height: 46,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12,
    marginHorizontal: 16, marginTop: 4,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  tabPill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabPillActive: { backgroundColor: colors.text, borderColor: colors.text },
  tabPillText: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  tabPillTextActive: { color: colors.surface },
  promoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
  promoCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoImage: { width: 52, height: 52, borderRadius: radius.sm },
  promoImagePlaceholder: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  promoName: { fontSize: 13, fontWeight: '800', color: colors.text, flexShrink: 1 },
  promoPrice: { fontSize: 13, fontWeight: '900', color: colors.text },
  promoOldPrice: { fontSize: 11, fontWeight: '700', color: colors.textFaint, textDecorationLine: 'line-through' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 9.5, fontWeight: '800' },
  promoActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  promoActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: 10,
  },
  promoActionBtnDanger: { flex: 0, width: 42 },
  promoActionText: { fontSize: 11, fontWeight: '800', color: colors.text, textTransform: 'uppercase' },
  fab: {
    position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalBackBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 10.5, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase', marginTop: 1 },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, marginHorizontal: 16 },
  pickImage: { width: 44, height: 44, borderRadius: radius.sm },
  pickPrice: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  pickEditHint: { fontSize: 9.5, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', marginTop: 2 },
  tinyLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  toggleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toggleCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, gap: 6,
  },
  toggleIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 4 },
  toggleSub: { fontSize: 10.5, fontWeight: '600', color: colors.textMuted },
  settingsBox: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.lg, padding: 14, gap: 12 },
  settingsTitle: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  smallInput: {
    height: 42, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 12, fontSize: 12, fontWeight: '800', color: colors.text,
  },
  readonlyBox: { justifyContent: 'center' },
  readonlyText: { fontSize: 12, fontWeight: '900', color: colors.text },
  previewBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: 12, gap: 6 },
  previewOld: { fontSize: 12, fontWeight: '700', color: colors.textFaint, textDecorationLine: 'line-through' },
  previewNew: { fontSize: 16, fontWeight: '900', color: colors.text },
  tierRow: { gap: 8 },
  kitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  footerBtnGhost: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  footerBtnGhostText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  footerBtnPrimary: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  footerBtnPrimaryText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
});
