import api from '../api/client';

// Liste de tous les profils utilisateurs (clients, vendeurs, livreurs, admins).
export const getAllProfiles = async (token) => {
  const { data } = await api.get('/profiles', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Active ou désactive un compte utilisateur.
export const updateProfileStatus = async (id, isActive, token) => {
  const { data } = await api.patch(`/profiles/${id}/status`, { is_active: isActive }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
