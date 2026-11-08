Channel3 keeps the conversation history, so your agent only has to track the conversation_id and re-send per-turn settings.

Rules your agent must follow:

Omit conversation_id on turn 1, then save the one returned and send it on every later turn.
Send context only on turn 1. Sending it again returns 422.
Re-send filters and config.collection_id on every turn that needs them. Filters apply to that turn only.
Run one turn at a time per conversation. A second one returns 409.
A failed turn saves no assistant message.
// Turn 1: no conversation_id, context allowed
const stream = await client.conversations.createTurnStream({
message: { role: "user", parts: [{ type: "text", text }] },
context: { user_context: "Budget under $200", application_context: "Shopping agent" },
});
// Save the conversation_id from the response, keyed by user.

// Later turns
await client.conversations.createTurnStream({
message: { role: "user", parts: [{ type: "text", text }] },
conversation_id: savedId,
});

// Restore history after a refresh (newest first, free call)
const page = await client.conversations.retrieve({ conversation_id: savedId, limit: 50 });
I didn't find in what I read where the conversation_id appears in the stream. Check Streaming Events for that.

Streaming Events
Messages and Parts
Errors
