import api from '../api/client';

export const getAllProductsAdmin = async ({ approval_status, search, category_id, supplier_id, limit = 50 } = {}, token) => {
  const { data } = await api.get('/products', {
    params: { approval_status, search, category_id, supplier_id, limit, isAdmin: 'true' },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.products || data || [];
};

export const createProductAdmin = async (payload, token) => {
  const { data } = await api.post('/products/admin', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateProductAdmin = async (id, payload, token) => {
  const { data } = await api.put(`/products/${id}`, { ...payload, isAdmin: 'true' }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteProductAdmin = async (id, token) => {
  const { data } = await api.delete(`/products/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
