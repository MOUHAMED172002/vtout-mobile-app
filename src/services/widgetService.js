import React from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ExtensionStorage } from '@bacons/apple-targets';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { getMyOrders } from './orderService';
import { getMyCart } from './cartService';
import { getMySupplierOrders } from './supplierOrderService';
import { getMySupplierProfile } from './supplierService';
import { getDeliveryProfile, getMyDeliveries, ACTIVE_STATUSES } from './deliveryOrderService';
import { getMyProfile } from './userService';
import { getSuppliers, getPendingProducts } from './adminSupplierService';
import { getOrderStatusLabel } from '../utils/orderStatus';
import BuyerWidget from '../widgets/BuyerWidget';
import SupplierQueueWidget from '../widgets/SupplierQueueWidget';
import DeliveryQueueWidget from '../widgets/DeliveryQueueWidget';
import AdminApprovalsWidget from '../widgets/AdminApprovalsWidget';

// ---------------------------------------------------------------------------
// Widgets écran d'accueil — un par rôle (acheteur/vendeur/livreur/admin),
// calcule les données puis les pousse vers les deux plateformes. Deux
// chemins totalement différents :
// - iOS : écrit du JSON dans le UserDefaults partagé (App Group, voir
//   ios.entitlements dans app.json) via ExtensionStorage
//   (`@bacons/apple-targets`), puis force les widgets à se redessiner. Les
//   widgets (targets/widget/*.swift) lisent ce JSON eux-mêmes.
// - Android : redessine directement chaque widget déjà ajouté à l'écran
//   d'accueil avec les données en mémoire (react-native-android-widget) —
//   la tâche headless (widget-task-handler.js) recalcule aussi ses propres
//   données de façon autonome quand l'OS redessine le widget indépendamment
//   de l'app (updatePeriodMillis).
//
// Invisible en Expo Go — nécessite un build EAS (composants natifs), voir
// README.md.
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'vtout_session_token';
const APP_GROUP = 'group.com.vtout.mobile';
const NOT_ACTIVE_ORDER_STATUSES = ['livrée', 'livree', 'annulée', 'annulee'];
// Même seuil que la demande initiale : au-delà de 3 jours sans commande (et
// panier vide), le widget "acheteur" bascule sur un message de relance
// plutôt que de rester silencieux.
const WINBACK_THRESHOLD_DAYS = 3;

const getToken = async (tokenParam) => tokenParam || (await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null));

