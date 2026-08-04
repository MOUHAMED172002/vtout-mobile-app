import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getDeliveryProfile,
  getMyDeliveries,
  getAvailableOrders,
  getMyFinancials,
  toggleDeliveryStatus,
  isDelivered,
  hasUnremittedCash,
  getDelivererFee,
} from '../../services/deliveryOrderService';
import { formatPrice } from '../../utils/format';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export default function DeliveryHomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken, user, profile: authProfile } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | not_registered | pending | rejected | active
  const [profile, setProfile] = useState(null);
  const [availableCount, setAvailableCount] = useState(0);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      let me = null;
      try {
        me = await getDeliveryProfile(token);
      } catch (err) {
        if (err?.response?.status === 404) {
          setStatus('not_registered');
          return;
        }
        throw err;
      }

      setProfile(me);

      if (me.kyc_status === 'rejected') {
        setStatus('rejected');
        return;
      }
      if (!me.is_verified) {
        setStatus('pending');
        return;
      }

      const [available, mine, financials] = await Promise.all([
        getAvailableOrders(token).catch(() => []),
        getMyDeliveries(token).catch(() => []),
        getMyFinancials(token).catch(() => ({ balance: 0 })),
      ]);
      setAvailableCount(available.length);
      setMyDeliveries(mine);
      setBalance(Number(financials?.balance || 0));
      setStatus('active');
    } catch (err) {
      setStatus('not_registered');
    } finally {
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const handleToggleOnline = async (value) => {
    setTogglingOnline(true);
    try {
      const token = await getToken();
      await toggleDeliveryStatus(value ? 'disponible' : 'hors_ligne', token);
      setProfile((p) => ({ ...p, status: value ? 'disponible' : 'hors_ligne' }));
    } catch (err) {
      // pas grave, on retente au prochain rafraîchissement
    } finally {
      setTogglingOnline(false);
    }
  };

  if (status === 'loading') return <Loading />;

  if (status === 'not_registered') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centerWrap}>
          <View style={styles.bigIcon}>
            <Ionicons name="bicycle" size={40} color={colors.primary} />
          </View>
          <Text style={styles.centerTitle}>Devenez livreur Vtout</Text>
          <Text style={styles.centerSubtitle}>
            Rejoignez notre flotte de livreurs partenaires et gagnez de l'argent en livrant des commandes près de chez vous.
          </Text>
          <Button title="Faire ma demande" onPress={() => navigation.navigate('BecomeDelivery')} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'pending') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centerWrap}>
          <View style={[styles.bigIcon, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time-outline" size={40} color={colors.warning} />
          </View>
          <Text style={styles.centerTitle}>Dossier en cours d'examen</Text>
          <Text style={styles.centerSubtitle}>
            Votre candidature livreur est en cours de vérification par notre équipe. Vous serez averti dès l'activation de votre compte, généralement sous 24h.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'rejected') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centerWrap}>
          <View style={[styles.bigIcon, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="close-circle-outline" size={40} color={colors.danger} />
          </View>
          <Text style={styles.centerTitle}>Dossier rejeté</Text>
          {profile?.kyc_rejection_reason ? (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Motif du rejet</Text>
              <Text style={styles.rejectionText}>{profile.kyc_rejection_reason}</Text>
            </View>
          ) : null}
          <Button title="Corriger mon dossier" onPress={() => navigation.navigate('BecomeDelivery')} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  const isOnline = profile?.status !== 'hors_ligne';
  const activeCount = myDeliveries.filter((o) => !isDelivered(o) && !['annulee', 'annulée'].includes(o.status)).length;
  const deliveredToday = myDeliveries.filter((o) => isDelivered(o) && isToday(o.delivered_at || o.updated_at));
  const earningsToday = deliveredToday.reduce((sum, o) => sum + getDelivererFee(o), 0);
  const unremitted = myDeliveries.filter(hasUnremittedCash);
  const unremittedAmount = unremitted.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Bonjour, {(authProfile?.fullname || user?.name || 'Rider').split(' ')[0]} 👋</Text>
            <Text style={styles.helloSub}>Gérez vos courses en temps réel.</Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={[styles.onlineLabel, { color: isOnline ? colors.success : colors.textFaint }]}>
              {isOnline ? 'En service' : 'Hors service'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={togglingOnline}
              trackColor={{ false: colors.border, true: `${colors.success}80` }}
              thumbColor={isOnline ? colors.success : '#fff'}
            />
          </View>
        </View>

        {unremitted.length > 0 && (
          <Pressable style={styles.debtBanner} onPress={() => navigation.navigate('MyDeliveries')}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.debtTitle}>Caisse non versée : {formatPrice(unremittedAmount)} F</Text>
              <Text style={styles.debtSubtitle}>Réglez ce montant avec l'administration pour continuer à accepter des courses.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        )}

        <View style={styles.statsGrid}>
          <StatCard icon="checkmark-done-circle" color={colors.success} label="Livrées aujourd'hui" value={String(deliveredToday.length)} />
          <StatCard icon="cash" color={colors.secondary} label="Gains du jour" value={`${formatPrice(earningsToday)} F`} />
          <StatCard icon="cube" color={colors.primary} label="Disponibles" value={String(availableCount)} />
          <StatCard icon="wallet" color="#6366f1" label="Solde" value={`${formatPrice(balance)} F`} />
        </View>

        <View style={styles.actionsGrid}>
          <NavCard
            icon="cube-outline"
            title="Commandes disponibles"
            subtitle={`${availableCount} en attente`}
            onPress={() => navigation.navigate('AvailableOrders')}
          />
          <NavCard
            icon="bicycle-outline"
            title="Mes livraisons"
            subtitle={`${activeCount} en cours`}
            onPress={() => navigation.navigate('MyDeliveries')}
          />
          <NavCard
            icon="time-outline"
            title="Historique"
            subtitle="Courses terminées"
            onPress={() => navigation.navigate('DeliveryHistory')}
          />
          <NavCard
            icon="wallet-outline"
            title="Portefeuille"
            subtitle={`Solde : ${formatPrice(balance)} F`}
            onPress={() => navigation.navigate('DeliveryWallet')}
          />
          <NavCard
            icon="settings-outline"
            title="Zones & véhicule"
            subtitle="Infos de profil livreur"
            onPress={() => navigation.navigate('DeliveryProfile')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, color, label, value }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NavCard({ icon, title, subtitle, onPress }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <View style={styles.navIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navTitle}>{title}</Text>
        <Text style={styles.navSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  bigIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  centerTitle: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  centerSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8, fontWeight: '600', lineHeight: 20 },
  rejectionBox: { backgroundColor: '#fee2e2', borderRadius: radius.md, padding: 14, marginTop: 16, alignSelf: 'stretch' },
  rejectionLabel: { fontSize: 10, fontWeight: '800', color: colors.danger, textTransform: 'uppercase', marginBottom: 4 },
  rejectionText: { fontSize: 13, color: '#991b1b', fontWeight: '600' },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hello: { fontSize: 19, fontWeight: '900', color: colors.text },
  helloSub: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  onlineToggle: { alignItems: 'center', gap: 4 },
  onlineLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  debtBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger,
    borderRadius: radius.md, padding: 14,
  },
  debtTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  debtSubtitle: { fontSize: 11, color: '#fff', opacity: 0.9, fontWeight: '600', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47.5%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: 14, gap: 6,
  },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  actionsGrid: { gap: 10 },
  navCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  navIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff1e8', alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  navSubtitle: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
});
