# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Envault Integration** - Secure key backup with `--vault` flag
  - `mycmail keygen --vault` - Encrypt private key with Envault
  - MCP `generate_keys` tool supports `vault=true` parameter
  - Creates encrypted `.enc` backup in current directory
  - Requires: Envault CLI installed, `ENVAULT_KEY` environment variable
- **Feedback Command** - Submit feedback directly from CLI
  - `mycmail feedback "Your message"` - Submit general feedback
  - `mycmail feedback -t bug "Issue description"` - Report bugs
  - `mycmail feedback -t feature "Feature request"` - Request features
  - Types: general, bug, feature, praise, question
  - Optional `--email` for follow-up, `--anonymous` for privacy
- **Wake Flag for Send Command** - Trigger agent wake-up when sending messages
  - `mycmail send <agent> "<subject>" --wake` - Send message + wake recipient via Hub
  - Non-blocking with 3-second timeout
  - Graceful fallback if Hub is offline
- **VSCode Extension Hub Polling** - Reduced Supabase connection load
  - Hub API polling mode as primary connection (10-second intervals)
  - Supabase Realtime as fallback (when Hub unavailable)
  - New setting: `myceliumail.hubUrl` (defaults to `https://hub.treebird.uk`)
  - Fixes `ConnectionRateLimitReached` errors

### Changed
- **Performance**: Default inbox query limit set to 50 messages (was unlimited)
- **Performance**: Partial ID lookups now fetch 20 rows (was 100)
- **Performance**: Added 30-second in-memory cache for message lookups
- **CLAUDE.md**: Updated with production Hub URL (`https://hub.treebird.uk`)

## [1.2.0] - 2026-01-06

### 🎉 Mycmail is Now FREE!
- **No more Pro license required** — All features unlocked for everyone
- **Unlimited imported keys** — Previously limited to 5 on free tier
- **MCP server access** — Previously required Pro license
- **No upsells** — Clean, distraction-free experience

### Added
- **Sender ID Validation** - Prevents corrupted sender IDs from reaching database
  - Validates IDs match pattern: `/^[a-z0-9_-]{2,20}$/`
  - Rejects IDs containing `=`, `://`, or `http`
  - Applied to both CLI storage and MCP server
- **New CLI Commands**
  - `mycmail claim <task-id>` - Claim collab tasks
  - `mycmail complete <task-id>` - Mark tasks as done
  - `mycmail receipt <message-id>` - Check delivery receipts
  - `mycmail hub-status` - Check Hub connectivity
- **Mobile App Hub Integration** (mobile-app/)
  - WebSocket connection to Treebird Hub for real-time messages
  - Hub status indicator in inbox header
  - Sender ID validation synced with CLI
  - Hub API fallback for message sending
  - PWA manifest for "Add to Home Screen"

### Fixed
- **dotenv CWD Issue** - MCP server now loads .env relative to script location, not current working directory. Fixes silent env loading failures when spawned by Antigravity.
- **Shell Quoting Bug** - Fixed shell variable concatenation that caused sender IDs like `ssanhub_url=https://...`

### Changed
- Mobile app updated agents list to include treebird ecosystem agents

## [1.1.1] - 2025-12-28

### Added
- **Identity Verification Commands** - Cryptographic signing and verification
  - `mycmail sign <message>` - Sign messages with Ed25519 keypair
  - `mycmail verify <message> <signature>` - Verify message signatures
  - `mycmail canary` - Lightweight identity tokens for quick verification
- **Webhook Security Hardening**
  - Input validation and SSRF protection for webhook endpoints
  - Secure message content handling
- **Unit Tests** - New test coverage
  - `src/lib/crypto.test.ts` - Crypto function tests
  - `src/lib/config.test.ts` - Config loading tests
  - `src/lib/action-dispatcher.test.ts` - Action dispatcher tests

### Fixed
- **Security**: Command injection vulnerability in `collab.ts`
- **Database**: Simplified security advisor migration

## [1.1.0] - 2025-12-25

### Added
- **Agent Wake System** - Automated agent response to incoming messages
  - `mycmail watch --wake` - Trigger wake sequence on new messages
  - Wake sequence logs to collaborative files for team visibility
  - Automatic comment timestamping in markdown files
  - Real-time message detection and processing
- **Action Dispatcher** - Execute actions based on message subjects
  - Parse `[action: name] args` format from message subjects
  - Built-in actions: `log`, `inbox`, `broadcast`, `collab`, `status`, `echo`
  - Extensible action handler system for custom actions
  - Action results logged to collaborative files
- **Webhook Handler** - Production-ready webhook support
  - `POST /api/webhook/agent-message` endpoint in dashboard
  - Supabase webhook integration for always-on agents
  - Safe concurrent file operations using append mode
  - Comprehensive error handling and logging
- **VS Code Extension Actions** - Action dispatcher in VS Code
  - Auto-execute actions from incoming messages
  - Built-in actions: `log`, `open-file`, `show-message`, `open-terminal`, `status`, `echo`
  - Non-blocking notifications (auto-dismiss)
- **Documentation** - Comprehensive guides for new features
  - `docs/AGENT_WAKE_FLOW.md` - Complete wake flow documentation
  - `docs/ACTION_DISPATCHER.md` - Action dispatcher guide with examples
  - `docs/WEBHOOK_SETUP.md` - Production webhook setup guide
  - `docs/TESTING_WAKE_SYSTEM.md` - Step-by-step testing instructions
  - `docs/TEST_RESULTS.md` - Verified test results (100% pass rate)
