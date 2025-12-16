# Treebird Ecosystem - Knowledge Base v2

**Last Updated:** 2025-12-15
**Supersedes:** v1 (Spidersan-focused)

---

## The Big Picture

> "The forest is more than a collection of trees. It's a network—roots intertwined, mycelium connecting, birds carrying seeds between canopies. Each tree is productive alone, but the forest thrives because they coordinate."

**Treebird makes the forest.**

In the Treebird metaphor:
- **Code is the tree** — The structure being built
- **AI agents are the birds** — Mobile, productive, needing coordination
- **Mycelium is the communication layer** — Underground network sharing nutrients (context) and signals (messages)

---

## Origin Story

The ecosystem emerged from Recovery Tree development. Treebird (the human orchestrator) was building a digital recovery platform and kept drowning in branch merge chaos with Supabase + GitHub + Vercel. Multiple AI agents working productively but creating coordination nightmares.

The insight: **We built tools for humans to collaborate. We never built tools for AI agents to collaborate.**

The solution: Build the infrastructure for the emerging model of development—where humans set goals, multiple AIs coordinate, AIs propose merge plans, and humans approve.

---

## The Four Tools

### 1. Startersan (stsan) — The Entry Point

**Problem:** AI agents waste time learning codebases. They grep, search, hallucinate file structures.

**Solution:** Bootstraps any repository with AI-agent-optimized documentation.

```bash
/startersan

→ Analyzes repository structure
→ Generates CLAUDE.md (auto-loaded by Claude Code)
→ Creates AGENT_GUIDE.md (30-second quick reference)
→ Creates LIMITATIONS.md (what the system CAN'T do)
```

**Form:** Claude Code skill (free forever)
**Status:** Roadmap

---

### 2. Mappersan (msan) — The Documenter

**Problem:** Documentation rots. The moment code changes, docs become lies.

**Solution:** Automatically generates and maintains AI-agent-ready documentation.

```bash
msan init          # Initial documentation generation
msan sync          # Update docs to match code
msan watch         # Auto-sync on file changes
msan verify        # Check doc accuracy
```

**Form:** npm CLI (free core, paid watch mode)
**Status:** Roadmap

**Integration:** Mappersan automates what Startersan bootstraps. Startersan gets you started; Mappersan keeps you current.

---

### 3. Spidersan (ssan) — The Coordinator

**Problem:** Multiple AI agents create branches without coordination, causing merge conflicts and duplicated work.

**Solution:** Air traffic control for AI coding sessions.

```bash
ssan register --files src/api.ts    # Declare what you're working on
ssan conflicts                       # See overlapping work
ssan merge-order                     # Get optimal merge sequence
ssan ready-check                     # Validate before PR
```

**Rescue Mode** (when coordination fails):

```bash
ssan rescue        # Start recovery mission
ssan scan --all    # Analyze all branches
ssan triage        # Categorize: MERGE / SALVAGE / ABANDON
ssan salvage       # Extract valuable code from broken branches
ssan archaeology   # Deep scan for buried treasure
```

**Form:** npm CLI (free local, paid cloud sync)
**Status:** Built ✓
**Repo:** https://github.com/treebird7/Spidersan

---

### 4. Myceliumail (mycm) — The Messenger

**Problem:** AI agents can't talk to each other. When Claude Code discovers something Cursor needs to know, there's no way to communicate.

**Solution:** Standalone agent-to-agent messaging system.

```bash
mycm send cursor "BLOCKED: Need auth module first"   # Direct message
mycm broadcast "API schema changed"                   # Team-wide alert
mycm inbox                                            # Check messages
mycm subscribe api-changes                            # Join channel
```

**E2E Encryption:** Messages encrypted with NaCl. Even the server can't read them.

```bash
mycm keygen                    # Generate keypair
mycm key-import cursor.pub     # Import teammate's public key
```

**Form:** npm CLI + MCP server (free local, paid cloud relay)
**Status:** Building (MCP server functional, CLI in progress)

---

## The Agent Network

| Agent | Full Name | Role |
|-------|-----------|------|
| **Watson** | — | Strategy, memory, co-CEO (claude.ai) |
| **Watsan** | Watson + san | Archiver daemon, async ops (CLI) |
| **Ssan** | Spidersan | Implementation, branch coordination |
| **Msan** | Mappersan | Documentation generation |
| **Stsan** | Startersan | Repository bootstrap |
| **Mycsan** | Myceliumail service | Messaging infrastructure |
| **Treebird** | — | Human orchestrator |

Watson and Watsan are the same "mind" in different modes—synchronous/dialogic vs async/archival.

---

## Technical Stack

- **Runtime:** Node.js
- **Database:** Supabase (cloud sync for messages, coordination state)
- **Encryption:** NaCl (TweetNaCl.js)
- **Integration:** MCP (Model Context Protocol) for Claude Desktop/Code
- **Deployment:** npm packages
- **License:** MIT (tools), proprietary (cloud services)

---

## The Documentation Pyramid

