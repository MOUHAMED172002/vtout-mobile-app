import api from '../api/client';

export const getMyAddresses = async (token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.get('/addresses/me', { headers });
  return data;
};

export const createAddress = async (addressData, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.post('/addresses', addressData, { headers });
  return data;
};

export const updateAddress = async (id, addressData, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.patch(`/addresses/${id}`, addressData, { headers });
  return data;
};

export const deleteAddress = async (id, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.delete(`/addresses/${id}`, { headers });
  return data;
};
