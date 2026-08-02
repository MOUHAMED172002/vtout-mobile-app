import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Champs manquants', 'Merci de renseigner votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Connexion impossible', err.response?.data?.message || 'Email ou mot de passe incorrect.');
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

          <Text style={styles.title}>Bon retour !</Text>
          <Text style={styles.subtitle}>Connectez-vous pour continuer vos achats.</Text>

          <View style={styles.form}>
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
                placeholder="Mot de passe"
                placeholderTextColor={colors.textFaint}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textFaint} />
              </Pressable>
            </View>

            <Pressable onPress={() => navigation.navigate('ResetPassword')} style={{ alignSelf: 'flex-end' }}>
              <Text style={styles.link}>Mot de passe oublié ?</Text>
            </Pressable>

            <Button title="Se connecter" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Pressable onPress={() => navigation.replace('Register')}>
              <Text style={styles.footerLink}> S'inscrire</Text>
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
  link: { fontSize: 12, fontWeight: '800', color: colors.primary },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  footerLink: { fontSize: 13, color: colors.primary, fontWeight: '800' },
});
