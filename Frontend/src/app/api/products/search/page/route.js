import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import channel3 from "@/lib/channel3";
import {
  CHANNEL3_SEARCH_PAGE_SIZE,
  mergeUniqueRecommendations,
  normalizeChannel3ImageData,
  toChannel3Recommendation,
} from "@/lib/channel3-products";

function jsonError(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function resolveAuthenticatedUser(request) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return { user: null, supabase: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase authentication is unavailable on the server.");
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    const authError = new Error("Your session has expired. Please sign in again.");
    authError.statusCode = 401;
    throw authError;
  }
  return { user: data.user, supabase };
}

async function persistAppendedProducts(supabase, user, localConversationId, recommendations) {
  if (!supabase || !user || !localConversationId || recommendations.length === 0) {
    return;
  }

  const { data: turn, error: readError } = await supabase
    .from("conversation_turns")
    .select("id,recommendations")
    .eq("conversation_id", localConversationId)
    .eq("user_id", user.id)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    console.warn("Could not load current history turn for paginated products:", readError.message);
    return;
  }
  if (!turn?.id) return;

  const merged = mergeUniqueRecommendations(
    Array.isArray(turn.recommendations) ? turn.recommendations : [],
    recommendations,
  );
  const { error: updateError } = await supabase
    .from("conversation_turns")
    .update({ recommendations: merged })
    .eq("id", turn.id)
    .eq("user_id", user.id);

  if (updateError) {
    console.warn("Could not persist paginated products in conversation history:", updateError.message);
  }
}

export async function POST(request) {
  try {
    if (!channel3) {
      return jsonError(
        "Channel3 is not configured. Set CHANNEL3_API_KEY or CHANNELV3_SECRET on the frontend server.",
        503,
      );
    }

    const body = await request.json();
    const query = String(body.query || "").trim().slice(0, 1200);
    const imageData =
      typeof body.imageData === "string" ? body.imageData : "";
    const pageToken =
      typeof body.pageToken === "string" ? body.pageToken.trim() : "";
    const limit = Math.min(
      Math.max(Number.parseInt(body.limit, 10) || CHANNEL3_SEARCH_PAGE_SIZE, 1),
      30,
    );
    const localConversationId = String(body.localConversationId || "").trim();

    if (!query && !imageData && !pageToken) {
      return jsonError("A search query, image, or Channel3 page token is required.");
    }
    if (pageToken.length > 8192) {
      return jsonError("The Channel3 page token is invalid or too large.");
    }
    if (imageData.length > 7_000_000) {
      return jsonError("The image is too large. Please upload an image under 5 MB.");
    }

    const { user, supabase } = await resolveAuthenticatedUser(request);
    const searchRequest = {
      limit,
      ...(query ? { query } : {}),
      ...(imageData
        ? { base64_image: normalizeChannel3ImageData(imageData) }
        : {}),
      ...(pageToken ? { page_token: pageToken } : {}),
      ...(user ? { "x-user-id": user.id } : {}),
    };

    // Channel3's cursor is opaque. The SDK forwards it as page_token and
    // returns the next cursor on page.response.next_page_token.
    const page = await channel3.products.search(searchRequest);
    const recommendations = (page.data || []).map((product, index) =>
      toChannel3Recommendation(product, index),
    );
    const nextPageToken =
      typeof page.response?.next_page_token === "string" &&
      page.response.next_page_token.length > 0
        ? page.response.next_page_token
        : null;

    await persistAppendedProducts(
      supabase,
      user,
      localConversationId,
      recommendations,
    );

    return NextResponse.json({
      success: true,
      recommendations,
      nextPageToken,
      hasMore: Boolean(nextPageToken),
    });
  } catch (error) {
    const status = error?.statusCode === 401 ? 401 : 502;
    console.error("Channel3 product pagination failed:", error);
    return jsonError(
      error?.message || "Could not load more products from Channel3.",
      status,
    );
  }
}
