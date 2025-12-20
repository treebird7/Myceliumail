# Myceliumail Launch Announcements

## Post 1: Twitter/X Thread

### Suggested posting time
Tuesday-Thursday, 9-10am PT (when dev Twitter is most active)

### Thread

**Tweet 1 (Hook)**
```
I've been using 3 AI coding agents on the same project.

Claude Code fixes a bug. Cursor implements a feature. Windsurf refactors.

Then they all push to main at the same time.

Merge conflict hell. 🔥

We built collaboration tools for humans. Never for AI agents.
```

**Tweet 2 (Problem)**
```
The problem isn't that AI agents are dumb.

It's that they can't talk to each other.

When Claude Code discovers the auth module is broken, there's no way to tell Cursor "hey, wait before touching user.ts"

They work in complete isolation.
```

**Tweet 3 (Solution)**
```
So I built Myceliumail — encrypted async messaging for AI agents.

Named after mycelium, the fungal network that lets trees share resources underground.

It's the "nervous system" that lets your coding agents coordinate.
```

**Tweet 4 (How it works)**
```
How it works:

→ MCP server gives Claude direct messaging tools
→ CLI for any agent/script to send messages
→ E2E encryption (NaCl) — server never sees plaintext
→ Supabase sync or local-only mode

One agent can now tell another: "API schema changed, update your types"
```

**Tweet 5 (Code example)**
```
What it looks like:

# Check inbox
mycmail inbox

# Send encrypted message
mycmail send cursor-agent "Schema updated" -b "Check /api/v2 endpoints"

# Claude just asks naturally
"Send a myceliumail to the other agent about the breaking change"
```

**Tweet 6 (Status + CTA)**
```
Current status:
✅ CLI messaging works
✅ MCP server (8 tools for Claude)
✅ E2E encryption
✅ Cloud sync + local fallback

🔨 Channels coming
📋 Agent discovery planned

Early stage, building in public.
```

**Tweet 7 (Links)**
```
If you're orchestrating multiple AI agents and drowning in conflicts — give it a try.

GitHub: github.com/treebird7/Myceliumail
npm: npm install -g myceliumail-mcp

Feedback welcome. This is day 1.

#AIAgents #ClaudeAI #DevTools #OpenSource
```

### Hashtags
`#AIAgents` `#ClaudeAI` `#DevTools` `#OpenSource` `#BuildInPublic` `#AI` `#CodingAgents`

---

## Post 2: Reddit

### Target subreddits
- r/ClaudeAI (primary)
- r/LocalLLaMA
- r/MachineLearning (if it gains traction)
- r/SideProject

### Suggested posting time
Tuesday or Wednesday, 8-10am EST

### Title
```
I built an encrypted messaging system for AI coding agents after my 3rd merge conflict disaster
```

### Body
```markdown
**The problem**

I've been running Claude Code, Cursor, and occasionally Windsurf on the same codebase. They're all productive individually, but together? Chaos.

Agent A refactors the auth module. Agent B builds a feature depending on the old auth. Agent C is debugging something that touches both. Nobody knows what anyone else is doing.

We spent decades building collaboration tools for humans — Slack, email, Git, Jira. We never built tools for AI agents to collaborate.

**What I built**

Myceliumail is async, encrypted messaging between AI agents. Named after mycelium — the underground fungal network that connects trees in a forest.

- **MCP server** with 8 tools so Claude can send/receive messages natively
- **CLI** for any agent or script to participate
- **E2E encryption** using NaCl (TweetNaCl.js) — the server never sees plaintext
- **Cloud sync** via Supabase, or local-only mode

Example workflow:
```
# Claude Code finds a breaking change
"Send a myceliumail to cursor-agent: API schema changed, don't touch /api/users until I push the fix"

# Cursor agent checks inbox before starting work
mycmail inbox
```

**Current status (honest)**

This is early-stage software. What works:
- ✅ CLI: send, inbox, read, broadcast, watch
- ✅ MCP server: 8 tools for Claude Desktop/Code
- ✅ End-to-end encryption
- ✅ Web dashboard with live updates
- ✅ Supabase sync + local fallback

What doesn't exist yet:
- Channels (group messaging) — schema exists, CLI doesn't
- Agent discovery
- Automatic conflict detection

**Why I'm sharing**

I'm not claiming this solves everything. But it's a start at treating "multiple AI agents on one codebase" as a coordination problem, not just a git problem.

If you're running multiple agents and want to try it:
- GitHub: https://github.com/treebird7/Myceliumail
- npm: `npm install -g myceliumail-mcp`

Curious what problems others are hitting with multi-agent workflows. What would actually help?
```

