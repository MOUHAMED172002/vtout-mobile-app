import api from '../api/client';

// ---------------------------------------------------------------------------
// Commandes reçues par le vendeur + changement de statut.
// Mêmes endpoints que supplier-portal/src/services/orderService.js
// ---------------------------------------------------------------------------

export const getMySupplierOrders = async (token) => {
  const { data } = await api.get('/orders/me/supplier', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

export const updateOrderStatus = async (orderId, status, token) => {
  const { data } = await api.put(`/orders/${orderId}/status`, { status }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// Estime le gain net vendeur d'une commande (prix fournisseur x (1 - commission)).
export const getEstimatedGain = (order) => {
  let total = 0;
  (order?.items || []).forEach((item) => {
    const commissionRate = item.product?.category?.commission_rate
      ? parseFloat(item.product.category.commission_rate) / 100
      : 0.12;
    const multiplier = 1 - commissionRate;
    const gainPerItem = item.product?.supplier_price
      ? parseFloat(item.product.supplier_price) * multiplier
      : parseFloat(item.price) * multiplier;
    total += (parseFloat(gainPerItem) || 0) * item.quantity;
  });
  return total;
};
