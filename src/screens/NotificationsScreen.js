import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { useNotifications } from '../context/NotificationContext';
import EmptyState from '../components/EmptyState';

const TYPE_ICONS = {
  wallet: 'wallet-outline',
  order: 'receipt-outline',
  alert: 'alert-circle-outline',
  info: 'information-circle-outline',
};

const TYPE_COLORS = {
  wallet: colors.success,
  order: colors.secondary,
  alert: colors.danger,
  info: colors.primary,
};

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

export default function NotificationsScreen() {
  const { notifications, loading, markRead, markAllRead, removeNotification } = useNotifications();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {notifications.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerCount}>{notifications.filter((n) => !n.is_read).length} non lue(s)</Text>
          <Pressable onPress={markAllRead}>
            <Text style={styles.headerAction}>Tout marquer comme lu</Text>
          </Pressable>
        </View>
      )}

      {!loading && notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="Aucune notification" subtitle="Vous serez averti ici des mises à jour de vos commandes." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const icon = TYPE_ICONS[item.type] || TYPE_ICONS.info;
            const color = TYPE_COLORS[item.type] || TYPE_COLORS.info;
            return (
              <Pressable
                style={[styles.row, !item.is_read && styles.rowUnread]}
                onPress={() => !item.is_read && markRead(item.id)}
                onLongPress={() => removeNotification(item.id)}
              >
                <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.time}>{timeAgo(item.created_at || item.createdAt)}</Text>
                </View>
                {!item.is_read && <View style={styles.dot} />}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  headerCount: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  headerAction: { fontSize: 11, fontWeight: '800', color: colors.primary },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  rowUnread: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '800', color: colors.text },
  message: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  time: { fontSize: 10, color: colors.textFaint, fontWeight: '700', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
