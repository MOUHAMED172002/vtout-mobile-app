import api from '../api/client';

export const getAllConfigs = async () => {
  const { data } = await api.get('/configs/public');
  return data;
};

export const getConfigsByGroup = async (group) => {
  const { data } = await api.get(`/configs/group/${group}`);
  return data;
};
