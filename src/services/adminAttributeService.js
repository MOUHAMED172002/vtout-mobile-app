import api from '../api/client';

// Liste de tous les attributs de variante (ex: Couleur, Taille) avec leurs valeurs.
export const getAllAttributes = async (token) => {
  const { data } = await api.get('/attributes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const createAttribute = async (name, token) => {
  const { data } = await api.post('/attributes', { name }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateAttribute = async (id, name, token) => {
  const { data } = await api.patch(`/attributes/${id}`, { name }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteAttribute = async (id, token) => {
  const { data } = await api.delete(`/attributes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Valeurs d'un attribut (ex: pour "Couleur" -> Rouge, Bleu, Vert).
export const getAttributeValues = async (attributeId, token) => {
  const { data } = await api.get(`/attributes/${attributeId}/values`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

export const addAttributeValue = async ({ attribute_id, value }, token) => {
  const { data } = await api.post('/attributes/values', { attribute_id, value }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateAttributeValue = async (id, value, token) => {
  const { data } = await api.patch(`/attributes/values/${id}`, { value }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteAttributeValue = async (id, token) => {
  const { data } = await api.delete(`/attributes/values/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
