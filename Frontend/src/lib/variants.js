// Quick-Own Variant Model Normalizer & Helpers
// Supports Channel3 / UCP variant options, legacy variant arrays, and category fallbacks.

export const COLOR_MAP = {
  black: "#111827",
  "core black": "#111827",
  white: "#FFFFFF",
  "triple white": "#FAFAFA",
  navy: "#1e3a8a",
  "midnight blue": "#172554",
  blue: "#2563eb",
  red: "#dc2626",
  "solar red": "#ef4444",
  orange: "#f97316",
  "bright orange": "#ff6b00",
  green: "#16a34a",
  "forest green": "#14532d",
  lime: "#84cc16",
  "lime green": "#a3e635",
  yellow: "#eab308",
  pink: "#ec4899",
  purple: "#9333ea",
  grey: "#6b7280",
  gray: "#6b7280",
  brown: "#78350f",
  tan: "#d2b48c",
  "warm tan": "#d4b896",
  beige: "#f5f5dc",
  silver: "#cbd5e1",
  gold: "#eab308",
  charcoal: "#374151",
  cream: "#fef3c7",
  olive: "#556b2f",
  maroon: "#800000",
  teal: "#0d9488",
  coral: "#f87171",
  natural: "#e8e1d5",
  "off white": "#faf9f6",
  "light green": "#86efac",
  "dark brown": "#451a03",
  "dark grey": "#374151",
  "dark gray": "#374151",
  khaki: "#c3b091",
  sand: "#d8c4b6",
  ivory: "#fffff0",
  burgundy: "#800020",
  nude: "#e3bc9a",
};

export function getColorHex(label) {
  if (!label || typeof label !== "string") return "#94a3b8";
  const lower = label.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return hex;
  }
  return "#94a3b8";
}

export function isValueOutOfStock(value) {
  return value?.available === "OutOfStock";
}

export function isValueMissing(value) {
  return value?.exists === false;
}

export function extractChannel3Uuid(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  return match ? match[0].toLowerCase() : null;
}

export function buildCleanedUrlMap(...products) {
  const map = new Map();

  for (const prod of products) {
    if (!prod) continue;
    const candidates = [
      ...(Array.isArray(prod.images) ? prod.images : []),
      ...(Array.isArray(prod.rawProduct?.images) ? prod.rawProduct.images : []),
    ];

    for (const item of candidates) {
      if (!item) continue;

      // Handle string candidate that is already cleaned
      if (typeof item === "string" && item.includes("/cleaned/v1/")) {
        const cleanTrimmed = item.trim();
        const uuid = extractChannel3Uuid(cleanTrimmed);
        if (uuid) {
          map.set(uuid, cleanTrimmed);
          map.set(cleanTrimmed, cleanTrimmed);
          map.set(cleanTrimmed.split("?")[0], cleanTrimmed);
          const rawVariant = cleanTrimmed.replace("/cleaned/v1/", "/");
          map.set(rawVariant, cleanTrimmed);
          map.set(rawVariant.split("?")[0], cleanTrimmed);
        }
        continue;
      }

      if (typeof item !== "object") continue;
      const cleaned = item.cleaned_url;
      const raw = item.url;
      if (typeof cleaned === "string" && cleaned.trim().length > 0) {
        const cleanTrimmed = cleaned.trim();

        if (typeof raw === "string" && raw.trim().length > 0) {
          const rawTrimmed = raw.trim();
          map.set(rawTrimmed, cleanTrimmed);
          map.set(rawTrimmed.split("?")[0], cleanTrimmed);
          const rawUuid = extractChannel3Uuid(rawTrimmed);
          if (rawUuid) {
            map.set(rawUuid, cleanTrimmed);
          }
        }

        map.set(cleanTrimmed, cleanTrimmed);
        map.set(cleanTrimmed.split("?")[0], cleanTrimmed);
        const cleanUuid = extractChannel3Uuid(cleanTrimmed);
        if (cleanUuid) {
          map.set(cleanUuid, cleanTrimmed);
        }
      }
    }
  }

  return map;
}

