# Lessons Learned: MCP Supabase Connection Debugging

## Date
December 17-18, 2025

## Issue Summary
Watson (Claude Desktop MCP user) could not see Supabase messages. The MCP server only showed locally cached messages instead of fetching from the cloud.

---

## Root Causes Identified

### 1. Schema Mismatch (Code Bug)
**Problem:** The MCP server's `storage.ts` was using incorrect column names when querying Supabase:
- Used `recipient` instead of `to_agent`
- Used `sender` instead of `from_agent`  
- Used `body` instead of `message`

**Symptom:** Supabase queries returned empty results because the columns didn't exist.

**Fix:** Updated all Supabase queries in `storage.ts` to use the correct column names matching the actual `agent_messages` table schema.

**Lesson:** Always verify that code column names match the actual database schema. Consider using generated types from Supabase to catch these mismatches at compile time.

---

### 2. Silent Error Swallowing (Bad Pattern)
**Problem:** All Supabase operations had empty `catch` blocks:
```typescript
} catch {
    // Fall through to local
}
```

**Symptom:** Errors were completely hidden. When Supabase failed, the code silently fell back to local storage without any indication of why.

**Fix:** Added proper error logging to all catch blocks:
```typescript
} catch (err) {
    console.error('getInbox failed, falling back to local:', err);
    // Fall through to local
}
```

**Lesson:** Never use empty catch blocks. Always log errors, even when recovering gracefully. Silent failures are debugging nightmares.

---

### 3. NPX Caching (Deployment Issue)
**Problem:** `npx myceliumail-mcp` was aggressively caching old versions of the package, even after publishing fixes to npm.

**Symptom:** Even after publishing v1.0.6 with fixes, Claude Desktop kept running the broken old version.

**Attempted Solutions:**
- `npx -y myceliumail-mcp@1.0.6` - Did not reliably bust cache
- `npm cache clean --force` - Not effective for npx cache

**Final Fix:** Configured Claude Desktop to run the local build directly:
```json
{
  "command": "node",
  "args": ["/path/to/dist/server.js"]
}
```

**Lesson:** For development and debugging, always use local builds with direct paths. Don't trust `npx` caching behavior during active development. For production users, consider adding version-specific instructions: `npx myceliumail-mcp@latest`.

---

### 4. Missing Global Config Support (Feature Gap)
**Problem:** The MCP server only read Supabase credentials from environment variables, but Claude Desktop's MCP config doesn't support complex env var setup easily.

**Fix:** Added fallback to read from `~/.myceliumail/config.json`, same as the CLI tool.

**Lesson:** MCP servers should support multiple config sources (env vars, config files) for flexibility across different deployment contexts.

---

## Debugging Techniques Used

### 1. File-Based Debug Logging
When console output was being swallowed by the MCP runtime, we added file-based logging:
```typescript
const LOG_FILE = join(homedir(), '.myceliumail', 'debug.log');
appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
```

This proved essential for diagnosing issues in environments where stderr isn't visible.

### 2. Reproduction Script
Created `debug-mcp-connection.js` to test the Supabase connection outside of the MCP context:
```javascript
const { hasSupabase } = require('./dist/lib/config.js');
const { getInbox } = require('./dist/lib/storage.js');
// Test directly
```

This isolated whether the issue was in the code or the MCP runtime environment.

### 3. Direct Supabase Verification
Used the Supabase MCP tool to verify data existed:
```sql
SELECT * FROM agent_messages WHERE to_agent = 'watson';
```

This confirmed the data was in the cloud and the issue was in fetching, not storage.

---

## Prevention Guidelines

1. **Schema Validation:** Use TypeScript generated types from Supabase CLI to catch column name mismatches at compile time.

2. **Error Visibility:** Always log errors, never swallow them silently. Use a consistent error logging pattern.

3. **Multiple Config Sources:** Support env vars AND config files for flexibility.

4. **Local Development:** Always test with local builds during debugging. Don't rely on npm/npx for rapid iteration.

5. **Integration Tests:** Add tests that actually hit Supabase (in a test project) to catch schema drift.

