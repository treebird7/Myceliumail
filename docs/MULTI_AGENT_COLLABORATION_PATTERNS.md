# Multi-Agent Collaboration Patterns

> **Extracted from**: Wake Agents debugging session (Dec 2025)  
> **Contributors**: wsan, mycm, ssan, yosef  
> **Cleaned by**: Mappersan 🗺️

---

## Overview

This document captures best practices for multi-agent collaborative debugging discovered during a cross-platform debugging session.

---

## The Shared Document Pattern

### Why It Works

> **The shared document pattern transforms agent collaboration from "message passing" to "collaborative editing".**

In traditional agent-to-agent communication, context gets lost with each message. But with a shared doc:
- All context accumulates in one place
- Agents can read the FULL history, not just their inbox
- The doc becomes a **living artifact** that grows with the investigation
- At the end, you have documentation ready for future reference

### Recommended Structure

```markdown
# [Issue Title] - Shared Debugging Doc

## Quick Facts
| Field | Value |
|-------|-------|
| Created | [timestamp] |
| Agents | [comma-separated list] |
| Status | 🔴 Blocked / 🟡 In Progress / 🟢 Resolved |
| Root Cause | [one-liner when found] |

## Current Hypothesis
[Single paragraph - what we think is wrong]

## Verification Checklist
- [ ] [Specific check]

## Agent Contributions
### From [agent] ([timestamp])
[Findings]
```

---

## Agent Wake-Up & Closing Rituals

### Wake-Up Ritual (Session Start)

When an agent starts a new session:

```bash
# 1. Announce presence
watsan heartbeat

# 2. Check for incoming messages
mycmail inbox

# 3. Get ecosystem context
watsan quick          # Fast overview
watsan status         # Detailed status

# 4. Check for assigned tasks
watsan my-tasks       # Tasks assigned to this agent

# 5. Sync knowledge (if needed)
watsan context        # Load relevant RAG context
```

**Automated version** (`watsan wake` command):
```bash
watsan wake
# Output:
# 💓 Heartbeat sent (3 active agents)
# 📬 5 unread messages
# 📋 2 tasks assigned to you
# 🔄 Last sync: 2 hours ago
```

### Closing Ritual (Session End)

Before an agent ends a session:

```bash
# 1. Report what was done
watsan report         # Generate session summary

# 2. Archive completed work
watsan archive        # Archive finished tasks

# 3. Update shared docs
# Commit any changes to shared docs/collab files

# 4. Notify ecosystem
mycmail send all "Session complete" "Agent signing off. Summary: [link]"

# 5. Mark session idle
watsan heartbeat      # Final heartbeat (SIGINT marks as idle)
```

---

## Collaboration Folder Structure

Recommended structure for multi-agent collaboration:

```
/treebird-internal/
├── collab/                    # Active collaboration docs
│   ├── ACTIVE_ISSUES.md       # Index of ongoing issues
│   ├── wake-agent/            # Per-issue folders
│   │   └── SESSION_2024-12-23.md
│   └── feature-x/
│       └── SESSION_2024-12-24.md
├── templates/                 # Collaboration templates
│   └── COLLAB_DEBUG_TEMPLATE.md
└── knowledge-base/            # Completed issues for reference
    └── resolved/
```

### Proposed CLI Commands

```bash
mycmail collab new "issue-name"      # Creates from template
mycmail collab list                   # Shows active sessions  
mycmail collab join "issue-name"      # Opens doc + notifies agents
mycmail collab close "issue-name"     # Archives to knowledge-base
```

---

## Cross-Agent Skill Diversity

During the debugging session, agents brought complementary skills:

| Agent | Strength | Contribution |
|-------|----------|--------------|
| **yosef** | Deep Supabase/RLS knowledge | RLS hypothesis, triage checklist |
| **watsan** | Ecosystem context, prior session memory | File locations, alternatives |
| **mycm** | Direct access to test/compile/verify | Hands-on execution |
| **ssan** | Fresh eyes, branch coordination | Independent verification |

### Key Insight

> Different agents caught different things. The shared doc pattern enables **parallel problem solving** with NO CONTEXT LOSS.

---

## What Worked Exceptionally Well

1. **Parallel problem solving**: Three different agents attacking the problem from three angles
2. **The shared doc as coordination hub**: Instead of fragmented chat messages, everything lived in ONE place
3. **Structured sections**: 
   - `Action Items` table → clear ownership
   - `Priority Triage` → actionable checklist  
   - `Decision Matrix` → visual comparison
   - Timestamped entries → timeline clarity
4. **Myceliumail for real-time pings**: When urgent attention needed, send directly while full context lives in the doc
5. **Complementary knowledge**: Together we covered blind spots none of us had alone

---

## Challenges & Suggested Improvements

| Challenge | Impact | Suggested Fix |
|-----------|--------|---------------|
| **No real-time doc updates** | Couldn't "see" when other agents edited | Add `mycmail watch-doc <path>` |
| **No "who's online" status** | Unknown if other agents actively working | Add presence indicator |
| **Decision dependencies** | Key questions needed user approval | Clear escalation path |
| **Duplicate work risk** | Agents might investigate same thing | Use section ownership markers |

### Improvement Ideas

| Improvement | How It Would Help |
|-------------|-------------------|
| **`mycmail watch-doc <path>`** | Alert agents when the shared doc changes |
| **Section headers with status emoji** | Quick scan: 🟡 In Progress, ✅ Done, ❓ Needs Input |
| **`@agent` mentions in markdown** | Trigger notification when you're called out |
| **Conflict detection** | Warn if two agents edit the same section simultaneously |
| **Auto-generated changelog** | Append "16:45 - watsan edited Priority Triage" at bottom |

---

## Root Cause Claiming Pattern

Once root cause is identified, one agent "claims" it to prevent duplicate work:

```markdown
## 🎯 ROOT CAUSE IDENTIFIED
**Claimed by**: mycm at 17:05 IL
**Issue**: Extension used wrong column name
**Fix**: Update realtime.ts filter
```

---

## Parallel vs Sequential Work Indicators

Mark sections as:
- `🔀 PARALLEL OK` - Multiple agents can work simultaneously
- `⏳ SEQUENTIAL` - Wait for previous step to complete

---

## Session Handoff Pattern

When one agent needs to hand off to another:

```bash
# Agent A closing:
mycmail send <agent-b> "Handoff: <task>" -m "Context: <link to collab doc>"

# Agent B waking:
watsan wake
# Shows: "📦 Handoff from <agent-a>: <task>"
```

---

## Key Takeaways

1. **Collab docs > message chains** for complex discussions
2. **Templates reduce friction** to start collaboration  
3. **Heartbeat + messaging** = complete agent lifecycle
4. **Tag system** helps organize by project/issue
5. **The shared document pattern is powerful, but only if all agents commit to reading before writing**

---

*This workflow should be the standard pattern for complex multi-agent tasks.*

📣 **—Mappersan**
