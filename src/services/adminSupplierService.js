import api from '../api/client';

// Liste de tous les vendeurs (fournisseurs).
export const getSuppliers = async (token) => {
  const { data } = await api.get('/suppliers', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// Change le statut d'un vendeur (ex: 'active' pour approuver, 'suspendu' pour rejeter/suspendre).
export const updateSupplierStatus = async (id, status, token) => {
  const { data } = await api.patch(`/suppliers/${id}`, { status }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// Produits en attente d'approbation (catalogue fournisseurs), même filtre que le back-office web.
export const getPendingProducts = async (token) => {
  const { data } = await api.get('/products', {
    params: { approval_status: 'En attente', isAdmin: 'true' },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data?.products || data || [];
};

export const approveProduct = async (id, token) => {
  const { data } = await api.put(`/products/${id}`, {
    approval_status: 'approved',
    admin_feedback: 'Produit approuvé.',
    isAdmin: 'true',
  }, { headers: { Authorization: `Bearer ${token}` } });
  return data;
};

export const rejectProduct = async (id, feedback, token) => {
  const { data } = await api.put(`/products/${id}`, {
    approval_status: 'rejected',
    admin_feedback: feedback || 'Produit rejeté.',
    isAdmin: 'true',
  }, { headers: { Authorization: `Bearer ${token}` } });
  return data;
};
