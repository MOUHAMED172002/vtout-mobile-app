import api from '../api/client';

// Liste de tous les litiges (réclamations clients).
export const getAllDisputes = async (token) => {
  const { data } = await api.get('/admin/disputes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Compteurs par statut (utilisé pour un résumé rapide en tête d'écran).
export const getDisputeStats = async (token) => {
  const { data } = await api.get('/admin/disputes/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Changement de statut basique (open / under_review / resolved / cancelled),
// sans gestion du remboursement (réservée au back-office web).
export const updateDisputeStatus = async (id, status, token) => {
  const { data } = await api.patch(`/admin/disputes/${id}`, { status }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
