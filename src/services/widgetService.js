import React from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ExtensionStorage } from '@bacons/apple-targets';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { getMyOrders } from './orderService';
import { getMySupplierOrders } from './supplierOrderService';
import { getMySupplierProfile } from './supplierService';
import { getOrderStatusLabel } from '../utils/orderStatus';
import OrderTrackingWidget from '../widgets/OrderTrackingWidget';
import SupplierQueueWidget from '../widgets/SupplierQueueWidget';

// ---------------------------------------------------------------------------
// Widgets écran d'accueil — calcule les données (client + vendeur) et les
// pousse vers les deux plateformes. Deux chemins totalement différents :
// - iOS : écrit du JSON dans le UserDefaults partagé (App Group, voir
//   ios.entitlements dans app.json) via ExtensionStorage
//   (`@bacons/apple-targets`), puis force le widget à se redessiner. Le
//   widget (targets/widget/widgets.swift) lit ce JSON lui-même.
// - Android : redessine directement chaque widget déjà ajouté à l'écran
//   d'accueil avec les données en mémoire (react-native-android-widget) —
//   pas de "storage partagé", la tâche headless (widget-task-handler.js)
//   recalcule aussi ses propres données de façon autonome quand l'OS
//   redessine le widget indépendamment de l'app (ex: updatePeriodMillis).
//
// Invisible en Expo Go — nécessite un build EAS (composants natifs), voir
// README.md.
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'vtout_session_token';
const APP_GROUP = 'group.com.vtout.mobile';
const ORDER_WIDGET_KEY = 'vtout_order_widget';
const SUPPLIER_WIDGET_KEY = 'vtout_supplier_widget';
const NOT_ACTIVE_STATUSES = ['livrée', 'livree', 'annulée', 'annulee'];

export async function computeOrderWidgetData(tokenParam) {
  const token = tokenParam || (await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null));
  if (!token) return { hasOrder: false };
  try {
    const orders = await getMyOrders(token);
    if (!Array.isArray(orders) || orders.length === 0) return { hasOrder: false };
    // La commande la plus récente, en préférant une commande encore active
    // (ni livrée ni annulée) à une commande terminée si les deux existent.
    const sorted = [...orders].sort(
      (a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
    );
    const order = sorted.find((o) => !NOT_ACTIVE_STATUSES.includes((o.status || '').toLowerCase())) || sorted[0];
    return {
      hasOrder: true,
      orderId: order.id,
      status: order.status,
      statusLabel: getOrderStatusLabel(order.status),
      itemsCount: (order.items || []).length || order.items_count || 0,
      total: Math.round(Number(order.total_amount) || 0),
    };
  } catch {
    return { hasOrder: false };
  }
}

export async function computeSupplierWidgetData(tokenParam) {
  const token = tokenParam || (await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null));
  if (!token) return { isSupplier: false, pendingCount: 0 };
  try {
    const profile = await getMySupplierProfile(token);
    if (!profile) return { isSupplier: false, pendingCount: 0 };
    const orders = await getMySupplierOrders(token);
    const pendingCount = (orders || []).filter((o) => o.status === 'en_attente').length;
    return { isSupplier: true, pendingCount };
  } catch {
    return { isSupplier: false, pendingCount: 0 };
  }
}

function pushToIOS(orderData, supplierData) {
  try {
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set(ORDER_WIDGET_KEY, orderData);
    storage.set(SUPPLIER_WIDGET_KEY, supplierData);
    ExtensionStorage.reloadWidget();
  } catch {
    // Pas de widget natif dispo (Expo Go, ou build pas encore rebuild
    // après ajout du plugin) — no-op silencieux, jamais bloquant.
  }
}

async function pushToAndroid(orderData, supplierData) {
  if (Platform.OS !== 'android') return;
  try {
    await requestWidgetUpdate({
      widgetName: 'OrderTracking',
      renderWidget: () => <OrderTrackingWidget data={orderData} />,
    });
    await requestWidgetUpdate({
      widgetName: 'SupplierQueue',
      renderWidget: () => <SupplierQueueWidget data={supplierData} />,
    });
  } catch {
    // Idem — aucun widget ajouté à l'écran d'accueil pour l'instant.
  }
}

// Point d'entrée appelé depuis l'app (connexion, déconnexion, mise à jour
// de commande reçue par socket — voir NotificationContext.js). Passer
// `null` explicitement à la déconnexion pour effacer les données affichées.
export async function refreshWidgets(token) {
  const [orderData, supplierData] = await Promise.all([
    computeOrderWidgetData(token),
    computeSupplierWidgetData(token),
  ]);
  pushToIOS(orderData, supplierData);
  await pushToAndroid(orderData, supplierData);
}
