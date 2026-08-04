import api from '../api/client';

// Statistiques du tableau de bord admin (ventes, commandes, alertes stock...).
// Reprend le même endpoint que le back-office web (/stats/dashboard).
export const getDashboardStats = async (token, period = '30J') => {
  const { data } = await api.get('/stats/dashboard', {
    params: { period },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Recherches sans résultat côté client (utile pour repérer des besoins produits non couverts).
export const getFailedSearches = async (token) => {
  const { data } = await api.get('/stats/search-analytics', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
