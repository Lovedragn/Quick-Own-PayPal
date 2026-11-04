// Helper for Local Storage persistence

const STORAGE_KEYS = {
  CART: "quickown_cart",
  LIKES: "quickown_liked_products",
  PAGINATION: "quickown_pagination",
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
  } catch (e) {
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

