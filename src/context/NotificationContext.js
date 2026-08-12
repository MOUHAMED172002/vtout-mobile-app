import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { socketService } from '../services/socketService';
import { registerForPushNotificationsAsync } from '../services/pushService';
import { refreshWidgets } from '../services/widgetService';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification as apiDeleteNotification,
} from '../services/notificationApiService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isSignedIn, user, getToken, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const token = await getToken();
      const data = await getMyNotifications(token);
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      load();
      getToken().then(refreshWidgets);
      socketService.connect(user.id);
      if (isAdmin) socketService.emit('join', 'admins');

      const handleLive = () => load();
      // Un changement de statut de commande est précisément ce que les
      // widgets écran d'accueil affichent — on les redessine en même temps
      // que la liste de notifications (voir src/services/widgetService.js).
      const handleOrderUpdate = () => { load(); getToken().then(refreshWidgets); };
      const unsubOrder = socketService.subscribe('order_status_updated', handleOrderUpdate);
      const unsubMessage = socketService.subscribe('new_message', handleLive);
      const unsubAdmin = socketService.subscribe('admin_notification', handleLive);

      return () => {
        unsubOrder();
        unsubMessage();
        unsubAdmin();
        socketService.disconnect();
      };
    }
    setNotifications([]);
    // Déconnexion : les widgets ne doivent plus afficher les données du
    // compte précédent.
    refreshWidgets(null);
  }, [isSignedIn, user?.id, isAdmin, load, getToken]);

  // Enregistre le jeton de push Expo de cet appareil à la connexion. Le
  // retrait à la déconnexion est géré par AuthContext.signOut() (qui a
  // encore un Bearer valide au moment de l'appel). Sans effet si aucun
  // build EAS n'est configuré (voir README) ou si l'app tourne dans
  // Expo Go (SDK 53+).
  useEffect(() => {
    if (isSignedIn && user?.id) {
      getToken().then((token) => registerForPushNotificationsAsync(token));
    }
  }, [isSignedIn, user?.id, getToken]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      const token = await getToken();
      await markNotificationRead(id, token);
    } catch {
      // pas grave, le prochain rafraîchissement corrigera l'état
    }
  }, [getToken]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      const token = await getToken();
      await markAllNotificationsRead(token);
    } catch {
      // idem
    }
  }, [getToken]);

  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const token = await getToken();
      await apiDeleteNotification(id, token);
    } catch {
      load();
    }
  }, [getToken, load]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, loading, unreadCount, refresh: load, markRead, markAllRead, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};
