import api from '../api/client';

export const getAllCategoriesAdmin = async () => {
  const { data } = await api.get('/categories');
  return Array.isArray(data) ? data : [];
};

export const createCategory = async ({ name, parent_id, commission_rate }, token) => {
  const { data } = await api.post('/categories', { name, parent_id, commission_rate }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateCategory = async (id, payload, token) => {
  const { data } = await api.put(`/categories/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteCategory = async (id, token) => {
  const { data } = await api.delete(`/categories/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
