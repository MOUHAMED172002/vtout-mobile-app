import api from '../api/client';

export const getHierarchy = async () => {
  const { data } = await api.get('/locations/hierarchy');
  return data;
};
