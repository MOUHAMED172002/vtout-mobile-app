import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllKits, deleteKit } from '../../services/adminKitService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function AdminKitsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllKits(token);
      setKits(Array.isArray(data) ? data : []);
    } catch (err) {
      setKits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (kit) => {
    Alert.alert('Désactiver ce kit', `Désactiver le pack "${kit.name}" ? Il ne sera plus visible côté client.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Désactiver', style: 'destructive', onPress: async () => {
          setBusyId(kit.id);
          try {
            const token = await getToken();
            await deleteKit(kit.id, token);
            setKits((prev) => prev.filter((k) => k.id !== kit.id));
          } catch (err) {
            Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de désactiver ce kit.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {kits.length === 0 ? (
        <EmptyState icon="gift-outline" title="Aucun kit" subtitle="Aucun pack promotionnel actif pour le moment." />
      ) : (
        <FlatList
          data={kits}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name="gift-outline" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.boutique?.name || 'Boutique inconnue'} · {item.components?.length ?? 0} produit{(item.components?.length ?? 0) > 1 ? 's' : ''}
                </Text>
                <Text style={styles.price}>{formatPrice(item.bundle_price)} F</Text>
              </View>
              <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item)} disabled={busyId === item.id} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: `${colors.secondary}18`, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  price: { fontSize: 13, fontWeight: '900', color: colors.primary, marginTop: 4 },
  deleteBtn: { padding: 8 },
});
