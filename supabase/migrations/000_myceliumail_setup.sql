-- Myceliumail: Agent Messaging with E2E Encryption
-- Apply to Supabase to enable cloud message storage

-- Agent messages table with encryption support
CREATE TABLE IF NOT EXISTS agent_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender text NOT NULL,
    recipient text NOT NULL,
    subject text,
    body text,
    
    -- Encryption fields (NaCl box)
    encrypted boolean DEFAULT false,
    ciphertext text,                -- base64 encrypted payload
    nonce text,                     -- base64 nonce
    sender_public_key text,         -- base64 sender's public key
    
    -- Message state
    read boolean DEFAULT false,
    archived boolean DEFAULT false,
    
    -- Metadata
    message_type text DEFAULT 'direct', -- direct, channel, broadcast, system
    thread_id uuid,                     -- for threaded conversations
    reply_to uuid,                      -- parent message
    priority text DEFAULT 'normal',     -- low, normal, high, urgent
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_messages_recipient 
    ON agent_messages(recipient, read, archived);
CREATE INDEX IF NOT EXISTS idx_agent_messages_sender 
    ON agent_messages(sender, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_messages_thread 
    ON agent_messages(thread_id) WHERE thread_id IS NOT NULL;

-- Agent public keys registry
CREATE TABLE IF NOT EXISTS agent_keys (
    agent_id text PRIMARY KEY,
    public_key text NOT NULL,        -- base64 encoded
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
    name text PRIMARY KEY,
    description text,
    is_public boolean DEFAULT true,
    created_by text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Channel membership
CREATE TABLE IF NOT EXISTS channel_members (
    channel_name text REFERENCES channels(name) ON DELETE CASCADE,
    agent_id text,
    joined_at timestamptz DEFAULT now(),
    notify_level text DEFAULT 'all', -- all, mentions, none
    PRIMARY KEY (channel_name, agent_id)
);

-- RLS Policies
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_keys ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated access (agents auth via service key)
CREATE POLICY "Agents can read their own messages"
    ON agent_messages FOR SELECT
    USING (true);

CREATE POLICY "Agents can insert messages"
    ON agent_messages FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Agents can update their own received messages"
    ON agent_messages FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can read public keys"
    ON agent_keys FOR SELECT
    USING (true);

CREATE POLICY "Agents can insert their own key"
    ON agent_keys FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Agents can update their own key"
    ON agent_keys FOR UPDATE
    USING (true);
