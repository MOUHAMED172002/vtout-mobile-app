import React, { useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { getPolicyByType, getCGV } from '../../services/contentService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function PolicyDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { type, title } = route.params || {};
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: title || 'Politique' });
  }, [title, navigation]);

  useEffect(() => {
    const fetcher = type === 'cgv' ? getCGV() : getPolicyByType(type);
    fetcher.then(setPolicy).catch(() => setPolicy(null)).finally(() => setLoading(false));
  }, [type]);

  if (loading) return <Loading />;
  if (!policy) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="document-text-outline" title="Contenu indisponible" subtitle="Ce document n'a pas encore été publié." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>{policy.title || title}</Text>
        <Text style={styles.body}>{policy.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 16 },
  body: { fontSize: 13, color: colors.textMuted, fontWeight: '500', lineHeight: 21 },
});
