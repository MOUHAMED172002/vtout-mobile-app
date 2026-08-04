import api from '../api/client';

// Chaque tranche : { min, max, fee, isLast }. `max` est `null` pour la
// dernière tranche (illimitée) — le backend le force de toute façon.
export const getDeliveryFeeTiers = async (token) => {
  const { data } = await api.get('/admin/delivery-fee-tiers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.tiers || [];
};

export const updateDeliveryFeeTiers = async (tiers, token) => {
  const { data } = await api.put('/admin/delivery-fee-tiers', { tiers }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Chaque tranche : { min, max, multiplier, isLast }.
export const getDeliveryMultiplierTiers = async (token) => {
  const { data } = await api.get('/admin/delivery-multiplier-tiers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.tiers || [];
};

export const updateDeliveryMultiplierTiers = async (tiers, token) => {
  const { data } = await api.put('/admin/delivery-multiplier-tiers', { tiers }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