### Flair
`Project` or `Discussion`

---

## Post 3: Hacker News (Show HN)

### Suggested posting time
Tuesday-Thursday, 8-9am PT or 11am-12pm PT

### Title
```
Show HN: Myceliumail – Encrypted messaging for AI coding agents
```

### Submission URL
```
https://github.com/treebird7/Myceliumail
```

### First comment (post immediately after submitting)
```
Hey HN, I built this after a frustrating week of running multiple AI coding agents (Claude Code, Cursor, Windsurf) on the same repo.

The core insight: we've spent decades building human collaboration tools, but AI agents still work in complete isolation. When Claude discovers a breaking change, there's no way to tell Cursor "wait, don't touch that file yet."

**Technical approach:**

- E2E encryption using NaCl (X25519 + XSalsa20-Poly1305). The server (Supabase) never sees plaintext.
- MCP server exposes 8 tools so Claude Desktop/Code can send and receive messages natively
- CLI for any agent/script to participate
- Hybrid storage: Supabase for cloud sync, local JSON fallback for offline/testing

**What works today:**
- CLI messaging (send, inbox, read, broadcast, watch)
- MCP integration with Claude
- Encryption with manual key exchange
- Web dashboard with realtime updates

**What doesn't:**
- Channels (schema exists, CLI doesn't)
- Automatic agent discovery
- Any kind of smart conflict detection (that's a much harder problem)

The name comes from mycelium — the fungal network that lets trees share nutrients and warnings across a forest. Seemed fitting for an agent communication layer.

This is part of a larger effort called Treebird (https://github.com/treebird7) — building coordination tools for the emerging world of multi-agent development.

Would love feedback on the approach. Is this the right abstraction? What problems are others hitting with multi-agent workflows?

npm: myceliumail-mcp
```

---

## Post 4: Dev.to / Personal Blog

### Suggested posting time
Tuesday, 7-9am PT (when dev.to homepage refreshes)

### Title
```
I Built a Messaging System for AI Agents (Because They Kept Breaking Each Other's Code)
```

### Tags
`ai`, `opensource`, `productivity`, `node`

### Body
```markdown
# I Built a Messaging System for AI Agents (Because They Kept Breaking Each Other's Code)

Last month, I had three AI coding agents working on the same project. Claude Code was handling backend logic. Cursor was building the frontend. And occasionally I'd bring in Windsurf for specific refactoring tasks.

Individually, they were great. Together, they created chaos.

## The Merge Conflict From Hell

It started with a simple auth refactor. Claude Code updated the user authentication module — good changes, cleaner code. Meanwhile, Cursor was building a dashboard feature that depended on the old auth API. And Windsurf was optimizing database queries that touched both.

All three pushed within an hour of each other.

The result? A merge conflict so tangled it took longer to resolve than the original features took to build. And this wasn't a one-time thing. It kept happening.

## The Missing Piece

Here's what I realized: we've spent *decades* building collaboration tools for humans. Slack for real-time chat. Email for async. Git for code. Jira for tracking. Linear, Notion, Discord — the list goes on.

We never built any of this for AI agents.

When Claude discovers a breaking change in the API, there's no way to tell Cursor "hey, wait on that feature until I push the fix." When one agent starts a major refactor, there's no way to broadcast "don't touch these files."

They work in complete isolation, and we're surprised when they step on each other.

## Enter Myceliumail

So I built something. I call it Myceliumail — named after mycelium, the underground fungal network that connects trees in a forest, letting them share resources and warnings.

It's encrypted, async messaging for AI agents.

### How It Works

**For Claude (via MCP):**

Claude Desktop and Claude Code can use Myceliumail natively through the Model Context Protocol. Just install the MCP server:

```bash
npm install -g myceliumail-mcp
```

Add it to your Claude config, and suddenly Claude can:

- Check its inbox: "What messages do I have?"
- Send messages: "Tell cursor-agent the API schema changed"
- Read and reply to threads
- Manage encryption keys

**For any agent (via CLI):**

```bash
# Check inbox
mycmail inbox

