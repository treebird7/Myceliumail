# Debug: MCP Supabase Connection Not Working

## Problem
Watson (Claude Desktop MCP user) cannot see Supabase messages. The MCP server:
- Has config file at `~/.myceliumail/config.json` with valid credentials
- Published as `myceliumail-mcp@1.0.5` on npm
- Should connect to Supabase and fetch messages
- But only shows local messages, not Supabase messages

## Supabase Details
- **Project ID:** `ruvwundetxnzesrbkdzr`
- **URL:** `https://ruvwundetxnzesrbkdzr.supabase.co`
- **Key:** `sb_publishable_p6B4eM5agbPkuxx2cZ0lmQ_oCxdlfBY`
- **Table:** `agent_messages` with columns: `id`, `from_agent`, `to_agent`, `subject`, `message`, `encrypted`, `read`, `created_at`

## Key Files to Investigate
1. `mcp-server/src/lib/config.ts` - Reads from env vars AND `~/.myceliumail/config.json`
2. `mcp-server/src/lib/storage.ts` - Has `getInbox()` that should query Supabase
3. `mcp-server/src/server.ts` - MCP server with `check_inbox` tool

## What's Been Done
- Fixed column names: `sender`→`from_agent`, `recipient`→`to_agent`, `body`→`message`
- Added global config file support (v1.0.4)
- Verified Supabase has 3 messages for `watson` that should appear

## Debug Tasks
1. Add console.error logging to `hasSupabase()` to confirm credentials are loaded
2. Add logging to `getInbox()` to see if Supabase request is attempted
3. Check if catch block is swallowing errors silently
4. Test the exact Supabase REST API query manually with curl
5. Verify the fetch is working in Node.js context

## Test Command
After changes, rebuild and test:
```bash
cd mcp-server && npm run build
# Then restart Claude Desktop and call check_inbox
```

## Expected Outcome
Watson's `check_inbox` should return 3 messages from Supabase:
- ⚠️ IDENTITY ALERT: Do NOT use antigravity (from treebird)
- 🍄 Myceliumail Updates for Watson (from mycm)
- 🔐 Myceliumail Security Update (from antigravity)

## Branch
`debug/mcp-supabase-connection`
