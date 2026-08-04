import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const THEME_CHOICES = [
  { key: 'system', label: 'Système', icon: 'phone-portrait-outline' },
  { key: 'light', label: THEMES.light.label, icon: THEMES.light.icon },
  { key: 'dark', label: THEMES.dark.label, icon: THEMES.dark.icon },
  { key: 'retro', label: THEMES.retro.label, icon: THEMES.retro.icon },
  { key: 'valentine', label: THEMES.valentine.label, icon: THEMES.valentine.icon },
];

const ACCOUNT_ITEMS = [
  { label: 'Changer le mot de passe', icon: 'lock-closed-outline', route: 'ChangePassword' },
  { label: 'Mes adresses', icon: 'location-outline', route: 'Addresses' },
  { label: 'Notifications', icon: 'notifications-outline', route: 'Notifications' },
];

export default function SettingsScreen({ navigation }) {
  const { colors, preference, themeKey, setThemePreference } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 40 }}>

        <View>
          <Text style={styles.sectionLabel}>Univers visuel</Text>
          <View style={styles.themeGrid}>
            {THEME_CHOICES.map((opt) => {
              const isActive = preference === opt.key;
              const swatch = opt.key === 'system' ? null : THEMES[opt.key]?.colors;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.themeCard, isActive && styles.themeCardActive]}
                  onPress={() => setThemePreference(opt.key)}
                >
                  <View style={[styles.themeIconWrap, isActive && styles.themeIconWrapActive]}>
                    <Ionicons name={opt.icon} size={18} color={isActive ? '#fff' : colors.textMuted} />
                  </View>
                  <Text style={[styles.themeCardLabel, isActive && styles.themeCardLabelActive]}>{opt.label}</Text>
                  {swatch && (
                    <View style={styles.swatchRow}>
                      <View style={[styles.swatchDot, { backgroundColor: swatch.primary }]} />
                      <View style={[styles.swatchDot, { backgroundColor: swatch.secondary }]} />
                      <View style={[styles.swatchDot, { backgroundColor: swatch.background, borderWidth: 1, borderColor: swatch.border }]} />
                    </View>
                  )}
                  {isActive && (
                    <View style={styles.themeCheck}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {preference === 'system' && (
            <Text style={styles.hint}>Suit automatiquement le réglage clair/sombre de votre téléphone (thème « {THEMES[themeKey]?.label} » actif).</Text>
          )}
        </View>

        <View>
          <Text style={styles.sectionLabel}>Compte & sécurité</Text>
          <View style={styles.menuCard}>
            {ACCOUNT_ITEMS.map((item, idx) => (
              <Pressable
                key={item.route}
                style={[styles.menuRow, idx === ACCOUNT_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={styles.menuIconWrap}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: {
    width: '31%', minWidth: 100, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.border, padding: 12, alignItems: 'flex-start', gap: 8,
  },
  themeCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0d` },
  themeIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  themeIconWrapActive: { backgroundColor: colors.primary },
  themeCardLabel: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted },
  themeCardLabelActive: { color: colors.text },
  swatchRow: { flexDirection: 'row', gap: 4 },
  swatchDot: { width: 10, height: 10, borderRadius: 5 },
  themeCheck: { position: 'absolute', top: 8, right: 8 },
  hint: { fontSize: 11, color: colors.textFaint, fontWeight: '600', marginTop: 8, lineHeight: 15 },
  menuCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: `${colors.primary}1a`, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.danger, marginTop: 4,
  },
  signOutText: { fontSize: 14, fontWeight: '800', color: colors.danger },
});
