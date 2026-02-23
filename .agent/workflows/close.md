---
description: End-of-session ceremony - retro, reflect, handoff, index, close
---

# /close — Session Closing Ceremony

**One command to rule them all.** Run this at the end of every session.

> **Global Workflow** — Works for any agent. Copy to your `.agent/workflows/` directory.

## What It Does

```
/close
   │
   ├── 1. RETRO      — Quick Start-Stop-Continue reflection
   ├── 2. TASK DUMP  — List your P0/P1/P2 tasks
   ├── 3. HANDOFF    — Write .pending_task.md
   ├── 4. GIT SYNC   — Commit and push your work
   └── 5. SIGN OFF   — Add closing entry to collab
```

---

## Quick Close (< 5 min)

### 1. Add Your Retro Entry
Add to today's collab doc:

```markdown
---

## [YOUR_AGENT_NAME] Closing Retro (HH:MM)

### Start-Stop-Continue
| Start | Stop | Continue |
|-------|------|----------|
| [New thing to try] | [What didn't work] | [What's working well] |

### Task Dump
**P0 (Tomorrow):**
- [ ] [Critical task] 

**P1 (This week):**
- [ ] [Important task]

**P2 (Future):**
- [ ] [Nice to have]

### Session Stats
- Commits: [N]
- Tasks completed: [N]
- Key insight: [One-liner]

---
```

// turbo
### 2. Write Your Pending Tasks
```bash
cat > .pending_task.md << EOF
# Pending from $(date +"%B %d, %Y") ($(date +%H:%M))

## 🔴 P0 — Must Do Tomorrow
- [ ] [TASK]

## 🟡 P1 — This Week  
- [ ] [TASK]

## 🔑 Key Context
- [Important context for next session]

## 📍 Files to Check
- [File path] — [Why]
EOF
echo "✅ Created .pending_task.md"
```

// turbo
### 3. Git Sync Your Work
```bash
git add -A
git status
echo "---"
echo "Review the above, then commit with:"
echo "git commit -m 'Close $(date +%Y-%m-%d) session'"
echo "git push origin main"
```

### 4. Sign Off in Collab
Add final entry to today's collab:

```markdown
---

## [YOUR_AGENT_NAME] signing off 🌙 (HH:MM)

See you tomorrow, flock!

---
```

---

## Full Close (Facilitator Only)

If you're facilitating the session close (usually Birdsan):

### Create LESSONS_LEARNED
```bash
TODAY=$(date +%Y-%m-%d)
TREEBIRD="${TREEBIRD_INTERNAL:-/Users/freedbird/Dev/treebird-internal}"
cat > "$TREEBIRD/knowledge/LESSONS_LEARNED_$TODAY.md" << EOF
# Lessons Learned — $(date +"%B %d, %Y")

## Session Stats
- Duration: [START] → [END]
- Agents: [COUNT]
- Tools shipped: [LIST]

## Key Insights
1. [INSIGHT]
2. [INSIGHT]
3. [INSIGHT]

## Patterns Extracted
- [PATTERN]

## Task Dump (All Agents)
### P0 (Tomorrow)
- [ ] [TASK] — [OWNER]

### P1 (This week)
- [ ] [TASK] — [OWNER]

### P2 (Future)
- [ ] [TASK] — [OWNER]

---

*Session facilitated by [FACILITATOR]*
EOF
echo "✅ Created LESSONS_LEARNED_$TODAY.md"
```

### Broadcast Close
```bash
mycmail broadcast "🌙 Session closed. See you tomorrow, flock!" 2>/dev/null || echo "Manual announce needed"
```

---

## Checklist

Before closing, verify:

- [ ] All my work is committed and pushed
- [ ] I've added retro entry to collab
- [ ] .pending_task.md is up to date
- [ ] I've signed off in the collab doc

---

## Corresponding `/dawn`

See `/dawn` workflow for morning session startup.

```
/dawn ←→ /close
   │         │
   │    SESSION    
   │         │
   └─────────┘
```

---

**Owner:** Flock (shared)  
**Estimated time:** 5-15 min
