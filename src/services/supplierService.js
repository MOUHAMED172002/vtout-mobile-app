import api from '../api/client';

// ---------------------------------------------------------------------------
// Inscription / profil vendeur (Supplier) + gestion des boutiques.
// Mêmes endpoints backend que le portail vendeur web (supplier-portal),
// voir server/routes/supplierRoutes.js et server/controllers/supplierController.js
// ---------------------------------------------------------------------------

// Auto-inscription en tant que fournisseur pour un compte déjà connecté.
export const registerSupplier = async (supplierData, token) => {
  const { data } = await api.post('/suppliers/register', supplierData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// Profil fournisseur du compte connecté (null si pas encore vendeur).
export const getMySupplierProfile = async (token) => {
  const { data } = await api.get('/suppliers/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

export const updateMySupplierProfile = async (profileData, token) => {
  const { data } = await api.patch('/suppliers/me', profileData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// Boutiques (points de vente) du vendeur.
export const getMyBoutiques = async (token) => {
  const { data } = await api.get('/suppliers/me/boutiques', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

export const createBoutique = async (boutiqueData, token) => {
  const { data } = await api.post('/suppliers/me/boutiques', boutiqueData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

export const updateBoutique = async (id, boutiqueData, token) => {
  const { data } = await api.patch(`/suppliers/me/boutiques/${id}`, boutiqueData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

export const deleteBoutique = async (id, token) => {
  const { data } = await api.delete(`/suppliers/me/boutiques/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// Statistiques de vente (30 derniers jours + top produits + alertes stock).
export const getSupplierStats = async (token) => {
  const { data } = await api.get('/stats/supplier-performance', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};
