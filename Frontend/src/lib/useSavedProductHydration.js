"use client";

import { useEffect, useRef } from "react";
import {
  createStoredLikedProduct,
  getStoredLikedProducts,
  getStoredLikedProductDetails,
  getStoredOrders,
} from "@/lib/storage";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const GENERIC_PRODUCT_NAMES = new Set([
  "accessories",
  "apparel",
  "bag",
  "bags",
  "clothes",
  "clothing",
  "electronics",
  "fashion",
  "footwear",
  "jacket",
  "jackets",
  "product",
  "products",
  "shirt",
  "shirts",
  "shoe",
  "shoes",
  "top",
  "tops",
]);

function isGenericProductName(value) {
  if (typeof value !== "string" || !value.trim()) return true;
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return (
    !normalized ||
    GENERIC_PRODUCT_NAMES.has(normalized) ||
    normalized.startsWith("product ")
  );
}

function buildRecommendationIndex(conversations) {
  const index = new Map();
  const recentConversations = [...(conversations || [])].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0),
  );

  for (const conversation of recentConversations) {
    for (const turn of [...(conversation.turns || [])].reverse()) {
      for (const recommendation of [...(turn.recommendations || [])].reverse()) {
        const id = recommendation?.product?.productId;
        if (id && !index.has(String(id))) {
          index.set(String(id), recommendation);
        }
      }
    }
  }

  return index;
}

function productSnapshot(product) {
  if (!product || typeof product !== "object") return null;
  return {
    source: product.source || null,
    productId: product.productId || null,
    name: product.name || product.title || product.productName || null,
    brand: product.brand || null,
    category: product.category || null,
    description: product.description || null,
    imageUrl:
      typeof product.imageUrl === "string" &&
      !product.imageUrl.trim().startsWith("data:")
        ? product.imageUrl
        : typeof product.images?.[0] === "string" &&
            !product.images[0].trim().startsWith("data:")
          ? product.images[0]
          : null,
    inStock: product.inStock,
    offers: Array.isArray(product.offers) ? product.offers.slice(0, 8) : [],
    variants: product.variants || null,
    images: Array.isArray(product.images) ? product.images.slice(0, 6) : [],
  };
}

/**
 * Repairs legacy wishlist/order records by recovering product snapshots from
 * saved conversations first, then looking up remaining Channel3 IDs.
 */
