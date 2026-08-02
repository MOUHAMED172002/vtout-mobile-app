import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getMyFinancials, requestPayout } from '../../services/supplierWalletService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';

export default function SupplierWalletScreen() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [payoutInfo, setPayoutInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyFinancials(token);
      setBalance(Number(data?.balance || 0));
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setPayoutRequests(Array.isArray(data?.payoutRequests) ? data.payoutRequests : []);
      if (data?.savedPayoutInfo) setPayoutInfo(data.savedPayoutInfo);
    } catch {
      setBalance(0);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleRequestPayout = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      Alert.alert('Montant invalide', 'Merci de saisir un montant valide.');
      return;
    }
    if (value > balance) {
      Alert.alert('Solde insuffisant', 'Le montant demandé dépasse votre solde disponible.');
      return;
    }
    if (!payoutInfo.trim()) {
      Alert.alert('Informations manquantes', 'Merci de renseigner vos coordonnées de paiement (Mobile Money ou compte bancaire).');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await requestPayout({ amount: value, payout_info: payoutInfo }, token);
      Alert.alert('Demande envoyée', 'Votre demande de retrait a été transmise à l\'équipe Vtout.');
      setAmount('');
      setShowPayoutForm(false);
      await load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  const combinedHistory = [
    ...transactions.map((t) => ({ ...t, kind: 'transaction' })),
    ...payoutRequests.map((p) => ({ ...p, kind: 'payout' })),
  ].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={combinedHistory}
        keyExtractor={(item, idx) => `${item.kind}-${item.id || idx}`}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue}>{formatPrice(balance)} <Text style={styles.balanceCurrency}>F</Text></Text>
              <Button
                title="Demander un retrait"
                variant="secondary"
                onPress={() => setShowPayoutForm((s) => !s)}
                style={{ marginTop: 14 }}
                icon={<Ionicons name="cash-outline" size={16} color="#fff" />}
              />
            </View>

            {showPayoutForm && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Nouvelle demande de retrait</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Montant (FCFA)"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Money / compte bancaire"
                  placeholderTextColor={colors.textFaint}
                  value={payoutInfo}
                  onChangeText={setPayoutInfo}
                />
                <Button title="Envoyer la demande" onPress={handleRequestPayout} loading={submitting} />
              </View>
            )}

            <Text style={styles.sectionTitle}>Historique</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="Aucune transaction pour le moment" />}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <View style={[styles.historyIcon, { backgroundColor: item.kind === 'payout' ? '#fef3c7' : '#ecfdf5' }]}>
              <Ionicons
                name={item.kind === 'payout' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                size={20}
                color={item.kind === 'payout' ? colors.warning : colors.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>
                {item.kind === 'payout' ? 'Demande de retrait' : (item.description || item.type || 'Transaction')}
              </Text>
              <Text style={styles.historyDate}>
                {new Date(item.created_at || item.createdAt).toLocaleDateString('fr-FR')}
                {item.kind === 'payout' ? ` · ${item.status || 'en attente'}` : ''}
              </Text>
            </View>
            <Text style={[styles.historyAmount, item.kind === 'payout' && { color: colors.warning }]}>
              {item.kind === 'payout' ? '-' : '+'}{formatPrice(item.amount)} F
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  balanceCard: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 20 },
  balanceLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  balanceValue: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 6 },
  balanceCurrency: { fontSize: 14, color: colors.primary },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  formTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  historyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  historyTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  historyDate: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  historyAmount: { fontSize: 13, fontWeight: '900', color: colors.success },
});
