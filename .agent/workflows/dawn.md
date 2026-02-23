---
description: Morning session startup - context loading, health check, collab start
---

# /dawn — Morning Session Startup

**Start fresh with full context.** Run this at the beginning of every session.

> **Global Workflow** — Works for any agent. Copy to your `.agent/workflows/` directory.

## What It Does

```
/dawn
   │
   ├── 1. PENDING     — Check your .pending_task.md
   ├── 2. CONTEXT     — Read yesterday's LESSONS_LEARNED
   ├── 3. SYNC        — Pull latest from your repo
   ├── 4. COLLAB      — Read/create today's daily collab
   └── 5. ANNOUNCE    — Join the session
```

---

## Quick Dawn (< 2 min)

// turbo
### 1. Check for Pending Tasks
```bash
# Check your own pending tasks
if [ -f ".pending_task.md" ]; then
  echo "⚠️ You have pending work from yesterday:"
  cat ".pending_task.md"
else
  echo "✅ No pending tasks"
fi
```

// turbo
### 2. Read Yesterday's Lessons
```bash
YESTERDAY=$(date -v-1d +%Y-%m-%d)
LESSONS_FILE="${TREEBIRD_INTERNAL:-/Users/freedbird/Dev/treebird-internal}/knowledge/LESSONS_LEARNED_$YESTERDAY.md"
if [ -f "$LESSONS_FILE" ]; then
  echo "📚 Yesterday's lessons:"
  head -50 "$LESSONS_FILE"
else
  echo "ℹ️ No lessons file found for $YESTERDAY"
fi
```

// turbo
### 3. Sync Your Repo
```bash
git pull origin main 2>&1 | head -10
```

### 4. Check Today's Collab
```bash
TODAY=$(date +%Y-%m-%d)
COLLAB_FILE="${TREEBIRD_INTERNAL:-/Users/freedbird/Dev/treebird-internal}/collab/$TODAY-daily.md"

if [ -f "$COLLAB_FILE" ]; then
  echo "📄 Today's collab exists: $COLLAB_FILE"
  echo "📊 Line count: $(wc -l < "$COLLAB_FILE")"
else
  echo "⚠️ No collab file for today yet"
  echo "Create one or wait for Birdsan to facilitate"
fi
```

### 5. Announce Your Presence
Add an entry to today's collab:

```markdown
---

## [YOUR_AGENT_NAME] joins (HH:MM)

☀️ Good morning! Here to continue [your focus for today].

**Pending from yesterday:**
- [List items from .pending_task.md]

**Today's focus:**
- [What you plan to work on]

---
```

---

## What You Should Know at Dawn

### From Yesterday
| Question | Where to Find |
|----------|---------------|
| What did I commit to? | `.pending_task.md` in your repo |
| What did the flock learn? | `treebird-internal/knowledge/LESSONS_LEARNED_*.md` |
| What's the theme? | Yesterday's synthesis in collab |
| What's blocked? | Yesterday's task dump |

### Today
| Question | Where to Find |
|----------|---------------|
| Who's awake? | Today's collab doc |
| What's the priority? | From yesterday's P0 tasks |

---

## Environment Variables

Set these for easier workflow execution:

```bash
export TREEBIRD_INTERNAL="/Users/freedbird/Dev/treebird-internal"
export AGENT_NAME="YourAgentName"
```

---

## Corresponding `/close`

See `/close` workflow for end-of-session ceremony.

```
/dawn ←→ /close
   │         │
   │    SESSION    
   │         │
   └─────────┘
```

---

**Owner:** Flock (shared)  
**Estimated time:** 2-5 min
