import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getHierarchy } from '../services/locationService';
import territoriesFallback from '../data/decoupage-territorial-benin.json';

const removeAccents = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function buildLocationList(rawData) {
  const list = [];
  (rawData || []).forEach((dep) => {
    const communes = dep.communes || [];
    communes.forEach((com) => {
      const arrs = com.arrondissements || [];
      if (arrs.length > 0) {
        arrs.forEach((arr) => {
          const qs = arr.quartiers || [];
          qs.forEach((q) => {
            const formatted = `${q.name || q.lib_quart}, ${arr.name || arr.lib_arrond}, ${com.name || com.lib_com}`;
            list.push({
              departement_id: dep.id || dep.id_dep,
              departement_label: dep.name || dep.lib_dep,
              commune_id: com.id || com.id_com,
              commune_label: com.name || com.lib_com,
              arrondissement_id: arr.id || arr.id_arrond,
              arrondissement_label: arr.name || arr.lib_arrond,
              quartier_id: q.id || q.id_quart,
              quartier_label: q.name || q.lib_quart,
              formattedAddress: formatted,
              searchStr: removeAccents(formatted),
            });
          });
        });
      } else if (com.quartiers) {
        com.quartiers.forEach((q) => {
          const formatted = `${q.name}, ${com.name}`;
          list.push({
            departement_id: dep.id,
            departement_label: dep.name,
            commune_id: com.id,
            commune_label: com.name,
            quartier_id: q.id,
            quartier_label: q.name,
            formattedAddress: formatted,
            searchStr: removeAccents(formatted),
          });
        });
      }
    });
  });
  return list;
}

// Recherche + sélection d'un quartier de livraison (Bénin), avec repli sur
// les données locales embarquées si l'API est injoignable.
export default function LocationPicker({ value, onChange }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(value?.formattedAddress || '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let raw;
        try {
          raw = await getHierarchy();
        } catch {
          raw = territoriesFallback;
        }
        setAllLocations(buildLocationList(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim() || !showSuggestions) return [];
    const q = removeAccents(query.trim());
    return allLocations.filter((loc) => loc.searchStr.includes(q)).slice(0, 30);
  }, [query, allLocations, showSuggestions]);

  if (value?.quartier_id) {
    return (
      <View style={styles.selectedBox}>
        <View style={styles.selectedIcon}>
          <Ionicons name="checkmark" size={16} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedTitle}>{value.quartier_label}</Text>
          <Text style={styles.selectedSubtitle} numberOfLines={1}>
            {value.arrondissement_label ? `${value.arrondissement_label}, ` : ''}
            {value.commune_label}{value.departement_label ? ` · ${value.departement_label}` : ''}
          </Text>
        </View>
        <Pressable style={styles.editBtn} onPress={() => { onChange(null); setQuery(''); }}>
          <Ionicons name="pencil" size={12} color={colors.primary} />
          <Text style={styles.editBtnText}>Modifier</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color={colors.textFaint} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Ex: Akassato, Godomey, Tokpota..."
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={(t) => { setQuery(t); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 12 }} />}
      </View>

      {showSuggestions && query.length > 0 && (
        <View style={styles.suggestions}>
          {filtered.length === 0 && !loading ? (
            <Text style={styles.noResult}>Aucune localité trouvée.</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, idx) => `${item.quartier_id}-${idx}`}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.suggestionRow}
                  onPress={() => {
                    onChange(item);
                    setQuery(item.formattedAddress);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionTitle}>{item.quartier_label}</Text>
                  <Text style={styles.suggestionSubtitle}>
                    {item.arrondissement_label ? `${item.arrondissement_label}, ` : ''}{item.commune_label} ({item.departement_label})
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  suggestions: {
    marginTop: 6, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  suggestionRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  suggestionSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  noResult: { padding: 16, textAlign: 'center', color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  selectedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ecfdf5',
    borderWidth: 1, borderColor: '#a7f3d0', borderRadius: radius.md, padding: 14,
  },
  selectedIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  selectedTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  selectedSubtitle: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: '#a7f3d0' },
  editBtnText: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
});