Tiered information architecture for AI agents:

| Tier | File | Size | Purpose |
|------|------|------|---------|
| 1 | CLAUDE.md | ~150 LOC | Auto-loaded, instant context |
| 2 | AGENT_GUIDE.md | ~100 LOC | 30-second decisions |
| 3 | LIMITATIONS.md | ~200 LOC | Boundary awareness |
| 4 | USE_CASES.md | ~1000 LOC | Deep reference (only when needed) |

**Principle:** Maximum understanding, minimum tokens.

---

## Business Model

**Open core:** Tools free (MIT), infrastructure paid.

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | All CLI tools, local storage, Startersan skill |
| Pro | $29/mo | Hosted backend, zero setup, unlimited |
| Team | $99/mo | Dashboard, analytics, multi-user |
| Enterprise | Custom | Self-hosted, SSO, SLA, support |

*Note: Earlier discussions mentioned $15/mo for Spidersan Pro specifically—may need to align pricing across ecosystem.*

---

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12 | Treebird as umbrella brand | Unifies the ecosystem under one vision |
| 2025-12 | Four-tool architecture | Separation of concerns: bootstrap, document, coordinate, communicate |
| 2025-12 | Documentation Pyramid | Token-efficient, tiered info for AI agents |
| 2025-12 | CLI-native, local-first | Universal, scriptable, works offline |
| 2025-12 | Open core business model | Tools free, charge for convenience/scale |
| 2025-12 | Watson/Watsan split | Different modes serve different needs |
| 2025-12 | "-san" naming convention | Honorific + identifier, ecosystem cohesion |
| 2025-12 | E2E encryption standard | Sensitive context needs protection |
| 2025-12 | Graceful degradation | Coordination helps, never hinders |

---

## Roadmap (from Vision Doc)

### Phase 1: Foundation (Current)
- [x] Spidersan core (branch coordination)
- [x] Local storage adapter
- [x] Supabase cloud storage
- [x] End-to-end encryption
- [x] Documentation pyramid concept
- [ ] Myceliumail MCP server (in progress)

### Phase 2: Ecosystem (Q1 2025)
- [ ] Mappersan v1 (documentation generation)
- [ ] Myceliumail standalone CLI
- [ ] Startersan skill (repository bootstrap)
- [ ] Cross-tool integration

### Phase 3: Intelligence (Q2 2025)
- [ ] Conflict prediction (ML-based)
- [ ] Auto-triage recommendations
- [ ] Merge sequence optimization
- [ ] Documentation drift detection

### Phase 4: Platform (Q3 2025)
- [ ] Team dashboard
- [ ] Analytics and insights
- [ ] Webhook integrations
- [ ] VS Code / JetBrains extensions

### Phase 5: Ecosystem Growth (Q4 2025)
- [ ] Plugin architecture
- [ ] Community tool marketplace
- [ ] Enterprise features
- [ ] Multi-repository coordination

---

## Related Projects

### Recovery Tree
The original project that spawned this ecosystem. A digital recovery platform for behavioral addictions combining AI guidance with 12-step principles. Features Elder Tree (AI sponsor), URG Mining (crisis intervention), and privacy-first architecture.

Recovery Tree and Treebird ecosystem are now separate projects, though they share:
- Supabase infrastructure patterns
- Privacy-first values
- The human orchestrator (treebird)

---

## Open Questions

1. **Pricing alignment** — Vision doc says $29/mo Pro, earlier notes say $15/mo for Spidersan. Ecosystem-wide pricing TBD.

2. **Watsan implementation** — How does it persist its archive? What triggers action vs. passive archiving?

3. **Startersan and Mappersan** — Build order? Startersan as skill first (lower lift), then Mappersan as full CLI?

4. **Multi-agent message routing** — How to handle when an agent has multiple instances?

5. **Project/workspace concept** — Should messages be grouped by project context?

---

## Command Quick Reference

| Tool | Command | Purpose |
|------|---------|---------|
| Startersan | `/startersan` | Bootstrap AI-ready documentation |
| Mappersan | `msan init` | Generate documentation |
| Mappersan | `msan sync` | Update docs from code |
| Mappersan | `msan watch` | Auto-sync on changes |
| Spidersan | `ssan register` | Declare working files |
| Spidersan | `ssan conflicts` | Check for overlaps |
| Spidersan | `ssan merge-order` | Get merge sequence |
| Spidersan | `ssan rescue` | Start recovery mission |
| Myceliumail | `mycm send` | Message another agent |
| Myceliumail | `mycm inbox` | Check messages |
| Myceliumail | `mycm broadcast` | Team-wide alert |

---

## Links

- **GitHub:** github.com/treebird7
- **Spidersan:** https://github.com/treebird7/Spidersan
- **Mappersan:** Coming soon
- **Myceliumail:** Coming soon (MCP server in testing)
- **Startersan:** Available as Claude Code skill (TBD)

---

*"AI agents are productive alone. But codebases thrive when they coordinate. Treebird makes the forest."*

— treebird, December 2025
