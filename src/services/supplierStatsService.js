import api from '../api/client';

// Pilotage & performance vendeur : CA (30j), commandes, alertes stock,
// CA mensuel (6 mois) et top produits vendus. Même endpoint que le
// portail vendeur (/stats/supplier-performance).
export const getSupplierPerformance = async (token) => {
  const { data } = await api.get('/stats/supplier-performance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
