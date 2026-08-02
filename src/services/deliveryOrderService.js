import api from '../api/client';

// Service API de l'espace livreur (mobile). Porté depuis
// frontend/src/services/deliveryService.js (web), en ne gardant que les
// endpoints livreur — les routes /delivery/admin/* restent hors périmètre
// (espace admin géré séparément).
//
// Convention du projet mobile : chaque fonction prend le `token` en DERNIER
// paramètre (voir src/services/orderService.js).

// ---------------------------------------------------------------------------
// Profil livreur / KYC
// ---------------------------------------------------------------------------

// Profil livreur courant (véhicule, statut, zones, KYC...). Rejette avec une
// erreur 404 (err.response.status === 404) si l'utilisateur n'a pas encore
// de profil livreur (n'a jamais candidaté).
export const getDeliveryProfile = async (token) => {
  const { data } = await api.get('/delivery/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Statut KYC seul (léger), utile pour l'écran de candidature.
export const getMyKycStatus = async (token) => {
  const { data } = await api.get('/delivery/my-kyc', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Candidature livreur (création) — ou mise à jour du profil si déjà candidat.
// payload: { fullname, phone, vehicle_type, vehicle_model, license_plate, id_card_url, selfie_url, service_zones }
export const registerLivreur = async (payload, token) => {
  const { data } = await api.post('/delivery/register', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Upload d'une pièce KYC (CNI ou selfie). `file` est un objet RN
// { uri, name, type } issu d'expo-image-picker.
export const uploadKycImage = async (file, token) => {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/upload/single', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.url;
};

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

// Commandes prêtes à être prises en charge (non assignées).
export const getAvailableOrders = async (token) => {
  const { data } = await api.get('/delivery/available', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

// Commandes assignées au livreur courant (en cours + historique).
export const getMyDeliveries = async (token) => {
  const { data } = await api.get('/delivery/my-deliveries', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const assignOrder = async (orderId, token) => {
  const { data } = await api.post('/delivery/assign', { orderId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const releaseOrder = async (orderId, token) => {
  const { data } = await api.post('/delivery/release', { orderId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// status: 'expédiée' (colis récupéré) | 'livrée' (remis au client, nécessite
// le code de confirmation donné par le client).
export const updateDeliveryStatus = async (orderId, status, deliveryCode, token) => {
  const { data } = await api.post('/delivery/status', {
    orderId,
    status,
    delivery_code: deliveryCode || null,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ---------------------------------------------------------------------------
// Disponibilité / Zones / Position
// ---------------------------------------------------------------------------

// status: 'disponible' | 'hors_ligne'
export const toggleDeliveryStatus = async (status, token) => {
  const { data } = await api.post('/delivery/toggle-status', { status }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateServiceZones = async (zones, token) => {
  const { data } = await api.post('/delivery/update-zones', { zones }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Optionnel — géolocalisation en direct (non utilisée par défaut côté mobile).
export const updateLocation = async (lat, lng, token) => {
  const { data } = await api.put('/delivery/location', { lat, lng }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ---------------------------------------------------------------------------
// Cash (paiement à la livraison) & finances
// ---------------------------------------------------------------------------

// Génère un lien de paiement (FedaPay) pour reverser le cash encaissé sur
// une commande livrée en paiement à la livraison.
export const generateCashPaymentLink = async (orderId, token) => {
  const { data } = await api.post('/delivery/generate-cash-link', { orderId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Solde disponible / transactions / demandes de retrait du livreur.
export const getMyFinancials = async (token) => {
  const { data } = await api.get('/financials/my-status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ---------------------------------------------------------------------------
// Helpers partagés entre les écrans livreur
// ---------------------------------------------------------------------------

export const ACTIVE_STATUSES = ['expediee', 'expédiée', 'confirmee', 'confirmée', 'assignee', 'assignée'];
export const FINISHED_STATUSES = ['livree', 'livrée', 'annulee', 'annulée'];

export const isPickedUp = (order) => ['expediee', 'expédiée'].includes(order?.status);
export const isDelivered = (order) => ['livree', 'livrée'].includes(order?.status);
export const isCashOnDelivery = (order) => order?.payment_method === 'delivery';

// Gain estimé du livreur pour cette commande (le backend calcule
// `deliverer_fee`; on retombe sur `delivery_fee` si absent).
export const getDelivererFee = (order) => {
  const v = order?.deliverer_fee !== undefined ? order.deliverer_fee : order?.delivery_fee;
  return Number(v || 0);
};

// Cash encaissé chez le client, livré mais pas encore reversé à Vtout.
export const hasUnremittedCash = (order) =>
  isDelivered(order) && isCashOnDelivery(order) && order?.payment_status === 'en_attente';

export const getOrderRef = (order) => (order?.id ? String(order.id).slice(0, 8).toUpperCase() : '');
