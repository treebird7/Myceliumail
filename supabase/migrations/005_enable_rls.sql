-- Enable RLS on all Toak and Treesan tables
-- These tables are accessed by edge functions with service role key
-- Toak messaging tables
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
-- Toak security tables
ALTER TABLE public.tenant_agent_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_usage ENABLE ROW LEVEL SECURITY;
-- Treesan knowledge base tables
ALTER TABLE public.rls_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rls_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rls_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
-- Other tables
ALTER TABLE public.chaos_windows ENABLE ROW LEVEL SECURITY;
-- Allow service role full access to all tables
-- (Edge functions use service role key)
CREATE POLICY "Allow service role full access" ON public.channels
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.channel_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.tenant_agent_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.api_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.api_nonces
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.rate_limit_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.rls_objects
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.rls_nodes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.rls_edges
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.knowledge_chunks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.chaos_windows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
