import api from '../api/client';

// Espace admin "Logistique" (mobile) — livreurs (KYC/validation), caisse
// (cash-on-delivery à reverser) et vue d'ensemble ("tour de contrôle").
// Miroir des routes /delivery/admin/* (server/routes/deliveryRoutes.js).

// ---------------------------------------------------------------------------
// Livreurs
// ---------------------------------------------------------------------------

// Liste complète des livreurs (avec profil rattaché : fullname, email, phone).
export const getLivreursList = async (token) => {
  const { data } = await api.get('/delivery/admin/list', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

// Bascule directe du statut de vérification (hors flux KYC avec motif) —
// body attendu par le backend : { is_verified }.
export const verifyLivreur = async (id, isVerified, token) => {
  const { data } = await api.post(`/delivery/admin/verify/${id}`, { is_verified: isVerified }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Revue KYC — payload : { action: 'approve' | 'reject', rejection_reason? }.
export const reviewKyc = async (id, payload, token) => {
  const { data } = await api.post(`/delivery/admin/kyc-review/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteLivreur = async (id, token) => {
  const { data } = await api.delete(`/delivery/admin/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ---------------------------------------------------------------------------
// Caisse (cash-on-delivery)
// ---------------------------------------------------------------------------

// Historique des versements déjà confirmés (commandes payment_status='payé').
// Renvoie { orders: [...] } côté backend.
export const getCashHistory = async (token) => {
  const { data } = await api.get('/delivery/admin/cash-history', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data?.orders) ? data.orders : [];
};

// Confirme le versement de tout le cash en attente d'un livreur —
// payload attendu par le backend : { deliveryPersonId }.
export const confirmCashRemitted = async (payload, token) => {
  const { data } = await api.post('/delivery/admin/confirm-cash', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ---------------------------------------------------------------------------
// Assignation & stats (tour de contrôle)
// ---------------------------------------------------------------------------

// Assignation manuelle d'une commande à un livreur —
// payload : { orderId, deliveryPersonId } (deliveryPersonId falsy = désassigner).
export const adminAssignOrder = async (payload, token) => {
  const { data } = await api.post('/delivery/admin/assign', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Stats agrégées : { debts, dailyDeliveries, timestamp }.
// - debts : créances en attente de versement, groupées par livreur
//   ({ delivery_person_id, total_debt, order_count, deliveryPerson }).
// - dailyDeliveries : livraisons effectuées aujourd'hui, groupées par livreur
//   ({ delivery_person_id, count, deliveryPerson }).
export const getDeliveryStatsAdmin = async (token) => {
  const { data } = await api.get('/delivery/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data || { debts: [], dailyDeliveries: [], timestamp: null };
};
