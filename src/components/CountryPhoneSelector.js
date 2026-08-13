import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

// Miroir de frontend/src/component/Shared/CountryPhoneSelector.jsx — mêmes
// 14 indicatifs (Afrique de l'Ouest + quelques pays occidentaux), même
// format de valeur (indicatif + numéro local concaténés, ex: "+22961000000").
// Utilisé uniquement là où le web l'utilise (inscription vendeur) — le
// reste de l'app garde la convention "+229" fixe déjà en place ailleurs.
const COUNTRIES = [
  { code: 'BJ', name: 'Bénin', indicatif: '+229', flag: '🇧🇯' },
  { code: 'CI', name: "Côte d'Ivoire", indicatif: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', indicatif: '+221', flag: '🇸🇳' },
  { code: 'TG', name: 'Togo', indicatif: '+228', flag: '🇹🇬' },
  { code: 'BF', name: 'Burkina Faso', indicatif: '+226', flag: '🇧🇫' },
  { code: 'ML', name: 'Mali', indicatif: '+223', flag: '🇲🇱' },
  { code: 'NE', name: 'Niger', indicatif: '+227', flag: '🇳🇪' },
  { code: 'GH', name: 'Ghana', indicatif: '+233', flag: '🇬🇭' },
  { code: 'NG', name: 'Nigéria', indicatif: '+234', flag: '🇳🇬' },
  { code: 'CM', name: 'Cameroun', indicatif: '+237', flag: '🇨🇲' },
  { code: 'CD', name: 'R.D.Congo', indicatif: '+243', flag: '🇨🇩' },
  { code: 'FR', name: 'France', indicatif: '+33', flag: '🇫🇷' },
  { code: 'GB', name: 'Royaume-Uni', indicatif: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'États-Unis', indicatif: '+1', flag: '🇺🇸' },
];

const extractCountry = (value) => {
  if (!value) return COUNTRIES[0];
  const indicatif = value.match(/^\+\d+/)?.[0];
  return COUNTRIES.find((c) => c.indicatif === indicatif) || COUNTRIES[0];
};

export default function CountryPhoneSelector({ value, onChange, label, error, required }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry = useMemo(() => extractCountry(value), [value]);

  const displayPhone = useMemo(() => {
    if (!value) return '';
    const indicatifDigits = selectedCountry.indicatif.replace('+', '');
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.startsWith(indicatifDigits) ? digitsOnly.slice(indicatifDigits.length) : digitsOnly;
  }, [value, selectedCountry]);

  const handleCountrySelect = (country) => {
    setModalVisible(false);
    setSearch('');
    onChange(`${country.indicatif}${displayPhone}`);
  };

  const handlePhoneChange = (text) => {
    onChange(`${selectedCountry.indicatif}${text.replace(/\D/g, '')}`);
  };

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
    || c.indicatif.includes(search)
    || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ gap: 6, width: '100%' }}>
      {label && (
        <View style={styles.labelRow}>
          <Ionicons name="call-outline" size={12} color={colors.textFaint} />
          <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
        </View>
      )}

      <View style={[styles.row, error && styles.rowError]}>
        <Pressable style={styles.countryBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.indicatif}>{selectedCountry.indicatif}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
        </Pressable>
        <TextInput
          style={styles.phoneInput}
          value={displayPhone}
          onChangeText={handlePhoneChange}
          placeholder="00 00 00 00"
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : (
        <Text style={styles.helper}>Format : {selectedCountry.indicatif} + numéro local</Text>
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir un pays</Text>
            <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un pays..."
              placeholderTextColor={colors.textFaint}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun pays trouvé.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.countryRow, selectedCountry.code === item.code && styles.countryRowActive]}
                onPress={() => handleCountrySelect(item)}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryIndicatif}>{item.indicatif}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: {
    flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden',
  },
  rowError: { borderColor: colors.danger },
  countryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: '100%',
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  flag: { fontSize: 17 },
  indicatif: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  phoneInput: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 14, fontWeight: '700', color: colors.text },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.danger },
  helper: { fontSize: 10, fontWeight: '600', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.3 },
  modalSafe: { flex: 1, backgroundColor: colors.background, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', height: 46, marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 12, fontWeight: '600', color: colors.textFaint, textAlign: 'center', marginTop: 40 },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  countryRowActive: { backgroundColor: `${colors.primary}0f` },
  countryName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  countryIndicatif: { fontSize: 13, fontWeight: '900', color: colors.primary },
});
