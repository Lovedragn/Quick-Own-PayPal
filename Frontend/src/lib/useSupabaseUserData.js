"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchRemoteUserData,
  syncRemoteOrdersSnapshot,
  syncRemoteWishlistSnapshot,
} from "@/lib/supabase";

function mergeOrders(remoteOrders = [], localOrders = []) {
  const byId = new Map();
  for (const order of [...remoteOrders, ...localOrders]) {
    if (order?.orderId) byId.set(String(order.orderId), order);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
  );
}

/**
 * Hydrates a signed-in user's wishlist and completed orders from Supabase,
 * migrates this browser's first local snapshot once, then keeps Supabase synced.
 */
export function useSupabaseUserData({
  userId,
  likedIds = [],
  saveLikes,
  likedProductDetails = {},
  saveLikedProductDetails,
  orders = [],
  saveOrders,
}) {
  const [readyUserId, setReadyUserId] = useState(null);
  const pendingInitialSyncRef = useRef(null);

  useEffect(() => {
    if (!userId) return undefined;

    let active = true;

    async function hydrate() {
      try {
        const remote = await fetchRemoteUserData(userId);
        if (!active) return;

        let localOwner = null;
        try {
          localOwner = localStorage.getItem("quickown_data_owner");
        } catch {}

        // Unassigned local data may be migrated to the first signed-in account.
        // Data owned by a different account is never copied into this account.
        const mayMigrateLocal = !localOwner || localOwner === userId;
        const mergedLikedIds = mayMigrateLocal
          ? [...new Set([...(remote.likedIds || []), ...likedIds.map(String)])]
          : remote.likedIds || [];
        const mergedDetails = mayMigrateLocal
          ? { ...remote.likedProductDetails, ...likedProductDetails }
          : remote.likedProductDetails;
        const mergedOrders = mayMigrateLocal
          ? mergeOrders(remote.orders, orders)
          : remote.orders || [];

        pendingInitialSyncRef.current = {
          userId,
          likedIds: JSON.stringify([...mergedLikedIds].map(String).sort()),
          details: JSON.stringify(mergedDetails || {}),
          orders: JSON.stringify(mergedOrders || []),
        };

        saveLikes?.(mergedLikedIds);
        saveLikedProductDetails?.(mergedDetails);
        saveOrders?.(mergedOrders);

        try {
          localStorage.setItem("quickown_data_owner", userId);
        } catch {}

        setReadyUserId(userId);
      } catch (error) {
        console.error("Could not hydrate signed-in user data:", error);
      }
    }

    void hydrate();

    return () => {
      active = false;
    };
    // This load should happen once when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const likedIdsSignature = JSON.stringify(
    [...(likedIds || [])].map(String).sort(),
  );
  const detailsSignature = JSON.stringify(likedProductDetails || {});
  const ordersSignature = JSON.stringify(orders || []);

  useEffect(() => {
    if (!userId || readyUserId !== userId) return;

    const initialSnapshot = pendingInitialSyncRef.current;
    if (initialSnapshot?.userId === userId) {
      const matchesInitialSnapshot =
        initialSnapshot.likedIds === likedIdsSignature &&
        initialSnapshot.details === detailsSignature &&
        initialSnapshot.orders === ordersSignature;
      if (!matchesInitialSnapshot) return;
      pendingInitialSyncRef.current = null;
    }

    void syncRemoteWishlistSnapshot(
      userId,
      JSON.parse(likedIdsSignature),
      JSON.parse(detailsSignature),
    );
    void syncRemoteOrdersSnapshot(userId, JSON.parse(ordersSignature));
  }, [
    userId,
    readyUserId,
    likedIdsSignature,
    detailsSignature,
    ordersSignature,
  ]);

  return { ready: Boolean(userId && readyUserId === userId) };
}