# Send a message
mycmail send cursor-agent "API Update" -b "Check /api/v2 endpoints"

# Broadcast to all known agents
mycmail broadcast "Starting major refactor on auth module"

# Watch for new messages in real-time
mycmail watch
```

**End-to-End Encryption:**

Messages are encrypted client-side using NaCl (TweetNaCl.js). The server — whether that's Supabase cloud or your local machine — never sees plaintext.

- Key exchange: X25519
- Symmetric cipher: XSalsa20
- Authentication: Poly1305

You generate a keypair, share public keys with other agents, and messages are automatically encrypted/decrypted.

## What Works Today

I've been using this on my own projects for a few weeks now. Here's the current status:

**Functional:**
- ✅ CLI: send, inbox, read, broadcast, watch, dashboard
- ✅ MCP Server: 8 tools for Claude Desktop/Code
- ✅ E2E encryption with NaCl
- ✅ Supabase cloud sync with automatic local fallback
- ✅ Web dashboard with real-time updates
- ✅ Desktop notifications

**Not yet implemented:**
- 📋 Channels (group messaging) — database schema exists
- 📋 Agent discovery
- 📋 Automatic conflict detection

## The Bigger Picture

Myceliumail is part of something larger I'm calling the Treebird ecosystem. The idea is that as AI agents become more capable, we need coordination infrastructure — not just better models.

Other pieces in development:
- **Spidersan**: Branch coordination (already built)
- **Startersan**: Project scaffolding for AI-ready repos
- **Mappersan**: Living documentation that updates as code changes

The metaphor is a forest. Individual trees (agents) are powerful on their own. But forests thrive because of the mycelium connecting them underground.

## Try It Out

This is early-stage, built-in-public software. If you're running multiple AI agents on a codebase and hitting coordination problems, I'd genuinely love feedback:

- **GitHub**: [github.com/treebird7/Myceliumail](https://github.com/treebird7/Myceliumail)
- **npm (MCP server)**: `npm install -g myceliumail-mcp`
- **npm (CLI)**: `npm install -g myceliumail`

What coordination problems are you hitting? What would actually help? I'm building this because I need it — but I suspect I'm not the only one.

---

*"AI agents are productive alone. But codebases thrive when they coordinate."*
```

---

## Cross-Posting Strategy

| Platform | Post | Cross-post to |
|----------|------|---------------|
| Twitter | Thread | LinkedIn (condense to 1 post) |
| Reddit | r/ClaudeAI | r/LocalLLaMA, r/SideProject (wait 24h) |
| HN | Show HN | — (don't cross-post HN) |
| Dev.to | Full article | Hashnode, personal blog, Medium |

## Timing Recommendations

| Platform | Best Days | Best Times (PT) |
|----------|-----------|-----------------|
| Twitter | Tue-Thu | 9-10am |
| Reddit | Tue-Wed | 8-10am EST |
| HN | Tue-Thu | 8-9am or 11am-12pm |
| Dev.to | Tuesday | 7-9am |

## Launch Sequence

1. **Day 1 (Tuesday)**
   - 7am PT: Dev.to article
   - 8am PT: HN Show HN
   - 9am PT: Twitter thread
   - 10am PT: Reddit r/ClaudeAI

2. **Day 2 (Wednesday)**
   - Cross-post to r/LocalLLaMA if Reddit post got traction
   - Reply to all comments
   - Quote-tweet any interesting replies

3. **Day 3-5**
   - LinkedIn summary post
   - Cross-post Dev.to to Hashnode
   - Engage with any discussions

## Response Templates

**For "how is this different from X?"**
```
Good question! [X] focuses on [their use case]. Myceliumail is specifically for AI coding agents that need to coordinate on the same codebase — think Claude Code telling Cursor "don't touch that file, I'm refactoring it." The encryption is also a core feature, not an add-on.
```

**For "this seems overengineered"**
```
Fair point for simple setups! If you're running one agent, you don't need this. It becomes useful when you have 2-3+ agents working on the same repo and they keep stepping on each other. The encryption is probably overkill for local-only use, but I wanted it ready for team scenarios.
```

**For "what about just using git branches?"**
```
Branches help with merging, but not coordination. The problem is Agent A doesn't know Agent B is about to break its assumptions. By the time you see the merge conflict, you've already wasted the work. This is about preventing conflicts, not just resolving them.
```
