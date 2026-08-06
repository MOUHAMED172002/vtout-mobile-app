import api from '../api/client';

// ---------------------------------------------------------------------------
// Gestion des produits côté vendeur : liste, création, édition,
// activation/désactivation (in_stock_supplier), suppression, upload d'image.
// Mêmes endpoints backend que supplier-portal/src/services/{supplierService,
// productService, uploadService, deliveryFeeService}.js
// ---------------------------------------------------------------------------

export const getMySupplierProducts = async (token) => {
  const { data } = await api.get('/suppliers/me/products', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

// Un seul produit pour le formulaire d'édition — contrairement à l'endpoint
// public (getProductById), inclut cost_price (mémo privé du prix d'achat,
// réservé au vendeur propriétaire du produit).
export const getMyProductById = async (id, token) => {
  const { data } = await api.get(`/suppliers/me/products/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};

export const createProduct = async (productData, token) => {
  const { data } = await api.post('/products', productData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateProduct = async (id, productData, token) => {
  const { data } = await api.put(`/products/${id}`, productData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteProduct = async (id, token) => {
  const { data } = await api.delete(`/products/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Mise à jour rapide du stock (préserve le statut d'approbation courant).
export const updateProductStock = async (productId, stock, token) => {
  const { data } = await api.put(`/products/${productId}`, { stock, preserve_approval: true }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Active/désactive la disponibilité du produit sans le supprimer ni
// redéclencher une validation admin (champ in_stock_supplier).
export const setProductAvailability = async (productId, inStock, token) => {
  const { data } = await api.put(`/products/${productId}`, {
    in_stock_supplier: inStock,
    preserve_approval: true,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getCategories = async () => {
  const { data } = await api.get('/categories');
  return data;
};

// Aplatit l'arbre de catégories (parent + children) en une liste simple,
// pratique pour un sélecteur mobile.
export const flattenCategories = (categories = []) => {
  const result = [];
  const walk = (list, depth = 0) => {
    (list || []).forEach((cat) => {
      result.push({ id: cat.id, name: cat.name, depth });
      if (cat.children && cat.children.length > 0) walk(cat.children, depth + 1);
    });
  };
  walk(categories);
  return result;
};

// Upload d'une image produit (React Native : objet {uri, name, type}).
export const uploadProductImage = async (file, token) => {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/upload/single', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.url;
};

// ---------------------------------------------------------------------------
// Grille des frais de livraison (marketing) — utilisée pour calculer le prix
// public affiché aux clients à partir du prix de vente souhaité par le
// vendeur. Repli sur des paliers par défaut si la config distante échoue.
// ---------------------------------------------------------------------------
const DEFAULT_TIERS = [
  { min: 0, max: 500, fee: 300 },
  { min: 500, max: 2000, fee: 500 },
  { min: 2000, max: 5000, fee: 700 },
  { min: 5000, max: 15000, fee: 1000 },
  { min: 15000, max: 1000000, fee: 1500 },
];

export const getDeliveryFeeTiers = async () => {
  try {
    const { data } = await api.get('/configs/public');
    const tiersConfig = (data || []).find((c) => c.key === 'delivery_fee_tiers');
    if (tiersConfig && tiersConfig.value) {
      const tiers = typeof tiersConfig.value === 'string' ? JSON.parse(tiersConfig.value) : tiersConfig.value;
      return tiers.sort((a, b) => a.min - b.min);
    }
  } catch (err) {
    // repli silencieux sur les paliers par défaut
  }
  return DEFAULT_TIERS;
};

export const getCommissionRate = async () => {
  try {
    const { data } = await api.get('/configs/public');
    const config = (data || []).find((c) => c.key === 'commission_rate');
    if (config && config.value) return parseFloat(config.value);
  } catch (err) {
    // repli silencieux
  }
  return 10;
};

export const computeDeliveryFee = (supplierPrice, tiers) => {
  const price = parseFloat(supplierPrice) || 0;
  if (price === 0) return 0;
  const currentTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_TIERS;
  const tier = currentTiers.find((t) => price >= t.min && price < (t.max || Infinity));
  if (tier) return tier.fee;
  return currentTiers[currentTiers.length - 1]?.fee || 1000;
};

export const computePublicPrice = (supplierPrice, tiers) => {
  const fee = computeDeliveryFee(supplierPrice, tiers);
  return Math.round((parseFloat(supplierPrice) || 0) + fee);
};

// Retrouve le prix vendeur (gros) à partir d'un prix public déjà calculé,
// en recherchant le palier dont (prix public - frais) retombe dans sa plage.
export const reverseSupplierPrice = (publicPrice, tiers) => {
  const pub = parseFloat(publicPrice) || 0;
  if (pub === 0) return 0;
  const currentTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_TIERS;
  for (const tier of currentTiers) {
    const candidate = pub - tier.fee;
    if (candidate >= tier.min && candidate < (tier.max || Infinity)) {
      return Math.round(candidate);
    }
  }
  const lastFee = currentTiers[currentTiers.length - 1]?.fee || 1000;
  return Math.max(0, Math.round(pub - lastFee));
};
