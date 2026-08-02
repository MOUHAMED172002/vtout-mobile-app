import api from '../api/client';

export const getMyNotifications = async (token) => {
  const { data } = await api.get('/notifications/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const markNotificationRead = async (id, token) => {
  const { data } = await api.put(`/notifications/${id}/read`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const markAllNotificationsRead = async (token) => {
  const { data } = await api.put('/notifications/mark-all-read', {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteNotification = async (id, token) => {
  const { data } = await api.delete(`/notifications/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
