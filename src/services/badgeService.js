import api from '../api/client';

// ---------------------------------------------------------------------------
// Badge Vendeur Certifié — abonnement mensuel payant (FedaPay) qui affiche
// un badge "Certifié" sur tous les produits du fournisseur. Mêmes endpoints
// que le portail vendeur web et l'admin web, voir server/routes/badgeRoutes.js
// et server/controllers/badgeController.js.
// ---------------------------------------------------------------------------

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

// Prix mensuel courant (accessible à tout utilisateur connecté).
export const getBadgePrice = async (token) => {
  const { data } = await api.get('/badge/price', { headers: authHeaders(token) });
  return data;
};

// ---- Fournisseur ----

// Statut du badge + historique de paiements du fournisseur connecté.
export const getMyBadgeStatus = async (token) => {
  const { data } = await api.get('/badge/me', { headers: authHeaders(token) });
  return data;
};

// Lance un paiement FedaPay pour (re)certifier la boutique pour `months` mois.
export const subscribeToBadge = async (months, token) => {
  const { data } = await api.post('/badge/subscribe', { months }, { headers: authHeaders(token) });
  return data;
};

// ---- Admin ----

export const updateBadgePrice = async (amount, token) => {
  const { data } = await api.patch('/badge/price', { amount }, { headers: authHeaders(token) });
  return data;
};

export const getAllBadgeSubscriptions = async (token) => {
  const { data } = await api.get('/badge/admin/subscriptions', { headers: authHeaders(token) });
  return Array.isArray(data) ? data : [];
};

export const getCertifiedSuppliers = async (token) => {
  const { data } = await api.get('/badge/admin/certified', { headers: authHeaders(token) });
  return Array.isArray(data) ? data : [];
};

export const revokeBadge = async (supplierId, token) => {
  const { data } = await api.patch(`/badge/admin/${supplierId}/revoke`, {}, { headers: authHeaders(token) });
  return data;
};

// Attribue le badge gratuitement (sans paiement) pour `days` jours.
export const grantBadge = async (supplierId, days, token) => {
  const { data } = await api.post('/badge/admin/grant', { supplier_id: supplierId, days }, { headers: authHeaders(token) });
  return data;
};
