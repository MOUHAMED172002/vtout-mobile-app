import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getMyFinancials, requestPayout } from '../services/walletService';
import { formatPrice } from '../utils/format';
import Loading from '../components/Loading';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

export default function WalletScreen() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
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
    } catch {
      setBalance(0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleRequestPayout = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0 || value > balance) {
      Alert.alert('Montant invalide', 'Vérifiez le montant saisi par rapport à votre solde.');
      return;
    }
    if (!payoutInfo.trim()) {
      Alert.alert('Informations manquantes', 'Renseignez vos coordonnées Mobile Money.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await requestPayout({ amount: value, payout_info: payoutInfo }, token);
      Alert.alert('Demande envoyée', 'Votre demande de retrait a été transmise.');
      setAmount('');
      setShowPayoutForm(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={(item, idx) => String(item.id || idx)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue}>{formatPrice(balance)} <Text style={styles.balanceCurrency}>F</Text></Text>
              {balance > 0 && (
                <Button title="Demander un retrait" variant="secondary" onPress={() => setShowPayoutForm((s) => !s)} style={{ marginTop: 14 }} />
              )}
            </View>

            {showPayoutForm && (
              <View style={styles.formCard}>
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
                  placeholder="Numéro Mobile Money"
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
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="Aucune transaction" subtitle="Vos gains (parrainage, remboursements...) apparaîtront ici." />}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>{item.description || item.type || 'Transaction'}</Text>
              <Text style={styles.historyDate}>{new Date(item.created_at || item.createdAt).toLocaleDateString('fr-FR')}</Text>
            </View>
            <Text style={styles.historyAmount}>+{formatPrice(item.amount)} F</Text>
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
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  historyTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  historyDate: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  historyAmount: { fontSize: 13, fontWeight: '900', color: colors.success },
});
