import api from '../api/client';

// Kits/packs promotionnels (regroupements de produits à prix bundle).
// NOTE : la fonctionnalité "Kits" est actuellement désactivée côté serveur
// (routes commentées dans server/routes/kitRoutes.js, non montées dans
// server/index.js) — ces appels renverront une 404 tant qu'elle n'est pas
// réactivée. Les écrans consommant ce service doivent tolérer un échec
// silencieux (liste vide) comme pour tout autre chargement réseau.
export const getAllKits = async (token) => {
  const { data } = await api.get('/kits', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data) ? data : [];
};

// Le contrôleur ne fait pas de suppression définitive : il désactive le kit
// (is_active: false).
export const deleteKit = async (id, token) => {
  const { data } = await api.delete(`/kits/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
