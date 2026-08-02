import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  getSuppliers,
  updateSupplierStatus,
  getPendingProducts,
  approveProduct,
  rejectProduct,
} from '../../services/adminSupplierService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

const isPendingSupplier = (s) => {
  const status = (s.status || '').toLowerCase();
  return !status || !['active', 'actif', 'suspended', 'suspendu'].includes(status);
};

function TabSwitch({ tab, setTab, pendingSuppliers, pendingProducts }) {
  return (
    <View style={styles.tabSwitch}>
      <Pressable style={[styles.tabBtn, tab === 'suppliers' && styles.tabBtnActive]} onPress={() => setTab('suppliers')}>
        <Text style={[styles.tabBtnText, tab === 'suppliers' && styles.tabBtnTextActive]}>
          Vendeurs {pendingSuppliers > 0 ? `(${pendingSuppliers})` : ''}
        </Text>
      </Pressable>
      <Pressable style={[styles.tabBtn, tab === 'products' && styles.tabBtnActive]} onPress={() => setTab('products')}>
        <Text style={[styles.tabBtnText, tab === 'products' && styles.tabBtnTextActive]}>
          Produits {pendingProducts > 0 ? `(${pendingProducts})` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

export default function AdminSupplierApprovalScreen() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [suppliersData, productsData] = await Promise.all([
        getSuppliers(token),
        getPendingProducts(token),
      ]);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      setSuppliers([]);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const pendingSuppliers = suppliers.filter(isPendingSupplier);
  const otherSuppliers = suppliers.filter((s) => !isPendingSupplier(s));
  const sortedSuppliers = [...pendingSuppliers, ...otherSuppliers];

  const handleSupplierStatus = async (supplier, status) => {
    setBusyId(supplier.id);
    try {
      const token = await getToken();
      await updateSupplierStatus(supplier.id, status, token);
      load();
    } catch (err) {
      // ignore, l'admin peut réessayer
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveProduct = async (product) => {
    setBusyId(product.id);
    try {
      const token = await getToken();
      await approveProduct(product.id, token);
      load();
    } catch (err) {
      // ignore
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const token = await getToken();
      await rejectProduct(rejectTarget.id, rejectReason, token);
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      // ignore
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <TabSwitch tab={tab} setTab={setTab} pendingSuppliers={pendingSuppliers.length} pendingProducts={products.length} />

      {tab === 'suppliers' ? (
        sortedSuppliers.length === 0 ? (
          <EmptyState icon="storefront-outline" title="Aucun vendeur" />
        ) : (
          <FlatList
            data={sortedSuppliers}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
            renderItem={({ item }) => {
              const pending = isPendingSupplier(item);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.name || 'Vendeur'}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{item.email || item.user?.email || item.phone || ''}</Text>
                    </View>
                    <View style={[styles.badge, pending ? styles.badgeWarning : styles.badgeSuccess]}>
                      <Text style={[styles.badgeText, pending ? styles.badgeWarningText : styles.badgeSuccessText]}>
                        {pending ? 'En attente' : (item.status?.toLowerCase().includes('suspend') ? 'Suspendu' : 'Actif')}
                      </Text>
                    </View>
                  </View>
                  {(item.quartier_label || item.commune_label) && (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={13} color={colors.textFaint} />
                      <Text style={styles.metaText} numberOfLines={1}>{[item.quartier_label, item.commune_label].filter(Boolean).join(', ')}</Text>
                    </View>
                  )}
                  {pending && (
                    <View style={styles.actionsRow}>
                      <Button
                        title="Approuver"
                        onPress={() => handleSupplierStatus(item, 'active')}
                        loading={busyId === item.id}
                        style={styles.actionBtn}
                      />
                      <Button
                        title="Rejeter"
                        variant="outline"
                        onPress={() => handleSupplierStatus(item, 'suspendu')}
                        loading={busyId === item.id}
                        style={styles.actionBtn}
                      />
                    </View>
                  )}
                </View>
              );
            }}
          />
        )
      ) : (
        products.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" title="Aucun produit en attente" subtitle="Tous les produits ont été traités." />
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: '#eef2ff' }]}>
                    <Ionicons name="cube-outline" size={18} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name || 'Sans nom'}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{item.category?.name || 'Non catégorisé'}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.priceText}>{formatPrice(item.price)} F</Text>
                  <Text style={styles.metaText}>· Stock: {item.stock ?? 0}</Text>
                </View>
                <View style={styles.actionsRow}>
                  <Button
                    title="Approuver"
                    onPress={() => handleApproveProduct(item)}
                    loading={busyId === item.id}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Rejeter"
                    variant="outline"
                    onPress={() => { setRejectTarget(item); setRejectReason(''); }}
                    disabled={busyId === item.id}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            )}
          />
        )
      )}

      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRejectTarget(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Motif du rejet</Text>
            <Text style={styles.modalSubtitle}>{rejectTarget?.name}</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex: photos insuffisantes, description incomplète..."
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.textArea}
            />
            <Button title="Confirmer le rejet" onPress={submitReject} loading={busyId === rejectTarget?.id} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabSwitch: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  tabBtnTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900', color: colors.primary },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeSuccess: { backgroundColor: '#d1fae5' },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  badgeWarningText: { color: '#b45309' },
  badgeSuccessText: { color: '#047857' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  priceText: { fontSize: 12, fontWeight: '800', color: colors.secondary },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 42 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modalSubtitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  textArea: {
    minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: 12, fontSize: 13, color: colors.text, textAlignVertical: 'top',
  },
});
