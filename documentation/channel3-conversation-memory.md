# Channel3 conversation continuity and Supabase user data

Quick-Own does not build its own memory engine and does not expose a Memory button, editor, or management drawer. The History button is the only conversation-history interface.

## Ownership boundaries

### Channel3 owns conversational continuity

- The app calls Channel3's Conversational Agent API through the server-only `/api/conversations/turn` route.
- The first turn creates a Channel3 conversation. The `turn.started` event returns the Channel3 `conversation_id`.
- The server stores that ID on the corresponding Supabase `conversations` row.
- Every later turn in that history item reuses the saved Channel3 `conversation_id` and sends only the new message. Channel3 retains and recalls the actual thread.
- The Channel3 API key stays on the Next.js server; it is never sent to the browser.
- The app does not create, edit, summarize, toggle, or delete a separate memory profile.

### Supabase owns Quick-Own user data

Supabase stores the durable app records needed across browsers and sessions:

- **Conversation history:** the local conversation ID, title, Channel3 thread ID, user turns, assistant replies, and product snapshots. The History UI reads its index and saved turns from these tables.
- **Wishlist:** the user's liked Channel3 product IDs and the product snapshots needed to render their saved products.
- **Placed orders:** orders are persisted only after PayPal confirms a successful capture. Pending checkout data is not treated as a placed order.

Cart state, temporary search input, and UI-only state are not part of the user-data persistence scope.

## Existing Channel3 conversations

For a Supabase conversation created before the Channel3 thread ID was stored, the server reads the saved turns once and supplies them as initial Channel3 conversation context when the new Channel3 thread is created. After that first turn, follow-up context is managed by Channel3 using its own conversation ID.

## Supabase migration

Run `documentation/supabase_channel3_memory.sql` in the Supabase SQL Editor. The additive migration:

- Adds `channel3_conversation_id` to `conversations`.
- Adds `assistant_message` to `conversation_turns`.
- Creates `user_wishlist_items` and `user_orders` with per-user Row Level Security.

It does not replace the existing History IDs or the existing conversation-turn records.

## Environment

Set these in `Frontend/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `CHANNEL3_API_KEY` (server only; do not prefix with `NEXT_PUBLIC_`)

The route also accepts `CHANNELV3_SECRET` as an alternative Channel3 key name. Supabase authenticated-user policies must allow each user to read and modify only their own records.

## Channel3 references used

- Conversational turns: `client.conversations.createTurnStream()`
- Existing thread: send `conversation_id` on the next turn
- Thread history retrieval for diagnostics: `client.conversations.retrieve()`

No separate Channel3 memory-management API is used by the current TypeScript SDK integration; the persistent conversational thread is the memory mechanism used by Quick-Own.
