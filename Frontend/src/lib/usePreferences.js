import { useSyncExternalStore } from "react";
import {
  getStoredCart,
  saveStoredCart,
  getStoredLikedProducts,
  saveStoredLikedProducts,
  getStoredLikedProductDetails,
  saveStoredLikedProductDetails,
  getStoredPagination,
  saveStoredPagination,
  getStoredQuantities,
  saveStoredQuantities,
  getStoredOrders,
  saveStoredOrders,
  saveStoredConversations,
  saveStoredActiveConversationId,
} from "@/lib/storage";
import {
  supabase,
  fetchRemoteCart,
  saveRemoteCart,
  fetchRemoteWishlist,
  saveRemoteWishlist,
  fetchRemoteOrders,
  saveRemoteOrder,
} from "@/lib/supabase";

let activeUserId = null;

async function syncFromSupabase(userId) {
  if (!userId) return;
  try {
    const [cart, wishlist, orders] = await Promise.all([
      fetchRemoteCart(userId),
      fetchRemoteWishlist(userId),
      fetchRemoteOrders(userId),
    ]);
    if (Array.isArray(cart)) {
      saveStoredCart(cart);
    }
    if (wishlist) {
      saveStoredLikedProducts(wishlist.likedIds || []);
      saveStoredLikedProductDetails(wishlist.likedDetails || {});
    }
    if (Array.isArray(orders)) {
      saveStoredOrders(orders);
    }
  } catch (err) {
    console.error("Failed to sync from Supabase:", err);
  }
}

if (typeof window !== "undefined" && supabase) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user;
    if (user) {
      activeUserId = user.id;
      void syncFromSupabase(user.id);
    }
  });

  supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user;
    if (user) {
      activeUserId = user.id;
      await syncFromSupabase(user.id);
    } else {
      activeUserId = null;
      saveStoredCart([]);
      saveStoredLikedProducts([]);
      saveStoredLikedProductDetails({});
      saveStoredOrders([]);
    }
  });
}

function subscribeCart(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("quickown_cart_updated", callback);
  return () => {
    window.removeEventListener("quickown_cart_updated", callback);
  };
}

function subscribeLikes(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("quickown_likes_updated", callback);
  return () => {
    window.removeEventListener("quickown_likes_updated", callback);
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
  return () => {
    window.removeEventListener("quickown_orders_updated", callback);
  };
}

let emptyCart = [];
export function useCartPreference() {
  const cart = useSyncExternalStore(
    subscribeCart,
    getStoredCart,
    () => emptyCart,
  );

  const saveCart = (nextCart) => {
    saveStoredCart(nextCart);
    if (activeUserId) {
      void saveRemoteCart(activeUserId, nextCart);
    }
  };

  return [cart, saveCart];
}

let emptyLikes = [];
export function useLikesPreference() {
  const likes = useSyncExternalStore(
    subscribeLikes,
    getStoredLikedProducts,
    () => emptyLikes,
  );

  const saveLikes = (nextLikes) => {
    saveStoredLikedProducts(nextLikes);
    if (activeUserId) {
      void saveRemoteWishlist(
        activeUserId,
        nextLikes,
        getStoredLikedProductDetails(),
      );
    }
  };

  return [likes, saveLikes];
}

let emptyDetails = {};
export function useLikedProductDetailsPreference() {
  const details = useSyncExternalStore(
    (callback) =>
      subscribeLocalPreference(
        "quickown_liked_product_details_updated",
        callback,
      ),
    getStoredLikedProductDetails,
    () => emptyDetails,
  );

  const saveDetails = (nextDetails) => {
    saveStoredLikedProductDetails(nextDetails);
    if (activeUserId) {
      void saveRemoteWishlist(
        activeUserId,
        getStoredLikedProducts(),
        nextDetails,
      );
    }
  };

  return [details, saveDetails];
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
  const orders = useSyncExternalStore(
    subscribeOrders,
    getStoredOrders,
    () => emptyOrders,
  );

  const saveOrders = (nextOrders) => {
    saveStoredOrders(nextOrders);
    if (activeUserId && Array.isArray(nextOrders)) {
      nextOrders.forEach((o) => {
        void saveRemoteOrder(activeUserId, o);
      });
    }
  };

  return [orders, saveOrders];
}


function subscribeLocalPreference(eventName, callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function parseStoredArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useConversationsPreference() {
  const conversationsJson = useSyncExternalStore(
    (callback) =>
      subscribeLocalPreference("quickown_conversations_updated", callback),
    () =>
      typeof window === "undefined"
        ? "[]"
        : localStorage.getItem("quickown_conversations") || "[]",
    () => "[]",
  );
  return [
    parseStoredArray(conversationsJson),
    saveStoredConversations,
  ];
}

export function useActiveConversationPreference() {
  const conversationId = useSyncExternalStore(
    (callback) =>
      subscribeLocalPreference(
        "quickown_active_conversation_updated",
        callback,
      ),
    () =>
      typeof window === "undefined"
        ? null
        : localStorage.getItem("quickown_active_conversation"),
    () => null,
  );
  return [conversationId, saveStoredActiveConversationId];
}
