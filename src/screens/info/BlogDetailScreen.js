import React, { useEffect, useState } from 'react';
import { Text, Image, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { getBlogBySlug } from '../../services/blogService';
import { getOptimizedImage } from '../../utils/format';
import Loading from '../../components/Loading';

export default function BlogDetailScreen({ route, navigation }) {
  const { slug } = route.params;
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogBySlug(slug).then(setBlog).catch(() => setBlog(null)).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (blog?.title) navigation.setOptions({ title: '' });
  }, [blog, navigation]);

  if (loading) return <Loading />;
  if (!blog) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Article introuvable.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {blog.image_url ? (
          <Image source={{ uri: getOptimizedImage(blog.image_url, 800) }} style={styles.image} />
        ) : null}
        <Text style={styles.category}>{blog.category}</Text>
        <Text style={styles.title}>{blog.title}</Text>
        <Text style={styles.body}>{blog.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { textAlign: 'center', marginTop: 40, color: colors.textMuted, fontWeight: '700' },
  image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#f1f5f9' },
  category: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 20, marginTop: 18 },
  title: { fontSize: 21, fontWeight: '900', color: colors.text, marginHorizontal: 20, marginTop: 6, lineHeight: 27 },
  body: { fontSize: 13.5, color: colors.textMuted, fontWeight: '500', lineHeight: 22, marginHorizontal: 20, marginTop: 16 },
});
