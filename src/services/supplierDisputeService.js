import api from '../api/client';

// Litiges clients sur les commandes du vendeur connecté.
export const getMyDisputes = async (token) => {
  const { data } = await api.get('/suppliers/me/disputes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const respondToDispute = async (id, { supplier_response, supplier_evidence_url }, token) => {
  const { data } = await api.patch(`/suppliers/me/disputes/${id}/respond`, {
    supplier_response,
    supplier_evidence_url,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
