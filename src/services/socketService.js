import { io } from 'socket.io-client';
import { baseURL } from '../api/client';

// Même serveur socket.io que l'API REST, sans le suffixe /api.
const SOCKET_URL = baseURL.replace(/\/api\/?$/, '');

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(userId) {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      if (userId) this.socket.emit('join', userId);
    });

    this.socket.on('order_status_updated', (data) => this.notify('order_status_updated', data));
    this.socket.on('new_message', (data) => this.notify('new_message', data));
    this.socket.on('admin_notification', (data) => this.notify('admin_notification', data));
  }

  emit(event, data) {
    this.socket?.emit(event, data);
  }

  // Écoute directe d'un événement arbitraire (au lieu des 3 canaux fixes
  // pré-enregistrés dans connect()) — nécessaire pour les canaux dynamiques
  // par commande (`order_update_${orderId}`, position du livreur en direct,
  // voir OrderTrackingMap.js). Miroir de notificationService.on/off côté web.
  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return () => this.unsubscribe(event, callback);
  }

  unsubscribe(event, callback) {
    const list = this.listeners.get(event);
    if (list) this.listeners.set(event, list.filter((cb) => cb !== callback));
  }

  notify(event, data) {
    (this.listeners.get(event) || []).forEach((cb) => cb(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