---

## Related Files Modified
- `mcp-server/src/lib/config.ts` - Added config file support
- `mcp-server/src/lib/storage.ts` - Fixed column names, added error logging
- `mcp-server/package.json` - Version bumps

---

## Lessons Learned: Perpetual Dance Collab (January 2-3, 2026)

### 5. dotenv CWD Issue (MCP Loading)
**Problem:** When Claude Desktop spawns MCP servers, the working directory is often `/` or user's home, not the repo root. `import 'dotenv/config'` looks for `.env` in CWD.

**Symptom:** MCP server couldn't find Supabase credentials, silently failed.

**Fix:** Use explicit path resolution:
```typescript
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');
config({ path: envPath });
```

**Lesson:** Never rely on CWD for config files in MCP servers. Always resolve paths relative to the script location.

---

### 6. WebSocket Event Name Mismatches
**Problem:** My hub-client listened for `chat` events but Hub emits `chat:message`.

**Symptom:** Chat messages weren't received; no errors, just silent failure.

**Fix:** Changed `socket.on('chat', ...)` to `socket.on('chat:message', ...)`.

**Lesson:** When integrating with external APIs:
1. Check the actual event names in the source code
2. Log all received events during development to spot mismatches
3. Don't assume event names — verify them

---

### 7. Payload Field Name Mismatches
**Problem:** Hub sends `text` for chat content, but my types expected `message`.

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'length')`

**Fix:** Handle both fields: `const messageText = payload.text || payload.message || '';`

**Lesson:** When consuming external payloads:
1. Check the actual payload structure
2. Use fallbacks for field name variations
3. Add type annotations with optional fields for flexibility

---

### 8. Canonical Paths for Shared Files
**Problem:** Agents using repo symlinks (`~/Dev/Spidersan/treebird-internal/...`) instead of canonical path.

**Symptom:** Merge conflicts, editing wrong file, confusion.

**Fix:** Always use: `/Users/freedbird/Dev/treebird-internal/collab/` for shared files.

**Lesson:** Document and enforce canonical paths for all shared resources.

---

### 9. Task Completion Protocol
**Problem:** Tasks marked as "done" before actually being built and tested.

**Protocol Now:**
1. ✅ Update collab doc status
2. 📤 Git commit + push immediately
3. 📢 Add completion note to URGENT section

**Lesson:** Transparency > Speed. Never mark done until shipped AND tested.

---

## Lessons Learned: Mammoth Hunt Collab (January 3, 2026)

### 10. Collab Task Format Matters for Automation
**Problem:** Created `mycmail claim` command but couldn't auto-claim tasks because collab table didn't use `[ ]` checkboxes or `⬜` status markers.

**Symptom:** Command worked but couldn't find claimable tasks in the collab doc.

**Fix:** Updated collab format manually; future collabs should use consistent claimable markers:
- `[ ]` for markdown checkboxes
- `⬜ Open` for table status columns

**Lesson:** When building automation tools, design the data format first. Standardize on consistent markers across all collab docs.

---

### 11. MCP Health Monitoring Discovery
**Problem:** MCP server showing NOT RUNNING despite being needed for Antigravity integration.

**Discovery:** `spidersan mcp-health` shows myceliumail-mcp not running with zombie Snyk processes.

**Next Steps:** Need to debug MCP binary path and Antigravity config.

**Lesson:** Always check ecosystem health before claiming tasks complete. MCP issues may not be obvious until you run diagnostics.

---

### 12. Identity Block Prevents Agent Confusion
**Why:** Agents without explicit identity can confuse themselves with other agents when processing shared context files.

**Format Added:**
```markdown
## 🪪 Identity

