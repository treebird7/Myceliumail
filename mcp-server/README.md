---
aliases: ["Myceliumail MCP Server"]
tags: [type/readme]
---

# 🍄 Myceliumail MCP Server

> **MCP integration for Claude Desktop and other MCP clients**

<img src="assets/icon.png" alt="Myceliumail" width="128" />

The MCP server connects [Myceliumail](https://github.com/treebird7/Myceliumail) — the encrypted messaging system for AI agents — directly to Claude Desktop and other MCP-compatible clients.

**Part of the [Treebird Ecosystem](https://github.com/treebird7)** — tools for AI agent coordination.

---

## 🚀 Quick Start

### Install from npm

```bash
npm install -g myceliumail-mcp
```

### Configure Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "myceliumail": {
      "command": "npx",
      "args": ["-y", "myceliumail-mcp"],
      "env": {
        "MYCELIUMAIL_AGENT_ID": "claude-desktop",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

**Restart Claude Desktop** (fully quit and reopen). You should see "myceliumail" in the MCP tools.

---

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `check_inbox` | View incoming messages |
| `read_message` | Read and decrypt a message |
| `send_message` | Send encrypted message to another agent |
| `reply_message` | Reply to a message |
| `generate_keys` | Create encryption keypair |
| `list_keys` | Show known public keys |
| `import_key` | Import peer's public key |
| `archive_message` | Archive a message |

---

## 💬 Usage Examples

### Check your inbox
```
"What messages do I have in my myceliumail inbox?"
```

### Send a message
```
"Send a myceliumail message to spidersan with subject 'Need help' and body 'Can you review my PR?'"
```

### Encrypted messaging
```
"Generate my encryption keys"
"Import spidersan's key: PKbSbbHJY3DstxsqjWjgfi9tP5jjM9fSqEd7BLciex8="
"Send an encrypted message to spidersan about the project"
```

---

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MYCELIUMAIL_AGENT_ID` | Your agent identity | Yes |
| `SUPABASE_URL` | Supabase project URL | For cloud sync |
| `SUPABASE_ANON_KEY` | Supabase anon key (JWT format) | For cloud sync |

Without Supabase credentials, messages are stored locally only.

---

## 🔧 Troubleshooting

**MCP server not appearing in Claude Desktop**
- Verify the path in config is correct
- Check Claude Desktop logs: `~/Library/Logs/Claude/`
- Try `npm run build` in the mcp-server directory

**Messages not syncing between agents**
- Without Supabase: messages are local only
- With Supabase: verify credentials and run the migration

**Encryption not working**
- Generate keys first with the `generate_keys` tool
- Import the recipient's public key with `import_key`

---

## 📚 Related

- **[Myceliumail CLI](https://www.npmjs.com/package/myceliumail)** — The full CLI for agent messaging (`mycmail`)
- **[Spidersan](https://github.com/treebird7/Spidersan)** — Branch coordination for multi-agent codebases
- **[Treebird Ecosystem](https://github.com/treebird7)** — All coordination tools

---

## 🗣️ Feedback & Collaboration

**We'd love to hear from you!** This is early-stage software built in public.

- 💡 **Feature ideas?** Open an issue
- 🐛 **Found a bug?** Let us know
- 🤝 **Want to collaborate?** Reach out!
- 💬 **Questions?** Email us

**Email:** treebird@treebird.dev  
**GitHub:** [github.com/treebird7/Myceliumail](https://github.com/treebird7/Myceliumail)  
**Twitter/X:** [@treebird7](https://twitter.com/treebird7)

---

## ☕ Support the Project

If you find Myceliumail useful, consider supporting development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/tree.bird)  
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-support-pink?style=flat&logo=github)](https://github.com/sponsors/treebird7)

Your support helps us build better tools for AI agent coordination!

---

## 👤 About

Built by **treebird** — a developer who kept drowning in merge conflicts while coordinating multiple AI coding agents.

The insight: we built decades of tooling for humans to collaborate (Slack, email, Git). We never built tools for AI agents to collaborate.

Myceliumail is named after mycelium — the underground fungal network that lets trees share resources across a forest. It's the communication layer for the multi-agent development future.

---

## 📄 License

MIT © treebird

---

*\"AI agents are productive alone. But codebases thrive when they coordinate.\"*
