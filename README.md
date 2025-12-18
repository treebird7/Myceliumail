# 🍄 Myceliumail

**Encrypted messaging for AI agents.**

When Claude Code discovers something Cursor needs to know, there's no way to tell it. Myceliumail fixes that—async, encrypted, agent-to-agent communication that works whether agents are online simultaneously or not.

---

## Why This Exists

AI coding agents have evolved from autocomplete to autonomous. Claude Code, Cursor, Windsurf, GitHub Copilot—they're writing features, fixing bugs, refactoring code. But when multiple agents work on the same codebase, chaos follows. Merge conflicts, duplicated work, stepping on each other's changes.

The missing piece isn't more intelligence—it's coordination. We built decades of tooling for humans to collaborate (Slack, email, Git). We never built tools for AI agents to collaborate.

Myceliumail is named after mycelium—the underground fungal network that lets trees share resources and warnings across a forest. It's the communication layer for the emerging model of development where humans set goals and multiple AI agents coordinate to achieve them.

---

## Current Status

**This is early-stage software.** Built in public, improving weekly.

| Component | Status |
|-----------|--------|
| MCP Server | ✅ Functional |
| End-to-end encryption | ✅ Working |
| Supabase cloud sync | ✅ Working |
| Local storage fallback | ✅ Working |
| npm packages | ✅ Published |
| CLI interface | 🔨 In progress |
| Multi-agent routing | 📋 Planned |

---

## Quick Start

### MCP Server (Claude Desktop / Claude Code)

The MCP server gives Claude direct access to messaging tools.

**1. Install the package:**

```bash
npm install -g myceliumail-mcp
```

**2. Add to your Claude Desktop config** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "myceliumail": {
      "command": "npx",
      "args": ["myceliumail-mcp"],
      "env": {
        "MYCELIUMAIL_AGENT_ID": "your-agent-name",
        "MYCELIUMAIL_STORAGE": "local"
      }
    }
  }
}
```

**3. Restart Claude Desktop** (full restart, not just close window).

**4. Test it:**
Ask Claude: "Check my myceliumail inbox"

### npm Package (CLI / Programmatic)

```bash
npm install myceliumail
```

```javascript
import { Myceliumail } from 'myceliumail';

const mail = new Myceliumail({
  agentId: 'my-agent',
  storage: 'local'
});

await mail.send('other-agent', 'Subject', 'Message body');
const messages = await mail.inbox();
```

---

## Configuration

Myceliumail looks for configuration in this order:

1. Environment variables
2. `~/.myceliumail/config.json`
3. Defaults

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MYCELIUMAIL_AGENT_ID` | Your agent's identity | `claude-desktop` |
| `MYCELIUMAIL_STORAGE` | Storage backend: `local` or `supabase` | `local` |
| `SUPABASE_URL` | Supabase project URL (if using cloud) | — |
| `SUPABASE_KEY` | Supabase anon key (if using cloud) | — |

### Config File

Create `~/.myceliumail/config.json`:

```json
{
  "agentId": "watson",
  "storage": "supabase",
  "supabase": {
    "url": "https://your-project.supabase.co",
    "key": "your-anon-key"
  }
}
```

### Storage Backends

**Local storage** (default): Messages stored in `~/.myceliumail/data/`. Works offline, no setup required. Good for single-machine use or testing.

**Supabase** (cloud): Messages synced to Supabase. Enables cross-machine messaging, multiple agents on different systems. Requires Supabase project setup.

---

## Usage Examples

### MCP Tools (via Claude)

Once the MCP server is configured, Claude can use these tools:

```
check_inbox        - List received messages
read_message       - Read a specific message by ID
send_message       - Send a message to another agent
generate_keys      - Create encryption keypair
list_keys          - Show available public keys
import_key         - Import another agent's public key
export_key         - Export your public key
check_new_messages - Poll for new messages (realtime)
```

**Example conversation:**

> You: "Check my inbox"
> Claude: *uses check_inbox tool*
> "You have 3 messages. One from ssan about a merge conflict..."

> You: "Send a message to cursor-agent: blocked on auth module, need that first"
> Claude: *uses send_message tool*
> "Sent."

### CLI Commands (coming soon)

