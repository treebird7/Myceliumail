# Cross-Tool Integration Plan

> **Status**: PLANNING  
> **Created**: 2025-12-24  
> **Contributors**: mycm, ssan, wsan

This document tracks planned integrations between Myceliumail and other Treebird ecosystem tools.

---

## 1. Ecosystem-Wide Session Lifecycle

### Goal
Unified wake/close commands across all tools for consistent session management.

### Current State
| Tool | Wake | Close | Status |
|------|------|-------|--------|
| mycmail | `mycmail wake` | `mycmail close` | ✅ Implemented |
| watsan | `watsan wake` | `watsan close` | 🔄 Planned |
| spidersan | `spidersan wake` | `spidersan close` | 📋 Proposed by ssan |

### Proposed Integration

**spidersan wake** (proposed by ssan):
- Auto-run `spidersan sync` to get latest branch registry
- Show branches that might conflict with pending work
- Register agent's active branches

**spidersan close** (proposed by ssan):
- Mark branches as stale/abandoned if closing mid-work
- Trigger `spidersan cleanup` for orphaned branches
- Broadcast branch status to other agents

### Cross-Tool Hook
```bash
# Future: mycmail wake --with-branches
# Would include Spidersan branch context in wake output
```

---

## 2. Branch Context in Wake

### Goal
Show active Spidersan branches during `mycmail wake` for conflict awareness.

### Proposed by
ssan (RE: WAKE features for Spidersan workflow)

### Implementation Ideas
1. `mycmail wake --with-branches` flag
2. Query Spidersan registry during wake
3. Highlight branches that overlap with current work

### Schema Addition (JSON output)
```json
{
  "branches": {
    "active": ["feature/collab-commands", "fix/inbox-filter"],
    "potentialConflicts": ["feature/wake-close"]
  }
}
```

---

## 3. Central Collab Folder

### Goal
Single location for all collaboration documents, accessible by all agents.

### Options Discussed
| Location | Pros | Cons |
|----------|------|------|
| `~/.treebird/collabs/` | Central, not repo-specific | Not git-tracked |
| `treebird-internal/collab/` | Git-tracked, versioned | Requires repo access |
| Per-project `/docs/` | Context-specific | Fragmented |

### Decision
**Recommended**: `~/.treebird/collabs/` for active collabs, archive to git repo.

### ssan's Additional Suggestions
- Auto-notify participants when collab doc is updated
- Spidersan registers collab branches to track work
- Archive old collabs after N days of inactivity

---

## 4. Collab Commands

### Goal
CLI commands to manage collaborative documents.

### Status
📋 Planned (wsan RFC: /collab command status)

### Proposed Commands
| Command | Description | Status |
|---------|-------------|--------|
| `mycmail collab new <topic>` | Create collab doc from template | Planned |
| `mycmail collab list` | Show active collabs | Planned |
| `mycmail collab join <id>` | Add yourself to a collab | Planned |
| `mycmail collab invite <agent> <id>` | Send invite message | Planned |
| `mycmail collab close <id>` | Archive collab | Planned |

### Template Location
`/docs/COLLAB_DEBUG_TEMPLATE.md` (existing)

---

## 5. Conflict Alert Integration

### Goal
Auto-message affected agents when Spidersan detects a branch conflict.

### Proposed by
ssan (RE: WAKE features for Spidersan workflow)

### Implementation Ideas
1. Spidersan detects conflict during `sync` or `register`
2. Calls `mycmail send <agent> "CONFLICT: <branch>"` 
3. Include conflict details in message body

### Example Flow
```
ssan: spidersan register feature/login
-> Conflict detected with mycm's feature/auth
-> mycmail send mycm "#conflict: feature/login overlaps with feature/auth"
```

---

## 6. Merge Coordination Hook

### Goal
Notify agents when a branch is marked as merged so they can rebase/update.

### Proposed by
ssan (RE: WAKE features for Spidersan workflow)

### Implementation Ideas
1. `spidersan mark-merged <branch>` broadcasts to agents
2. Agents receive `#merge-complete:` tagged message
3. Auto-trigger `git fetch` or notify to rebase

---

## 7. Hashtag Conventions

### Current Tags in Use
| Tag | Purpose | Example |
|-----|---------|---------|
| `#wake-feature:` | Session lifecycle discussions | Collab doc updates |
| `#conflict:` | Branch conflicts | Spidersan alerts |
| `#merge-complete:` | Merge notifications | Post-merge sync |
| `#spidersan:` | Spidersan-related | Feature requests |
| `#collab:` | Collaboration invites | New collab docs |

---

## 8. Mappersan Integration

### Goal
Connect Mappersan (documentation guardian) with ecosystem tools for unified session management and doc validation.

### Agent ID
- `msan` (Mappersan)

### Proposed Commands

| Command | Description | Status |
|---------|-------------|--------|
| `mappersan hello` | Output `Read ~/.treebird/START_HERE.md` | 📋 Proposed |
| `mappersan report` | Show doc freshness, validation status, pending messages | 📋 Proposed |
| `mappersan wake` | Check inbox, show outdated docs, announce presence | 📋 Proposed |
| `mappersan close` | Summarize doc changes, broadcast status | 📋 Proposed |

### Report Output (for standup protocol)
```
📊 Mappersan Report
──────────────────────
Documentation Status:
  CLAUDE.md files: 5 up-to-date, 2 outdated
  Last generation: 2025-12-24 01:30
  
Validation:
  Matching codebase: ✓
  Stale sections: 1 warning

Ecosystem:
  Pending messages: 3
  Spidersan branches: feature/collab-commands
```

### Cross-Tool Hooks

**With Myceliumail:**
- `mappersan send` / `mappersan inbox` - Already implemented
- `mappersan report --notify` - Broadcast report via mycmail

**With Spidersan:**
- Read branch registry for context in CLAUDE.md generation
- Notify when docs for a branch are generated/updated

**With Watsan:**
- Report doc freshness during standup
- Index generated docs to RAG (future)

### Hashtag Conventions
| Tag | Purpose |
|-----|---------|
| `#docs:` | Documentation updates |
| `#claude-md:` | CLAUDE.md generation |
| `#mappersan:` | Mappersan-related requests |

---

## Action Items

### High Priority
- [ ] Implement `mycmail collab new/list/join/close` commands
- [ ] Define central collab folder location
- [ ] Document hashtag conventions

### Medium Priority
- [ ] Add `--with-branches` flag to `mycmail wake`
- [ ] Implement `spidersan wake/close` (ssan owner)
- [ ] Add conflict alert integration
- [ ] Implement `mappersan hello` command (msan owner)
- [ ] Implement `mappersan report` command (msan owner)

### Low Priority
- [ ] Merge coordination hook
- [ ] Auto-archive inactive collabs
- [ ] File watcher for collab doc updates
- [ ] Implement `mappersan wake/close` (msan owner)

---

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2025-12-24 | Added Mappersan integration section (#8) | msan |
| 2025-12-24 | Initial plan from ssan's feedback | mycm |
