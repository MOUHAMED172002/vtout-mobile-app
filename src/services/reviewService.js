import api from '../api/client';

export const getProductReviews = async (productId, limit = 20) => {
  const { data } = await api.get(`/reviews/product/${productId}?limit=${limit}`);
  return data;
};

export const getMyReviews = async (token) => {
  const { data } = await api.get('/reviews/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const createReview = async (reviewData, token) => {
  const { data } = await api.post('/reviews', reviewData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteReview = async (id, token) => {
  const { data } = await api.delete(`/reviews/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// `files` : tableau d'objets RN { uri, name, type } issus d'expo-image-picker.
export const uploadReviewImages = async (files, token) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const { data } = await api.post('/upload/multiple', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.urls || [];
};
