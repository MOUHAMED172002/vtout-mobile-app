import api from '../api/client';

// Portefeuille client (gains de parrainage, remboursements...) — même
// endpoint générique que le portefeuille vendeur côté serveur
// (financialRoutes.js), mais gardé séparé ici pour ne pas mélanger les
// domaines client / vendeur côté mobile.
export const getMyFinancials = async (token) => {
  const { data } = await api.get('/financials/my-status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const requestPayout = async (payoutData, token) => {
  const { data } = await api.post('/financials/request-payout', payoutData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
