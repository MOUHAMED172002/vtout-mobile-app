import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { applyReferralCode } from '../services/referralService';
import Button from '../components/Button';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function RegisterScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { signUp, getToken } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(route.params?.referralCode || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      Alert.alert('Champs manquants', 'Nom, email et mot de passe (8 caractères minimum) sont requis.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      if (referralCode.trim()) {
        try {
          const token = await getToken();
          await applyReferralCode(referralCode.trim(), token);
        } catch (refErr) {
          // Code invalide ou déjà utilisé — le compte est bien créé, on ne
          // bloque pas l'inscription pour autant.
        }
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Inscription impossible', err.isAuthAppError ? err.message : (err.response?.data?.message || 'Cet email est peut-être déjà utilisé.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>

          <LinearGradient colors={[colors.secondary, colors.navy]} style={styles.logoBanner}>
            <View style={styles.logoBadge}>
              <Ionicons name="bag-handle" size={22} color={colors.primary} />
            </View>
            <Text style={styles.brand}>Vtout</Text>
            <Text style={styles.brandSub}>On vend tout</Text>
          </LinearGradient>

          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez des milliers d'acheteurs au Bénin.</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor={colors.textFaint}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Mot de passe (8 caractères min.)"
                placeholderTextColor={colors.textFaint}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textFaint} />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Code de parrainage (optionnel)"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
            />

            <Button title="Créer mon compte" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
          </View>

          <View style={{ marginTop: 24 }}>
            <GoogleSignInButton onSuccess={() => navigation.goBack()} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <Pressable onPress={() => navigation.replace('Login')}>
              <Text style={styles.footerLink}> Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  closeBtn: { alignSelf: 'flex-end', width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoBanner: { borderRadius: radius.lg, padding: 24, alignItems: 'center', gap: 6, marginBottom: 28 },
  logoBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  brand: { color: '#fff', fontSize: 22, fontWeight: '900' },
  brandSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 6, marginBottom: 24 },
  form: { gap: 12 },
  input: {
    height: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4,
  },
  passwordWrap: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  footerLink: { fontSize: 13, color: colors.primary, fontWeight: '800' },
});
