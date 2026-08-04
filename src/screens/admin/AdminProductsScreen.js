import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Image, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllProductsAdmin, deleteProductAdmin } from '../../services/adminProductService';
import { formatPrice, getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const STATUS_TABS = [
  { key: 'approved', label: 'Approuvés' },
  { key: 'En attente', label: 'En attente' },
  { key: 'rejected', label: 'Rejetés' },
];

const approvalLabel = (s) => (s === 'approved' ? 'Approuvé' : s === 'rejected' ? 'Rejeté' : 'En attente');
const badgeStyleFor = (s) => ({ backgroundColor: s === 'approved' ? '#d1fae5' : s === 'rejected' ? '#fee2e2' : '#fef3c7' });
const badgeTextStyleFor = (s) => ({ color: s === 'approved' ? '#059669' : s === 'rejected' ? '#dc2626' : '#d97706' });

export default function AdminProductsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [tab, setTab] = useState('approved');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllProductsAdmin({ approval_status: tab, search: search.trim() || undefined, limit: 60 }, token);
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, tab, search]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    const timeout = setTimeout(load, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  const handleDelete = (product) => {
    Alert.alert('Supprimer le produit', `Supprimer "${product.name}" définitivement ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await deleteProductAdmin(product.id, token);
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de supprimer ce produit.');
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabRow}>
        {STATUS_TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="cube-outline" title="Aucun produit" subtitle="Aucun produit ne correspond à ce filtre." />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('AdminProductForm', { id: item.id })}>
            {item.images?.[0]?.image_url ? (
              <Image source={{ uri: getThumbnail(item.images[0].image_url) }} style={styles.image} />
            ) : (
              <View style={[styles.image, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="image-outline" size={20} color={colors.textFaint} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.supplier?.name || item.boutique?.name || 'Sans vendeur'}</Text>
              <View style={styles.rowBottom}>
                <Text style={styles.price}>{formatPrice(item.price)} F</Text>
                <View style={[styles.badge, badgeStyleFor(item.approval_status)]}>
                  <Text style={[styles.badgeText, badgeTextStyleFor(item.approval_status)]}>{approvalLabel(item.approval_status)}</Text>
                </View>
              </View>
            </View>
            <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => navigation.navigate('AdminProductForm', {})}>
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
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { flex: 1, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textAlign: 'center' },
  tabTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12 },
  image: { width: 52, height: 52, borderRadius: radius.sm },
  name: { fontSize: 13, fontWeight: '800', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  price: { fontSize: 13, fontWeight: '900', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  deleteBtn: { padding: 8 },
  fab: {
    position: 'absolute', right: 16, bottom: 16, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