export function extractImageUrl(img, cleanedMap = null) {
  if (!img) return null;
  let url = null;
  if (typeof img === "string") {
    const trimmed = img.trim();
    if (trimmed.length > 0) url = trimmed;
  } else if (typeof img === "object") {
    const candidate = img.cleaned_url || img.url;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) url = trimmed;
    }
  }

  if (!url) return null;

  if (cleanedMap && cleanedMap instanceof Map) {
    if (cleanedMap.has(url)) return cleanedMap.get(url);
    const noQuery = url.split("?")[0];
    if (cleanedMap.has(noQuery)) return cleanedMap.get(noQuery);
    const uuid = extractChannel3Uuid(url);
    if (uuid && cleanedMap.has(uuid)) return cleanedMap.get(uuid);
  }

  return url;
}

export function getCanonicalImageKey(url, cleanedMap = null) {
  if (!url || typeof url !== "string") return "";
  const resolved = extractImageUrl(url, cleanedMap) || url;
  const noQuery = resolved.split("?")[0].split("#")[0].trim().toLowerCase();
  const uuid = extractChannel3Uuid(noQuery);
  if (uuid) {
    return "uuid:" + uuid;
  }
  return "url:" + noQuery;
}

export function deduplicateImages(list, cleanedMap = null) {
  if (!Array.isArray(list)) return [];
  const map = new Map();

  for (const item of list) {
    if (!item) continue;
    const url = extractImageUrl(item, cleanedMap);
    if (!url || typeof url !== "string" || url.trim().length === 0) continue;
    const cleanUrl = url.trim();

    const key = getCanonicalImageKey(cleanUrl, cleanedMap);
    const isCleaned =
      cleanUrl.includes("/cleaned/v1/") ||
      (cleanedMap &&
        (cleanedMap.has(cleanUrl) || cleanedMap.has(cleanUrl.split("?")[0])));

    if (!map.has(key)) {
      map.set(key, { url: cleanUrl, isCleaned });
    } else {
      const existing = map.get(key);
      if (!existing.isCleaned && isCleaned) {
        map.set(key, { url: cleanUrl, isCleaned: true });
      }
    }
  }

  return Array.from(map.values()).map((e) => e.url);
}

export function getPrimaryCleanedImage(
  product,
  extraProduct,
  cleanedMap = null,
) {
  const sources = [
    extraProduct?.rawProduct,
    extraProduct,
    product?.rawProduct,
    product,
  ].filter(Boolean);

  // 1. Look for explicit is_main_image with cleaned_url
  for (const src of sources) {
    if (Array.isArray(src?.images)) {
      for (const img of src.images) {
        if (
          img &&
          typeof img === "object" &&
          img.is_main_image &&
          img.cleaned_url
        ) {
          const res = extractImageUrl(img.cleaned_url, cleanedMap);
          if (res) return res;
        }
      }
    }
  }

  // 2. Look for any image with cleaned_url
  for (const src of sources) {
    if (Array.isArray(src?.images)) {
      for (const img of src.images) {
        if (img && typeof img === "object" && img.cleaned_url) {
          const res = extractImageUrl(img.cleaned_url, cleanedMap);
          if (res) return res;
        }
      }
    }
  }

  // 3. Fallback to is_main_image url or general url
  for (const src of sources) {
    if (Array.isArray(src?.images)) {
      for (const img of src.images) {
        if (img && typeof img === "object" && img.is_main_image) {
          const res = extractImageUrl(img, cleanedMap);
          if (res) return res;
        }
      }
    }
  }

  // 4. Fallback to product imageUrl or images[0]
  const fallback =
    extractImageUrl(extraProduct?.imageUrl, cleanedMap) ||
    extractImageUrl(product?.imageUrl, cleanedMap) ||
    (Array.isArray(extraProduct?.images) && extraProduct.images.length > 0
      ? extractImageUrl(extraProduct.images[0], cleanedMap)
      : null) ||
    (Array.isArray(product?.images) && product.images.length > 0
      ? extractImageUrl(product.images[0], cleanedMap)
      : null) ||
    null;

  return fallback;
}

