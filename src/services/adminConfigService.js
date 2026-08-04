import api from '../api/client';

export const getAllConfigs = async (token) => {
  const { data } = await api.get('/configs', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getConfigsByGroup = async (group, token) => {
  const { data } = await api.get(`/configs/group/${group}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const upsertConfig = async ({ key, value, group, description }, token) => {
  const { data } = await api.post('/configs/upsert', { key, value, group, description }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteConfig = async (key, token) => {
  const { data } = await api.delete(`/configs/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
