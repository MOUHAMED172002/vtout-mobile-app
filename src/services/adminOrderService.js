import api from '../api/client';

// Liste de toutes les commandes (tous vendeurs confondus) — réservé aux admins.
export const getAllOrders = async (token) => {
  const { data } = await api.get('/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Change le statut d'une commande (en_attente / confirmee / expediee / livree / annulee).
export const updateOrderStatus = async (orderId, status, token) => {
  const { data } = await api.put(`/orders/${orderId}/status`, { status }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
