import api from '../api/client';

export const getMyOrders = async (token) => {
  const { data } = await api.get('/orders/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getOrderById = async (id, token) => {
  const { data } = await api.get(`/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const createOrder = async (orderData, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.post('/orders', orderData, { headers });
  return data;
};

export const cancelOrder = async (orderId, token) => {
  const { data } = await api.put(`/orders/${orderId}/status`, { status: 'annulee' }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
