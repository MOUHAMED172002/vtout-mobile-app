import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, Image, Alert, Switch, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMySupplierProducts, deleteProduct, setProductAvailability } from '../../services/supplierProductService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const approvalLabel = (s) => (s === 'approved' ? 'Approuvé' : s === 'rejected' ? 'Rejeté' : 'En attente');
const badgeStyleFor = (s) => ({ backgroundColor: s === 'approved' ? '#d1fae5' : s === 'rejected' ? '#fee2e2' : '#fef3c7' });
const badgeTextStyleFor = (s) => ({ color: s === 'approved' ? '#059669' : s === 'rejected' ? '#dc2626' : '#d97706' });

export default function SupplierProductsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMySupplierProducts(token);
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const handleToggleAvailability = async (product) => {
    setBusyId(product.id);
    try {
      const token = await getToken();
      const nextValue = !(product.in_stock_supplier !== false);
      await setProductAvailability(product.id, nextValue, token);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, in_stock_supplier: nextValue } : p)));
    } catch {
      Alert.alert('Erreur', 'Impossible de changer la disponibilité.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (product) => {
    Alert.alert('Supprimer le produit', `Voulez-vous vraiment supprimer "${product.name}" ? Cette action est irréversible.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          setBusyId(product.id);
          try {
            const token = await getToken();
            await deleteProduct(product.id, token);
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.error || 'Erreur lors de la suppression.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  const filtered = products.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textFaint} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="cube-outline" title="Aucun produit" subtitle="Ajoutez votre premier produit pour commencer à vendre." />}
        renderItem={({ item }) => {
          const isAvailable = item.in_stock_supplier !== false;
          const displayStock = item.total_stock ?? item.stock ?? 0;
          return (
            <View style={styles.card}>
              <Pressable style={styles.cardTop} onPress={() => navigation.navigate('SupplierProductForm', { id: item.id })}>
                {item.images?.[0]?.image_url ? (
                  <Image source={{ uri: getThumbnail(item.images[0].image_url) }} style={styles.image} />
                ) : (
                  <View style={[styles.image, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="image-outline" size={22} color={colors.textFaint} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.price}>{formatPrice(item.supplier_price)} F · Stock {displayStock}</Text>
                  <View style={[styles.badge, badgeStyleFor(item.approval_status)]}>
                    <Text style={[styles.badgeText, badgeTextStyleFor(item.approval_status)]}>{approvalLabel(item.approval_status)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>

              <View style={styles.cardFooter}>
                <View style={styles.availabilityRow}>
                  <Text style={styles.availabilityLabel}>{isAvailable ? 'Disponible à la vente' : 'Désactivé'}</Text>
                  <Switch
                    value={isAvailable}
                    onValueChange={() => handleToggleAvailability(item)}
                    disabled={busyId === item.id}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>
                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('SupplierProductForm', { id: item.id })}>
                    <Ionicons name="create-outline" size={16} color={colors.secondary} />
                    <Text style={[styles.actionText, { color: colors.secondary }]}>Modifier</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)} disabled={busyId === item.id}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => navigation.navigate('SupplierProductForm', {})}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', height: 46, marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  image: { width: 56, height: 56, borderRadius: radius.sm },
  name: { fontSize: 13, fontWeight: '800', color: colors.text },
  price: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 3 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginTop: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  cardFooter: { borderTopWidth: 1, borderTopColor: colors.border, padding: 12, gap: 10 },
  availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availabilityLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  actionsRow: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  fab: {
    position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
