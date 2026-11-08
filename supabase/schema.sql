-- ====================================================================
-- QUICK-OWN SUPABASE SCHEMA
-- Project Ref: thzyahamwbizvpcwaszx
-- Features: Auth, Session Management, Channel3 Conversations & Turns
-- ====================================================================

-- 1. CONVERSATIONS TABLE
-- Stores Channel3 conversation threads pinned to authenticated users
CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY, -- Channel3 conversation_id (conv_... or UUID)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Shopping conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. CONVERSATION TURNS TABLE
-- Stores each query, intent, search mode, product results, and notices
CREATE TABLE IF NOT EXISTS public.conversation_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT,
    image_search BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'complete',
    recommendations JSONB DEFAULT '[]'::jsonb,
    intent JSONB,
    notice TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
    ON public.conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_turns_conversation_created
    ON public.conversation_turns(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_turns_user_id
    ON public.conversation_turns(user_id);

-- 4. ENABLE ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR CONVERSATIONS
DROP POLICY IF EXISTS "Users can select own conversations" ON public.conversations;
CREATE POLICY "Users can select own conversations"
    ON public.conversations FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations"
    ON public.conversations FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 6. RLS POLICIES FOR CONVERSATION TURNS
DROP POLICY IF EXISTS "Users can select own turns" ON public.conversation_turns;
CREATE POLICY "Users can select own turns"
    ON public.conversation_turns FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own turns" ON public.conversation_turns;
CREATE POLICY "Users can insert own turns"
    ON public.conversation_turns FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own turns" ON public.conversation_turns;
CREATE POLICY "Users can delete own turns"
    ON public.conversation_turns FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 7. EXPLICIT GRANTS FOR SUPABASE POSTGREST DATA API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_turns TO authenticated;

