import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAllProfiles, updateProfileStatus } from '../../services/adminUserService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const ROLE_LABELS = {
  admin: 'Admin',
  fournisseur: 'Vendeur',
  livreur: 'Livreur',
  user: 'Client',
};

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getAllProfiles(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      u.fullname?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

  const handleToggle = async (user, nextActive) => {
    setBusyId(user.id);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: nextActive } : u)));
    try {
      const token = await getToken();
      await updateProfileStatus(user.id, nextActive, token);
    } catch (err) {
      // rollback en cas d'échec
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: !nextActive } : u)));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textFaint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, email, téléphone..."
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
        />
      </View>

      {filteredUsers.length === 0 ? (
        <EmptyState icon="people-outline" title="Aucun utilisateur" />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const active = item.is_active !== false;
            return (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.fullname || item.email || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.fullname || 'Sans nom'}</Text>
                  <Text style={styles.email} numberOfLines={1}>{item.email || item.phone || ''}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{ROLE_LABELS[item.role] || item.role || 'Client'}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Switch
                    value={active}
                    onValueChange={(v) => handleToggle(item, v)}
                    disabled={busyId === item.id}
                    trackColor={{ false: colors.border, true: `${colors.success}80` }}
                    thumbColor={active ? colors.success : '#f4f4f5'}
                  />
                  <Text style={[styles.statusLabel, { color: active ? colors.success : colors.textFaint }]}>
                    {active ? 'Actif' : 'Désactivé'}
                  </Text>
                </View>
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: `${colors.secondary}18`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900', color: colors.secondary },
  name: { fontSize: 13, fontWeight: '800', color: colors.text },
  email: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: colors.background, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  statusLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});
