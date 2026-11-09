-- ==============================================================================
-- QUICK-OWN SUPABASE / POSTGRES COMPLETE IDEMPOTENT SCHEMA MIGRATION
-- ==============================================================================
-- This script is completely safe to run multiple times (idempotent).
-- It will CREATE any tables that do not exist yet, and ALTER existing tables
-- to guarantee all required columns, types, indexes, and RLS policies are present.
-- ==============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CONVERSATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Shopping conversation',
  channel3_conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all expected columns exist even if table was created previously
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS channel3_conversation_id text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Shopping conversation';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Indexes for performance & foreign key cascade checks
CREATE INDEX IF NOT EXISTS conversations_user_id_idx
  ON public.conversations (user_id);

CREATE INDEX IF NOT EXISTS conversations_user_id_updated_at_idx
  ON public.conversations (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS conversations_channel3_conversation_id_idx
  ON public.conversations (channel3_conversation_id)
  WHERE channel3_conversation_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
CREATE POLICY "Users can create their own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
CREATE POLICY "Users can delete their own conversations"
  ON public.conversations FOR DELETE
  USING ((select auth.uid()) = user_id);


-- ==============================================================================
-- 2. CONVERSATION_TURNS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL DEFAULT '',
  image_search boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'complete',
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  assistant_message text DEFAULT '',
  intent jsonb,
  notice text DEFAULT '',
  error text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all expected columns exist even if table was created previously
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS query text NOT NULL DEFAULT '';
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS image_search boolean NOT NULL DEFAULT false;
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'complete';
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS recommendations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS assistant_message text DEFAULT '';
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS intent jsonb;
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS notice text DEFAULT '';
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS error text DEFAULT '';
ALTER TABLE public.conversation_turns ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Indexes for turn history loading
CREATE INDEX IF NOT EXISTS conversation_turns_lookup_idx
  ON public.conversation_turns (conversation_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversation_turns_user_id_idx
  ON public.conversation_turns (user_id);

-- Enable Row Level Security
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversation turns" ON public.conversation_turns;
CREATE POLICY "Users can view their own conversation turns"
  ON public.conversation_turns FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversation turns" ON public.conversation_turns;
CREATE POLICY "Users can insert their own conversation turns"
  ON public.conversation_turns FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own conversation turns" ON public.conversation_turns;
CREATE POLICY "Users can update their own conversation turns"
  ON public.conversation_turns FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversation turns" ON public.conversation_turns;
CREATE POLICY "Users can delete their own conversation turns"
  ON public.conversation_turns FOR DELETE
  USING ((select auth.uid()) = user_id);


-- ==============================================================================
-- 3. USER_WISHLIST_ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_wishlist_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  item_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

ALTER TABLE public.user_wishlist_items ADD COLUMN IF NOT EXISTS item_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.user_wishlist_items ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_wishlist_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS user_wishlist_items_user_idx
  ON public.user_wishlist_items (user_id, created_at DESC);

ALTER TABLE public.user_wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own wishlist items" ON public.user_wishlist_items;
CREATE POLICY "Users can read their own wishlist items"
  ON public.user_wishlist_items FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can add to their own wishlist items" ON public.user_wishlist_items;
CREATE POLICY "Users can add to their own wishlist items"
  ON public.user_wishlist_items FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own wishlist items" ON public.user_wishlist_items;
CREATE POLICY "Users can update their own wishlist items"
  ON public.user_wishlist_items FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can remove from their own wishlist items" ON public.user_wishlist_items;
CREATE POLICY "Users can remove from their own wishlist items"
  ON public.user_wishlist_items FOR DELETE
  USING ((select auth.uid()) = user_id);


-- ==============================================================================
-- 4. USER_ORDERS TABLE (Primary completed orders table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_orders (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  order_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, order_id)
);

ALTER TABLE public.user_orders ADD COLUMN IF NOT EXISTS order_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.user_orders ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS user_orders_user_idx
  ON public.user_orders (user_id, created_at DESC);

ALTER TABLE public.user_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own orders" ON public.user_orders;
CREATE POLICY "Users can read their own orders"
  ON public.user_orders FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can add their own orders" ON public.user_orders;
CREATE POLICY "Users can add their own orders"
  ON public.user_orders FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.user_orders;
CREATE POLICY "Users can update their own orders"
  ON public.user_orders FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own orders" ON public.user_orders;
CREATE POLICY "Users can delete their own orders"
  ON public.user_orders FOR DELETE
  USING ((select auth.uid()) = user_id);


-- ==============================================================================
-- 5. USER_CARTS TABLE (Cloud synced shopping cart)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_carts (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_carts ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_carts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own cart" ON public.user_carts;
CREATE POLICY "Users can read their own cart"
  ON public.user_carts FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own cart" ON public.user_carts;
CREATE POLICY "Users can insert their own cart"
  ON public.user_carts FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cart" ON public.user_carts;
CREATE POLICY "Users can update their own cart"
  ON public.user_carts FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own cart" ON public.user_carts;
CREATE POLICY "Users can delete their own cart"
  ON public.user_carts FOR DELETE
  USING ((select auth.uid()) = user_id);


-- ==============================================================================
-- 6. USER_WISHLISTS TABLE (Aggregated wishlist snapshot)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_wishlists (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  liked_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_wishlists ADD COLUMN IF NOT EXISTS liked_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_wishlists ADD COLUMN IF NOT EXISTS liked_details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.user_wishlists ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own wishlist snapshot" ON public.user_wishlists;
CREATE POLICY "Users can read their own wishlist snapshot"
  ON public.user_wishlists FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own wishlist snapshot" ON public.user_wishlists;
CREATE POLICY "Users can insert their own wishlist snapshot"
  ON public.user_wishlists FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own wishlist snapshot" ON public.user_wishlists;
CREATE POLICY "Users can update their own wishlist snapshot"
  ON public.user_wishlists FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own wishlist snapshot" ON public.user_wishlists;
CREATE POLICY "Users can delete their own wishlist snapshot"
  ON public.user_wishlists FOR DELETE
  USING ((select auth.uid()) = user_id);


-- ==============================================================================
-- 7. ORDERS TABLE (Legacy / Alternate relational orders table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  capture_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'COMPLETED',
  currency text NOT NULL DEFAULT 'USD',
  total text NOT NULL DEFAULT '0.00',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS capture_id text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total text NOT NULL DEFAULT '0.00';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id, created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their orders table" ON public.orders;
CREATE POLICY "Users can read their orders table"
  ON public.orders FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert into orders table" ON public.orders;
CREATE POLICY "Users can insert into orders table"
  ON public.orders FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);


-- ==============================================================================
-- 8. PERMISSIONS GRANT
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
