import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Demande la permission, récupère le jeton de push Expo de cet appareil et
// l'enregistre côté serveur (profiles.metadata.expo_push_tokens).
//
// ⚠️ Nécessite un build de développement/production EAS — les notifications
// push distantes ne fonctionnent plus dans Expo Go depuis le SDK 53. Voir
// README.md pour la configuration `extra.eas.projectId` requise.
export const registerForPushNotificationsAsync = async (token) => {
  try {
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('[pushService] extra.eas.projectId manquant dans app.json — push désactivé.');
      return null;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    await api.post('/profiles/push-token', { token: expoPushToken }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return expoPushToken;
  } catch (err) {
    console.warn('[pushService] registration failed:', err.message);
    return null;
  }
};
