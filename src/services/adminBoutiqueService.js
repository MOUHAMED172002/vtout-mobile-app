import api from '../api/client';

// Catalogue admin complet de toutes les boutiques (contrairement à
// boutiqueService.getBoutiques qui n'expose que l'annuaire public).
export const getAllBoutiquesAdmin = async (token) => {
  const { data } = await api.get('/suppliers/boutiques-all', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

// Création d'une boutique par un admin pour le compte d'un fournisseur.
// payload attend au minimum { supplier_id, name }.
export const adminCreateBoutique = async (payload, token) => {
  const { data } = await api.post('/suppliers/boutiques-admin', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
