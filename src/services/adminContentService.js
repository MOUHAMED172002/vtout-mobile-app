import api from '../api/client';

export const getAllBlogsAdmin = async (token) => {
  const { data } = await api.get('/blog', {
    params: { publishedOnly: 'false' },
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const createBlog = async (payload, token) => {
  const { data } = await api.post('/blog', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateBlog = async (id, payload, token) => {
  const { data } = await api.put(`/blog/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteBlog = async (id, token) => {
  const { data } = await api.delete(`/blog/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getAllFaqsAdmin = async (token) => {
  const { data } = await api.get('/content/faqs', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const createFaq = async (payload, token) => {
  const { data } = await api.post('/content/faqs', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateFaq = async (id, payload, token) => {
  const { data } = await api.patch(`/content/faqs/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteFaq = async (id, token) => {
  const { data } = await api.delete(`/content/faqs/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getAllPoliciesAdmin = async (token) => {
  const { data } = await api.get('/content/policies', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const createPolicy = async (payload, token) => {
  const { data } = await api.post('/content/policies', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updatePolicy = async (id, payload, token) => {
  const { data } = await api.patch(`/content/policies/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deletePolicy = async (id, token) => {
  const { data } = await api.delete(`/content/policies/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
