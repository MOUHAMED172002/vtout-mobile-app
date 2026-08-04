import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSpace } from '../context/SpaceContext';
import { useNotifications } from '../context/NotificationContext';
import Button from '../components/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLS = 4;
const GRID_GAP = 12;
const GRID_CARD_PADDING = 16;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - GRID_CARD_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const QUICK_ACTIONS = [
  { label: 'Mes commandes', icon: 'receipt-outline', route: 'Orders' },
  { label: 'Mes favoris', icon: 'heart-outline', route: 'Favorites' },
  { label: 'Mes avis', icon: 'star-outline', route: 'MyReviews' },
];

const ORDER_STATUS_SHORTCUTS = [
  { label: 'En attente', icon: 'time-outline', status: 'pending' },
  { label: 'Confirmées', icon: 'checkmark-circle-outline', status: 'confirmed' },
  { label: 'Expédiées', icon: 'airplane-outline', status: 'shipped' },
  { label: 'Livrées', icon: 'checkmark-done-circle-outline', status: 'delivered' },
  { label: 'Annulées', icon: 'close-circle-outline', status: 'cancelled' },
];

const ACCOUNT_ITEMS = [
  { label: 'Notifications', icon: 'notifications-outline', route: 'Notifications' },
  { label: 'Mon portefeuille', icon: 'wallet-outline', route: 'Wallet' },
  { label: 'Mes adresses', icon: 'location-outline', route: 'Addresses' },
  { label: 'Aide & À propos', icon: 'help-circle-outline', route: 'InfoHub' },
];

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { isLoaded, isSignedIn, user, profile, isSupplier, isDelivery, isAdmin } = useAuth();
  const { switchSpace, availableSpaces } = useSpace();
  const { unreadCount } = useNotifications();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.guestWrap}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={32} color={colors.textFaint} />
          </View>
          <Text style={styles.guestTitle}>Connectez-vous à Vtout</Text>
          <Text style={styles.guestSubtitle}>Accédez à vos commandes, favoris et adresses.</Text>
          <View style={{ width: '100%', gap: 12, marginTop: 24 }}>
            <Button title="Se connecter" onPress={() => navigation.navigate('Login')} />
            <Button title="Créer un compte" variant="outline" onPress={() => navigation.navigate('Register')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.fullname || user?.name || 'Utilisateur';
  const avatarUrl = profile?.avatar_url || user?.image || null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 32 }}>
        <View style={styles.profileHeader}>
          <Pressable style={styles.avatarPress} onPress={() => navigation.navigate('EditProfile')}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImageWrap} contentFit="cover" />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="pencil" size={11} color="#fff" />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <Pressable style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((item) => (
            <Pressable key={item.route} style={styles.quickCard} onPress={() => navigation.navigate(item.route)}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={styles.quickCardLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Mes commandes</Text>
            <Pressable onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.sectionLink}>Voir tout</Text>
            </Pressable>
          </View>
          <View style={styles.iconGrid}>
            {ORDER_STATUS_SHORTCUTS.map((item) => (
              <Pressable
                key={item.status}
                style={styles.iconGridItem}
                onPress={() => navigation.navigate('Orders', { initialStatus: item.status })}
              >
                <View style={styles.iconGridIconWrap}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.iconGridLabel} numberOfLines={2}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>Mon compte</Text>
          <View style={styles.iconGrid}>
            {ACCOUNT_ITEMS.map((item) => (
              <Pressable key={item.route} style={styles.iconGridItem} onPress={() => navigation.navigate(item.route)}>
                <View style={styles.iconGridIconWrap}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                  {item.route === 'Notifications' && unreadCount > 0 && (
                    <View style={styles.iconGridBadge}>
                      <Text style={styles.iconGridBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.iconGridLabel} numberOfLines={2}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {availableSpaces.length > 1 && (
          <View>
            <Text style={styles.sectionLabel}>Mes espaces</Text>
            <View style={styles.menuCard}>
              {availableSpaces.filter((s) => s.key !== 'customer').map((s, idx, arr) => (
                <Pressable
                  key={s.key}
                  style={[styles.menuRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => switchSpace(s.key)}
                >
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={s.icon} size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{s.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(!isSupplier || !isDelivery) && !isAdmin && (
          <View>
            <Text style={styles.sectionLabel}>Vendre ou livrer sur Vtout</Text>
            <View style={{ gap: 10 }}>
              {!isSupplier && (
                <Button
                  title="Devenir vendeur"
                  variant="outline"
                  onPress={() => navigation.navigate('SupplierRegister')}
                  icon={<Ionicons name="storefront-outline" size={16} color={colors.text} />}
                />
              )}
              {!isDelivery && (
                <Button
                  title="Devenir livreur"
                  variant="outline"
                  onPress={() => navigation.navigate('BecomeDelivery')}
                  icon={<Ionicons name="bicycle-outline" size={16} color={colors.text} />}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  guestTitle: { fontSize: 19, fontWeight: '900', color: colors.text, textAlign: 'center' },
  guestSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarPress: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarImageWrap: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.surface },
  avatarInitial: { color: '#fff', fontSize: 24, fontWeight: '900' },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background,
  },
  name: { fontSize: 18, fontWeight: '900', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, alignItems: 'center', gap: 6,
  },
  quickCardLabel: { fontSize: 10.5, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionLink: { fontSize: 11, fontWeight: '800', color: colors.primary },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: GRID_CARD_PADDING },
  iconGridItem: { width: GRID_ITEM_WIDTH, alignItems: 'center', gap: 6 },
  iconGridIconWrap: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: `${colors.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  iconGridBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  iconGridBadgeText: { fontSize: 8.5, fontWeight: '900', color: '#fff' },
  iconGridLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textAlign: 'center', lineHeight: 12 },
  menuCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(243,112,33,0.1)', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
});
