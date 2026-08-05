import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, RefreshControl, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAllCoupons, createCoupon, updateCoupon, toggleCoupon, deleteCoupon, getCouponUsages,
} from '../../services/couponService';
import { getCategories } from '../../services/productService';
import { getAllProfiles } from '../../services/adminUserService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

const REWARD_OPTIONS = [
  { key: 'percentage', label: 'Réduction %', icon: 'pricetag-outline', desc: 'Ex : -10% sur la commande' },
  { key: 'fixed_amount', label: 'Montant fixe', icon: 'cash-outline', desc: 'Ex : -1000 FCFA' },
  { key: 'free_shipping', label: 'Livraison offerte', icon: 'car-outline', desc: 'Annule les frais de livraison' },
];

const RESTRICTION_OPTIONS = [
  { key: 'none', label: 'Tous les clients', icon: 'people-outline', desc: 'Aucune restriction' },
  { key: 'first_order', label: '1ère commande', icon: 'gift-outline', desc: 'Nouveaux clients (bienvenue)' },
  { key: 'category', label: 'Une catégorie', icon: 'grid-outline', desc: "Articles d'une catégorie" },
  { key: 'personal', label: 'Un client précis', icon: 'person-outline', desc: 'Code personnel' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const emptyForm = {
  code: '', discount_type: 'percentage', discount_value: '', max_discount_amount: '',
  min_order_amount: '0', category_id: '', assigned_user_id: '', first_order_only: false,
  start_date: todayISO(), end_date: '', usage_limit: '',
};

const restrictionOf = (f) => (f.first_order_only ? 'first_order' : f.category_id ? 'category' : f.assigned_user_id ? 'personal' : 'none');

// Équivalent mobile de frontend/src/component/Admin/Marketing/CouponManager.jsx
export default function AdminCouponsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();

  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [restrictionType, setRestrictionType] = useState('none');
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [usagesFor, setUsagesFor] = useState(null);
  const [usages, setUsages] = useState([]);
  const [loadingUsages, setLoadingUsages] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [couponsData, categoriesData] = await Promise.all([
        getAllCoupons(token),
        getCategories().catch(() => []),
      ]);
      setCoupons(couponsData);
      setCategories(categoriesData || []);
    } catch (err) {
      setCoupons([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showForm || restrictionType !== 'personal') return;
    const q = customerQuery.trim();
    if (q.length < 2) { setCustomers([]); return; }
    const timeout = setTimeout(async () => {
      setLoadingCustomers(true);
      try {
        const token = await getToken();
        const all = await getAllProfiles(token);
        const ql = q.toLowerCase();
        setCustomers((all || []).filter((p) =>
          p.fullname?.toLowerCase().includes(ql) || p.email?.toLowerCase().includes(ql) || p.phone?.includes(q)
        ).slice(0, 20));
      } catch {
        // silencieux
      } finally {
        setLoadingCustomers(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [customerQuery, showForm, restrictionType, getToken]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, start_date: todayISO() });
    setRestrictionType('none');
    setCustomerQuery('');
    setCustomerLabel('');
    setCustomers([]);
    setShowForm(true);
  };

  const openEdit = (c) => {
    const nextForm = {
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value != null ? String(c.discount_value) : '',
      max_discount_amount: c.max_discount_amount != null ? String(c.max_discount_amount) : '',
      min_order_amount: String(c.min_order_amount ?? 0),
      category_id: c.category_id ? String(c.category_id) : '',
      assigned_user_id: c.assigned_user_id || '',
      first_order_only: !!c.first_order_only,
      start_date: toInputDate(c.start_date),
      end_date: toInputDate(c.end_date),
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
    };
    setEditingId(c.id);
    setForm(nextForm);
    setRestrictionType(restrictionOf(nextForm));
    setCustomerLabel(c.assignedUser ? (c.assignedUser.fullname || c.assignedUser.email) : '');
    setCustomerQuery('');
    setCustomers([]);
    setShowForm(true);
  };

  const selectRestriction = (key) => {
    setRestrictionType(key);
    setForm((f) => ({
      ...f,
      first_order_only: key === 'first_order',
      category_id: key === 'category' ? f.category_id : '',
      assigned_user_id: key === 'personal' ? f.assigned_user_id : '',
    }));
    if (key !== 'personal') { setCustomerQuery(''); setCustomerLabel(''); setCustomers([]); }
  };

  const handleSave = async () => {
    if (!editingId && !form.code.trim()) return Alert.alert('Code manquant', 'Le code est obligatoire.');
    if (!form.start_date || !form.end_date) return Alert.alert('Dates manquantes', 'Les dates de début et de fin sont obligatoires (AAAA-MM-JJ).');
    if (form.discount_type !== 'free_shipping' && (!form.discount_value || Number(form.discount_value) <= 0)) {
      return Alert.alert('Valeur invalide', 'La valeur de la réduction doit être supérieure à 0.');
    }
    if (restrictionType === 'category' && !form.category_id) return Alert.alert('Catégorie manquante', 'Choisissez une catégorie.');
    if (restrictionType === 'personal' && !form.assigned_user_id) return Alert.alert('Client manquant', 'Choisissez un client.');

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'free_shipping' ? null : Number(form.discount_value),
      max_discount_amount: form.discount_type === 'percentage' && form.max_discount_amount ? Number(form.max_discount_amount) : null,
      min_order_amount: Number(form.min_order_amount) || 0,
      category_id: form.category_id || null,
      assigned_user_id: form.assigned_user_id || null,
      first_order_only: !!form.first_order_only,
      start_date: form.start_date,
      end_date: form.end_date,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    };

    setSaving(true);
    try {
      const token = await getToken();
      if (editingId) await updateCoupon(editingId, payload, token);
      else await createCoupon(payload, token);
      setShowForm(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c) => {
    try {
      const token = await getToken();
      await toggleCoupon(c.id, token);
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de changer le statut.');
    }
  };

  const handleDelete = (c) => {
    Alert.alert('Supprimer le coupon', `Supprimer "${c.code}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            const res = await deleteCoupon(c.id, token);
            if (res?.message?.includes('désactivé')) Alert.alert('Info', 'Coupon déjà utilisé : désactivé au lieu de supprimé.');
            load();
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de supprimer.');
          }
        },
      },
    ]);
  };

  const openUsages = async (c) => {
    setUsagesFor(c);
    setLoadingUsages(true);
    try {
      const token = await getToken();
      setUsages(await getCouponUsages(c.id, token));
    } catch {
      setUsages([]);
    } finally {
      setLoadingUsages(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredCoupons = useMemo(() => (q ? coupons.filter((c) => c.code.toLowerCase().includes(q)) : coupons), [coupons, q]);

  const valueLabel = (c) => {
    if (c.discount_type === 'free_shipping') return 'Livraison offerte';
    if (c.discount_type === 'percentage') {
      const cap = c.max_discount_amount ? ` (max ${formatPrice(c.max_discount_amount)} F)` : '';
      return `-${Number(c.discount_value)}%${cap}`;
    }
    return `-${formatPrice(c.discount_value)} F`;
  };

  const typeIcon = (t) => (t === 'percentage' ? 'pricetag' : t === 'free_shipping' ? 'car' : 'cash');
  const typeColor = (t) => (t === 'percentage' ? colors.secondary : t === 'free_shipping' ? colors.success : colors.warning);

  const selectedCategory = categories.find((c) => String(c.id) === String(form.category_id));

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={filteredCoupons}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
              <TextInput style={styles.searchInput} placeholder="Rechercher un code…" placeholderTextColor={colors.textFaint} value={search} onChangeText={setSearch} autoCapitalize="characters" />
            </View>
            <Pressable style={styles.addBtn} onPress={openCreate}>
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="pricetag-outline" title="Aucun coupon pour le moment" />}
        renderItem={({ item: c }) => (
          <View style={styles.row}>
            <View style={[styles.typeIconWrap, { backgroundColor: `${typeColor(c.discount_type)}1f` }]}>
              <Ionicons name={typeIcon(c.discount_type)} size={15} color={typeColor(c.discount_type)} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle}>{c.code}</Text>
                {c.first_order_only && <View style={styles.tagPill}><Text style={styles.tagPillText}>Bienvenue</Text></View>}
                {c.category && <View style={styles.tagPillIndigo}><Text style={styles.tagPillTextIndigo}>{c.category.name}</Text></View>}
                {c.assignedUser && <View style={styles.tagPillPink}><Text style={styles.tagPillTextPink} numberOfLines={1}>{c.assignedUser.fullname || c.assignedUser.email}</Text></View>}
                {!c.active && <View style={styles.mutedPill}><Text style={styles.mutedPillText}>Inactif</Text></View>}
              </View>
              <Text style={styles.rowSub} numberOfLines={1}>
                {valueLabel(c)} · min {formatPrice(c.min_order_amount)} F · {c.used_count || 0}{c.usage_limit ? `/${c.usage_limit}` : ''} utilisé{c.used_count > 1 ? 's' : ''}
              </Text>
              <Text style={styles.rowDates}>{new Date(c.start_date).toLocaleDateString('fr-FR')} → {new Date(c.end_date).toLocaleDateString('fr-FR')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={styles.actionsRow}>
                <Pressable onPress={() => openUsages(c)} style={styles.iconBtn}><Ionicons name="time-outline" size={16} color={colors.textMuted} /></Pressable>
                <Pressable onPress={() => handleToggle(c)} style={styles.iconBtn}><Ionicons name="power" size={16} color={c.active ? colors.success : colors.textFaint} /></Pressable>
                <Pressable onPress={() => handleDelete(c)} style={styles.iconBtn}><Ionicons name="trash-outline" size={16} color={colors.danger} /></Pressable>
              </View>
              <Pressable onPress={() => openEdit(c)}><Text style={styles.editText}>Modifier</Text></Pressable>
            </View>
          </View>
        )}
      />

      {/* Modal création/édition */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Modifier le coupon' : 'Créer un coupon'}</Text>
              <Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={styles.modalLabel}>Code</Text>
                  <TextInput
                    style={[styles.input, !!editingId && styles.inputDisabled]}
                    value={form.code}
                    onChangeText={(t) => setForm((f) => ({ ...f, code: t.toUpperCase() }))}
                    editable={!editingId}
                    placeholder="Ex : BIENVENUE10"
                    placeholderTextColor={colors.textFaint}
                    autoCapitalize="characters"
                  />
                </View>

                <View>
                  <Text style={styles.sectionLabel}>1 · Type de réduction</Text>
                  <View style={styles.optionsGrid}>
                    {REWARD_OPTIONS.map((opt) => {
                      const active = form.discount_type === opt.key;
                      return (
                        <Pressable key={opt.key} style={[styles.optionCard, active && styles.optionCardActive]} onPress={() => setForm((f) => ({ ...f, discount_type: opt.key }))}>
                          <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.textFaint} />
                          <Text style={[styles.optionCardTitle, active && styles.optionCardTitleActive]}>{opt.label}</Text>
                          <Text style={styles.optionCardDesc}>{opt.desc}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {form.discount_type !== 'free_shipping' && (
                    <View style={styles.rowGap}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Valeur {form.discount_type === 'percentage' ? '(%)' : '(FCFA)'}</Text>
                        <TextInput style={styles.input} value={form.discount_value} onChangeText={(t) => setForm((f) => ({ ...f, discount_value: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholderTextColor={colors.textFaint} />
                      </View>
                      {form.discount_type === 'percentage' && (
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalLabel}>Plafond (FCFA)</Text>
                          <TextInput style={styles.input} value={form.max_discount_amount} onChangeText={(t) => setForm((f) => ({ ...f, max_discount_amount: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholder="Illimité" placeholderTextColor={colors.textFaint} />
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View>
                  <Text style={styles.sectionLabel}>2 · Qui peut l'utiliser ?</Text>
                  <View style={styles.optionsGrid}>
                    {RESTRICTION_OPTIONS.map((opt) => {
                      const active = restrictionType === opt.key;
                      return (
                        <Pressable key={opt.key} style={[styles.optionCard, active && styles.optionCardActive]} onPress={() => selectRestriction(opt.key)}>
                          <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.textFaint} />
                          <Text style={[styles.optionCardTitle, active && styles.optionCardTitleActive]}>{opt.label}</Text>
                          <Text style={styles.optionCardDesc}>{opt.desc}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {restrictionType === 'category' && (
                    <Pressable style={styles.input} onPress={() => setShowCategoryPicker(true)}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: selectedCategory ? colors.text : colors.textFaint }}>
                        {selectedCategory ? selectedCategory.name : 'Choisir une catégorie…'}
                      </Text>
                    </Pressable>
                  )}

                  {restrictionType === 'personal' && (
                    <View style={{ gap: 8 }}>
                      {form.assigned_user_id ? (
                        <View style={styles.selectedCustomerBox}>
                          <Text style={styles.selectedCustomerText} numberOfLines={1}>{customerLabel}</Text>
                          <Pressable onPress={() => { setForm((f) => ({ ...f, assigned_user_id: '' })); setCustomerLabel(''); }}>
                            <Text style={styles.changeText}>Retirer</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <>
                          <TextInput style={styles.input} value={customerQuery} onChangeText={setCustomerQuery} placeholder="Rechercher un client (nom, email, tél)…" placeholderTextColor={colors.textFaint} />
                          {customerQuery.trim().length >= 2 && (
                            <View style={styles.customerList}>
                              {loadingCustomers ? (
                                <Text style={styles.modalHelper}>Recherche…</Text>
                              ) : customers.length === 0 ? (
                                <Text style={styles.modalHelper}>Aucun client trouvé.</Text>
                              ) : (
                                customers.map((u) => (
                                  <Pressable key={u.id} style={styles.customerRow} onPress={() => { setForm((f) => ({ ...f, assigned_user_id: u.id })); setCustomerLabel(u.fullname || u.email); setCustomerQuery(''); }}>
                                    <Text style={styles.customerRowName} numberOfLines={1}>{u.fullname || 'Sans nom'}</Text>
                                    <Text style={styles.customerRowEmail} numberOfLines={1}>{u.email}</Text>
                                  </Pressable>
                                ))
                              )}
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>

                <View>
                  <Text style={styles.sectionLabel}>3 · Conditions</Text>
                  <View style={styles.rowGap}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Montant minimum (FCFA)</Text>
                      <TextInput style={styles.input} value={form.min_order_amount} onChangeText={(t) => setForm((f) => ({ ...f, min_order_amount: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholderTextColor={colors.textFaint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Limite d'utilisation</Text>
                      <TextInput style={styles.input} value={form.usage_limit} onChangeText={(t) => setForm((f) => ({ ...f, usage_limit: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" placeholder="Illimité" placeholderTextColor={colors.textFaint} />
                    </View>
                  </View>
                  <View style={styles.rowGap}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Début (AAAA-MM-JJ)</Text>
                      <TextInput style={styles.input} value={form.start_date} onChangeText={(t) => setForm((f) => ({ ...f, start_date: t }))} placeholder="2026-08-05" placeholderTextColor={colors.textFaint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Fin (AAAA-MM-JJ)</Text>
                      <TextInput style={styles.input} value={form.end_date} onChangeText={(t) => setForm((f) => ({ ...f, end_date: t }))} placeholder="2026-09-05" placeholderTextColor={colors.textFaint} />
                    </View>
                  </View>
                </View>

                <Button title={saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer le coupon'} onPress={handleSave} loading={saving} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal choix catégorie */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCategoryPicker(false)} />
          <View style={[styles.modalCard, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une catégorie</Text>
              <Pressable onPress={() => setShowCategoryPicker(false)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item: cat }) => (
                <Pressable style={styles.customerRow} onPress={() => { setForm((f) => ({ ...f, category_id: String(cat.id) })); setShowCategoryPicker(false); }}>
                  <Text style={styles.customerRowName}>{cat.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal historique d'utilisation */}
      <Modal visible={!!usagesFor} transparent animationType="fade" onRequestClose={() => setUsagesFor(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setUsagesFor(null)} />
          <View style={[styles.modalCard, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Utilisations — {usagesFor?.code}</Text>
              <Pressable onPress={() => setUsagesFor(null)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
            </View>
            {loadingUsages ? (
              <Text style={styles.modalHelper}>Chargement…</Text>
            ) : usages.length === 0 ? (
              <Text style={styles.modalHelper}>Pas encore utilisé.</Text>
            ) : (
              <FlatList
                data={usages}
                keyExtractor={(u) => String(u.id)}
                renderItem={({ item: u }) => (
                  <View style={styles.usageRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerRowName} numberOfLines={1}>{u.user?.fullname || u.user?.email || 'Invité'}</Text>
                      <Text style={styles.usageDate}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</Text>
                    </View>
                    <Text style={styles.usageAmount}>-{formatPrice(u.discount_amount)} F</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 46, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  addBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  typeIconWrap: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowTitle: { fontSize: 13, fontWeight: '900', color: colors.text },
  rowSub: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 3 },
  rowDates: { fontSize: 9, fontWeight: '600', color: colors.textFaint, marginTop: 1 },
  tagPill: { backgroundColor: 'rgba(139,92,246,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  tagPillText: { fontSize: 8, fontWeight: '900', color: '#8b5cf6', textTransform: 'uppercase' },
  tagPillIndigo: { backgroundColor: 'rgba(99,102,241,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, maxWidth: 110 },
  tagPillTextIndigo: { fontSize: 8, fontWeight: '900', color: '#6366f1', textTransform: 'uppercase' },
  tagPillPink: { backgroundColor: 'rgba(236,72,153,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, maxWidth: 110 },
  tagPillTextPink: { fontSize: 8, fontWeight: '900', color: '#ec4899', textTransform: 'uppercase' },
  mutedPill: { backgroundColor: colors.background, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  mutedPillText: { fontSize: 8, fontWeight: '900', color: colors.textFaint, textTransform: 'uppercase' },
  actionsRow: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 5 },
  editText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text, flexShrink: 1 },
  modalLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 6 },
  modalHelper: { fontSize: 12, fontWeight: '600', color: colors.textFaint, textAlign: 'center', paddingVertical: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  optionCard: { width: '31%', padding: 10, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, gap: 4 },
  optionCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(243,112,33,0.06)' },
  optionCardTitle: { fontSize: 10, fontWeight: '900', color: colors.text },
  optionCardTitleActive: { color: colors.primary },
  optionCardDesc: { fontSize: 8, fontWeight: '600', color: colors.textFaint, lineHeight: 11 },
  input: { height: 46, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '700', color: colors.text, justifyContent: 'center' },
  inputDisabled: { opacity: 0.5 },
  rowGap: { flexDirection: 'row', gap: 10, marginTop: 8 },
  selectedCustomerBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(236,72,153,0.08)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.2)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  selectedCustomerText: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
  changeText: { fontSize: 11, fontWeight: '800', color: '#ec4899', marginLeft: 8 },
  customerList: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  customerRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  customerRowName: { fontSize: 13, fontWeight: '800', color: colors.text },
  customerRowEmail: { fontSize: 10, fontWeight: '600', color: colors.textFaint, marginTop: 1 },
  usageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  usageDate: { fontSize: 10, fontWeight: '600', color: colors.textFaint, marginTop: 1 },
  usageAmount: { fontSize: 13, fontWeight: '900', color: colors.success },
});
