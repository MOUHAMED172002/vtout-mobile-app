import api from '../api/client';

// ---------------------------------------------------------------------------
// Portefeuille vendeur : solde, historique de transactions, demandes de
// retrait. Mêmes endpoints que server/routes/financialRoutes.js.
// ---------------------------------------------------------------------------

// Retourne { balance, transactions, payoutRequests, savedPayoutInfo }
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
