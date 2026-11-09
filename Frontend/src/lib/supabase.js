import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://thzyahamwbizvpcwaszx.supabase.co";

const supabasePublishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
).trim();

function isValidSupabaseKey(value) {
  if (!value || value.includes("YOUR_") || value.includes("PLACEHOLDER")) {
    return false;
  }

  // Supabase supports the newer publishable-key format and legacy anon JWT keys.
  const publishableKey = /^sb_publishable_[A-Za-z0-9_-]{20,}$/;
  const legacyAnonKey = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  return publishableKey.test(value) || legacyAnonKey.test(value);
}

function isValidSupabaseUrl(value) {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabasePublishableKey),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // OAuth and email-confirmation codes are exchanged explicitly by /auth/callback.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

// ==========================================
// AUTH HELPERS
// ==========================================

function getAuthCallbackUrl() {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in must be started in the browser.");
  }
  return new URL("/auth/callback", window.location.origin).toString();
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error(
      "Supabase publishable key is missing or invalid. Copy the complete Publishable key (sb_publishable_...) or legacy anon key from Supabase Project Settings → API Keys into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the frontend.",
    );
  }

  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(),
    },
  });
}

function getSupabaseConfigurationError() {
  return new Error(
    "Supabase publishable key is missing or invalid. Copy the complete Publishable key (sb_publishable_...) or legacy anon key from Supabase Project Settings → API Keys into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the frontend.",
  );
}

export async function signInWithPassword(email, password) {
  if (!supabase) throw getSupabaseConfigurationError();
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpWithPassword(email, password) {
  if (!supabase) throw getSupabaseConfigurationError();
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
    },
  });
}

export async function signOutUser() {
  if (!supabase) return { error: null };
  return await supabase.auth.signOut();
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// ==========================================
// CHANNEL3 CONVERSATIONS SYNC HELPERS
// ==========================================

export async function fetchRemoteConversations(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data: convs, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (convError || !convs) {
      console.warn("Could not load conversations from Supabase:", convError?.message);
      return [];
    }

    if (convs.length === 0) return [];

    const convIds = convs.map((c) => c.id);
    const { data: turns, error: turnsError } = await supabase
      .from("conversation_turns")
      .select("*")
      .in("conversation_id", convIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (turnsError) {
      console.warn("Could not load turns from Supabase:", turnsError?.message);
    }

    const turnsByConv = (turns || []).reduce((acc, t) => {
      if (!acc[t.conversation_id]) acc[t.conversation_id] = [];
      acc[t.conversation_id].push({
        id: t.id,
        query: t.query || "",
        imageSearch: Boolean(t.image_search),
        status: t.status || "complete",
        createdAt: t.created_at,
        resultCount: Array.isArray(t.recommendations) ? t.recommendations.length : 0,
        recommendations: t.recommendations || [],
        assistantMessage: t.assistant_message || "",
        intent: t.intent || null,
        notice: t.notice || "",
        error: t.error || "",
      });
      return acc;
    }, {});

    return convs.map((c) => ({
      id: c.id,
      title: c.title || "Shopping conversation",
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      channel3ConversationId: c.channel3_conversation_id || null,
      turns: turnsByConv[c.id] || [],
    }));
  } catch (err) {
    console.error("fetchRemoteConversations error:", err);
    return [];
  }
}

export async function saveRemoteConversation(conversation, userId) {
  if (!supabase || !userId || !conversation?.id) return;
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from("conversations").upsert({
      id: conversation.id,
      user_id: userId,
      title: conversation.title || "Shopping conversation",
      updated_at: conversation.updatedAt || now,
      ...(conversation.channel3ConversationId
        ? { channel3_conversation_id: conversation.channel3ConversationId }
        : {}),
    });
    if (error) {
      console.error("Could not save conversation to Supabase:", error.message);
    }
  } catch (err) {
    console.error("saveRemoteConversation error:", err);
  }
}

// ==========================================
// WISHLIST + COMPLETED ORDER PERSISTENCE
// ==========================================

