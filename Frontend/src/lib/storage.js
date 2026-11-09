// Storage helpers - Cart, Wishlist, Orders stored in memory & synced with Supabase (NOT local storage)

const STORAGE_KEYS = {
  PAGINATION: "quickown_pagination",
  QUANTITIES: "quickown_quantities",
  PENDING_CHECKOUT: "quickown_pending_checkout",
  CONVERSATIONS: "quickown_conversations",
  ACTIVE_CONVERSATION: "quickown_active_conversation",
};

// In-memory state for Cart, Wishlist, and Orders
let memoryCart = [];
let memoryLikes = [];
let memoryLikedProductDetails = {};
let memoryOrders = [];

// Clean up any legacy localStorage items if present
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("quickown_cart");
    localStorage.removeItem("quickown_liked_products");
    localStorage.removeItem("quickown_liked_product_details");
    localStorage.removeItem("quickown_orders");
  } catch {}
}

export function getStoredCart() {
  return memoryCart;
}

export function saveStoredCart(cart) {
  memoryCart = Array.isArray(cart) ? [...cart] : [];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("quickown_cart_updated"));
  }
}

export function getStoredLikedProducts() {
  return memoryLikes;
}

export function saveStoredLikedProducts(likedIds) {
  memoryLikes = Array.isArray(likedIds) ? [...likedIds] : [];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("quickown_likes_updated"));
  }
}

export function getStoredLikedProductDetails() {
  return memoryLikedProductDetails;
}

export function saveStoredLikedProductDetails(details) {
  memoryLikedProductDetails =
    details && typeof details === "object" && !Array.isArray(details)
      ? { ...details }
      : {};
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("quickown_liked_product_details_updated"));
  }
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
  return memoryOrders;
}

export function saveStoredOrders(orders) {
  memoryOrders = Array.isArray(orders) ? [...orders] : [];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("quickown_orders_updated"));
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
