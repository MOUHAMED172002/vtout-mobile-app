import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { searchProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function SearchScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const runSearch = useCallback((q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    searchProducts(q)
      .then((data) => setResults(data.products || data || []))
      .catch(() => setResults([]))
      .finally(() => {
        setLoading(false);
        setSearched(true);
      });
  }, []);

  const onChangeText = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 400);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher un produit..."
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={onChangeText}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <Loading fullScreen={false} />
      ) : searched && results.length === 0 ? (
        <EmptyState icon="search-outline" title="Aucun résultat" subtitle={`Rien pour « ${query} »`} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { id: item.id })} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    height: 48, borderRadius: radius.md, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
});
