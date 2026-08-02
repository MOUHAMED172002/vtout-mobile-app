import api from '../api/client';

// Annuaire public des boutiques (GET /suppliers/boutiques, sans auth).
export const getBoutiques = async (filters = {}) => {
  const { data } = await api.get('/suppliers/boutiques', { params: filters });
  return Array.isArray(data) ? data : [];
};
