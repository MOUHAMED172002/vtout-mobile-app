import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { resendVerificationEmail } from '../services/userService';

// Miroir de frontend/src/component/Shared/EmailVerificationBanner.jsx —
// affiché en permanence (au-dessus de toute la navigation, voir App.js) tant
// qu'un compte connecté n'a pas vérifié son email. L'anti-spam (1 envoi/2min)
// est géré côté serveur ; ici on ne fait qu'un affichage honnête des
// réponses (succès, déjà vérifié, ou erreur).
export default function EmailVerificationBanner() {
  const { isSignedIn, profile, getToken } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  if (!isSignedIn || !profile || profile.email_verified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    setError(null);
    try {
      const token = await getToken();
      await resendVerificationEmail(token);
      setSent(true);
      setTimeout(() => setDismissed(true), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name={sent ? 'checkmark-circle' : 'mail'} size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sécurisez votre compte !</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {error || `Votre adresse email (${profile.email}) n'a pas encore été vérifiée.`}
          </Text>
        </View>
        <Pressable style={styles.btn} onPress={handleResend} disabled={sending || sent}>
          {sending ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <Text style={styles.btnText}>{sent ? 'Envoyé' : 'Recevoir le lien'}</Text>
          )}
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={() => setDismissed(true)}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#4f46e5' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  btn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  btnText: { fontSize: 10.5, fontWeight: '800', color: '#4f46e5' },
  closeBtn: { padding: 4 },
});
