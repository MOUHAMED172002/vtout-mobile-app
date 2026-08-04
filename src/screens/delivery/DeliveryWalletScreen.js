import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMyFinancials, requestPayout } from '../../services/deliveryOrderService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';

const PAYOUT_METHODS = [
  { key: 'momo', label: 'Mobile Money', icon: 'phone-portrait-outline' },
  { key: 'bank', label: 'Banque', icon: 'business-outline' },
];

export default function DeliveryWalletScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('momo');
  const [details, setDetails] = useState('');
  const [saveDetails, setSaveDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyFinancials(token);
      setBalance(Number(data?.balance || 0));
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setPayoutRequests(Array.isArray(data?.payoutRequests) ? data.payoutRequests : []);
      if (data?.savedPayoutInfo?.details) setDetails(data.savedPayoutInfo.details);
      if (data?.savedPayoutInfo?.method) setMethod(data.savedPayoutInfo.method);
    } catch {
      setBalance(0);
      setTransactions([]);
      setPayoutRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleRequestPayout = async () => {
    const value = parseFloat(amount);
    if (!value || value < 1000) {
      Alert.alert('Montant invalide', 'Le montant minimum de retrait est de 1000 F.');
      return;
    }
    if (value > balance) {
      Alert.alert('Solde insuffisant', 'Le montant demandé dépasse votre solde disponible.');
      return;
    }
    if (!details.trim()) {
      Alert.alert('Informations manquantes', 'Merci de renseigner vos coordonnées de paiement.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await requestPayout({
        amount: value,
        payment_method: method,
        payment_details: details.trim(),
        save_details: saveDetails,
      }, token);
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
                title="Retirer mes gains"
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
                <Text style={styles.miniLabel}>Solde max : {formatPrice(balance)} F</Text>

                <View style={styles.methodRow}>
                  {PAYOUT_METHODS.map((m) => (
                    <Pressable
                      key={m.key}
                      style={[styles.methodBtn, method === m.key && styles.methodBtnActive]}
                      onPress={() => setMethod(m.key)}
                    >
                      <Ionicons name={m.icon} size={18} color={method === m.key ? colors.primary : colors.textFaint} />
                      <Text style={[styles.methodBtnText, method === m.key && { color: colors.primary }]}>{m.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={method === 'momo' ? 'Numéro Mobile Money & nom' : 'RIB, nom de la banque'}
                  placeholderTextColor={colors.textFaint}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={2}
                />

                <Pressable style={styles.checkboxRow} onPress={() => setSaveDetails((s) => !s)}>
                  <Ionicons name={saveDetails ? 'checkbox' : 'square-outline'} size={18} color={saveDetails ? colors.primary : colors.textFaint} />
                  <Text style={styles.checkboxLabel}>Enregistrer ces informations</Text>
                </Pressable>

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
                {item.kind === 'payout' ? ` · ${item.status === 'paid' ? 'Payé' : item.status === 'rejected' ? 'Rejeté' : 'En attente'}` : ''}
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

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  balanceCard: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 20 },
  balanceLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  balanceValue: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 6 },
  balanceCurrency: { fontSize: 14, color: colors.primary },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  formTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  miniLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textFaint, textAlign: 'right', marginTop: -4 },
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: colors.text,
  },
  textArea: { height: 60, textAlignVertical: 'top', paddingTop: 12 },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 48, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
  },
  methodBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0d` },
  methodBtnText: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
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
