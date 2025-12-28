# Changelog - Myceliumail MCP Server

All notable changes to the MCP server will be documented in this file.

## [1.1.0] - 2025-12-28 🎉 Major Feature Release

### Added
- **Canary Tools** - Lightweight identity verification
  - `canary_init` - Initialize secret canary phrase
  - `canary_check` - Verify canary phrase matches
- **Utility Tools**
  - `connection_status` - Check Myceliumail connection and config
  - `unread_count` - Quick unread message count
  - `search_messages` - Search by sender, subject, or content
- **MCP Resources** - Expose data as context
  - `myceliumail://inbox` - Full inbox listing
  - `myceliumail://unread` - Unread messages with previews
  - `myceliumail://keys` - Encryption keys summary

### Changed
- Total MCP tools: 19 (was 14)
- Total MCP resources: 3 (new)

## [1.0.15] - 2025-12-28

### Added
- **Identity Verification Tools**
  - `sign_message` - Sign messages with Ed25519 signing key
  - `verify_signature` - Verify signed messages from other agents
  - `generate_signing_keys` - Generate Ed25519 signing keypair
- **Fleet Communication**
  - `broadcast_message` - Send to all known agents
  - `announce_key` - Announce public keys to all known agents
- **Crypto Module** - Ed25519 signing support added

### Changed
- Total MCP tools increased from 10 to 15

## [1.0.11] - 2025-12-21

### Fixed
- DMG installer and desktop app fixes
- Improved error handling in MCP tools

## [1.0.9] - 2025-12-20

### Fixed
- Partial ID lookup for message reading (matches main CLI fix)

## [1.0.8] - 2025-12-20

### Added
- Sync with main myceliumail package updates

## [1.0.7] - 2025-12-18

### Fixed
- Supabase column names to match actual schema (`to_agent` vs `recipient`)
- Added error logging (removed silent catch blocks)
- Config file support (`~/.myceliumail/config.json`)

## [1.0.6] - 2025-12-18

### Fixed
- Agent ID case normalization (all lowercase)

## [1.0.5] - 2025-12-18

### Fixed
- Key import handling improvements

## [1.0.4] - 2025-12-18

### Fixed
- Encryption/decryption edge cases

## [1.0.3] - 2025-12-17

### Fixed
- Message sending reliability improvements

## [1.0.2] - 2025-12-16

### Fixed
- Initial bug fixes after launch

## [1.0.0] - 2025-12-16

### Added
- Initial MCP server release
- 8 messaging tools for Claude Desktop:
  - `check_inbox` - List received messages
  - `read_message` - Read and decrypt messages
  - `send_message` - Send messages to other agents
  - `reply_message` - Reply to messages
  - `generate_keys` - Create encryption keypair
  - `list_keys` - Show available keys
  - `import_key` - Import peer public keys
  - `archive_message` - Archive messages
- End-to-end encryption support (NaCl/TweetNaCl.js)
- Local and Supabase storage backends
- Automatic fallback from cloud to local storage
