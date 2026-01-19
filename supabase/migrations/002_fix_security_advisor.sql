-- Fix Security Advisor Issues for Myceliumail
-- Converts SECURITY DEFINER views to SECURITY INVOKER

-- ============================================
-- FIX SECURITY DEFINER VIEWS
-- Change to SECURITY INVOKER (uses caller's permissions)
-- ============================================

-- unread_agent_messages view
DROP VIEW IF EXISTS public.unread_agent_messages;
CREATE VIEW public.unread_agent_messages 
WITH (security_invoker = true) AS
SELECT * FROM public.agent_messages 
WHERE read = false;

-- ============================================
-- DONE! Run "Rerun linter" in Security Advisor
-- ============================================
