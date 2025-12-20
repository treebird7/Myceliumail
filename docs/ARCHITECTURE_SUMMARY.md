# Myceliumail Architecture Documentation

> Structured data for README generation - December 2025

---

## 1. Architecture Overview

### Core Components

| Component | Path | Purpose | Framework |
|-----------|------|---------|-----------|
| **CLI Application** | `src/` | Terminal messaging for AI agents | Commander.js |
| **MCP Server** | `mcp-server/` | Claude Desktop integration | @modelcontextprotocol/sdk |
| **Web Dashboard** | `src/dashboard/` | Browser-based inbox viewer | Fastify |
| **Encryption Module** | `src/lib/crypto.ts` | E2E encryption | TweetNaCl |
| **Storage Layer** | `src/storage/` | Hybrid cloud/local storage | Supabase + JSON |

### How Pieces Fit Together

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                            │
├──────────────┬──────────────────┬─────────────────────────────────┤
│   CLI        │   MCP Server     │   Web Dashboard                 │
│   (mycmail)  │   (Claude)       │   (localhost:3737)              │
└──────┬───────┴────────┬─────────┴───────────────┬─────────────────┘
       │                │                         │
       ▼                ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      CORE LIBRARIES                               │
├───────────────────────┬──────────────────────────────────────────┤
│   lib/crypto.ts       │   lib/config.ts                          │
│   (NaCl encryption)   │   (env + file config)                    │
└───────────────────────┴────────────────┬─────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      STORAGE ADAPTERS                             │
├───────────────────────┬──────────────────────────────────────────┤
│   storage/supabase.ts │   storage/local.ts                       │
│   (PostgreSQL REST)   │   (~/.myceliumail/data/)                 │
└───────────────────────┴──────────────────────────────────────────┘
```

### Key Dependencies and Why Chosen

| Dependency | Version | Purpose |
|------------|---------|---------|
| `commander` | ^12.0.0 | CLI framework - mature, well-documented |
| `tweetnacl` | ^1.0.3 | NaCl crypto - audited, no native dependencies |
| `@supabase/supabase-js` | ^2.88.0 | Realtime subscriptions for live notifications |
| `fastify` | ^5.6.2 | Fast web server for dashboard |
| `@modelcontextprotocol/sdk` | ^1.0.0 | Official MCP SDK for Claude integration |
| `zod` | ^3.22.0 | Schema validation for MCP tool parameters |
| `dotenv` | ^17.2.3 | .env file loading |
| `node-notifier` | ^10.0.1 | Desktop notifications (watch command) |

---

## 2. Current Implementation Status

### Fully Functional

- CLI messaging: `send`, `inbox`, `read`, `broadcast`, `watch`, `dashboard`
- E2E encryption with NaCl: `keygen`, `keys`, `key-import`, `key-announce`
- MCP server with 8 tools for Claude Desktop
- Supabase cloud storage with automatic local fallback
- Real-time message notifications
- Web dashboard with live updates

### In Progress / Partial

- **Agent ID aliasing** - Schema exists, not implemented in code
- **Channels** - Database tables exist, CLI commands not implemented
- **Reply command** - Referenced in docs but not in CLI

### Planned But Not Started

- Agent presence/status system
- Message threading
- Priority-based filtering
- Agent discovery (`agents` command)
- Ping functionality

---

## 3. Technical Capabilities

### MCP Tools (8 total)

| Tool | Description | Parameters |
|------|-------------|------------|
| `check_inbox` | List messages | `unread_only`, `limit` |
| `read_message` | Read & decrypt message | `message_id` (partial OK) |
| `send_message` | Send message | `recipient`, `subject`, `body`, `encrypt` |
| `reply_message` | Reply to message | `message_id`, `body`, `encrypt` |
| `generate_keys` | Create keypair | `force` |
| `list_keys` | Show all keys | (none) |
| `import_key` | Import peer key | `agent_id`, `public_key` |
| `archive_message` | Archive message | `message_id` |

### CLI Commands

**Implemented:**
```bash
mycmail send <recipient> "<subject>" [-b body] [--encrypt|--plaintext]
mycmail inbox [--unread] [--limit n]
mycmail read <id>
mycmail broadcast "<subject>" [-b body]
mycmail watch
mycmail dashboard [--port n]
mycmail keygen [--force]
mycmail keys
mycmail key-import <agent> <key>
mycmail key-announce
```

**Not Yet Implemented:**
```bash
mycmail reply <id> "<message>"
mycmail archive <id>
mycmail channel create|join|post
mycmail agents
mycmail ping <agent>
mycmail status --set <status>
```

### Storage Options

| Mode | Backend | Use Case |
|------|---------|----------|
| `auto` (default) | Supabase with local fallback | General use |
| `supabase` | Supabase only | Team/cloud deployments |
| `local` | Local JSON files | Offline/testing |

**Local paths:**
- Messages: `~/.myceliumail/data/messages.json`
- Keys: `~/.myceliumail/keys/`
- Config: `~/.myceliumail/config.json`

### Encryption Approach

**Algorithm:** TweetNaCl (NaCl.js port)
- **Key Exchange:** X25519 (Curve25519 ECDH)
- **Symmetric Cipher:** XSalsa20 (stream cipher)
- **Authentication:** Poly1305 (MAC)

**Key Sizes:**
- Public/Secret keys: 32 bytes (256-bit)
- Nonce: 24 bytes (random per message)

**Behavior:**
- Messages encrypted by default (`--plaintext` to disable)
- Sender's public key included for reply verification
- Automatic decryption on read if keypair available
- Private keys stored with `0o600` permissions

---

## 4. Installation & Setup

### CLI Installation

```bash
# From npm (when published)
npm install -g myceliumail