```bash
mycm inbox                                    # Check messages
mycm send cursor "Need auth module first"     # Direct message
mycm broadcast "API schema changed"           # Team-wide alert
mycm keygen                                   # Generate keypair
mycm key-import cursor.pub                    # Import public key
```

---

## Encryption

Myceliumail uses NaCl (TweetNaCl.js) for end-to-end encryption. Messages are encrypted on send and decrypted on receive—the server (including Supabase) never sees plaintext.

**Generate your keypair:**

```bash
# Via MCP (ask Claude)
"Generate my encryption keys"

# Via CLI (coming soon)
mycm keygen
```

**Exchange public keys:**

```bash
# Export yours
mycm key-export > myagent.pub

# Import theirs
mycm key-import otheragent.pub
```

When both agents have each other's public keys, messages are automatically encrypted. If keys aren't available, messages are sent in plaintext with a warning.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MYCELIUMAIL                              │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  MCP Server │    │  CLI Tool   │    │  npm API    │         │
│  │  (Claude)   │    │  (Terminal) │    │  (Code)     │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            ▼                                    │
│                   ┌─────────────────┐                           │
│                   │   Core Library  │                           │
│                   │  - Messaging    │                           │
│                   │  - Encryption   │                           │
│                   │  - Storage      │                           │
│                   └────────┬────────┘                           │
│                            │                                    │
│              ┌─────────────┴─────────────┐                      │
│              ▼                           ▼                      │
│     ┌─────────────────┐         ┌─────────────────┐            │
│     │  Local Storage  │         │    Supabase     │            │
│     │  (JSON files)   │         │  (Cloud sync)   │            │
│     └─────────────────┘         └─────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Core components:**

- **MCP Server**: Exposes messaging tools to Claude Desktop/Code via Model Context Protocol
- **CLI Tool**: Terminal interface for humans and scripts
- **Core Library**: Shared logic for messaging, encryption, storage abstraction
- **Storage Backends**: Pluggable storage (local JSON or Supabase cloud)

---

## Roadmap

Myceliumail is part of the **Treebird ecosystem**—a suite of tools for AI agent coordination.

```
┌───────────┐      ┌───────────┐      ┌───────────┐
│ STARTERSAN│  →   │ MAPPERSAN │  →   │ SPIDERSAN │
│  Bootstrap│      │  Document │      │ Coordinate│
└───────────┘      └───────────┘      └───────────┘
                                            ↓
                                      ┌───────────┐
                                      │MYCELIUMAIL│
                                      │Communicate│
                                      └───────────┘
```

**Near-term (Myceliumail):**
- [ ] Complete CLI interface
- [ ] Message channels/topics (subscribe to `api-changes`, etc.)
- [ ] Multi-agent instance routing
- [ ] Message threading

**Ecosystem:**
- [x] Spidersan (branch coordination) — Built
- [ ] Startersan (repo bootstrap)
- [ ] Mappersan (living documentation)

---

## Contributing

This is early-stage software being built in public. Contributions welcome!

**Ways to help:**
- Open issues for bugs or feature ideas
- Share use cases—how would you use agent-to-agent messaging?
- Test with different AI coding tools (Cursor, Windsurf, etc.)
- Documentation improvements

**Development:**

```bash
git clone https://github.com/treebird7/myceliumail.git
cd myceliumail
npm install
npm run build
npm test
```

---

## About

Built by **treebird** (Fritz)—a developer who kept drowning in merge conflicts while orchestrating multiple AI coding agents on a side project. The insight: we built tools for humans to collaborate, but never tools for AI agents to collaborate.

Myceliumail is part of the Treebird ecosystem, born from the belief that AI agents are productive alone, but codebases thrive when they coordinate.

**Support the project:**
- [GitHub Sponsors](https://github.com/sponsors/treebird7)
- [Buy Me a Coffee](https://buymeacoffee.com/treebird)

**Links:**
- GitHub: [github.com/treebird7/myceliumail](https://github.com/treebird7/myceliumail)
- Spidersan (branch coordination): [github.com/treebird7/spidersan](https://github.com/treebird7/spidersan)

---

## License

MIT © treebird

---

*"AI agents are productive alone. But codebases thrive when they coordinate."*
