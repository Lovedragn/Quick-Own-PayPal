export const CHANNEL3_SEARCH_PAGE_SIZE = 20;

export function normalizeChannel3ImageData(imageData) {
  if (typeof imageData !== "string" || !imageData.trim()) return null;
  const trimmed = imageData.trim();
  return trimmed.includes(",") ? trimmed.split(",").pop() : trimmed;
}

export function toChannel3Recommendation(product, index = 0, assistantText = "") {
  const rawOffers = Array.isArray(product?.offers) ? product.offers : [];
  const offers = rawOffers.map((offer) => ({
    merchantDomain: offer.domain || "Store",
    price: offer.price || null,
    currency: offer.price?.currency || "USD",
    productUrl: offer.url || "",
    availability: offer.availability || "InStock",
    inStock: offer.availability !== "OutOfStock",
  }));
  const selectedOffer = offers[0] || null;
  const imageObjects = Array.isArray(product?.images) ? product.images : [];
  const imageUrl =
    imageObjects.find((image) => image?.is_main_image)?.cleaned_url ||
    imageObjects.find((image) => image?.cleaned_url)?.cleaned_url ||
    imageObjects[0]?.url ||
    "";
  const matchedFeatures = Array.isArray(product?.key_features)
    ? product.key_features.slice(0, 8)
    : [];

  return {
    rank: index + 1,
    product: {
      source: "CHANNEL3",
      productId: product?.id,
      name: product?.title || "Product",
      brand: product?.brands?.[0]?.name || "",
      category: product?.category?.title || product?.category?.slug || "",
      description: product?.description || "",
      imageUrl,
      images: imageObjects,
      inStock: offers.some((offer) => offer.inStock),
      offers,
      variants: product?.variants || null,
    },
    selectedOffer,
    matchedFeatureCount: matchedFeatures.length || 1,
    matchedFeatures,
    explanation:
      assistantText ||
      "Recommended from Channel3's live product catalogue.",
  };
}

export function getRecommendationProductKey(recommendation) {
  const product = recommendation?.product || {};
  if (product.productId) return String(product.productId);
  return `${product.name || ""}::${product.brand || ""}`.trim().toLowerCase();
}

export function mergeUniqueRecommendations(existing = [], incoming = []) {
  const merged = [...existing];
  const seen = new Set(existing.map(getRecommendationProductKey).filter(Boolean));

  for (const item of incoming) {
    const key = getRecommendationProductKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...item, rank: merged.length + 1 });
  }

  return merged;
}