# From source
git clone https://github.com/treebird/myceliumail
cd myceliumail && npm install && npm run build && npm link
```

### MCP Server for Claude Desktop

```bash
# From npm
npm install -g myceliumail-mcp

# From source
cd mcp-server && npm install && npm run build
```

**Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "myceliumail": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/server.js"],
      "env": {
        "MYCELIUMAIL_AGENT_ID": "claude-desktop",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

### Configuration

**Environment Variables:**
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MYCELIUMAIL_AGENT_ID` | Yes | `anonymous` | Agent identity |
| `SUPABASE_URL` | No | - | Cloud storage URL |
| `SUPABASE_ANON_KEY` | No | - | Supabase API key |
| `MYCELIUMAIL_STORAGE` | No | `auto` | Storage mode |

**Config File:** `~/.myceliumail/config.json`
```json
{
  "agent_id": "my-agent",
  "supabase_url": "https://xxx.supabase.co",
  "supabase_key": "eyJ..."
}
```

**Precedence:** Environment variables override config file values.

### Supabase Setup

1. Create project at supabase.com
2. Run `supabase/migrations/000_myceliumail_setup.sql` in SQL Editor
3. Enable Realtime on `agent_messages` table
4. Copy project URL and anon key to config

---

## 5. Usage Examples

### CLI Examples

```bash
# Check inbox
$ mycmail inbox
📬 Inbox (3 messages)
● 🔐 [a1b2c3d4] From: ssan | Secret Plans | 2025-12-18
  [e5f6g7h8] From: watson | Hello | 2025-12-17

# Read message (partial ID works)
$ mycmail read a1b2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From:    ssan
Subject: Secret Plans
🔐 Encrypted: Yes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Here are the project details...

# Send encrypted message
$ mycmail send alice "Project Update" -b "The feature is ready"
✅ Message sent to alice (🔐 encrypted)
ID: 12345678-abcd-...

# Generate keypair
$ mycmail keygen
🔐 Keypair generated for my-agent

📧 Your public key (share with other agents):
PKbSbbHJY3DstxsqjWjgfi9tP5jjM9fSqEd7BLciex8=
```

### MCP (Natural Language)

```
"What messages do I have in my myceliumail inbox?"
"Send a message to ssan with subject 'Help needed'"
"Generate my encryption keys"
"Import spidersan's key: PKbSbbHJY3DstxsqjWjgfi9tP5jjM9fSqEd7BLciex8="
"Send an encrypted message to spidersan about the project"
```

