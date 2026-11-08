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
    await supabase.from("conversations").upsert({
      id: conversation.id,
      user_id: userId,
      title: conversation.title || "Shopping conversation",
      updated_at: conversation.updatedAt || now,
    });
  } catch (err) {
    console.error("saveRemoteConversation error:", err);
  }
}

export async function saveRemoteTurn(turnData, conversationId, userId) {
  if (!supabase || !userId || !conversationId) return;
  try {
    const now = new Date().toISOString();
    await supabase.from("conversations").upsert({
      id: conversationId,
      user_id: userId,
      updated_at: now,
    });

    await supabase.from("conversation_turns").insert({
      conversation_id: conversationId,
      user_id: userId,
      query: turnData.query || "",
      image_search: Boolean(turnData.imageSearch),
      status: turnData.status || "complete",
      recommendations: turnData.recommendations || [],
      intent: turnData.intent || null,
      notice: turnData.notice || "",
      error: turnData.error || "",
      created_at: turnData.createdAt || now,
    });
  } catch (err) {
    console.error("saveRemoteTurn error:", err);
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

