import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Image, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getOrderById } from '../services/orderService';
import { createReview, uploadReviewImages } from '../services/reviewService';
import Loading from '../components/Loading';
import Button from '../components/Button';

const RATING_LABELS = ['Très mauvais', 'Mauvais', 'Moyen', 'Très bien', 'Excellent'];

export default function WriteReviewScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { orderId, product: initialProduct } = route.params || {};
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(!initialProduct);
  const [products, setProducts] = useState(initialProduct ? [initialProduct] : []);
  const [product, setProduct] = useState(initialProduct || null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialProduct) return;
    (async () => {
      try {
        const token = await getToken();
        const order = await getOrderById(orderId, token);
        const items = (order?.items || []).map((item) => ({
          id: item.product_id,
          name: item.product?.name || `Produit ${item.product_id}`,
          image_url: item.product?.images?.[0]?.image_url || null,
        }));
        const unique = Array.from(new Map(items.map((p) => [p.id, p])).values());
        setProducts(unique);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, initialProduct, getToken]);

  const pickImages = async () => {
    if (images.length >= 3) {
      Alert.alert('Limite atteinte', 'Maximum 3 photos par avis.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 3));
    }
  };

  const removeImage = (uri) => setImages((prev) => prev.filter((u) => u !== uri));

  const handleSubmit = async () => {
    if (!product) {
      Alert.alert('Produit manquant', 'Merci de sélectionner un produit.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      let imageUrls = [];
      if (images.length > 0) {
        try {
          imageUrls = await uploadReviewImages(
            images.map((uri, idx) => ({ uri, name: `review-${idx}.jpg`, type: 'image/jpeg' })),
            token
          );
        } catch {
          Alert.alert('Photos non envoyées', "L'avis sera publié sans les photos.");
        }
      }

      await createReview({
        product_id: product.id,
        order_id: orderId,
        rating,
        title: title.trim() || null,
        body: body.trim(),
        images: imageUrls,
      }, token);

      Alert.alert('Merci !', 'Votre avis a été publié.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || "Impossible d'enregistrer votre avis.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }} keyboardShouldPersistTaps="handled">
        {!initialProduct && (
          <View style={styles.field}>
            <Text style={styles.label}>Produit</Text>
            {products.length === 0 ? (
              <Text style={styles.emptyText}>Aucun produit trouvé pour cette commande.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {products.map((p) => (
                  <Pressable key={p.id} style={[styles.productOption, product?.id === p.id && styles.productOptionActive]} onPress={() => setProduct(p)}>
                    <Ionicons name={product?.id === p.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={product?.id === p.id ? colors.primary : colors.textFaint} />
                    <Text style={styles.productOptionText} numberOfLines={1}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Votre note</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setRating(s)} style={[styles.starBtn, rating >= s && styles.starBtnActive]}>
                <Ionicons name="star" size={22} color={rating >= s ? '#fff' : colors.textFaint} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{rating}/5 — {RATING_LABELS[rating - 1]}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Titre (optionnel)</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Excellent produit !" placeholderTextColor={colors.textFaint} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Votre commentaire</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder="Dites-nous ce que vous avez pensé..."
            placeholderTextColor={colors.textFaint}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Photos (optionnel)</Text>
          <View style={styles.imagesRow}>
            {images.map((uri) => (
              <View key={uri} style={styles.imageWrap}>
                <Image source={{ uri }} style={styles.image} />
                <Pressable style={styles.removeImageBtn} onPress={() => removeImage(uri)}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {images.length < 3 && (
              <Pressable style={styles.addImageBtn} onPress={pickImages}>
                <Ionicons name="camera-outline" size={20} color={colors.textFaint} />
              </Pressable>
            )}
          </View>
        </View>

        <Button title="Publier mon avis" onPress={handleSubmit} loading={submitting} disabled={!product} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  emptyText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  productOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.md, padding: 12,
  },
  productOptionActive: { borderColor: colors.primary, backgroundColor: '#fff7ed' },
  productOptionText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  starBtnActive: { backgroundColor: '#f59e0b' },
  ratingLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  input: {
    height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  textArea: { height: 110, textAlignVertical: 'top', paddingTop: 12 },
  imagesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  imageWrap: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  removeImageBtn: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  addImageBtn: {
    width: 72, height: 72, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
});
