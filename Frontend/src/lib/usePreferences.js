import { useSyncExternalStore } from "react";
import {
  getStoredCart,
  saveStoredCart,
  getStoredLikedProducts,
  saveStoredLikedProducts,
  getStoredPagination,
  saveStoredPagination,
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

