import api from '../api/client';

export const getMyConversation = async (token) => {
  const { data } = await api.get('/support/messages', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};
