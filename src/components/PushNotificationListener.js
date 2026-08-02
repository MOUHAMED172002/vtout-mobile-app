import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { navigate } from '../navigation/navigationRef';

// Ouvre l'écran Notifications quand l'utilisateur tape sur une notification
// push (app en arrière-plan ou fermée). Ne rend rien à l'écran. Utilise
// navigationRef (pas useNavigation) car ce composant est rendu en dehors
// de l'arbre des écrans, directement sous NavigationContainer.
export default function PushNotificationListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      navigate('Notifications');
    });
    return () => subscription.remove();
  }, []);

  return null;
}