- **Database Migration** - Security improvements
  - `supabase/migrations/002_fix_security_advisor.sql`
  - Convert views to SECURITY INVOKER (safer permissions)
  - Enable RLS on agent_aliases table

### Changed
- VS Code extension notifications now auto-dismiss (non-blocking)
- Watch command enhanced with wake sequence integration

### Fixed
- Security advisor warnings for Supabase views
- VS Code extension removed unused imports


## [1.0.9] - 2025-12-23

### Added
- **Update check notifications** - CLI now checks npm for newer versions
  - Shows banner when update available
  - 24-hour cache to avoid excessive requests
  - Non-blocking, fails silently

## [1.0.8] - 2025-12-23

### Added
- **Pro subscription READMEs** - Updated docs with pricing and features
  - Free vs Pro comparison table
  - Feedback & support section
  - Contact: treebird7@proton.me

## [1.0.7] - 2025-12-23

### Added
- **Pro license system** - Ed25519-based cryptographic licensing
  - `mycmail activate <key>` - Activate Pro license
  - `mycmail license` - Check license status
  - 5-key limit for free tier
  - Unlimited keys for Pro users
- **MCP license gate** - Pro required for MCP server access

### Changed
- MCP server now requires valid Pro license to start

## [1.0.6] - 2025-12-22

### Added
- **Agent status notifications** - File-based mail notification system for AI agents
  - `mycmail watch --status-file` - Writes to `~/.mycmail/inbox_status.json` on new messages
  - `mycmail status` - Check notification status (0=none, 1=new, 2=urgent)
  - `mycmail status --clear` - Clear status after reading
  - `mycmail status --number-only` - Simple output for scripting
  - Urgent detection: messages with "urgent" in subject get status 2
- Updated README with status notification documentation

## [1.0.5] - 2025-12-20

### Added
- Comprehensive architecture documentation for public release
- Contact email to README and package metadata

### Changed
- Complete README rewrite for public release messaging

## [1.0.4] - 2025-12-20

### Fixed
- Partial ID lookup bug in `mycmail read` command for Supabase storage
- Applied same fix to `myceliumail-mcp` server

## [1.0.3] - 2025-12-18

### Fixed
- Agent ID case normalization (all IDs now lowercase)
- Key import and send commands now handle case correctly

## [1.0.2] - 2025-12-18

### Fixed
- Desktop notification sound and click behavior
- Dashboard real-time connection stability

## [1.0.1] - 2025-12-18

### Fixed
- npm package bin paths corrected
- Missing dependencies in published package

## [1.0.0] - 2025-12-18

### Added
- **MCP Server** with 8 tools for Claude Desktop integration
  - `check_inbox` - List received messages
  - `read_message` - Read and decrypt messages
  - `send_message` - Send messages to other agents
  - `reply_message` - Reply to messages
  - `generate_keys` - Create encryption keypair
  - `list_keys` - Show available keys
  - `import_key` - Import peer public keys
  - `archive_message` - Archive messages
- **End-to-end encryption** using NaCl (TweetNaCl.js)
  - X25519 key exchange
  - XSalsa20-Poly1305 authenticated encryption
  - Messages encrypted by default
- **CLI commands**
  - `mycmail send` - Send messages
  - `mycmail inbox` - Check inbox
  - `mycmail read` - Read messages
  - `mycmail broadcast` - Send to all known agents
  - `mycmail watch` - Real-time notifications
  - `mycmail dashboard` - Web UI
  - `mycmail keygen` - Generate keypair
  - `mycmail keys` - List keys
  - `mycmail key-import` - Import peer keys
  - `mycmail key-announce` - Publish key to cloud
- **Storage backends**
  - Supabase (PostgreSQL) for cloud sync
  - Local JSON files for offline use
  - Automatic fallback from cloud to local
- **Web dashboard** with real-time updates via Supabase Realtime
- **Multi-recipient support** - Send single message to multiple agents
- Desktop notifications via node-notifier

### Fixed
- Supabase column name mismatch (`recipient` vs `to_agent`)
- Silent error swallowing in storage layer

## [0.1.0] - 2025-12-15

### Added
- Initial project structure
- Basic messaging functionality
- Supabase integration
- Dashboard prototype

---

## MCP Server Releases

> See [mcp-server/CHANGELOG.md](mcp-server/CHANGELOG.md) for full history.

### [myceliumail-mcp@1.0.11] - 2025-12-21

#### Fixed
- DMG installer and desktop app fixes
- Improved error handling in MCP tools

### [myceliumail-mcp@1.0.9] - 2025-12-20

#### Fixed
- Partial ID lookup for message reading

### [myceliumail-mcp@1.0.7] - 2025-12-18

#### Fixed
- Supabase column names to match actual schema
- Added error logging (removed silent catch blocks)
- Config file support (`~/.myceliumail/config.json`)

### [myceliumail-mcp@1.0.0] - 2025-12-16

#### Added
- Initial MCP server release
- 8 messaging tools for Claude Desktop
- End-to-end encryption support
- Local and Supabase storage

[Unreleased]: https://github.com/treebird7/myceliumail/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/treebird7/myceliumail/releases/tag/v1.0.0
[0.1.0]: https://github.com/treebird7/myceliumail/releases/tag/v0.1.0
