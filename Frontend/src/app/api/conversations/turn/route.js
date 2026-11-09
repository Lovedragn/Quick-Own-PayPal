import { NextResponse } from "next/server";
import { Channel3 } from "@channel3/sdk";
import { createClient } from "@supabase/supabase-js";

const channel3ApiKey =
  process.env.CHANNELV3_SECRET || process.env.CHANNEL3_API_KEY || "";
const channel3 = channel3ApiKey ? new Channel3({ apiKey: channel3ApiKey }) : null;

// Prevent overlapping turns for one conversation within this server process.
// Channel3 also rejects concurrent turns with HTTP 409 across server instances.
const activeTurns = new Set();

function jsonError(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function buildSupabaseClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured for conversation memory.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

// One-time migration bridge for Supabase-only conversations created before
// Channel3 thread IDs were stored. Once a Channel3 thread exists, later turns
// use its conversation_id and Channel3 owns all ongoing conversational memory.
function buildLegacyConversationContext(turns = []) {
  return turns
    .filter((turn) => turn?.status !== "error")
    .slice(-12)
    .map((turn, index) => {
      const shopper = String(turn.query || "").trim().slice(0, 800);
      const assistant = String(turn.assistant_message || "").trim().slice(0, 1200);
      const products = (Array.isArray(turn.recommendations) ? turn.recommendations : [])
        .slice(0, 5)
        .map((item) => {
          const product = item?.product || {};
          const offer = item?.selectedOffer || product?.offers?.[0] || {};
          const title = product.name || product.title || "Product";
          const brand = product.brand ? ` by ${product.brand}` : "";
          const price = offer.price
            ? ` — ${offer.price} ${offer.currency || ""}`
            : "";
          return `${title}${brand}${price}`;
        });
      return [
        `Turn ${index + 1}`,
        shopper ? `Shopper: ${shopper}` : "Shopper: image search",
        assistant ? `Assistant: ${assistant}` : "",
        products.length ? `Products previously shown: ${products.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n")
    .slice(-9000);
}

function extractProductsFromParts(parts, target) {
  if (!Array.isArray(parts)) return;
  for (const part of parts) {
    if (part?.type !== "tool") continue;
    const output = part.output;
    const products = Array.isArray(output?.products)
      ? output.products
      : Array.isArray(output?.data?.products)
        ? output.data.products
        : [];
    for (const product of products) {
      if (product?.id && product?.title) target.set(product.id, product);
    }
  }
}

function toRecommendation(product, index, assistantText) {
  const rawOffers = Array.isArray(product.offers) ? product.offers : [];
  const offers = rawOffers.map((offer) => ({
    merchantDomain: offer.domain || "Store",
    price: offer.price || null,
    currency: offer.price?.currency || "USD",
    productUrl: offer.url || "",
    availability: offer.availability || "InStock",
    inStock: offer.availability !== "OutOfStock",
  }));
  const selectedOffer = offers[0] || null;
  const imageObjects = Array.isArray(product.images) ? product.images : [];
  const imageUrl =
    imageObjects.find((image) => image?.is_main_image)?.cleaned_url ||
    imageObjects.find((image) => image?.cleaned_url)?.cleaned_url ||
    imageObjects[0]?.url ||
    "";
  const matchedFeatures = Array.isArray(product.key_features)
    ? product.key_features.slice(0, 8)
    : [];

  return {
    rank: index + 1,
    product: {
      source: "CHANNEL3",
      productId: product.id,
      name: product.title || "Product",
      brand: product.brands?.[0]?.name || "",
      category: product.category?.title || product.category?.slug || "",
      description: product.description || "",
      imageUrl,
      images: imageObjects,
      inStock: offers.some((offer) => offer.inStock),
      offers,
      variants: product.variants || null,
    },
    selectedOffer,
    matchedFeatureCount: matchedFeatures.length || 1,
    matchedFeatures,
    explanation:
      assistantText ||
      "Recommended from Channel3's live product catalogue.",
  };
}

export async function POST(request) {
  let lockKey = null;
  let lockAcquired = false;

  try {
    if (!channel3) {
      return jsonError(
        "Channel3 is not configured. Set CHANNEL3_API_KEY or CHANNELV3_SECRET on the frontend server.",
        503,
      );
    }

    const body = await request.json();
    const message = String(body.message || "").trim();
    const imageData = typeof body.imageData === "string" ? body.imageData : "";
    const localConversationId = String(body.localConversationId || "").trim();
    const title = String(body.title || "Shopping conversation").slice(0, 64);
    const accessToken =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

    if (!message && !imageData) {
      return jsonError("Enter a product request or provide an image.");
    }
    if (!localConversationId) {
      return jsonError("A conversation ID is required to save shopping history.");
    }
    if (imageData.length > 7_000_000) {
      return jsonError("The image is too large. Please upload an image under 5 MB.");
    }

    let supabase = null;
    let user = null;
    let conversationRow = null;
    let previousTurns = [];

    if (accessToken) {
      supabase = buildSupabaseClient(accessToken);
      const { data: userResult, error: authError } =
        await supabase.auth.getUser(accessToken);
      if (authError || !userResult?.user) {
        return jsonError("Your session has expired. Please sign in again.", 401);
      }
      user = userResult.user;

      const now = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from("conversations")
        .upsert(
          {
            id: localConversationId,
            user_id: user.id,
            title,
            updated_at: now,
          },
          { onConflict: "id" },
        );
      if (upsertError) {
        return jsonError(
          `Could not prepare Supabase conversation history: ${upsertError.message}`,
          500,
        );
      }

      const { data: row, error: rowError } = await supabase
        .from("conversations")
        .select("id, channel3_conversation_id")
        .eq("id", localConversationId)
        .eq("user_id", user.id)
        .single();

      if (rowError) {
        const missingColumn =
          rowError.code === "42703" ||
          rowError.code === "PGRST204" ||
          /channel3_conversation_id/i.test(rowError.message || "");
        return jsonError(
          missingColumn
            ? "Supabase is missing the Channel3 conversation mapping column. Apply documentation/supabase_channel3_memory.sql, then retry."
            : `Could not load this conversation from Supabase: ${rowError.message}`,
          500,
        );
      }
      conversationRow = row;

      const { data: turns, error: turnsError } = await supabase
        .from("conversation_turns")
        .select("query,recommendations,status,assistant_message")
        .eq("conversation_id", localConversationId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(12);

      if (turnsError) {
        return jsonError(
          `Could not load previous shopping turns from Supabase: ${turnsError.message}`,
          500,
        );
      }
      previousTurns = turns || [];
    } else {
      previousTurns = Array.isArray(body.previousTurns)
        ? body.previousTurns.slice(-12)
        : [];
    }

    // Channel3 owns the full transcript once a thread exists. For an older
    // Supabase-only conversation, seed its history as context on the first turn.
    const resolvedExistingConversationId = user
      ? conversationRow?.channel3_conversation_id || ""
      : String(body.channel3ConversationId || "").trim();

    lockKey = `${user?.id || "guest"}:${localConversationId}`;
    if (activeTurns.has(lockKey)) {
      return jsonError(
        "A search is already running in this conversation. Please wait for it to finish.",
        409,
      );
    }
    activeTurns.add(lockKey);
    lockAcquired = true;

    const parts = [];
    if (message) parts.push({ type: "text", text: message });
    if (imageData) parts.push({ type: "image", url: imageData });

    const requestBody = {
      message: { role: "user", parts },
      ...(resolvedExistingConversationId
        ? { conversation_id: resolvedExistingConversationId }
        : {
            context: {
              user_context: buildLegacyConversationContext(previousTurns) || undefined,
              application_context:
                "You are the shopping agent inside Quick-Own. Use Channel3 catalogue tools to find real products and live merchant offers. Respect the shopper's complete conversation context, including earlier budget, brand, size, use-case and refinement constraints, unless the shopper explicitly changes them. Do not invent products, prices, availability or merchant offers.",
            },
          }),
      ...(user ? { "x-user-id": user.id } : {}),
    };

    // Channel3 currently does not accept IN/INR. Country and currency are
    // optional in the SDK; omitting them lets Channel3 use its documented
    // pan-region default (USD) instead of rejecting the conversation with 422.
    const stream = await channel3.conversations.createTurnStream(requestBody);

    let channel3ConversationId = resolvedExistingConversationId || null;
    let completed = false;
    let assistantText = "";
    const productsById = new Map();

    for await (const event of stream) {
      if (event.type === "turn.started") {
        channel3ConversationId = event.conversation_id;
        if (supabase && user && channel3ConversationId) {
          const { error: mappingError } = await supabase
            .from("conversations")
            .update({
              channel3_conversation_id: channel3ConversationId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", localConversationId)
            .eq("user_id", user.id);
          if (mappingError) {
            throw new Error(
              `Channel3 started, but Supabase could not save its conversation ID: ${mappingError.message}`,
            );
          }
        }
      } else if (event.type === "part.completed") {
        extractProductsFromParts([event.part], productsById);
      } else if (event.type === "turn.completed") {
        completed = true;
        const messageParts = event.message?.parts || [];
        assistantText = messageParts
          .filter((part) => part?.type === "text" && part.text)
          .map((part) => part.text)
          .join("\n")
          .trim();
        extractProductsFromParts(messageParts, productsById);
      } else if (event.type === "error") {
        throw new Error(
          event.message || event.code || "Channel3 could not complete this shopping turn.",
        );
      }
    }

    if (!completed || !channel3ConversationId) {
      throw new Error("Channel3 ended the stream before completing the conversation turn.");
    }

    const rawProducts = Array.from(productsById.values()).slice(0, 10);
    const recommendations = rawProducts.map((product, index) =>
      toRecommendation(product, index, assistantText),
    );
    const intent = {
      intentSummary: "Channel3 conversational product search",
      searchQuery: message,
      category: rawProducts[0]?.category?.title || "Shopping",
      constraints: [],
    };
    const notice = recommendations.length
      ? `Channel3 found ${recommendations.length} product options.`
      : assistantText || "Channel3 did not find matching products. Try refining your request.";

    // Persist the completed user/assistant turn on the server before returning
    // so a browser close cannot lose the Supabase history entry.
    if (supabase && user) {
      const now = new Date().toISOString();
      const { error: historyError } = await supabase
        .from("conversation_turns")
        .insert({
          conversation_id: localConversationId,
          user_id: user.id,
          query: message,
          image_search: Boolean(imageData),
          status: "complete",
          recommendations,
          intent,
          notice,
          error: "",
          assistant_message: assistantText,
          created_at: now,
        });
      if (historyError) {
        throw new Error(
          `Channel3 completed the turn, but Supabase could not save the conversation history: ${historyError.message}`,
        );
      }

      const { error: timestampError } = await supabase
        .from("conversations")
        .update({ updated_at: now, title })
        .eq("id", localConversationId)
        .eq("user_id", user.id);
      if (timestampError) {
        console.error("Could not update Supabase conversation timestamp:", timestampError.message);
      }
    }

    return NextResponse.json({
      success: true,
      conversationId: localConversationId,
      channel3ConversationId,
      assistantMessage: assistantText,
      recommendations,
      intent,
      notice,
    });
  } catch (error) {
    const status = error?.statusCode || error?.status || 500;
    const safeStatus = status === 409 ? 409 : status === 401 ? 401 : 502;
    console.error("Channel3 conversation turn failed:", error);
    return jsonError(
      error?.message || "Channel3 could not process this shopping conversation.",
      safeStatus,
    );
  } finally {
    if (lockAcquired && lockKey) activeTurns.delete(lockKey);
  }
}
