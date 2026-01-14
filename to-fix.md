# Issues Encountered - Claude Code Environment Testing

Testing session: 2026-01-14
Environment: Claude Code Web (cloud environment)
Tester: mycm (Myceliumail agent) 🍄

---

## 1. TypeScript Build Errors

**Problem:**
Initial `npm run build` in `mcp-server/` failed with multiple errors:

```
src/lib/signing.test.ts(8,38): error TS2307: Cannot find module 'vitest' or its corresponding type declarations.
src/server.ts(1322,41): error TS2345: Argument of type '"🔐 enc"' is not assignable to parameter of type 'never'.
src/server.ts(1323,42): error TS2345: Argument of type '"✍️ sign"' is not assignable to parameter of type 'never'.
```

**Root Cause:**
- Test files (*.test.ts) were being compiled by TypeScript
- `markers` array in server.ts:1321 lacked explicit type annotation

**Fix Applied:**
- Updated `tsconfig.json` to exclude `**/*.test.ts`
- Added explicit type annotation: `const markers: string[] = [];`

**Recommendation:**
- Ship with test files already excluded in tsconfig.json
- Consider adding vitest to devDependencies if tests should compile

---

## 2. envoak/envault Naming Confusion

**Problem:**
Package naming is inconsistent between installation and runtime:

**Installation (correct):**
```bash
npm install -g envoak
```

**Runtime behavior (confusing):**
```bash
$ envoak
Usage: envault [options] [command]  # ❌ Says "envault"
🔐 Encrypted Git-Ops for your environment variables
```

**Environment variable:**
```bash
❌ ENVAULT_KEY environment variable is missing.
```

**User Experience:**
1. User installs `envoak`
2. Runs `envoak` command
3. Sees help text for "envault"
4. Wonders if they installed the wrong package
5. Confusion about whether env var should be `ENVOAK_KEY` or `ENVAULT_KEY`

**Expected:**
- Help text: `Usage: envoak [options] [command]`
- All user-facing text should say "envoak"
- Consider: `ENVOAK_KEY` instead of `ENVAULT_KEY` (or document the intentional difference)

**Documentation Note:**
The docs correctly show `ENVAULT_KEY`, so they match actual behavior. Just the help text is mismatched.

---

## 3. MCP Tools Not Loading in Claude Code

**Problem:**
After setting up `.mcp.json` with proper configuration:
```json
{
  "mcpServers": {
    "myceliumail": {
      "command": "node",
      "args": ["/home/user/Myceliumail/mcp-server/dist/server.js"],
      "env": {
        "MYCELIUMAIL_AGENT_ID": "mycm"
      }
    }
  }
}
```

MCP tools still not available after restart. Attempted to call:
```
mcp__myceliumail__check_inbox
```
Result: `Error: No such tool available`

**Status:** Unresolved
**Environment:** Claude Code Web (cloud)

**Possible Causes:**
- Cloud environment may have different MCP loading behavior
- May need proaksy (stateless MCP proxy) mentioned by user
- Permissions or path issues in sandboxed environment
- Server may be failing to start silently

**To Investigate:**
- Check if MCP server is actually starting
- Look for MCP server logs/errors
- Test if proaksy is required for cloud environments
- Verify stdio transport is working

---

## 4. mycmail CLI Not Available

**Problem:**
Tried to run session startup commands per CLAUDE.md:
```bash
$ mycmail wake
/bin/bash: line 1: mycmail: command not found
```

**Root Cause:**
The `mycmail` CLI is not installed in the environment. The MCP server is the tool interface, not a standalone CLI in this context.

**Confusion:**
CLAUDE.md instructions assume `mycmail` command is available:
```bash
mycmail wake
mycmail close -m "message"
mycmail inbox
mycmail send <agent> "<subject>"
```

**For Cloud Environments:**
Need to clarify:
- Is `mycmail` CLI available in Claude Code Web?
- Should users rely only on MCP tools?
- Should CLAUDE.md have environment-specific instructions?

---

## 5. Hub Connection Failures

**Problem:**
Initial session startup attempts to announce presence:
```bash
curl -s -X POST https://hub.treebird.uk/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sender":"Myceliumail","text":"🍄 Network awakening...","glyph":"🍄"}'
```
Result: `Exit code 56` (network error)

**Status:** May be expected if Hub is not running
**Impact:** Can't announce presence to other agents

---

## 6. Missing Environment Configuration

**Problem:**
No `.env` file or encrypted `config.enc` exists in the repo.

**Environment requirements:**
- `MYCELIUMAIL_AGENT_ID` (provided via .mcp.json) ✓
- `SUPABASE_URL` (optional, for cloud sync)
- `SUPABASE_ANON_KEY` (optional)
- `ENVAULT_KEY` (for decrypting config)

**Workarounds:**
- MCP server can run in local storage mode without Supabase
- Config can be provided via .mcp.json env section

**Question:**
Should repos include an encrypted config.enc for easy setup with just ENVAULT_KEY?

---

## 7. proaksy Missing Context

**User mentioned:** "proaksy is a stateless proxy MCP that helps to run mycmail on other environments"

**Problem:**
- Not documented in this repo
- Not published on npm
- Unclear if it's required for Claude Code Web
- May be the missing piece for MCP tools loading

**Questions:**
- Is proaksy required for cloud environments?
- Where is the proaksy repo?
- Should it be documented in main README?
- Should .mcp.json point to proaksy instead of direct server.js?

---

## Summary - Setup Friction Points

1. **Build issues** - Need to fix before ship ✓ FIXED
2. **envoak/envault naming** - Confusing for new users
3. **MCP loading** - Not working in cloud environment (critical)
4. **Missing setup docs** - How to bootstrap in new environment
5. **proaksy documentation** - Not mentioned in repo
6. **Environment-specific CLAUDE.md** - Instructions assume local CLI

---

## Recommendations

### High Priority
- [ ] Fix envoak help text to say "envoak" not "envault"
- [ ] Debug why MCP tools don't load in Claude Code Web
- [ ] Document proaksy and when it's needed
- [ ] Add environment-specific setup guides

### Medium Priority
- [ ] Add quick-start script that handles all setup
- [ ] Include sample encrypted config.enc for testing
- [ ] Add troubleshooting section for MCP issues
- [ ] Clarify mycmail CLI vs MCP tool usage

### Low Priority
- [ ] Add healthcheck endpoint to MCP server for debugging
- [ ] Better error messages when tools fail to load
- [ ] Add --verbose flag to see what's happening

---

**Testing Platform:** Claude Code Web (sandboxed cloud environment)
**Session:** claude/general-conversation-lLFlp
**Date:** 2026-01-14
