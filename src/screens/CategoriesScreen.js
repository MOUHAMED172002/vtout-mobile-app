import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { getCategories } from '../services/productService';
import { getThumbnail } from '../utils/format';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function CategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>Catégories</Text>
      {categories.length === 0 ? (
        <EmptyState icon="grid-outline" title="Aucune catégorie disponible" />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('ProductsList', { categoryId: item.id, title: item.name })}
            >
              {item.image_url ? (
                <Image source={{ uri: getThumbnail(item.image_url) }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                </View>
              )}
              <Text style={styles.label}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 24, fontWeight: '900', color: colors.text, paddingHorizontal: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  image: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
});
