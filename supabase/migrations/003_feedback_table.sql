-- Migration: Add feedback table for user/developer feedback collection
-- Part of T-009/T-010: Community Infrastructure

-- Feedback table for collecting user insights
CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    type text NOT NULL DEFAULT 'general',  -- general, bug, feature, praise, question
    message text NOT NULL,
    
    -- Optional metadata
    agent_id text,                         -- who submitted (optional, can be anonymous)
    tool text,                             -- which tool: mycmail, envault, spidersan, etc.
    version text,                          -- tool version
    platform text,                         -- os/platform info
    email text,                            -- optional contact email
    
    -- Status tracking
    status text DEFAULT 'new',             -- new, reviewed, responded, archived
    priority text DEFAULT 'normal',        -- low, normal, high
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type, status);
CREATE INDEX IF NOT EXISTS idx_feedback_tool ON feedback(tool, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

-- RLS Policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (anonymous submissions allowed)
CREATE POLICY "Anyone can submit feedback"
    ON feedback FOR INSERT
    WITH CHECK (true);

-- Only authenticated users can read feedback (admin access)
CREATE POLICY "Admins can read feedback"
    ON feedback FOR SELECT
    USING (true);  -- TODO: Restrict to admin role when auth is set up

-- Only admins can update feedback status
CREATE POLICY "Admins can update feedback"
    ON feedback FOR UPDATE
    USING (true);  -- TODO: Restrict to admin role when auth is set up
