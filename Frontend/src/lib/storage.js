// Helper for Local Storage persistence

const STORAGE_KEYS = {
  CART: "quickown_cart",
  LIKES: "quickown_liked_products",
  LIKED_PRODUCT_DETAILS: "quickown_liked_product_details",
  PAGINATION: "quickown_pagination",
  QUANTITIES: "quickown_quantities",
  ORDERS: "quickown_orders",
  PENDING_CHECKOUT: "quickown_pending_checkout",
  CONVERSATIONS: "quickown_conversations",
  ACTIVE_CONVERSATION: "quickown_active_conversation",
};

export function getStoredCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read cart from local storage", e);
    return [];
  }
}

export function saveStoredCart(cart) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    window.dispatchEvent(new Event("quickown_cart_updated"));
  } catch (e) {
    console.error("Failed to save cart to local storage", e);
  }
}

export function getStoredLikedProducts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIKES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read likes from local storage", e);
    return [];
  }
}

export function saveStoredLikedProducts(likedIds) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(likedIds));
    window.dispatchEvent(new Event("quickown_likes_updated"));
  } catch (e) {
    console.error("Failed to save likes to local storage", e);
  }
}

export function getStoredLikedProductDetails() {
  const details = getStoredJson(STORAGE_KEYS.LIKED_PRODUCT_DETAILS, {});
  return details && typeof details === "object" && !Array.isArray(details)
    ? details
    : {};
}

export function saveStoredLikedProductDetails(details) {
  const safeDetails =
    details && typeof details === "object" && !Array.isArray(details)
      ? details
      : {};
  saveStoredJson(
    STORAGE_KEYS.LIKED_PRODUCT_DETAILS,
    safeDetails,
    "quickown_liked_product_details_updated",
  );
}

export function createStoredLikedProduct(recommendation) {
  const product = recommendation?.product;
  if (!product?.productId) return null;

  const safeImageUrl = (value) =>
    typeof value === "string" && !value.trim().startsWith("data:")
      ? value
      : null;

  return {
    product: {
      source: product.source || null,
      productId: product.productId,
      name: product.name || product.title || product.productName || "Unnamed product",
      brand: product.brand || null,
      category: product.category || null,
      description: product.description || null,
      imageUrl: safeImageUrl(product.imageUrl) || safeImageUrl(product.images?.[0]),
      inStock: product.inStock,
      offers: Array.isArray(product.offers) ? product.offers.slice(0, 8) : [],
      variants: product.variants || null,
      images: Array.isArray(product.images)
        ? product.images.slice(0, 6).filter((image) =>
            typeof image === "string" ? safeImageUrl(image) : image,
          )
        : [],
    },
    selectedOffer: recommendation.selectedOffer || null,
    matchedFeatureCount: recommendation.matchedFeatureCount || 0,
    matchedFeatures: Array.isArray(recommendation.matchedFeatures)
      ? recommendation.matchedFeatures.slice(0, 10)
      : [],
    explanation: recommendation.explanation || "",
  };
}

export function getStoredPagination() {
  if (typeof window === "undefined") return { page: 1, pageSize: 8 };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAGINATION);
    return raw ? JSON.parse(raw) : { page: 1, pageSize: 8 };
  } catch {
    return { page: 1, pageSize: 8 };
  }
}

export function saveStoredPagination(pagination) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PAGINATION, JSON.stringify(pagination));
  } catch (e) {
    console.error("Failed to save pagination to local storage", e);
  }
}

export function getStoredQuantities() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUANTITIES);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to read quantities from local storage", e);
    return {};
  }
}

export function saveStoredQuantities(quantities) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.QUANTITIES, JSON.stringify(quantities));
    window.dispatchEvent(new Event("quickown_quantities_updated"));
  } catch (e) {
    console.error("Failed to save quantities to local storage", e);
  }
}

export function getStoredOrders() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read orders from local storage", e);
    return [];
  }
}

export function saveStoredOrders(orders) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new Event("quickown_orders_updated"));
  } catch (e) {
    console.error("Failed to save orders to local storage", e);
  }
}

export function getStoredPendingCheckout() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_CHECKOUT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredPendingCheckout(checkoutInfo) {
  if (typeof window === "undefined") return;
  try {
    if (!checkoutInfo) {
      localStorage.removeItem(STORAGE_KEYS.PENDING_CHECKOUT);
    } else {
      localStorage.setItem(STORAGE_KEYS.PENDING_CHECKOUT, JSON.stringify(checkoutInfo));
    }
  } catch (e) {
    console.error("Failed to save pending checkout to local storage", e);
  }
}


function getStoredJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key} from local storage`, error);
    return fallback;
  }
}

function saveStoredJson(key, value, eventName) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(eventName));
  } catch (error) {
    console.error(`Failed to save ${key} to local storage`, error);
  }
}

export function getStoredConversations() {
  const conversations = getStoredJson(STORAGE_KEYS.CONVERSATIONS, []);
  return Array.isArray(conversations) ? conversations : [];
}

export function saveStoredConversations(conversations) {
  const safeConversations = Array.isArray(conversations)
    ? conversations.slice(0, 40)
    : [];
  saveStoredJson(
    STORAGE_KEYS.CONVERSATIONS,
    safeConversations,
    "quickown_conversations_updated",
  );
}

export function getStoredActiveConversationId() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION) || null;
  } catch {
    return null;
  }
}

export function saveStoredActiveConversationId(conversationId) {
  if (typeof window === "undefined") return;
  try {
    if (conversationId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, conversationId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
    }
    window.dispatchEvent(new Event("quickown_active_conversation_updated"));
  } catch (error) {
    console.error("Failed to save active conversation", error);
  }
}
