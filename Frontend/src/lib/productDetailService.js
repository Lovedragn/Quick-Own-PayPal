// In-memory cache for fetched product details & sample images
const productCache = new Map();
const pendingFetches = new Map();

/**
 * Fetch full product details including all sample images on-demand.
 * Used when hovering a card or opening product detail overlay.
 */
export async function fetchProductSampleImages(productId) {
  if (!productId) return null;

  if (productCache.has(productId)) {
    return productCache.get(productId);
  }

  if (pendingFetches.has(productId)) {
    return pendingFetches.get(productId);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`);
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      if (!data.success || !data.product) {
        return null;
      }

      const p = data.product;
      const images = [];

      if (Array.isArray(p.images)) {
        for (const img of p.images) {
          if (typeof img === 'string' && img) {
            images.push(img);
          } else if (img && typeof img === 'object') {
            const url = img.cleaned_url || img.url;
            if (url) images.push(url);
          }
        }
      }

      const result = {
        productId: p.id || productId,
        title: p.title,
        description: p.description,
        images: Array.from(new Set(images.filter(Boolean))),
        rawProduct: p,
      };

      productCache.set(productId, result);
      return result;
    } catch (err) {
      console.warn(`[productDetailService] Failed to load sample images for ${productId}:`, err);
      return null;
    } finally {
      pendingFetches.delete(productId);
    }
  })();

  pendingFetches.set(productId, fetchPromise);
  return fetchPromise;
}

export function getCachedProductImages(productId) {
  if (!productId) return null;
  const cached = productCache.get(productId);
  return cached?.images || null;
}

