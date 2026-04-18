-- Tighten RLS policies flagged as "always true"
-- All mutating operations (INSERT/UPDATE/DELETE) are scoped to service_role
-- because agents interact via Edge Functions that carry the service_role key.
-- SELECT policies remain open where public read is intentional.

-- ============================================================
-- agent_messages
-- ============================================================

-- INSERT: was WITH CHECK (true) — scope to service_role
DROP POLICY IF EXISTS "Agents can insert messages" ON public.agent_messages;
CREATE POLICY "Agents can insert messages"
  ON public.agent_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

-- UPDATE: was USING (true) — scope to service_role
DROP POLICY IF EXISTS "Agents can update their own received messages" ON public.agent_messages;
CREATE POLICY "Agents can update their own received messages"
  ON public.agent_messages FOR UPDATE
  TO service_role
  USING (true);

-- ============================================================
-- feedback
-- ============================================================

-- INSERT: intentionally open for anonymous submissions — restrict to anon + authenticated
-- (keeps anonymous feedback working, removes catch-all exposure)
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE: scope to service_role only (admin review flow via Edge Function)
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  TO service_role
  USING (true);

-- ============================================================
-- memoak_memories
-- ============================================================

-- INSERT: was WITH CHECK (true) — scope to service_role (workers call via Edge Function)
DROP POLICY IF EXISTS "Workers can insert memories" ON public.memoak_memories;
CREATE POLICY "Workers can insert memories"
  ON public.memoak_memories FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- spider_registries
-- ============================================================
-- Machine registries are written by Spidersan daemons via Edge Functions.
-- Scope all mutating policies to service_role.

DROP POLICY IF EXISTS "Insert own machine registries" ON public.spider_registries;
CREATE POLICY "Insert own machine registries"
  ON public.spider_registries FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Update own machine registries" ON public.spider_registries;
CREATE POLICY "Update own machine registries"
  ON public.spider_registries FOR UPDATE
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Delete own machine registries" ON public.spider_registries;
CREATE POLICY "Delete own machine registries"
  ON public.spider_registries FOR DELETE
  TO service_role
  USING (true);
