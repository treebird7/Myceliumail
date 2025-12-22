# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
