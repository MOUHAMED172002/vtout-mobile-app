import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store s'appuie sur le trousseau natif (Keychain iOS /
// Keystore Android) et n'existe pas du tout sur le web — son module natif
// y est un objet vide, donc chaque appel lève une TypeError silencieuse
// (« ExpoSecureStore.setValueWithKeyAsync is not a function »). Comme cet
// appel se trouve dans le bloc try de AuthContext.refreshSession(), la
// TypeError était rattrapée par le catch englobant, qui efface alors la
// session pourtant valide — connexion/inscription "ne marchaient pas" sur
// le web (via `expo start --web`) alors qu'elles fonctionnaient bien côté
// serveur. Le navigateur n'offre de toute façon aucun stockage réellement
// sécurisé accessible au JS : on utilise AsyncStorage (localStorage) sur
// le web, comme le fait n'importe quelle appli web classique.
const isWeb = Platform.OS === 'web';

export const tokenStorage = {
  getItem: (key) => (isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key)),
  setItem: (key, value) => (isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value)),
  deleteItem: (key) => (isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key)),
};
