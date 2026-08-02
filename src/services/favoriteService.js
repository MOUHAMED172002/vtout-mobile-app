import api from '../api/client';

export const toggleFavorite = async (productId, token, variantId = null) => {
  const isFavorite = await checkFavorite(productId, token, variantId);
  if (isFavorite) {
    return await removeFavorite(productId, token, variantId);
  } else {
    return await addFavorite(productId, token, variantId);
  }
};

export const getUserFavorites = async (token) => {
  const { data } = await api.get('/favorites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const checkFavorite = async (productId, token, variantId = null) => {
  const { data } = await api.get(`/favorites/check/${productId}`, {
    params: { variant_id: variantId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.isFavorite;
};

export const addFavorite = async (productId, token, variantId = null) => {
  const { data } = await api.post('/favorites', {
    product_id: productId,
    variant_id: variantId,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const removeFavorite = async (productId, token, variantId = null) => {
  const { data } = await api.delete(`/favorites/${productId}`, {
    params: { variant_id: variantId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