export function normalizeProductVariants(product, cleanedMap = null) {
  if (!product) {
    return {
      hasVariants: false,
      isUcp: false,
      options: [],
      selectedMap: {},
      selectedList: [],
      colorOption: null,
      sizeOption: null,
      otherOptions: [],
      legacyVariants: [],
    };
  }

  // 1. Channel3 UCP variants object: { options: [...], selected: [...] }
  if (
    product.variants &&
    typeof product.variants === "object" &&
    Array.isArray(product.variants.options) &&
    product.variants.options.length > 0
  ) {
    const rawOptions = product.variants.options;
    const rawSelected = Array.isArray(product.variants.selected)
      ? product.variants.selected
      : [];

    const selectedMap = {};
    for (const item of rawSelected) {
      if (item && item.name && item.label) {
        selectedMap[item.name] = item.label;
      }
    }

    // Ensure every option has a selected fallback
    for (const opt of rawOptions) {
      if (
        !selectedMap[opt.name] &&
        Array.isArray(opt.values) &&
        opt.values.length > 0
      ) {
        const inStockVal = opt.values.find(
          (v) => v.exists !== false && v.available !== "OutOfStock",
        );
        selectedMap[opt.name] = inStockVal?.label || opt.values[0].label;
      }
    }

    const colorOption =
      rawOptions.find((opt) => /colou?r/i.test(opt.name)) || null;

    // Normalize values inside colorOption to support both camelCase and snake_case thumbnailUrl
    const normalizedColorOption = colorOption
      ? {
          ...colorOption,
          values: (colorOption.values || []).map((v) => ({
            ...v,
            thumbnailUrl:
              extractImageUrl(v.thumbnailUrl, cleanedMap) ||
              extractImageUrl(v.thumbnail_url, cleanedMap) ||
              extractImageUrl(v.imageUrl, cleanedMap) ||
              extractImageUrl(v.image_url, cleanedMap) ||
              null,
            imageUrl:
              extractImageUrl(v.imageUrl, cleanedMap) ||
              extractImageUrl(v.image_url, cleanedMap) ||
              extractImageUrl(v.thumbnailUrl, cleanedMap) ||
              extractImageUrl(v.thumbnail_url, cleanedMap) ||
              null,
          })),
        }
      : null;

    const sizeOption =
      rawOptions.find((opt) =>
        /size|capacity|storage|memory/i.test(opt.name),
      ) || null;
    const otherOptions = rawOptions.filter(
      (opt) => opt !== colorOption && opt !== sizeOption,
    );

    // If product has no color option in variants (e.g. only storage/specs),
    // treat the product itself as a single color/style variant so it displays its product image in a swatch
    const effectiveColorOption = normalizedColorOption || {
      name: "Color",
      values: [
        {
          label: product.color || product.name || "Default",
          exists: true,
          available: product.inStock !== false ? "InStock" : "OutOfStock",
          thumbnailUrl: extractImageUrl(product.imageUrl, cleanedMap) || null,
          imageUrl: extractImageUrl(product.imageUrl, cleanedMap) || null,
          id: product.productId || "default-var",
        },
      ],
    };

    return {
      hasVariants: true,
      isUcp: true,
      options: rawOptions,
      selectedMap,
      selectedList: rawSelected,
      colorOption: effectiveColorOption,
      sizeOption,
      otherOptions,
      legacyVariants: [],
    };
  }

  // 2. Legacy flat array of variants: [{ id, label, thumbnailUrl, imageUrl }, ...]
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const legacyVariants = product.variants;
    const colorValues = legacyVariants.map((v, i) => {
      const thumb =
        extractImageUrl(v.thumbnailUrl, cleanedMap) ||
        extractImageUrl(v.imageUrl, cleanedMap);
      const img = extractImageUrl(v.imageUrl, cleanedMap) || thumb;
      return {
        label: v.name || v.label || `Option ${i + 1}`,
        exists: true,
        available: v.available === false ? "OutOfStock" : "InStock",
        thumbnailUrl: thumb,
        imageUrl: img,
        id: v.id || `var-${i}`,
      };
    });

    const colorOption = {
      name: "Color",
      values: colorValues,
    };

    return {
      hasVariants: true,
      isUcp: false,
      options: [colorOption],
      selectedMap: { Color: colorValues[0]?.label },
      selectedList: [{ name: "Color", label: colorValues[0]?.label }],
      colorOption,
      sizeOption: null,
      otherOptions: [],
      legacyVariants,
    };
  }

  // 3. Fallback: Product has only single default variant/image
  const defaultLabel = product.color || product.name || "Default";
  const defaultImg =
    extractImageUrl(product.imageUrl, cleanedMap) ||
    extractImageUrl(product.image, cleanedMap) ||
    null;
  const defaultSingleValue = {
    label: defaultLabel,
    exists: true,
    available: product.inStock !== false ? "InStock" : "OutOfStock",
    thumbnailUrl: defaultImg,
    imageUrl: defaultImg,
    id: product.productId || "default-var",
  };
  const fallbackColorOption = {
    name: "Color",
    values: [defaultSingleValue],
  };

  return {
    hasVariants: false,
    isUcp: false,
    options: [fallbackColorOption],
    selectedMap: { Color: defaultLabel },
    selectedList: [{ name: "Color", label: defaultLabel }],
    colorOption: fallbackColorOption,
    sizeOption: null,
    otherOptions: [],
    legacyVariants: [],
  };
}

