import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

const MENU_ITEMS = [
  { label: 'Mes commandes', icon: 'receipt-outline', route: 'Orders' },
  { label: 'Mes favoris', icon: 'heart-outline', route: 'Favorites' },
  { label: 'Mes adresses', icon: 'location-outline', route: 'Addresses' },
];

export default function ProfileScreen({ navigation }) {
  const { isLoaded, isSignedIn, user, profile, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);
  };

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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <Pressable
              key={item.route}
              style={[styles.menuRow, idx === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
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

        <Button title="Se déconnecter" variant="outline" onPress={handleSignOut} icon={<Ionicons name="log-out-outline" size={16} color={colors.text} />} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  guestTitle: { fontSize: 19, fontWeight: '900', color: colors.text, textAlign: 'center' },
  guestSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 24, fontWeight: '900' },
  name: { fontSize: 18, fontWeight: '900', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  menuCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(243,112,33,0.1)', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
});
