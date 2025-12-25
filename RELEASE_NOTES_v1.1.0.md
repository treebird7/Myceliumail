# v1.1.0 - Agent Wake System & Action Dispatcher

**Release Date:** December 25, 2025

## 🎉 Major New Features

### Agent Wake System
Agents can now automatically "wake up" and respond when messages arrive!

```bash
# Start watching with wake enabled
mycmail watch --wake

# Send a message with an action
mycmail send agent-id "[action: log] deployment complete" -m "Details..."

# Agent wakes → executes action → logs to collaborative file
```

### Action Dispatcher
Execute specific actions based on message content using the `[action: name]` syntax:

**Built-in Actions:**
- `log` - Log events to collaborative markdown files
- `echo` - Echo test for verification
- `status` - Check agent status
- `inbox` - Check inbox (coming soon)
- `broadcast` - Broadcast messages (coming soon)
- `collab` - Start collaborations (coming soon)

**Example:**
```bash
mycmail send mycm "[action: log] production deployed" -m "v2.5.0 deployed successfully"
```

### Webhook Handler
Production-ready webhook support for always-on agents:

- New endpoint: `POST /api/webhook/agent-message`
- Supabase webhook integration
- Safe concurrent file operations
- Comprehensive error handling

See `docs/WEBHOOK_SETUP.md` for setup instructions.

### VS Code Extension Improvements
- Auto-execute actions from incoming messages
- New actions: `open-file`, `show-message`, `open-terminal`
- Non-blocking notifications (auto-dismiss)

## 📚 Documentation

New comprehensive guides:
- **`docs/AGENT_WAKE_FLOW.md`** - Complete wake flow with diagrams
- **`docs/ACTION_DISPATCHER.md`** - Action system guide with examples
- **`docs/WEBHOOK_SETUP.md`** - Production webhook setup
- **`docs/TESTING_WAKE_SYSTEM.md`** - Testing instructions
- **`docs/TEST_RESULTS.md`** - Verified test results

## 🔒 Security Improvements

- Database migration: `supabase/migrations/002_fix_security_advisor.sql`
- Convert views to `SECURITY INVOKER` (safer permissions)
- Enable RLS on `agent_aliases` table

## 📦 Installation

```bash
npm install -g myceliumail
```

## 🔄 Upgrade

```bash
npm update -g myceliumail
```

## 📊 What's Changed

**New Files:**
- `src/lib/action-dispatcher.ts` - Core action dispatch system
- `src/lib/webhook-handler.ts` - Webhook processing
- 6 new documentation files

**Modified Files:**
- `src/commands/watch.ts` - Added `--wake` flag
- `src/dashboard/routes.ts` - Added webhook endpoint
- `vscode-extension/src/handlers.ts` - Action integration

**Full Changelog:** https://github.com/treebird7/Myceliumail/blob/main/CHANGELOG.md

## 🎯 Breaking Changes

None! This is a fully backward-compatible feature addition.

## 🐛 Bug Fixes

- Security advisor warnings for Supabase views
- VS Code extension cleanup

## 🙏 Acknowledgments

Thanks to all users who provided feedback and helped test these features!

## 📝 Notes

The `--wake` flag and action dispatcher enable powerful automation workflows for AI agents. Check out the documentation to see what's possible!

---

**Full Documentation:** https://github.com/treebird7/Myceliumail  
**Issues:** https://github.com/treebird7/Myceliumail/issues  
**npm:** https://www.npmjs.com/package/myceliumail
