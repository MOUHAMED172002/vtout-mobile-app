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

// `file` est un objet RN { uri, name, type } issu d'expo-image-picker.
export const uploadAvatar = async (file, token) => {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/upload/single', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.url;
};
