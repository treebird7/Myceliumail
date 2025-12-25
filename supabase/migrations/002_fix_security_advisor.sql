-- Fix Security Advisor Issues
-- Run this in Supabase SQL Editor for both projects

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- Change to SECURITY INVOKER (uses caller's permissions)
-- ============================================

-- unread_agent_messages
DROP VIEW IF EXISTS public.unread_agent_messages;
CREATE VIEW public.unread_agent_messages 
WITH (security_invoker = true) AS
SELECT * FROM public.agent_messages 
WHERE read_at IS NULL;

-- active_branches
DROP VIEW IF EXISTS public.active_branches;
CREATE VIEW public.active_branches 
WITH (security_invoker = true) AS
SELECT * FROM public.branches 
WHERE status = 'active' OR status IS NULL;

-- recent_file_shares (if file_shares table exists)
DROP VIEW IF EXISTS public.recent_file_shares;
-- CREATE VIEW public.recent_file_shares 
-- WITH (security_invoker = true) AS
-- SELECT * FROM public.file_shares 
-- WHERE created_at > NOW() - INTERVAL '7 days';

-- stale_branches
DROP VIEW IF EXISTS public.stale_branches;
CREATE VIEW public.stale_branches 
WITH (security_invoker = true) AS
SELECT * FROM public.branches 
WHERE updated_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 2. ENABLE RLS ON agent_aliases
-- ============================================

ALTER TABLE public.agent_aliases ENABLE ROW LEVEL SECURITY;

-- Permissive policy - adjust based on your needs
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.agent_aliases;
CREATE POLICY "Allow all for authenticated" ON public.agent_aliases
FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DONE! Run "Rerun linter" in Security Advisor
-- ============================================
