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

