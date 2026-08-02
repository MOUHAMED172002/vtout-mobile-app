import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { getFaqs } from '../../services/contentService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FaqScreen() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    getFaqs().then(setFaqs).catch(() => setFaqs([])).finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {faqs.length === 0 ? (
        <EmptyState icon="help-circle-outline" title="Aucune question pour le moment" />
      ) : (
        <FlatList
          data={faqs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const open = openId === item.id;
            return (
              <Pressable style={styles.card} onPress={() => toggle(item.id)}>
                <View style={styles.questionRow}>
                  <Text style={styles.question}>{item.question}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textFaint} />
                </View>
                {open && <Text style={styles.answer}>{item.answer}</Text>}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  question: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.text },
  answer: { fontSize: 12.5, color: colors.textMuted, fontWeight: '500', lineHeight: 19, marginTop: 10 },
});
