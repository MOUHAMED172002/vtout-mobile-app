import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getCategories } from '../services/productService';
import { resolveCategoryIcon } from '../utils/categoryIcon';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CategoriesScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const parents = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenByParent = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = [];
        map[c.parent_id].push(c);
      }
    });
    return map;
  }, [categories]);

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>Catalogue complet</Text>
        <Text style={styles.headerTitle}>Toutes nos catégories</Text>
      </View>
      {parents.length === 0 ? (
        <EmptyState icon="grid-outline" title="Aucune catégorie disponible" />
      ) : (
        <FlatList
          data={parents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isOpen = expandedId === item.id;
            const children = childrenByParent[item.id] || [];
            const { isEmoji, emoji, IconComponent } = resolveCategoryIcon(item.icon, 'Package');
            return (
              <View style={[styles.card, isOpen && styles.cardOpen]}>
                <Pressable style={styles.cardHeader} onPress={() => toggle(item.id)}>
                  <View style={[styles.cardIcon, isOpen && styles.cardIconOpen]}>
                    {isEmoji ? (
                      <Text style={styles.cardEmoji}>{emoji}</Text>
                    ) : (
                      <IconComponent size={26} color={isOpen ? '#fff' : colors.primary} strokeWidth={2} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, isOpen && styles.cardTitleOpen]}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {children.length} {children.length > 1 ? 'sous-catégories' : 'sous-catégorie'}
                    </Text>
                  </View>
                  <View style={[styles.chevronWrap, isOpen && styles.chevronWrapOpen]}>
                    <Ionicons name="chevron-down" size={16} color={isOpen ? '#fff' : colors.textFaint} />
                  </View>
                </Pressable>

                {isOpen && (
                  <View style={styles.cardBody}>
                    {children.length === 0 ? (
                      <Pressable
                        style={styles.exploreBtn}
                        onPress={() => navigation.navigate('ProductsList', { categoryId: item.id, title: item.name })}
                      >
                        <Text style={styles.exploreBtnText}>Explorer la collection</Text>
                      </Pressable>
                    ) : (
                      <View style={{ gap: 4 }}>
                        {children.map((sub) => {
                          const subIcon = resolveCategoryIcon(sub.icon, 'CornerDownRight');
                          return (
                            <Pressable
                              key={sub.id}
                              style={styles.subRow}
                              onPress={() => navigation.navigate('ProductsList', { categoryId: sub.id, title: sub.name })}
                            >
                              <View style={styles.subIcon}>
                                {subIcon.isEmoji ? (
                                  <Text style={styles.subEmoji}>{subIcon.emoji}</Text>
                                ) : (
                                  <subIcon.IconComponent size={16} color={colors.primary} strokeWidth={2} />
                                )}
                              </View>
                              <Text style={styles.subLabel} numberOfLines={1}>{sub.name}</Text>
                              <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 4 },
  headerEyebrow: { fontSize: 10.5, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, overflow: 'hidden',
  },
  cardOpen: { borderColor: colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  cardIcon: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconOpen: { backgroundColor: colors.primary },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  cardTitleOpen: { color: colors.primary },
  cardSubtitle: { fontSize: 10.5, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 },
  chevronWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  chevronWrapOpen: { backgroundColor: colors.primary },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  exploreBtn: { height: 46, borderRadius: radius.md, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  exploreBtnText: { fontSize: 11.5, fontWeight: '800', color: colors.surface, textTransform: 'uppercase', letterSpacing: 0.5 },
  subRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    paddingHorizontal: 10, borderRadius: radius.md,
  },
  subIcon: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  subEmoji: { fontSize: 15 },
  subLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
});
