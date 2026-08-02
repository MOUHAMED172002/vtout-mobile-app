import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getPlatformReviews, createPlatformReview } from '../../services/contentService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';

function Stars({ rating, size = 12 }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= rating ? 'star' : 'star-outline'} size={size} color={colors.primary} />
      ))}
    </View>
  );
}

export default function TestimonialsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { isSignedIn, getToken } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    getPlatformReviews().then(setReviews).catch(() => setReviews([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Commentaire requis', 'Merci de partager quelques mots sur votre expérience.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await createPlatformReview({ rating, comment: comment.trim() }, token);
      setComment('');
      setRating(5);
      setShowForm(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'envoyer votre témoignage.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={!showForm ? <EmptyState icon="chatbubbles-outline" title="Aucun témoignage pour le moment" /> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={16} color={colors.secondary} />
              </View>
              <Stars rating={item.rating} />
            </View>
            <Text style={styles.comment}>{item.comment}</Text>
          </View>
        )}
        ListFooterComponent={
          isSignedIn ? (
            <View style={{ marginTop: 8 }}>
              {showForm ? (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Partagez votre expérience</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Pressable key={s} onPress={() => setRating(s)}>
                        <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={26} color={colors.primary} />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre témoignage..."
                    placeholderTextColor={colors.textFaint}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button title="Annuler" variant="outline" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
                    <Button title="Publier" onPress={handleSubmit} loading={submitting} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <Button title="Laisser un témoignage" variant="outline" onPress={() => setShowForm(true)} icon={<Ionicons name="add" size={16} color={colors.text} />} />
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${colors.secondary}18`, alignItems: 'center', justifyContent: 'center' },
  comment: { fontSize: 12.5, color: colors.text, fontWeight: '500', lineHeight: 19, fontStyle: 'italic' },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  formTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  starsRow: { flexDirection: 'row', gap: 8 },
  input: {
    minHeight: 90, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 12, fontSize: 13, color: colors.text, textAlignVertical: 'top',
  },
});
