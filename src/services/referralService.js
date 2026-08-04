import api from '../api/client';

// Code personnel + statistiques de parrainage de l'utilisateur connecté.
export const getMyReferralInfo = async (token) => {
  const { data } = await api.get('/referrals/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Rattache un code de parrainage au compte qui vient d'être créé.
export const applyReferralCode = async (code, token) => {
  const { data } = await api.post('/referrals/apply', { code }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
