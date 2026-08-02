import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

export default function ResetPasswordScreen({ navigation }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Merci de renseigner votre adresse email.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'envoyer l'email de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        {sent ? (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="mail-outline" size={32} color={colors.success} />
            </View>
            <Text style={styles.title}>Email envoyé</Text>
            <Text style={styles.subtitle}>
              Si un compte existe pour {email}, un lien de réinitialisation vient d'être envoyé.
            </Text>
            <Button title="Retour à la connexion" onPress={() => navigation.replace('Login')} style={{ marginTop: 24, width: '100%' }} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>Saisissez votre email pour recevoir un lien de réinitialisation.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button title="Envoyer le lien" onPress={handleSubmit} loading={loading} style={{ width: '100%' }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
  input: {
    width: '100%', height: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8,
  },
});
