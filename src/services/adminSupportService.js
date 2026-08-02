import api from '../api/client';

export const getAllConversations = async (token) => {
  const { data } = await api.get('/support/admin/conversations', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const getConversationMessages = async (conversationId, token) => {
  const { data } = await api.get('/support/messages', {
    params: { conversation_id: conversationId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};
