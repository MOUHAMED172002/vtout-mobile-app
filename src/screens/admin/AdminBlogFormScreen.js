import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllBlogsAdmin, createBlog, updateBlog } from '../../services/adminContentService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const slugify = (text) => text
  .toLowerCase()
  .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
  .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c')
  .replace(/ /g, '-')
  .replace(/[^\w-]+/g, '');

export default function AdminBlogFormScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const editingId = route.params?.id || null;
  const existing = route.params?.blog || null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(existing?.title || '');
  const [slug, setSlug] = useState(existing?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!existing?.slug);
  const [category, setCategory] = useState(existing?.category || '');
  const [summary, setSummary] = useState(existing?.summary || '');
  const [content, setContent] = useState(existing?.content || '');
  const [imageUrl, setImageUrl] = useState(existing?.image_url || '');
  const [isPublished, setIsPublished] = useState(existing?.is_published || false);

  const load = useCallback(async () => {
    if (!editingId || existing) return;
    setLoading(true);
    try {
      const token = await getToken();
      const blogs = await getAllBlogsAdmin(token);
      const found = blogs.find((b) => String(b.id) === String(editingId));
      if (found) {
        setTitle(found.title || '');
        setSlug(found.slug || '');
        setSlugTouched(true);
        setCategory(found.category || '');
        setSummary(found.summary || '');
        setContent(found.content || '');
        setImageUrl(found.image_url || '');
        setIsPublished(found.is_published || false);
      }
    } catch {
      Alert.alert('Erreur', "Impossible de charger l'article.");
    } finally {
      setLoading(false);
    }
  }, [editingId, existing, getToken]);

  useEffect(() => { load(); }, [load]);

  const handleTitleChange = (text) => {
    setTitle(text);
    if (!slugTouched) setSlug(slugify(text));
  };

  const handleSubmit = async () => {
    const missing = [];
    if (!title.trim()) missing.push('Titre');
    if (!summary.trim()) missing.push('Résumé');
    if (!content.trim()) missing.push('Contenu');
    if (missing.length > 0) {
      Alert.alert('Champs manquants', missing.join(', '));
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        category: category.trim() || 'Général',
        summary: summary.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        is_published: isPublished,
      };

      if (editingId) {
        await updateBlog(editingId, payload, token);
      } else {
        await createBlog(payload, token);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Titre</Text>
            <TextInput style={styles.input} value={title} onChangeText={handleTitleChange} placeholder="Ex: Comment bien commander sur Vtout" placeholderTextColor={colors.textFaint} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Slug</Text>
            <TextInput
              style={styles.input}
              value={slug}
              onChangeText={(t) => { setSlug(t); setSlugTouched(true); }}
              placeholder="comment-bien-commander-sur-vtout"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Catégorie</Text>
            <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Ex: Conseils" placeholderTextColor={colors.textFaint} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Résumé</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              value={summary}
              onChangeText={setSummary}
              placeholder="Court résumé affiché dans la liste des articles..."
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contenu</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Contenu complet de l'article..."
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={10}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>URL de l'image (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.publishRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.publishLabel}>Publier l'article</Text>
              <Text style={styles.publishSub}>Visible publiquement dès l'enregistrement.</Text>
            </View>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{ false: colors.border, true: `${colors.success}80` }}
              thumbColor={isPublished ? colors.success : '#fff'}
            />
          </View>

          <Button title={editingId ? 'Enregistrer les modifications' : "Créer l'article"} onPress={handleSubmit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    minHeight: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  textAreaSmall: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  textArea: { height: 200, textAlignVertical: 'top', paddingTop: 12 },
  publishRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14,
  },
  publishLabel: { fontSize: 13, fontWeight: '800', color: colors.text },
  publishSub: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
});
