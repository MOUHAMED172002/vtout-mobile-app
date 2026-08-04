import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

export default function ChangePasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Champs requis', 'Merci de renseigner votre mot de passe actuel et le nouveau.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Les mots de passe ne correspondent pas', 'Vérifiez la confirmation du nouveau mot de passe.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Mot de passe modifié', 'Votre mot de passe a été mis à jour avec succès.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message = err?.response?.data?.message || "Le mot de passe actuel est incorrect ou une erreur est survenue.";
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>Changer le mot de passe</Text>
        <Text style={styles.subtitle}>Utilisez un mot de passe unique d'au moins 8 caractères.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Mot de passe actuel</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Pressable onPress={() => setShowCurrent((s) => !s)} style={styles.eyeBtn}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textFaint} />
            </Pressable>
          </View>

          <Text style={styles.label}>Nouveau mot de passe</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Pressable onPress={() => setShowNew((s) => !s)} style={styles.eyeBtn}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textFaint} />
            </Pressable>
          </View>

          <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            secureTextEntry={!showNew}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Button title="Mettre à jour le mot de passe" onPress={handleSubmit} loading={loading} style={{ marginTop: 12 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 24, alignItems: 'center' },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 4,
  },
  title: { fontSize: 19, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  form: { width: '100%' },
  label: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 12 },
  input: {
    width: '100%', height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  passwordWrap: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 14 },
});
