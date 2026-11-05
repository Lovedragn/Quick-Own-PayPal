import { useSyncExternalStore } from "react";
import {
  getStoredCart,
  saveStoredCart,
  getStoredLikedProducts,
  saveStoredLikedProducts,
  getStoredPagination,
  saveStoredPagination,
  getStoredQuantities,
  saveStoredQuantities,
  getStoredOrders,
  saveStoredOrders,
} from "@/lib/storage";

function subscribeCart(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("quickown_cart_updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("quickown_cart_updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeLikes(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("quickown_likes_updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("quickown_likes_updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeQuantities(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("quickown_quantities_updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("quickown_quantities_updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeOrders(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("quickown_orders_updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("quickown_orders_updated", callback);
    window.removeEventListener("storage", callback);
  };
}

let emptyCart = [];
export function useCartPreference() {
  const cartJson = useSyncExternalStore(
    subscribeCart,
    () => {
      if (typeof window === "undefined") return "[]";
      return localStorage.getItem("quickown_cart") || "[]";
    },
    () => "[]"
  );

  let cart = emptyCart;
  try {
    cart = JSON.parse(cartJson);
  } catch {
    cart = emptyCart;
  }

  return [cart, saveStoredCart];
}

let emptyLikes = [];
export function useLikesPreference() {
  const likesJson = useSyncExternalStore(
    subscribeLikes,
    () => {
      if (typeof window === "undefined") return "[]";
      return localStorage.getItem("quickown_liked_products") || "[]";
    },
    () => "[]"
  );

  let likes = emptyLikes;
  try {
    likes = JSON.parse(likesJson);
  } catch {
    likes = emptyLikes;
  }

  return [likes, saveStoredLikedProducts];
}

let emptyQuantities = {};
export function useQuantitiesPreference() {
  const quantitiesJson = useSyncExternalStore(
    subscribeQuantities,
    () => {
      if (typeof window === "undefined") return "{}";
      return localStorage.getItem("quickown_quantities") || "{}";
    },
    () => "{}"
  );

  let quantities = emptyQuantities;
  try {
    quantities = JSON.parse(quantitiesJson);
  } catch {
    quantities = emptyQuantities;
  }

  return [quantities, saveStoredQuantities];
}

let emptyOrders = [];
export function useOrdersPreference() {
  const ordersJson = useSyncExternalStore(
    subscribeOrders,
    () => {
      if (typeof window === "undefined") return "[]";
      return localStorage.getItem("quickown_orders") || "[]";
    },
    () => "[]"
  );

  let orders = emptyOrders;
  try {
    orders = JSON.parse(ordersJson);
  } catch {
    orders = emptyOrders;
  }

  return [orders, saveStoredOrders];
}
