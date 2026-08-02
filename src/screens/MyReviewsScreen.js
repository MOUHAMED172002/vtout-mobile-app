import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getMyReviews, deleteReview } from '../services/reviewService';
import { getThumbnail } from '../utils/format';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function MyReviewsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyReviews(token);
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (review) => {
    Alert.alert('Supprimer cet avis', 'Voulez-vous vraiment supprimer cet avis ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          setBusyId(review.id);
          try {
            const token = await getToken();
            await deleteReview(review.id, token);
            setReviews((prev) => prev.filter((r) => r.id !== review.id));
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer cet avis.');
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
      {reviews.length === 0 ? (
        <EmptyState icon="star-outline" title="Aucun avis publié" subtitle="Vos avis sur vos achats apparaîtront ici." />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                {item.product?.images?.[0]?.image_url ? (
                  <Image source={{ uri: getThumbnail(item.product.images[0].image_url) }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, { backgroundColor: '#f1f5f9' }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>{item.product?.name || 'Produit'}</Text>
                  <View style={{ flexDirection: 'row', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons key={s} name={s <= item.rating ? 'star' : 'star-outline'} size={12} color={colors.primary} />
                    ))}
                  </View>
                </View>
                <Pressable onPress={() => handleDelete(item)} disabled={busyId === item.id} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
              {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productImage: { width: 40, height: 40, borderRadius: radius.sm },
  productName: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 3 },
  deleteBtn: { padding: 6 },
  body: { fontSize: 12, color: colors.textMuted, fontWeight: '500', lineHeight: 18 },
});
