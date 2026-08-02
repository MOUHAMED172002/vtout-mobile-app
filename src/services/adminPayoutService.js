import api from '../api/client';

export const getAllPayoutRequests = async (token) => {
  const { data } = await api.get('/financials/admin/payouts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const processPayout = async (id, { status, admin_notes }, token) => {
  const { data } = await api.put(`/financials/admin/payouts/${id}`, { status, admin_notes }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
