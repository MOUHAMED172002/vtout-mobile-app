import api from '../api/client';

// Endpoint public, réutilisé tel quel par LocationPicker côté client.
export const getHierarchy = async () => {
  const { data } = await api.get('/locations/hierarchy');
  return data;
};

// type: 'department' | 'commune' | 'arrondissement' | 'quartier'
// parentId: id du niveau parent (non requis pour un département)
export const createLocation = async ({ type, parentId, name, id }, token) => {
  const { data } = await api.post('/locations', { type, parentId, name, id }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteLocation = async (type, id, token) => {
  const { data } = await api.delete(`/locations/${type}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
