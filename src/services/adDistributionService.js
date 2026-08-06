import api from '../api/client';

// ---------------------------------------------------------------------------
// Distribution publicitaire via Statut WhatsApp — mêmes endpoints backend que
// frontend/src/services/adDistributionService.js. Voir server/controllers/
// {adDistributorController,adAdminController}.js pour le détail des règles
// (cycle de preuve en 2 captures, anti-fraude, délais de paiement...).
// ---------------------------------------------------------------------------

const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// Visuel de campagne (image que le distributeur doit publier en Statut).
// `file` = { uri, name, type } (résultat d'expo-image-picker déjà normalisé).
export const uploadCampaignCreative = async (file, token) => {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post('/upload/single', form, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
};

// ── Admin : campagnes ──────────────────────────────────────────────────
export const getAllCampaigns = async (token) => {
  const { data } = await api.get('/ad-distribution/admin/campaigns', authHeaders(token));
  return Array.isArray(data) ? data : [];
};
export const createCampaign = async (payload, token) => {
  const { data } = await api.post('/ad-distribution/admin/campaigns', payload, authHeaders(token));
  return data;
};
export const updateCampaign = async (id, payload, token) => {
  const { data } = await api.patch(`/ad-distribution/admin/campaigns/${id}`, payload, authHeaders(token));
  return data;
};
export const deleteCampaign = async (id, token) => {
  const { data } = await api.delete(`/ad-distribution/admin/campaigns/${id}`, authHeaders(token));
  return data;
};

// ── Admin : modération ─────────────────────────────────────────────────
export const getModerationQueue = async (token) => {
  const { data } = await api.get('/ad-distribution/admin/queue', authHeaders(token));
  return Array.isArray(data) ? data : [];
};
export const getPayoutQueue = async (token) => {
  const { data } = await api.get('/ad-distribution/admin/payouts', authHeaders(token));
  return Array.isArray(data) ? data : [];
};
export const getSubmissionDetail = async (id, token) => {
  const { data } = await api.get(`/ad-distribution/admin/submissions/${id}`, authHeaders(token));
  return data;
};
export const approveSubmission = async (id, views_verified, token) => {
  const { data } = await api.patch(`/ad-distribution/admin/submissions/${id}/approve`, { views_verified }, authHeaders(token));
  return data;
};
export const rejectSubmission = async (id, reason, token) => {
  const { data } = await api.patch(`/ad-distribution/admin/submissions/${id}/reject`, { reason }, authHeaders(token));
  return data;
};
export const requestLiveCheck = async (id, token) => {
  const { data } = await api.patch(`/ad-distribution/admin/submissions/${id}/live-check`, {}, authHeaders(token));
  return data;
};
export const markSubmissionPaid = async (id, token) => {
  const { data } = await api.patch(`/ad-distribution/admin/submissions/${id}/mark-paid`, {}, authHeaders(token));
  return data;
};

// ── Admin : distributeurs ──────────────────────────────────────────────
export const getAllDistributors = async (token) => {
  const { data } = await api.get('/ad-distribution/admin/distributors', authHeaders(token));
  return Array.isArray(data) ? data : [];
};
export const banDistributor = async (id, reason, token) => {
  const { data } = await api.patch(`/ad-distribution/admin/distributors/${id}/ban`, { reason }, authHeaders(token));
  return data;
};
export const unbanDistributor = async (id, token) => {
  const { data } = await api.patch(`/ad-distribution/admin/distributors/${id}/unban`, {}, authHeaders(token));
  return data;
};

// ── Distributeur ────────────────────────────────────────────────────────
export const requestPhoneOtp = async (phone, token) => {
  const { data } = await api.post('/ad-distribution/me/request-otp', { phone }, authHeaders(token));
  return data;
};
export const verifyPhoneOtp = async (phone, code, token) => {
  const { data } = await api.post('/ad-distribution/me/verify-otp', { phone, code }, authHeaders(token));
  return data;
};
export const getMyDistributorProfile = async (token) => {
  const { data } = await api.get('/ad-distribution/me', authHeaders(token));
  return data;
};
export const updateMomoNumber = async (momo_number, token) => {
  const { data } = await api.patch('/ad-distribution/me/momo', { momo_number }, authHeaders(token));
  return data;
};
export const getAvailableCampaigns = async (token) => {
  const { data } = await api.get('/ad-distribution/campaigns', authHeaders(token));
  return Array.isArray(data) ? data : [];
};
export const claimCampaign = async (id, token) => {
  const { data } = await api.post(`/ad-distribution/campaigns/${id}/claim`, {}, authHeaders(token));
  return data;
};
export const getMySubmissions = async (token) => {
  const { data } = await api.get('/ad-distribution/submissions', authHeaders(token));
  return Array.isArray(data) ? data : [];
};

// `file` = { uri, name, type } (résultat d'expo-image-picker déjà normalisé).
const uploadScreenshot = async (path, id, file, token, extraFields = {}) => {
  const form = new FormData();
  form.append('screenshot', file);
  Object.entries(extraFields).forEach(([k, v]) => form.append(k, String(v)));
  const { data } = await api.post(`/ad-distribution/submissions/${id}/${path}`, form, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
export const submitEarlyScreenshot = (id, file, token) => uploadScreenshot('screenshot-early', id, file, token);
// La récompense dépend des vues : le distributeur les déclare ici (lues sous son Statut).
export const submitLateScreenshot = (id, file, viewsReported, token) => uploadScreenshot('screenshot-late', id, file, token, { views_reported: viewsReported });
export const submitLiveCheckScreenshot = (id, file, token) => uploadScreenshot('live-check', id, file, token);
