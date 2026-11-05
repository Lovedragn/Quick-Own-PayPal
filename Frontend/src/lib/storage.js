// Helper for Local Storage persistence

const STORAGE_KEYS = {
  CART: "quickown_cart",
  LIKES: "quickown_liked_products",
  PAGINATION: "quickown_pagination",
  QUANTITIES: "quickown_quantities",
  ORDERS: "quickown_orders",
  PENDING_CHECKOUT: "quickown_pending_checkout",
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
