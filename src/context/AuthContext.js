import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../api/client';
import { tokenStorage } from '../utils/tokenStorage';

const TOKEN_KEY = 'vtout_session_token';
const USER_CACHE_KEY = 'vtout_user_cache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const signOut = useCallback(async () => {
    try {
      // Retire les jetons de push AVANT de couper la session (le Bearer
      // doit encore être valide pour que l'appel soit authentifié).
      await api.delete('/profiles/push-token');
    } catch (err) {
      // pas grave, les jetons expirés seront nettoyés automatiquement
    }
    try {
      await api.post('/auth/sign-out');
    } catch (err) {
      // le nettoyage local doit se faire même si l'appel réseau échoue
    }
    setAuthToken(null);
    setSession(null);
    setUser(null);
    setProfile(null);
    await tokenStorage.deleteItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_CACHE_KEY);
  }, []);

  // Retourne { ok: true } normalement, ou { ok: false, deactivated: true }
  // si l'API applicative refuse l'accès (401) — ce qui signale un compte
  // désactivé (voir authMiddleware.js : un profil avec deleted_at renseigné
  // se voit refuser req.auth malgré une session Better Auth valide).
  const fetchProfile = useCallback(async (token) => {
    try {
      const { data } = await api.get('/profiles/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(data || { role: 'user' });
      return { ok: true };
    } catch (err) {
      if (err?.response?.status === 401) return { ok: false, deactivated: true };
      setProfile({ role: 'user' });
      return { ok: true };
    }
  }, []);

  // Vérifie la session courante auprès du serveur (cookie natif RN, avec
  // repli sur le token Bearer persisté) et met à jour l'état local. Renvoie
  // { deactivated: true } si la session a dû être coupée parce que le
  // compte est désactivé, pour que signIn/signUp/signInWithGoogle puissent
  // afficher un message clair plutôt que de laisser croire à une connexion
  // réussie.
  const refreshSession = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/get-session');
      if (data?.session && data?.user) {
        setAuthToken(data.session.id);
        const profileResult = await fetchProfile(data.session.id);
        if (!profileResult.ok) {
          await signOut();
          return { deactivated: !!profileResult.deactivated };
        }
        setSession(data.session);
        setUser(data.user);
        await tokenStorage.setItem(TOKEN_KEY, data.session.id);
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
      } else {
        setAuthToken(null);
        setSession(null);
        setUser(null);
        setProfile(null);
        await tokenStorage.deleteItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_CACHE_KEY);
      }
    } catch (err) {
      setAuthToken(null);
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoaded(true);
    }
    return {};
  }, [fetchProfile, signOut]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await tokenStorage.getItem(TOKEN_KEY);
        if (storedToken) setAuthToken(storedToken);
        const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cachedUser) setUser(JSON.parse(cachedUser));
      } catch (err) {
        // ignore hydration errors, refreshSession below is the source of truth
      }
      await refreshSession();
    })();
  }, [refreshSession]);

  const DEACTIVATED_MESSAGE = 'Ce compte a été supprimé.';
  const deactivatedError = () => {
    const err = new Error(DEACTIVATED_MESSAGE);
    err.isAuthAppError = true;
    return err;
  };

  const signIn = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/sign-in/email', { email, password });
    // Sans withCredentials, aucun cookie n'est reçu/renvoyé : on récupère le
    // jeton directement dans le corps de la réponse pour que l'appel
    // /auth/get-session qui suit soit déjà authentifié via le Bearer.
    if (data?.token) setAuthToken(data.token);
    const result = await refreshSession();
    if (result.deactivated) throw deactivatedError();
  }, [refreshSession]);

  const signUp = useCallback(async (email, password, name) => {
    const { data } = await api.post('/auth/sign-up/email', { email, password, name });
    if (data?.token) setAuthToken(data.token);
    const result = await refreshSession();
    if (result.deactivated) throw deactivatedError();
  }, [refreshSession]);

  const requestPasswordReset = useCallback(async (email) => {
    await api.post('/auth/forget-password', { email, redirectTo: 'vtout://reset-password' });
  }, []);

  const signInWithGoogle = useCallback(async (idToken) => {
    const { data } = await api.post('/auth/sign-in/social', { provider: 'google', idToken: { token: idToken } });
    if (data?.token) setAuthToken(data.token);
    const result = await refreshSession();
    if (result.deactivated) throw deactivatedError();
  }, [refreshSession]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await api.post('/auth/change-password', { currentPassword, newPassword, revokeOtherSessions: false });
  }, []);

  const updateAuthUser = useCallback(async (fields) => {
    await api.post('/auth/update-user', fields);
    await refreshSession();
  }, [refreshSession]);

  const deleteAccount = useCallback(async () => {
    await api.delete('/profiles/me');
    await signOut();
  }, [signOut]);

  const getToken = useCallback(async () => session?.id || null, [session?.id]);

  const value = useMemo(() => ({
    isLoaded,
    isSignedIn: !!user,
    session,
    user,
    profile,
    role: profile?.role || user?.role || 'user',
    isAdmin: !!profile?.isAdmin || profile?.role === 'admin',
    isSupplier: !!profile?.isSupplier || !!profile?.Supplier,
    isDelivery: !!profile?.isDelivery || !!profile?.DeliveryPerson,
    getToken,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    requestPasswordReset,
    changePassword,
    updateAuthUser,
    deleteAccount,
    refreshSession,
    refreshProfile: () => session?.id && fetchProfile(session.id),
  }), [isLoaded, user, profile, session, getToken, signIn, signUp, signInWithGoogle, signOut, requestPasswordReset, changePassword, updateAuthUser, deleteAccount, refreshSession, fetchProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
