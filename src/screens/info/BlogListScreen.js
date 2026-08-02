import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme/colors';
import { getBlogs } from '../../services/blogService';
import { getThumbnail } from '../../utils/format';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function BlogListScreen({ navigation }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogs().then(setBlogs).catch(() => setBlogs([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {blogs.length === 0 ? (
        <EmptyState icon="newspaper-outline" title="Aucun article pour le moment" />
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('BlogDetail', { slug: item.slug })}>
              {item.image_url ? (
                <Image source={{ uri: getThumbnail(item.image_url) }} style={styles.image} />
              ) : (
                <View style={[styles.image, { backgroundColor: '#f1f5f9' }]} />
              )}
              <View style={{ flex: 1 }}>
                {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12 },
  image: { width: 84, height: 84, borderRadius: radius.md },
  category: { fontSize: 9, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 13.5, fontWeight: '800', color: colors.text, marginTop: 3 },
  summary: { fontSize: 11.5, color: colors.textMuted, fontWeight: '500', marginTop: 3, lineHeight: 16 },
});
