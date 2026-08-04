import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra || {};
const isGoogleConfigured = !!extra.googleWebClientId;
// expo-auth-session lève une exception synchrone pendant le rendu
// (useMemo) si le client id résolu pour la plateforme courante est vide —
// ce qui plantait tout l'écran de connexion/inscription quand la config
// Google n'était pas (encore) chargée. On donne toujours une valeur de
// repli non vide au hook pour qu'il ne puisse jamais crasher, et on
// n'affiche/n'active le bouton que si la vraie configuration est présente.
const SAFE_PLACEHOLDER_CLIENT_ID = 'not-configured.apps.googleusercontent.com';

export default function GoogleSignInButton({ onSuccess }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      clientId: extra.googleWebClientId || SAFE_PLACEHOLDER_CLIENT_ID,
      webClientId: extra.googleWebClientId || SAFE_PLACEHOLDER_CLIENT_ID,
      iosClientId: extra.googleIosClientId || undefined,
      androidClientId: extra.googleAndroidClientId || undefined,
      scopes: ['openid', 'profile', 'email'],
    },
    { scheme: 'vtout' }
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      setLoading(true);
      signInWithGoogle(response.params.id_token)
        .then(() => onSuccess?.())
        .catch((err) => {
          Alert.alert('Connexion Google impossible', err.isAuthAppError ? err.message : (err.response?.data?.message || 'Une erreur est survenue.'));
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      Alert.alert('Connexion Google impossible', response.error?.message || 'La connexion a été annulée.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  if (!isGoogleConfigured) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OU</Text>
        <View style={styles.dividerLine} />
      </View>
      <Pressable
        style={[styles.btn, (!request || loading) && { opacity: 0.6 }]}
        disabled={!request || loading}
        onPress={() => promptAsync()}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#DB4437" />
            <Text style={styles.btnText}>Continuer avec Google</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 10.5, fontWeight: '800', color: colors.textFaint, letterSpacing: 1 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  btnText: { fontSize: 14, fontWeight: '800', color: colors.text },
});
