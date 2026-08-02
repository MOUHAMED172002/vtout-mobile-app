import api from '../api/client';

export const getMyProfile = async (token) => {
  const { data } = await api.get('/profiles/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateMyProfile = async (profileData, token) => {
  const { data } = await api.patch('/profiles/me', profileData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