I am **Myceliumail** (mycm). My glyph is 🍄.  
For shared files, always use canonical: `/Users/freedbird/Dev/treebird-internal`
```

**Lesson:** Simple identity blocks at the top of CLAUDE.md prevent confusion during multi-agent collabs.

---

## Lessons Learned: MCP Restart Collab (January 5, 2026)

### 13. Process ≠ Connection (Critical MCP Insight)
**Problem:** MCP process running at OS level (`ps aux` shows PID) but tools not available in Antigravity.

**Symptom:** `list_resources` fails with EOF, but process is clearly running.

**Root Cause:** Antigravity connects to MCPs **only at startup**. Externally spawned or restarted MCPs don't get auto-reconnected.

**Fix:** Must restart Antigravity to reconnect. No API exists to trigger reconnection.

**Lesson:** When debugging "MCP not working," always check BOTH:
1. Is the process running? (`ps aux | grep mcp`)
2. Is Antigravity connected? (Try using a tool)

---

### 14. Sender ID Validation Prevents Data Corruption
**Problem:** Corrupted sender IDs stored in Supabase (`ssanhub_url=https://...`).

**Root Cause:** Missing newline in `.env` file caused variable concatenation.

**Fix Applied:** Added validation in `sendMessage()`:
```typescript
const AGENT_ID_PATTERN = /^[a-z0-9_-]{2,20}$/;
if (!AGENT_ID_PATTERN.test(sender) || sender.includes('=')) {
  throw new Error(`Invalid sender: "${sender}"`);
}
```

**Lesson:** Validate ALL input at the storage layer, not just the API layer. Bad data in the database causes cascading failures (can't reply, can't filter, trust issues).

---

### 15. Use `npx -yq` Not `npx -y` for MCP Servers
**Problem:** npx-based MCP servers writing to stdout during install, breaking JSON-RPC protocol.

**Symptom:** EOF / Initialize errors in Antigravity.

**Fix:** Use `-yq` flag (quiet mode) instead of just `-y`:
```json
{
  "command": "npx",
  "args": ["-yq", "@some/mcp-server"]
}
```

**Lesson:** MCP servers MUST NOT write to stdout (reserved for JSON-RPC). Use stderr for all logging.

---

### 16. Always Log MCP Tool Failures
**Problem:** "Agent execution terminated due to an error" with no details about what failed.

**Impact:** Debugging blind - no idea what tool was called or what error occurred.

**Proposed Pattern:**
```typescript
try {
  const result = await mcpTool(args);
} catch (err) {
  console.error(`MCP tool failed: ${toolName}`, { args, error: err.message });
  throw err;  // Re-throw with context
}
```

**Lesson:** Every MCP call should be wrapped with logging. Silent failures are debugging nightmares (see Lesson #2).

---

### 17. Zombie MCP Processes Degrade Performance
**Problem:** Multiple MCP processes spawned on each Antigravity window/restart, old ones linger.

**Symptom:** High CPU usage, port conflicts, confusion about "which MCP is the real one."

**Fix:** 
```bash
# Clean up zombies
spidersan mcp-health --kill-zombies

# Or brute force
pkill -f mcp-server
```

**Lesson:** After any Antigravity restart or debugging session, check for zombies with `ps aux | grep mcp`.

---

### 18. Keep MCP Tool Responses Under 50KB
**Problem:** Large responses (e.g., `grep` returning 1000+ lines) crash Antigravity.

**Symptom:** Timeout, agent termination, or memory issues.

**Fix:** Add explicit limits in tool responses:
```typescript
const MAX_RESPONSE_SIZE = 50000;  // 50KB
if (result.length > MAX_RESPONSE_SIZE) {
  return result.slice(0, MAX_RESPONSE_SIZE) + '\n... [truncated]';
}
```

**Lesson:** MCP tools should be defensive about response size. Trust that the caller can paginate or request more.

---

### 19. Pre-Flight Checklist for New MCP Servers
Before deploying any new MCP server:

- [ ] Use absolute path for dotenv loading (Lesson #5)
- [ ] Verify entry point matches transpiled output
- [ ] Test with `spidersan mcp-health`
- [ ] Check logs: `~/Library/Logs/Claude/mcp.log`
- [ ] Add response size limits to all tools
- [ ] Use `npx -yq` for npx-based servers (Lesson #15)
- [ ] Add input validation for all tool parameters

**Lesson:** MCP development has many silent failure modes. A checklist prevents repeating mistakes.

