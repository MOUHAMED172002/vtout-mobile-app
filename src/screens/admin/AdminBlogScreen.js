import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllBlogsAdmin, deleteBlog } from '../../services/adminContentService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function AdminBlogScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllBlogsAdmin(token);
      setBlogs(data);
    } catch {
      setBlogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AdminBlogForm')}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, colors, styles]);

  const handleDelete = (item) => {
    Alert.alert(
      "Supprimer l'article",
      `Supprimer "${item.title}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await deleteBlog(item.id, token);
              load();
            } catch {
              Alert.alert('Erreur', "Impossible de supprimer l'article.");
            }
          },
        },
      ],
    );
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {blogs.length === 0 ? (
        <EmptyState icon="newspaper-outline" title="Aucun article" subtitle="Créez votre premier article de blog." />
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('AdminBlogForm', { id: item.id, blog: item })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.badge, { backgroundColor: item.is_published ? `${colors.success}20` : `${colors.textFaint}20` }]}>
                    <Text style={[styles.badgeText, { color: item.is_published ? colors.success : colors.textMuted }]}>
                      {item.is_published ? 'Publié' : 'Brouillon'}
                    </Text>
                  </View>
                  {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
                  <Text style={styles.date}>
                    {new Date(item.published_at || item.created_at || item.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.trashButton} onPress={() => handleDelete(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  category: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  date: { fontSize: 11, fontWeight: '600', color: colors.textFaint },
  trashButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
