export const formatPrice = (v) => {
  if (v === null || v === undefined || isNaN(Number(v))) return '0';
  return Number(v).toLocaleString('fr-FR');
};

export const getOptimizedImage = (url, width = 800) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};

export const getThumbnail = (url) => getOptimizedImage(url, 400);

export const getProductDisplayPrice = (product) => {
  if (!product) {
    return { currentPrice: 0, basePrice: 0, isSale: false, discountPercent: 0, cheapestVariantId: null };
  }

  const bPrice = Number(product.price || 0);
  let minVariantPrice = Infinity;
  let foundVariant = false;
  let cheapestVariantId = null;

  if (product.variants && product.variants.length > 0) {
    product.variants.forEach((v) => {
      const p = Number(v.priceRows?.[0]?.price || 0);
      if (p > 0 && p < minVariantPrice) {
        minVariantPrice = p;
        foundVariant = true;
        cheapestVariantId = v.id;
      }
    });
  }

  let finalCurrent = 0;
  let finalBase = bPrice;

  if (product.old_price && Number(product.old_price) > bPrice) {
    finalBase = Number(product.old_price);
    finalCurrent = bPrice;
  } else if (bPrice > 0 && foundVariant && minVariantPrice < bPrice) {
    finalCurrent = minVariantPrice;
  } else if (bPrice > 0) {
    finalCurrent = bPrice;
  } else if (foundVariant) {
    finalCurrent = minVariantPrice;
    finalBase = 0;
  } else {
    finalCurrent = Number(product.supplier_price || 0);
  }

  const isSale = finalBase > finalCurrent && finalCurrent > 0 && finalBase > 0;
  return {
    currentPrice: finalCurrent,
    basePrice: finalBase,
    isSale,
    discountPercent: isSale ? Math.round(((finalBase - finalCurrent) / finalBase) * 100) : 0,
    cheapestVariantId,
  };
};

export const isProductOutOfStock = (product) => {
  if (!product) return true;
  if (product.total_stock !== undefined) return Number(product.total_stock) <= 0;
  if (product.variants && product.variants.length > 0) {
    return !product.variants.some((v) => (v.priceRows?.[0]?.stock || 0) > 0);
  }
  return (product.stock || 0) <= 0;
};
