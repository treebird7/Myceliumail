-- Myceliumail Public API Security (Toak)
-- Adds API keys, tenant agent registry, nonce replay store, and rate limiting.

-- ============================================================
-- Tenant-aware messages
-- ============================================================
ALTER TABLE agent_messages
ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default-flock';

CREATE INDEX IF NOT EXISTS idx_agent_messages_tenant
    ON agent_messages(tenant_id);

CREATE INDEX IF NOT EXISTS idx_agent_messages_thread
    ON agent_messages(thread_id)
    WHERE thread_id IS NOT NULL;

-- ============================================================
-- API Keys (per tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL,
    key_id text NOT NULL UNIQUE,          -- HMAC(pepper, api_key)
    key_prefix text NOT NULL,             -- display prefix
    name text,
    created_at timestamptz DEFAULT now(),
    last_used_at timestamptz,
    revoked_at timestamptz,
    created_by text
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant
    ON api_keys(tenant_id);

-- ============================================================
-- Tenant Agent Public Keys
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_agent_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL,
    agent_id text NOT NULL,
    public_key text NOT NULL,             -- base64
    algorithm text NOT NULL DEFAULT 'ed25519',
    created_at timestamptz DEFAULT now(),
    revoked_at timestamptz,
    created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tenant_agent_active
    ON tenant_agent_keys(tenant_id, agent_id)
    WHERE revoked_at IS NULL;

-- ============================================================
-- Nonce Replay Store
-- ============================================================
CREATE TABLE IF NOT EXISTS api_nonces (
    tenant_id text NOT NULL,
    agent_id text NOT NULL,
    nonce text NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_api_nonces
    ON api_nonces(tenant_id, agent_id, nonce);

CREATE INDEX IF NOT EXISTS idx_api_nonces_expires
    ON api_nonces(expires_at);

-- ============================================================
-- Rate Limits
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    tenant_id text PRIMARY KEY,
    tier text NOT NULL DEFAULT 'starter',
    burst_limit int NOT NULL DEFAULT 20,     -- per minute
    hour_limit int NOT NULL DEFAULT 100,
    day_limit int NOT NULL DEFAULT 1000,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope text NOT NULL,                    -- tenant | api_key
    scope_id text NOT NULL,                 -- tenant_id | api_key_id
    window_type text NOT NULL,              -- minute | hour | day
    window_start timestamptz NOT NULL,
    request_count int NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_rate_limit_usage
    ON rate_limit_usage(scope, scope_id, window_type, window_start);

-- Atomic rate limiter (single increment + check)
CREATE OR REPLACE FUNCTION consume_rate_limit(
    p_scope text,
    p_scope_id text,
    p_window_type text,
    p_window_start timestamptz,
    p_limit int
) RETURNS TABLE(allowed boolean, count int) AS $$
DECLARE new_count int;
BEGIN
    INSERT INTO rate_limit_usage (scope, scope_id, window_type, window_start, request_count)
    VALUES (p_scope, p_scope_id, p_window_type, p_window_start, 1)
    ON CONFLICT (scope, scope_id, window_type, window_start)
    DO UPDATE SET request_count = rate_limit_usage.request_count + 1
    RETURNING request_count INTO new_count;

    allowed := new_count <= p_limit;
    RETURN QUERY SELECT allowed, new_count;
END;
$$ LANGUAGE plpgsql;
