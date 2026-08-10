import api from '../api/client';

export const getMyOrders = async (token) => {
  const { data } = await api.get('/orders/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getOrderById = async (id, token) => {
  const { data } = await api.get(`/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const createOrder = async (orderData, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.post('/orders', orderData, { headers });
  return data;
};

export const cancelOrder = async (orderId, token) => {
  const { data } = await api.put(`/orders/${orderId}/status`, { status: 'annulee' }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Régénère un lien/token de paiement FedaPay pour une commande (flux legacy)
// — ou un PendingCheckout (flux différé, voir createOrder ci-dessus) — dont
// le paiement en ligne a échoué. Pas d'auth requise (invités inclus), voir
// retryOrderPayment côté backend.
export const retryOrderPayment = async (orderId, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.post(`/orders/${orderId}/retry-payment`, {}, { headers });
  return data;
};

// Confirmation explicite dès la fermeture du navigateur de paiement — la
// commande n'existe pas encore côté serveur tant que ce n'est pas confirmé
// (voir orderController.js materializePendingCheckout). Pas d'auth requise,
// re-vérifiée serveur-à-serveur dans le contrôleur (jamais fait confiance au
// seul retour du navigateur). Le webhook FedaPay reste le filet de sécurité
// si cet appel échoue (réseau, onglet fermé trop tôt…).
export const confirmPendingPayment = async (pendingCheckoutId, transactionId) => {
  const { data } = await api.post(`/orders/pending-checkout/${pendingCheckoutId}/confirm`, {
    transaction_id: transactionId,
  });
  return data;
};