// ── Acheteur : widget "intelligent" à priorités — une seule chose affichée
// à la fois, la plus utile dans l'instant :
//   1. commande active en cours (comme avant)
//   2. sinon panier non finalisé (rappel panier)
//   3. sinon aucune commande depuis WINBACK_THRESHOLD_DAYS jours (relance)
//   4. sinon rien d'urgent (état neutre)
export async function computeBuyerWidgetData(tokenParam) {
  const token = await getToken(tokenParam);
  if (!token) return { mode: 'signed_out' };
  try {
    const [orders, cart] = await Promise.all([
      getMyOrders(token).catch(() => []),
      getMyCart(token).catch(() => []),
    ]);
    const orderList = Array.isArray(orders) ? orders : [];

    const sorted = [...orderList].sort(
      (a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
    );
    const activeOrder = sorted.find((o) => !NOT_ACTIVE_ORDER_STATUSES.includes((o.status || '').toLowerCase()));
    if (activeOrder) {
      return {
        mode: 'order',
        orderId: activeOrder.id,
        statusLabel: getOrderStatusLabel(activeOrder.status),
        itemsCount: (activeOrder.items || []).length || activeOrder.items_count || 0,
        total: Math.round(Number(activeOrder.total_amount) || 0),
      };
    }

    const cartItems = Array.isArray(cart) ? cart : [];
    if (cartItems.length > 0) {
      const total = cartItems.reduce(
        (sum, it) => sum + (Number(it.price_snapshot ?? it.price ?? 0) * (Number(it.quantity) || 1)),
        0
      );
      return { mode: 'cart', itemsCount: cartItems.reduce((s, it) => s + (Number(it.quantity) || 1), 0), total: Math.round(total) };
    }

    const lastOrderDate = sorted.length > 0 ? new Date(sorted[0].created_at || sorted[0].createdAt) : null;
    const daysSince = lastOrderDate ? Math.floor((Date.now() - lastOrderDate.getTime()) / 86400000) : null;
    if (daysSince === null || daysSince >= WINBACK_THRESHOLD_DAYS) {
      return { mode: 'winback', daysSince };
    }

    return { mode: 'idle' };
  } catch {
    return { mode: 'signed_out' };
  }
}

export async function computeSupplierWidgetData(tokenParam) {
  const token = await getToken(tokenParam);
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

export async function computeDeliveryWidgetData(tokenParam) {
  const token = await getToken(tokenParam);
  if (!token) return { isDelivery: false, activeCount: 0 };
  try {
    const profile = await getDeliveryProfile(token);
    if (!profile) return { isDelivery: false, activeCount: 0 };
    const deliveries = await getMyDeliveries(token);
    const activeCount = (deliveries || []).filter((o) => ACTIVE_STATUSES.includes((o.status || '').toLowerCase())).length;
    return { isDelivery: true, activeCount };
  } catch {
    return { isDelivery: false, activeCount: 0 };
  }
}

// Même définition de "vendeur en attente de validation" que
// AdminSupplierApprovalScreen.js#isPendingSupplier — dupliquée ici car un
// service ne doit pas importer un écran.
const isPendingSupplier = (s) => {
  const status = (s.status || '').toLowerCase();
  return !status || !['active', 'actif', 'suspended', 'suspendu'].includes(status);
};

export async function computeAdminWidgetData(tokenParam) {
  const token = await getToken(tokenParam);
  if (!token) return { isAdmin: false, pendingCount: 0 };
  try {
    const profile = await getMyProfile(token);
    if (!profile || profile.role !== 'admin') return { isAdmin: false, pendingCount: 0 };
    const [suppliers, pendingProducts] = await Promise.all([
      getSuppliers(token).catch(() => []),
      getPendingProducts(token).catch(() => []),
    ]);
    const pendingSuppliers = (suppliers || []).filter(isPendingSupplier).length;
    const pendingProductsCount = (pendingProducts || []).length;
    return { isAdmin: true, pendingCount: pendingSuppliers + pendingProductsCount, pendingSuppliers, pendingProducts: pendingProductsCount };
  } catch {
    return { isAdmin: false, pendingCount: 0 };
  }
}

function pushToIOS(data) {
  try {
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('vtout_buyer_widget', data.buyer);
    storage.set('vtout_supplier_widget', data.supplier);
    storage.set('vtout_delivery_widget', data.delivery);
    storage.set('vtout_admin_widget', data.admin);
    ExtensionStorage.reloadWidget();
  } catch {
    // Pas de widget natif dispo (Expo Go, ou build pas encore rebuild
    // après ajout du plugin) — no-op silencieux, jamais bloquant.
  }
}

async function pushToAndroid(data) {
  if (Platform.OS !== 'android') return;
  const jobs = [
    ['OrderTracking', () => <BuyerWidget data={data.buyer} />],
    ['SupplierQueue', () => <SupplierQueueWidget data={data.supplier} />],
    ['DeliveryQueue', () => <DeliveryQueueWidget data={data.delivery} />],
    ['AdminApprovals', () => <AdminApprovalsWidget data={data.admin} />],
  ];
  await Promise.all(
    jobs.map(([widgetName, renderWidget]) =>
      requestWidgetUpdate({ widgetName, renderWidget }).catch(() => {
        // Idem — aucun widget de ce type ajouté à l'écran d'accueil.
      })
    )
  );
}

// Point d'entrée appelé depuis l'app (connexion, déconnexion, mise à jour
// de commande reçue par socket — voir NotificationContext.js). Passer
// `null` explicitement à la déconnexion pour effacer les données affichées.
// Calcule les 4 jeux de données en une fois — chaque compute* renvoie un
// état "inactif" propre si le compte n'a pas ce rôle, donc pas besoin de
// savoir à l'avance quels widgets l'utilisateur a réellement ajoutés.
export async function refreshWidgets(token) {
  const [buyer, supplier, delivery, admin] = await Promise.all([
    computeBuyerWidgetData(token),
    computeSupplierWidgetData(token),
    computeDeliveryWidgetData(token),
    computeAdminWidgetData(token),
  ]);
  const data = { buyer, supplier, delivery, admin };
  pushToIOS(data);
  await pushToAndroid(data);
}
