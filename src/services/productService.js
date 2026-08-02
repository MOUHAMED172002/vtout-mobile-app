import api from '../api/client';

export const searchProducts = async (query) => {
  const { data } = await api.get(`/products/search?q=${encodeURIComponent(query)}`);
  return data;
};

export const getProducts = async (filters = {}) => {
  const { data } = await api.get('/products', { params: filters });
  return data;
};

export const getProductById = async (id) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

export const getRelatedProducts = async (id) => {
  const { data } = await api.get(`/products/${id}/related`);
  return data;
};

export const getFrequentlyBoughtTogether = async (id) => {
  const { data } = await api.get(`/products/${id}/bought-together`);
  return data;
};

export const getCategories = async () => {
  const { data } = await api.get('/categories');
  return data;
};

export const getAttributes = async () => {
  const { data } = await api.get('/attributes');
  return data;
};

export const getAttributesByCategory = async (categoryId) => {
  const { data } = await api.get(`/attributes/category/${categoryId}`);
  return data;
};

export const getSuppliers = async () => {
  const { data } = await api.get('/suppliers');
  return data;
};
