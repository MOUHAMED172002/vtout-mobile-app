import axios from 'axios';
import Constants from 'expo-constants';

const rawBaseUrl =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  'http://localhost:3000/api';

const baseURL = rawBaseUrl.replace(/\/+$/, '');

// withCredentials désactivé volontairement : React Native n'envoie jamais
// d'en-tête Origin (concept propre aux navigateurs), donc s'il attache un
// cookie de session (via withCredentials) sans Origin, le middleware CSRF
// de better-auth le rejette avec 403 MISSING_OR_NULL_ORIGIN (voir
// origin-check.mjs : la vérification d'origine ne se déclenche que si un
// cookie est présent). L'app s'authentifie déjà via le jeton Bearer
// (session.token, capturé dans AuthContext et persisté dans SecureStore).
const api = axios.create({
  baseURL,
  withCredentials: false,
  headers: { Accept: 'application/json' },
});

// Jeton de session courant (défini par AuthContext après connexion, ou au
// démarrage depuis le stockage sécurisé). Ajouté automatiquement en plus du
// cookie de session pour rester compatible avec le fallback "Bearer" déjà
// géré par le backend (voir server/middleware/authMiddleware.js).
let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token || null;
};

api.interceptors.request.use((config) => {
  if (currentToken && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

export default api;
export { baseURL };
