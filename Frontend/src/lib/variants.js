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

export function normalizeProductVariants(product) {
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
      if (!selectedMap[opt.name] && Array.isArray(opt.values) && opt.values.length > 0) {
        const inStockVal = opt.values.find(
          (v) => v.exists !== false && v.available !== "OutOfStock"
        );
        selectedMap[opt.name] = inStockVal?.label || opt.values[0].label;
      }
    }

    const colorOption =
      rawOptions.find((opt) => /colou?r/i.test(opt.name)) || null;
    const sizeOption =
      rawOptions.find((opt) => /size|capacity|storage|memory/i.test(opt.name)) || null;
    const otherOptions = rawOptions.filter(
      (opt) => opt !== colorOption && opt !== sizeOption
    );

    return {
      hasVariants: true,
      isUcp: true,
      options: rawOptions,
      selectedMap,
      selectedList: rawSelected,
      colorOption,
      sizeOption,
      otherOptions,
      legacyVariants: [],
    };
  }

  // 2. Legacy flat array of variants: [{ id, label, thumbnailUrl, imageUrl }, ...]
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const legacyVariants = product.variants;
    const colorValues = legacyVariants.map((v, i) => ({
      label: v.name || v.label || `Option ${i + 1}`,
      exists: true,
      available: v.available === false ? "OutOfStock" : "InStock",
      thumbnailUrl: v.thumbnailUrl || v.imageUrl,
      imageUrl: v.imageUrl || v.thumbnailUrl,
      id: v.id || `var-${i}`,
    }));

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

