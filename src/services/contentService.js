import api from '../api/client';

export const getFaqs = async () => {
  const { data } = await api.get('/content/faqs');
  return Array.isArray(data) ? data : [];
};

export const getPolicies = async () => {
  const { data } = await api.get('/content/policies');
  return Array.isArray(data) ? data : [];
};

export const getPolicyByType = async (type) => {
  const { data } = await api.get(`/content/policies/type/${type}`);
  return data;
};

// Toutes les politiques publiées pour un type donné (ex: 'supplier'),
// contrairement à getPolicyByType qui ne renvoie que le premier document.
export const getPoliciesByType = async (type) => {
  const { data } = await api.get(`/policies/type/${type}`);
  return Array.isArray(data) ? data : [];
};

export const getCGV = async () => {
  const { data } = await api.get('/content/cgv');
  return data;
};

export const getPlatformReviews = async () => {
  const { data } = await api.get('/content/platform-reviews');
  return Array.isArray(data) ? data : [];
};

export const createPlatformReview = async ({ rating, comment }, token) => {
  const { data } = await api.post('/content/platform-reviews', { rating, comment }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