export function getDomainFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function normalizeOffer(offer) {
  if (!offer) return null;
  const merchant =
    offer.merchant ||
    offer.merchant_name ||
    offer.merchantDomain ||
    offer.merchant_domain ||
    offer.domain ||
    offer.merchant?.name ||
    offer.merchant?.domain ||
    (offer.url ? getDomainFromUrl(offer.url) : null) ||
    (offer.productUrl ? getDomainFromUrl(offer.productUrl) : null) ||
    "Store";

  const productUrl =
    offer.productUrl ||
    offer.url ||
    offer.link ||
    null;

  let price = null;
  let currency = offer.currency || null;

  if (offer.price !== null && offer.price !== undefined) {
    if (typeof offer.price === "object") {
      price = Number(offer.price.price);
      if (offer.price.currency) currency = offer.price.currency;
    } else {
      price = Number(offer.price);
    }
  } else if (offer.amount !== null && offer.amount !== undefined) {
    price = Number(offer.amount);
  }

  if (!currency && offer.currency) {
    currency = offer.currency;
  }
  currency = currency || "USD";

  if (!merchant || !productUrl || price === null || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    merchant,
    price,
    currency,
    availability: offer.availability || "InStock",
    productUrl,
  };
}

export function extractNormalizedOffers(recommendationOrProduct) {
  if (!recommendationOrProduct) return [];
  const product = recommendationOrProduct.product || recommendationOrProduct;
  const rawOffers = Array.isArray(product?.offers)
    ? [...product.offers]
    : [];
  const chosen = recommendationOrProduct?.selectedOffer;
  if (chosen) {
    rawOffers.unshift(chosen);
  }

  const seenUrls = new Set();
  const result = [];

  for (const raw of rawOffers) {
    const opt = normalizeOffer(raw);
    if (!opt) continue;
    if (seenUrls.has(opt.productUrl)) continue;
    seenUrls.add(opt.productUrl);
    result.push(opt);
  }

  return result;
}

