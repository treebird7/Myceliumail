-- Enable Realtime for agent_messages table
-- This allows the mycmail watch command to receive push notifications

-- Enable Realtime publication for agent_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;

-- Note: By default, Realtime listens to all events (INSERT, UPDATE, DELETE).
-- If you want to limit to specific events, use:
-- ALTER PUBLICATION supabase_realtime ADD TABLE ONLY agent_messages 
--   WITH (publish = 'insert');