export function useSavedProductHydration({
  likedIds = [],
  likedProductDetails = {},
  saveLikedProductDetails,
  orders = [],
  saveOrders,
  conversations = [],
}) {
  const requestedIdsRef = useRef(new Set());

  useEffect(() => {
    const recommendationIndex = buildRecommendationIndex(conversations);
    const nextDetails = { ...likedProductDetails };
    let detailsChanged = false;
    const idsToFetch = new Set();

    for (const rawId of likedIds) {
      const id = String(rawId);
      const existingProduct = nextDetails[id]?.product;
      if (!existingProduct || isGenericProductName(existingProduct.name)) {
        const recommendation = recommendationIndex.get(id);
        const recovered = createStoredLikedProduct(recommendation);
        const recoveredProduct = recovered?.product;
        const shouldReplace =
          recoveredProduct &&
          (!existingProduct ||
            (isGenericProductName(existingProduct.name) &&
              (!isGenericProductName(recoveredProduct.name) ||
                (!existingProduct.imageUrl && recoveredProduct.imageUrl) ||
                (!existingProduct.description && recoveredProduct.description))));
        if (
          shouldReplace &&
          JSON.stringify(existingProduct) !== JSON.stringify(recoveredProduct)
        ) {
          nextDetails[id] = recovered;
          detailsChanged = true;
        }
        if (!recoveredProduct || isGenericProductName(recoveredProduct.name)) {
          idsToFetch.add(id);
        }
      }
    }

    if (detailsChanged) {
      saveLikedProductDetails(nextDetails);
    }

    let nextOrders = orders;
    let ordersChanged = false;
    nextOrders = (orders || []).map((order) => {
      let orderChanged = false;
      const items = (order.items || []).map((item) => {
        const id = item?.productId ? String(item.productId) : "";
        if (!id) return item;

        const currentName =
          item.name || item.productName || item.product?.name || "";
        if (isGenericProductName(currentName)) {
          const recommendation = recommendationIndex.get(id);
          const product = productSnapshot(recommendation?.product);
          if (product?.name && !isGenericProductName(product.name)) {
            orderChanged = true;
            return {
              ...item,
              name: product.name,
              productName: product.name,
              brand: item.brand || product.brand,
              imageUrl: item.imageUrl || product.imageUrl,
              product: { ...(item.product || {}), ...product },
            };
          }
          idsToFetch.add(id);
        }
        return item;
      });
      if (orderChanged) {
        ordersChanged = true;
        return { ...order, items };
      }
      return order;
    });

    if (ordersChanged) {
      saveOrders(nextOrders);
    }

    const unresolvedIds = [...idsToFetch].filter(
      (id) => !requestedIdsRef.current.has(id),
    );
    if (unresolvedIds.length === 0) return;

    unresolvedIds.forEach((id) => requestedIdsRef.current.add(id));

    void Promise.all(
      unresolvedIds.map(async (id) => {
        try {
          const response = await fetch(
            `${API_BASE}/api/products/${encodeURIComponent(id)}`,
          );
          if (!response.ok) return null;
          const data = await response.json();
          const product = data?.product || data?.data?.product || data?.data || data;
          const snapshot = productSnapshot(product);
          if (!snapshot?.productId || !snapshot.name) return null;
          return { id, product: snapshot };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      const resolved = new Map(
        results.filter(Boolean).map(({ id, product }) => [id, product]),
      );
      if (resolved.size === 0) return;

      const currentLikedIds = new Set(getStoredLikedProducts().map(String));
      const updatedDetails = { ...getStoredLikedProductDetails() };
      let hasDetailUpdates = false;
      for (const id of currentLikedIds) {
        const product = resolved.get(id);
        if (!product) continue;
        const saved = createStoredLikedProduct({
          product,
          selectedOffer: product.offers?.[0] || null,
        });
        if (saved) {
          updatedDetails[id] = saved;
          hasDetailUpdates = true;
        }
      }
      if (hasDetailUpdates) {
        saveLikedProductDetails(updatedDetails);
      }

      let hasOrderUpdates = false;
      const updatedOrders = getStoredOrders().map((order) => {
        let orderChanged = false;
        const items = (order.items || []).map((item) => {
          const id = item?.productId ? String(item.productId) : "";
          const product = resolved.get(id);
          if (!product) return item;

          const currentName =
            item.name || item.productName || item.product?.name || "";
          const nextName =
            !isGenericProductName(currentName) ||
            isGenericProductName(product.name)
              ? currentName
              : product.name;
          const updatedItem = {
            ...item,
            ...(nextName
              ? { name: nextName, productName: nextName }
              : {}),
            brand: item.brand || product.brand,
            imageUrl: item.imageUrl || product.imageUrl,
            product: { ...(item.product || {}), ...product },
          };

          if (
            updatedItem.name !== item.name ||
            updatedItem.productName !== item.productName ||
            updatedItem.brand !== item.brand ||
            updatedItem.imageUrl !== item.imageUrl ||
            !item.product
          ) {
            orderChanged = true;
          }
          return updatedItem;
        });
        if (orderChanged) {
          hasOrderUpdates = true;
          return { ...order, items };
        }
        return order;
      });
      if (hasOrderUpdates) {
        saveOrders(updatedOrders);
      }
    });
  }, [
    likedIds,
    likedProductDetails,
    saveLikedProductDetails,
    orders,
    saveOrders,
    conversations,
  ]);
}
