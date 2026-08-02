import api from '../api/client';

export const validateCoupon = async (code, amount) => {
  const { data } = await api.post('/coupons/validate', { code, amount });
  return data;
};
