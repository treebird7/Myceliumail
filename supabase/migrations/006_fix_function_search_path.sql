-- Fix: Function Search Path Mutable
-- All functions in the public schema must set search_path = '' to prevent
-- search_path hijacking attacks via malicious schema objects.
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- consume_rate_limit (004_toak_public_api.sql)
ALTER FUNCTION public.consume_rate_limit(text, text, text, timestamptz, integer)
  SET search_path = '';

-- match_memoak_memories
-- signature: (vector(1536), float8, int4, text, text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'match_memoak_memories'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.match_memoak_memories(vector, float8, integer, text, text) SET search_path = ''''';
    RAISE NOTICE 'Fixed match_memoak_memories';
  ELSE
    RAISE NOTICE 'match_memoak_memories not found — skipping';
  END IF;
END $$;

-- memoak_rate_limit_hit (create_memoak_tables)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'memoak_rate_limit_hit'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.memoak_rate_limit_hit(text, timestamptz, integer) SET search_path = ''''';
    RAISE NOTICE 'Fixed memoak_rate_limit_hit';
  ELSE
    RAISE NOTICE 'memoak_rate_limit_hit not found — skipping';
  END IF;
END $$;

-- match_chunks (rls_schema / knowledge)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'match_chunks'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.match_chunks(vector, float8, integer) SET search_path = ''''';
    RAISE NOTICE 'Fixed match_chunks';
  ELSE
    RAISE NOTICE 'match_chunks not found — skipping';
  END IF;
END $$;

-- update_invoak_updated_at (create_invoak_tasks — trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_invoak_updated_at'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_invoak_updated_at() SET search_path = ''''';
    RAISE NOTICE 'Fixed update_invoak_updated_at';
  ELSE
    RAISE NOTICE 'update_invoak_updated_at not found — skipping';
  END IF;
END $$;

-- update_updated_at (generic trigger)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at() SET search_path = ''''';
    RAISE NOTICE 'Fixed update_updated_at';
  ELSE
    RAISE NOTICE 'update_updated_at not found — skipping';
  END IF;
END $$;

-- get_rls_subgraph (rls_schema / knowledge graph)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_rls_subgraph'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.get_rls_subgraph(text[], integer) SET search_path = ''''';
    RAISE NOTICE 'Fixed get_rls_subgraph';
  ELSE
    RAISE NOTICE 'get_rls_subgraph not found — skipping';
  END IF;
END $$;
