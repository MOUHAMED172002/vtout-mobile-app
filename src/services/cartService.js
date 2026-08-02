import api from '../api/client';

export const getMyCart = async (token) => {
  const { data } = await api.get('/cart', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const addToCart = async (productData, token) => {
  const { data } = await api.post('/cart', productData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const removeFromCart = async (itemId, token) => {
  const { data } = await api.delete(`/cart/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateCartItemQuantity = async (itemId, quantity, token) => {
  const { data } = await api.patch(`/cart/${itemId}`, { quantity }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