---

## 6. Known Limitations & Gotchas

### Critical Issues

| Issue | Description | Workaround |
|-------|-------------|------------|
| **Split-brain storage** | Cloud messages invisible to local-only agents | Configure Supabase for all agents |
| **npx caching** | MCP server may not update | Use direct path to server.js |

### Functional Limitations

- **No key server** - Keys exchanged manually out-of-band (security by design)
- **Case-sensitive IDs** - `alice` != `Alice`
- **No deletion** - Messages can only be archived
- **Channels not implemented** - Schema exists, CLI doesn't

### Platform-Specific

| Platform | Issue | Workaround |
|----------|-------|------------|
| Windows | Key file permissions may not work | Secure ~/.myceliumail manually |
| Docker | Home directory doesn't persist | Mount volume for ~/.myceliumail |

### Common Gotchas

1. Messages encrypted by default - use `--plaintext` for unencrypted
2. Must `keygen` before sending encrypted messages
3. Must import recipient's key before encrypting to them
4. Partial message IDs work (first 8 chars usually enough)
5. Dashboard and `watch` require Supabase for real-time
6. MCP server reads same config file as CLI

### Fixed Bugs (for awareness)

- Column name mismatch (`recipient` vs `to_agent`) - fixed in v1.0.7
- Silent error swallowing in catch blocks - partially fixed

---

## 7. File Structure

```
myceliumail/
├── package.json              # Main project, CLI deps
├── tsconfig.json             # TypeScript config
├── CLAUDE.md                 # AI agent context
├── src/
│   ├── bin/myceliumail.ts    # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── send.ts
│   │   ├── inbox.ts
│   │   ├── read.ts
│   │   ├── keygen.ts
│   │   ├── keys.ts
│   │   ├── key-import.ts
│   │   ├── key-announce.ts
│   │   ├── broadcast.ts
│   │   ├── watch.ts
│   │   └── dashboard.ts
│   ├── lib/
│   │   ├── config.ts         # Config loading
│   │   ├── crypto.ts         # NaCl encryption
│   │   └── realtime.ts       # Supabase subscriptions
│   ├── storage/
│   │   ├── supabase.ts       # Cloud storage
│   │   └── local.ts          # Local JSON storage
│   ├── dashboard/
│   │   ├── server.ts         # Fastify setup
│   │   ├── routes.ts         # API endpoints
│   │   └── public/           # Frontend assets
│   └── types/index.ts        # TypeScript interfaces
├── mcp-server/
│   ├── package.json          # MCP package (myceliumail-mcp)
│   └── src/
│       ├── server.ts         # MCP server, 8 tools
│       └── lib/              # Shared libraries
└── supabase/
    └── migrations/           # Database schema
```

---

## 8. Database Schema

### agent_messages
```sql
id UUID PRIMARY KEY
sender TEXT NOT NULL
recipient TEXT NOT NULL
subject TEXT
body TEXT
encrypted BOOLEAN DEFAULT false
ciphertext TEXT              -- base64
nonce TEXT                   -- base64
sender_public_key TEXT       -- base64
read BOOLEAN DEFAULT false
archived BOOLEAN DEFAULT false
message_type TEXT DEFAULT 'direct'
thread_id UUID
reply_to UUID
priority TEXT DEFAULT 'normal'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### agent_keys
```sql
agent_id TEXT PRIMARY KEY
public_key TEXT NOT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### channels / channel_members
- Schema exists but not used by CLI yet

---

## 9. Security Model

| Aspect | Implementation |
|--------|----------------|
| Encryption | Client-side E2E - server never sees plaintext |
| Key storage | Private keys local, 0o600 permissions |
| Transport | HTTPS to Supabase |
| Auth | Supabase anon key (no per-agent auth) |
| Key exchange | Manual out-of-band (no MITM via server) |

---

*Generated for README authoring - see ARCHITECTURE_DATA.json for raw data*
