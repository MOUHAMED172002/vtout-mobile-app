import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { getProductReviews } from '../services/reviewService';
import { getThumbnail } from '../utils/format';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

function Stars({ rating, size = 12 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= rating ? 'star' : 'star-outline'} size={size} color={colors.primary} />
      ))}
    </View>
  );
}

export default function ProductReviewsScreen({ route }) {
  const { productId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductReviews(productId, 50)
      .then((data) => setReviews(Array.isArray(data) ? data : data?.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <Loading />;

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {reviews.length === 0 ? (
        <EmptyState icon="star-outline" title="Aucun avis pour ce produit" subtitle="Soyez le premier à partager votre expérience." />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{average.toFixed(1)}</Text>
              <Stars rating={Math.round(average)} size={16} />
              <Text style={styles.summaryCount}>{reviews.length} avis</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.user?.fullname || item.profile?.fullname || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.author}>{item.user?.fullname || item.profile?.fullname || 'Client Vtout'}</Text>
                  <Stars rating={Number(item.rating || 0)} />
                </View>
                <Text style={styles.date}>{new Date(item.created_at || item.createdAt).toLocaleDateString('fr-FR')}</Text>
              </View>
              {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
              {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              {Array.isArray(item.images) && item.images.length > 0 && (
                <View style={styles.imagesRow}>
                  {item.images.slice(0, 4).map((img, idx) => (
                    <Image key={idx} source={{ uri: getThumbnail(img) }} style={styles.reviewImage} />
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 20, alignItems: 'center', gap: 6, marginBottom: 4,
  },
  summaryValue: { fontSize: 32, fontWeight: '900', color: colors.text },
  summaryCount: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${colors.secondary}18`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '900', color: colors.secondary },
  author: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 3 },
  date: { fontSize: 10, color: colors.textFaint, fontWeight: '600' },
  title: { fontSize: 13, fontWeight: '800', color: colors.text },
  body: { fontSize: 12, color: colors.textMuted, fontWeight: '500', lineHeight: 18 },
  imagesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reviewImage: { width: 56, height: 56, borderRadius: radius.sm },
});
