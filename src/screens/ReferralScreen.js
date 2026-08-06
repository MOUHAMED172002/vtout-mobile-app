import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getMyReferralInfo } from '../services/referralService';
import { formatPrice } from '../utils/format';
import Loading from '../components/Loading';
import Button from '../components/Button';

const STEPS = [
  { icon: 'share-social-outline', text: "Partagez votre code avec vos amis" },
  { icon: 'person-add-outline', text: "Ils s'inscrivent sur Vtout avec votre code et reçoivent un coupon de bienvenue" },
  { icon: 'gift-outline', text: "Vous recevez votre coupon dès leur 1ère commande confirmée" },
];

export default function ReferralScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getMyReferralInfo(token);
      setInfo(data);
    } catch (err) {
      Alert.alert('Erreur', "Impossible de charger votre code de parrainage pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const shareMessage = info
    ? (info.referredReward > 0
        ? `Rejoins-moi sur Vtout et profite d'un coupon de bienvenue de ${formatPrice(info.referredReward)} FCFA ! 🎁\n\nUtilise mon code de parrainage : ${info.code}\n\n${info.shareUrl}`
        : `Rejoins-moi sur Vtout !\n\nUtilise mon code de parrainage : ${info.code}\n\n${info.shareUrl}`)
    : '';

  const handleShare = async () => {
    if (!info) return;
    try {
      await Share.share({ message: shareMessage });
    } catch (err) {
      // annulé ou échoué silencieusement — pas grave
    }
  };

  const handleCopy = async () => {
    if (!info) return;
    await Clipboard.setStringAsync(info.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Loading />;
  if (!info) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Impossible de charger cette page.</Text>
          <Button title="Réessayer" onPress={load} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="gift" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>Parrainez, gagnez</Text>
        <Text style={styles.subtitle}>
          {info.referredReward > 0 || info.referrerReward > 0
            ? `Offrez ${formatPrice(info.referredReward)} FCFA à vos amis et recevez ${formatPrice(info.referrerReward)} FCFA dès leur première commande.`
            : "Invitez vos amis sur Vtout avec votre code personnel."}
        </Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Votre code de parrainage</Text>
          <Text style={styles.codeValue}>{info.code}</Text>
          <Pressable style={styles.copyBtn} onPress={handleCopy}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={colors.primary} />
            <Text style={styles.copyBtnText}>{copied ? 'Copié !' : 'Copier le code'}</Text>
          </Pressable>
        </View>

        <Button
          title="Partager mon code"
          onPress={handleShare}
          icon={<Ionicons name="share-social" size={17} color="#fff" />}
          style={{ width: '100%' }}
        />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{info.totalInvited}</Text>
            <Text style={styles.statLabel}>Ami{info.totalInvited > 1 ? 's' : ''} invité{info.totalInvited > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{info.totalRewarded}</Text>
            <Text style={styles.statLabel}>Coupon{info.totalRewarded > 1 ? 's' : ''} gagné{info.totalRewarded > 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={styles.stepsBlock}>
          <Text style={styles.stepsTitle}>Comment ça marche</Text>
          {STEPS.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepIconWrap}>
                <Ionicons name={step.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
          <Pressable style={styles.detailLink} onPress={() => navigation.navigate('HowItWorks', { tab: 'parrainage' })}>
            <Text style={styles.detailLinkText}>Voir le détail des étapes du parrainage</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 14, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  content: { padding: 24, alignItems: 'center', gap: 16 },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  title: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', lineHeight: 19, marginBottom: 4 },
  codeBox: {
    width: '100%', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.lg, padding: 20,
  },
  codeLabel: { fontSize: 10.5, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { fontSize: 28, fontWeight: '900', color: colors.primary, letterSpacing: 4 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  copyBtnText: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  statCard: {
    flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, paddingVertical: 16,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  stepsBlock: { width: '100%', gap: 14, marginTop: 8 },
  stepsTitle: { fontSize: 13, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIconWrap: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: `${colors.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.text, lineHeight: 17 },
  detailLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 },
  detailLinkText: { fontSize: 12, fontWeight: '800', color: colors.primary },
});
