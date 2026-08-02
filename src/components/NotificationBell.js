import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

// Utilise useNavigation() (plutôt qu'une prop) pour pouvoir être posé dans
// n'importe quel en-tête (client, vendeur, livreur, admin) : "Notifications"
// est enregistré sur le stack racine, l'action remonte automatiquement.
export default function NotificationBell({ dark = false }) {
  const navigation = useNavigation();
  const { isSignedIn } = useAuth();
  const { unreadCount } = useNotifications();

  if (!isSignedIn) return null;

  return (
    <Pressable style={[styles.trigger, dark && styles.triggerDark]} onPress={() => navigation.navigate('Notifications')}>
      <Ionicons name="notifications-outline" size={18} color={dark ? '#fff' : colors.text} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  triggerDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  badge: {
    position: 'absolute', top: -3, right: -3, backgroundColor: colors.danger,
    minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
});
