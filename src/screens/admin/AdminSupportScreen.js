import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllConversations } from '../../services/adminSupportService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

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

export default function AdminSupportScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllConversations(token);
      data.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {conversations.length === 0 ? (
        <EmptyState icon="chatbox-ellipses-outline" title="Aucune conversation" subtitle="Les messages des clients apparaîtront ici." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.conversation_id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const isFromAdmin = item.sender?.role === 'admin';
            const customerId = String(item.conversation_id || '').replace(/_admin$/, '');
            const displayName = isFromAdmin ? `Client #${customerId.slice(0, 8)}` : (item.sender?.fullname || 'Client');
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('AdminSupportChat', { conversationId: item.conversation_id, customerId, customerName: isFromAdmin ? null : item.sender?.fullname })}
              >
                <View style={styles.avatar}>
                  <Ionicons name="person" size={16} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.preview} numberOfLines={1}>{isFromAdmin ? 'Vous : ' : ''}{item.content}</Text>
                </View>
                <Text style={styles.time}>{timeAgo(item.created_at || item.createdAt)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${colors.secondary}18`, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '800', color: colors.text },
  preview: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  time: { fontSize: 10, color: colors.textFaint, fontWeight: '700' },
});
