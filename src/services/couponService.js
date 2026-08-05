import api from '../api/client';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export const validateCoupon = async (code, amount, items) => {
  const { data } = await api.post('/coupons/validate', { code, amount, items });
  return data;
};

// ---- Admin ----

export const getAllCoupons = async (token) => {
  const { data } = await api.get('/coupons', { headers: authHeaders(token) });
  return Array.isArray(data) ? data : [];
};

export const createCoupon = async (couponData, token) => {
  const { data } = await api.post('/coupons', couponData, { headers: authHeaders(token) });
  return data;
};

export const updateCoupon = async (id, couponData, token) => {
  const { data } = await api.put(`/coupons/${id}`, couponData, { headers: authHeaders(token) });
  return data;
};

export const toggleCoupon = async (id, token) => {
  const { data } = await api.patch(`/coupons/${id}/toggle`, {}, { headers: authHeaders(token) });
  return data;
};

export const deleteCoupon = async (id, token) => {
  const { data } = await api.delete(`/coupons/${id}`, { headers: authHeaders(token) });
  return data;
};

export const getCouponUsages = async (id, token) => {
  const { data } = await api.get(`/coupons/${id}/usages`, { headers: authHeaders(token) });
  return Array.isArray(data) ? data : [];
};
