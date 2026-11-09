-- Quick-Own user data persistence and Channel3 conversation mapping.
-- Existing conversations and conversation_turns tables remain the history source.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS channel3_conversation_id text;

ALTER TABLE public.conversation_turns
  ADD COLUMN IF NOT EXISTS assistant_message text;

CREATE INDEX IF NOT EXISTS conversations_channel3_conversation_id_idx
  ON public.conversations (channel3_conversation_id)
  WHERE channel3_conversation_id IS NOT NULL;

-- Wishlist data is a product snapshot owned by the signed-in Supabase user.
CREATE TABLE IF NOT EXISTS public.user_wishlist_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  item_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

ALTER TABLE public.user_wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own wishlist" ON public.user_wishlist_items;
CREATE POLICY "Users can read their own wishlist"
  ON public.user_wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their own wishlist" ON public.user_wishlist_items;
CREATE POLICY "Users can add to their own wishlist"
  ON public.user_wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wishlist" ON public.user_wishlist_items;
CREATE POLICY "Users can update their own wishlist"
  ON public.user_wishlist_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their own wishlist" ON public.user_wishlist_items;
CREATE POLICY "Users can remove from their own wishlist"
  ON public.user_wishlist_items FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wishlist_items TO authenticated;

-- Completed PayPal captures only. Pending checkout details stay client-side until
-- PayPal confirms capture successfully.
CREATE TABLE IF NOT EXISTS public.user_orders (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  order_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, order_id)
);

ALTER TABLE public.user_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own orders" ON public.user_orders;
CREATE POLICY "Users can read their own orders"
  ON public.user_orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add their own orders" ON public.user_orders;
CREATE POLICY "Users can add their own orders"
  ON public.user_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.user_orders;
CREATE POLICY "Users can update their own orders"
  ON public.user_orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_orders TO authenticated;