export async function fetchRemoteUserData(userId) {
  if (!supabase || !userId) {
    return { likedIds: [], likedProductDetails: {}, orders: [] };
  }

  const [wishlistResult, ordersResult] = await Promise.all([
    supabase
      .from("user_wishlist_items")
      .select("product_id,item_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_orders")
      .select("order_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (wishlistResult.error) {
    throw new Error(`Could not load wishlist from Supabase: ${wishlistResult.error.message}`);
  }
  if (ordersResult.error) {
    throw new Error(`Could not load orders from Supabase: ${ordersResult.error.message}`);
  }

  const likedProductDetails = {};
  const likedIds = [];
  for (const row of wishlistResult.data || []) {
    const productId = String(row.product_id || "");
    if (!productId) continue;
    likedIds.push(productId);
    likedProductDetails[productId] = row.item_data || {
      product: { productId },
      selectedOffer: null,
    };
  }

  const orders = (ordersResult.data || [])
    .map((row) => row.order_data)
    .filter((order) => order && order.orderId);

  return { likedIds, likedProductDetails, orders };
}

export async function syncRemoteWishlistSnapshot(userId, likedIds = [], likedProductDetails = {}) {
  if (!supabase || !userId) return;

  const normalizedIds = [...new Set((likedIds || []).map(String).filter(Boolean))];
  const { data: existingRows, error: readError } = await supabase
    .from("user_wishlist_items")
    .select("product_id")
    .eq("user_id", userId);
  if (readError) {
    console.error("Could not inspect Supabase wishlist:", readError.message);
    return;
  }

  const desired = new Set(normalizedIds);
  const staleIds = (existingRows || [])
    .map((row) => String(row.product_id))
    .filter((productId) => !desired.has(productId));

  for (const productId of staleIds) {
    const { error } = await supabase
      .from("user_wishlist_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (error) {
      console.error("Could not remove stale Supabase wishlist item:", error.message);
    }
  }

  if (normalizedIds.length === 0) return;

  const rows = normalizedIds.map((productId) => ({
    user_id: userId,
    product_id: productId,
    item_data: likedProductDetails[productId] || {
      product: { productId },
      selectedOffer: null,
    },
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from("user_wishlist_items")
    .upsert(rows, { onConflict: "user_id,product_id" });
  if (upsertError) {
    console.error("Could not sync Supabase wishlist:", upsertError.message);
  }
}

export async function saveRemoteOrder(first, second) {
  if (!supabase || !first || !second) return null;
  const userId = typeof first === "string" ? first : second;
  const order = typeof first === "string" ? second : first;
  const orderId = order?.orderId || order?.id;
  if (!userId || !orderId) return null;

  try {
    const { data, error } = await supabase.from("user_orders").upsert(
      {
        user_id: userId,
        order_id: String(orderId),
        order_data: order,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,order_id" },
    );
    if (error) {
      console.error("Could not save completed order to Supabase:", error.message);
      return null;
    }
    return data || order;
  } catch (err) {
    console.error("saveRemoteOrder unexpected error:", err);
    return null;
  }
}

export async function syncRemoteOrdersSnapshot(userId, orders = []) {
  if (!supabase || !userId || !Array.isArray(orders) || orders.length === 0) return;

  const rows = orders
    .filter((order) => order?.orderId)
    .map((order) => ({
      user_id: userId,
      order_id: String(order.orderId),
      order_data: order,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("user_orders")
    .upsert(rows, { onConflict: "user_id,order_id" });
  if (error) {
    console.error("Could not sync Supabase orders:", error.message);
  }
}

export async function deleteRemoteConversation(conversationId, userId) {
  if (!supabase || !userId || !conversationId) return;
  try {
    await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);
  } catch (err) {
    console.error("deleteRemoteConversation error:", err);
  }
}

export async function clearRemoteConversations(userId) {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from("conversations")
      .delete()
      .eq("user_id", userId);
  } catch (err) {
    console.error("clearRemoteConversations error:", err);
  }
}

// ==========================================
// CART SUPABASE HELPERS
// ==========================================

export async function fetchRemoteCart(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("user_carts")
      .select("items")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("fetchRemoteCart error:", error.message);
      return [];
    }
    return Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    console.error("fetchRemoteCart unexpected error:", err);
    return [];
  }
}

export async function saveRemoteCart(userId, items) {
  if (!supabase || !userId) return;
  try {
    const safeItems = Array.isArray(items) ? items : [];
    const { error } = await supabase.from("user_carts").upsert({
      user_id: userId,
      items: safeItems,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("saveRemoteCart error:", error.message);
    }
  } catch (err) {
    console.error("saveRemoteCart unexpected error:", err);
  }
}

// ==========================================
// WISHLIST / LIKES SUPABASE HELPERS
// ==========================================

export async function fetchRemoteWishlist(userId) {
  if (!supabase || !userId) return { likedIds: [], likedDetails: {} };
  try {
    const { data, error } = await supabase
      .from("user_wishlists")
      .select("liked_ids, liked_details")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("fetchRemoteWishlist error:", error.message);
      return { likedIds: [], likedDetails: {} };
    }
    return {
      likedIds: Array.isArray(data?.liked_ids) ? data.liked_ids : [],
      likedDetails:
        data?.liked_details && typeof data.liked_details === "object"
          ? data.liked_details
          : {},
    };
  } catch (err) {
    console.error("fetchRemoteWishlist unexpected error:", err);
    return { likedIds: [], likedDetails: {} };
  }
}

export async function saveRemoteWishlist(userId, likedIds, likedDetails) {
  if (!supabase || !userId) return;
  try {
    const safeIds = Array.isArray(likedIds) ? likedIds : [];
    const safeDetails =
      likedDetails && typeof likedDetails === "object" ? likedDetails : {};
    const { error } = await supabase.from("user_wishlists").upsert({
      user_id: userId,
      liked_ids: safeIds,
      liked_details: safeDetails,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("saveRemoteWishlist error:", error.message);
    }
  } catch (err) {
    console.error("saveRemoteWishlist unexpected error:", err);
  }
}

// ==========================================
// ORDERS SUPABASE HELPERS
// ==========================================

export async function fetchRemoteOrders(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("user_orders")
      .select("order_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("fetchRemoteOrders error:", error.message);
      return [];
    }
    return (data || []).map((row) => row.order_data).filter(Boolean);
  } catch (err) {
    console.error("fetchRemoteOrders unexpected error:", err);
    return [];
  }
}

