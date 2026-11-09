import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://thzyahamwbizvpcwaszx.supabase.co";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    supabasePublishableKey !== "YOUR_SUPABASE_PUBLISHABLE_KEY"
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ==========================================
// AUTH HELPERS
// ==========================================

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local"
    );
  }
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });
}

export async function signInWithPassword(email, password) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local"
    );
  }
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpWithPassword(email, password) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local"
    );
  }
  return await supabase.auth.signUp({
    email,
    password,
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

export async function saveRemoteOrder(order, userId) {
  if (!supabase || !userId || !order?.orderId) return;
  const { error } = await supabase.from("user_orders").upsert(
    {
      user_id: userId,
      order_id: String(order.orderId),
      order_data: order,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,order_id" },
  );
  if (error) {
    console.error("Could not save completed order to Supabase:", error.message);
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

