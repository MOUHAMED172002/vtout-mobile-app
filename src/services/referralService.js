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

// ---- Admin ----

export const getReferralSettings = async (token) => {
  const { data } = await api.get('/referrals/admin/settings', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateReferralSettings = async (settings, token) => {
  const { data } = await api.patch('/referrals/admin/settings', settings, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getAllReferrals = async (token) => {
  const { data } = await api.get('/referrals/admin/all', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const getReferralStats = async (token) => {
  const { data } = await api.get('/referrals/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
