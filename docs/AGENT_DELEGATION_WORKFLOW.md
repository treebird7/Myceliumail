# Agent Delegation Workflow - Meta Documentation

> **How to create handoff packages for delegating work to fresh agents**

This documents the workflow used to create the Myceliumail Dashboard handoff package (Dec 15, 2025).

---

## The Workflow Pattern

### Step 1: Understand the Request

**User asked:** "Can you create a roadmap and everything necessary for a fresh new Gemini agent to build this?"

**What this means:**
- Create complete, self-contained documentation
- New agent should need ZERO context from this conversation
- Include code templates, not just descriptions
- Provide acceptance criteria and testing scenarios

### Step 2: Create Task Checklist

**File:** `task.md` (artifact)

```markdown
# Agent Handoff Package - [Feature Name]

## Documentation
- [ ] Create [FEATURE]_AGENT_HANDOFF.md
- [ ] Create [FEATURE]_BUILD_ROADMAP.md
- [ ] Create folder structure
- [ ] Add code templates

## Context Files
- [ ] Link to existing modules
- [ ] Document architecture
- [ ] List dependencies

## Acceptance Criteria
- [ ] Define success metrics
- [ ] List test scenarios

## Verification
- [ ] Self-contained
- [ ] No missing context
- [ ] Clear next steps
```

**Purpose:** Organize the handoff creation process

### Step 3: Create Implementation Plan

**File:** `implementation_plan.md` (artifact)

**Contents:**
1. **Complexity Analysis** - Time estimates, difficulty rating
2. **Tech Stack** - Technologies, why chosen
3. **Proposed Changes** - File structure, new files
4. **Implementation Phases** - Step-by-step breakdown
5. **Verification Plan** - How to test

**Key insight:** This becomes the skeleton for the agent handoff doc

### Step 4: Create Agent Handoff Brief

**File:** `docs/[FEATURE]_AGENT_HANDOFF.md`

This is the MAIN document the new agent reads. Structure:

```markdown
# [Feature] - Agent Handoff Brief

> For a fresh Gemini agent to build [feature]

## Your Mission
[One-paragraph description of what to build]

## What's Already Built (You Can Use)
[Table of existing modules with paths and descriptions]

## Project Structure (Create These)
[File tree showing what to create]

## Roadmap: Step-by-Step

### Step 1: [Phase Name] (time)
[Detailed instructions]

**File:** `path/to/file.ts`
```typescript
// Complete code template
```

**Test:** How to verify this step

### Step 2: ...
[Repeat for each phase]

## Acceptance Criteria
[Checklist of success criteria]

## Testing Scenarios
[Specific test cases]

## Troubleshooting
[Common issues and fixes]

## Resources
[Links to docs, existing code]
```

**Critical elements:**
- ✅ **Complete code templates** - copy-paste ready
- ✅ **Time estimates** for each phase
- ✅ **Test commands** after each step
- ✅ **Absolute file paths** not relative
- ✅ **Existing code references** with exact paths

### Step 5: Create Quick Roadmap

**File:** `docs/[FEATURE]_BUILD_ROADMAP.md`

A condensed checklist version:

```markdown
# [Feature] Build Roadmap

## Phase 1: Setup (15 min)
- [ ] Install dependencies
- [ ] Create directories

## Phase 2: Backend (2 hours)
- [ ] Create file X
- [ ] Test Y

...

## Time Budget
Setup: 15 min
Backend: 2 hours
Total: 6 hours

## Success = 
[One-sentence success criterion]
```

**Purpose:** Quick reference, easy to scan

### Step 6: Create Agent Prompt

**File:** `docs/[FEATURE]_AGENT_PROMPT.md`

**The copy-paste prompt** to start a new agent:

```markdown
# Quick Start Prompt for Fresh Agent

**Copy-paste this to a new Gemini agent:**

---

Hi! I need you to build [feature].

**Context:**
- Project: /absolute/path/to/project
- Read this first: `docs/FEATURE_AGENT_HANDOFF.md`
- Follow roadmap: `docs/FEATURE_BUILD_ROADMAP.md`

**Your mission:**
[One paragraph]

**Key requirements:**
[Bullet list of 5-6 requirements]

**Time estimate:** X hours

**Acceptance criteria:** [Success description]

Start with Phase 1 in the roadmap!

---
```

**Purpose:** Makes delegation effortless

---

## Key Principles

### 1. Self-Contained Documentation

The new agent should NOT need:
- ❌ This conversation history
- ❌ To ask clarifying questions
- ❌ To search for other docs
- ❌ To guess file paths

The new agent SHOULD have:
- ✅ Complete code templates
- ✅ Exact file paths (absolute)
- ✅ All dependencies listed
- ✅ Test commands
- ✅ Success criteria

### 2. Progressive Disclosure

**Info density by document:**

| Doc | Detail Level | Purpose |
|-----|-------------|---------|
| Agent Prompt | Minimal | Start a new agent (30 sec read) |
| Build Roadmap | Medium | Quick checklist (2 min read) |
| Agent Handoff | Maximum | Complete implementation (10 min read) |
| Implementation Plan | Technical | For reviewing agent (5 min read) |

### 3. Code > Prose

**Bad:**
> "Create an API endpoint that fetches messages from storage and decrypts them if encrypted."

**Good:**
```typescript
fastify.get('/api/inbox', async (request, reply) => {
    const messages = await storage.getInbox(agentId);
    const keyPair = loadKeyPair(agentId);
    // ... complete working code
});
```

**Why:** Copy-paste > interpretation errors

### 4. Testable Milestones

After each phase, agent should be able to RUN something:

```bash
# Step 1: ✅ Server starts
node src/dashboard/server.ts

# Step 2: ✅ API responds
curl http://localhost:3737/api/inbox

# Step 3: ✅ UI loads
open http://localhost:3737
```

---

## Templates for Startersan

### Template: Agent Handoff Brief

```markdown
# {FEATURE_NAME} - Agent Handoff Brief

> For a fresh Gemini agent to build {feature_description}

## Your Mission
{one_paragraph_mission}

## What's Already Built (You Can Use)
| Module | Path | What It Does |
|--------|------|--------------|
{existing_modules_table}

## Project Structure (Create These)
{file_tree}

## Roadmap: Step-by-Step

### Step 1: {phase_name} ({time_estimate})
{detailed_instructions}

**File:** `{file_path}`
```{language}
{complete_code_template}
```

**Test:** {test_command}

{repeat_for_each_step}

## Acceptance Criteria
{checklist}

## Testing Scenarios
{test_cases}

## Troubleshooting
{common_issues}

## Resources
{links}
```

### Template: Build Roadmap

```markdown
# {FEATURE_NAME} Build Roadmap

## Phase 1: {name} ({time})
- [ ] {task}
- [ ] {task}

## Phase 2: {name} ({time})
- [ ] {task}

## Time Budget
{phase}: {time}
Total: {total_time}

## Key Files to Reference
{existing_files}

## Success = 
{one_sentence_success}
```

### Template: Agent Prompt

```markdown
# Quick Start Prompt for Fresh Agent

**Copy-paste this to a new Gemini agent:**

---

Hi! I need you to build {feature_name}.

**Context:**
- Project: {absolute_project_path}
- Read this first: `{handoff_doc_path}`
- Follow roadmap: `{roadmap_doc_path}`

**Your mission:**
{one_paragraph}

**Key requirements:**
{5_6_bullets}

**Time estimate:** {hours}

**Acceptance criteria:** {success_description}

Start with Phase 1 in the roadmap!

---
```

---

## Prompts Used (for Startersan)

### Initial Request Pattern

**User says:**
> "can you create a roadmap and everything necessary for a fresh new Gemini agent to build this?"

**Agent interprets as:**
1. Create self-contained documentation
2. Include complete code templates
3. Add step-by-step instructions
4. Provide testing/verification steps
5. Make it copy-paste ready for delegation

### Workflow Execution Prompts

**Internal agent prompts to self:**

1. **"Create task checklist"**
   - Output: task.md artifact
   - Organizes handoff creation process

2. **"Analyze complexity and create implementation plan"**
   - Output: implementation_plan.md artifact
   - Time estimates, phases, tech stack

3. **"Transform implementation plan into agent handoff brief"**
   - Output: docs/FEATURE_AGENT_HANDOFF.md
   - Add complete code templates
   - Add absolute paths
   - Add test commands

4. **"Create condensed roadmap checklist"**
   - Output: docs/FEATURE_BUILD_ROADMAP.md
   - Just phases, tasks, time budget

5. **"Create copy-paste delegation prompt"**
   - Output: docs/FEATURE_AGENT_PROMPT.md
   - Minimal, ready to send to new agent

---

## Quality Checklist

Before handing off to new agent, verify:

- [ ] All file paths are absolute
- [ ] Code templates are copy-paste ready
- [ ] Every step has a test command
- [ ] Time estimates are realistic
- [ ] Acceptance criteria are clear
- [ ] No references to "this conversation"
- [ ] No undefined acronyms or jargon
- [ ] Links to existing code are correct
- [ ] New agent can start immediately

---

## Example Usage in Startersan

```bash
# Generate agent handoff package
startersan delegate "build web dashboard" \
  --feature dashboard \
  --complexity medium \
  --estimate "4-6 hours"

# Outputs:
# - DASHBOARD_AGENT_HANDOFF.md
# - DASHBOARD_BUILD_ROADMAP.md
# - DASHBOARD_AGENT_PROMPT.md
```

**Startersan would:**
1. Analyze the project structure
2. Identify existing modules
3. Generate templates with correct paths
4. Create phase-by-phase instructions
5. Add testing scenarios
6. Output ready-to-use delegation docs

---

## Key Insight from ssan's Messages

**From "CRITICAL: Myceliumail Migration Plan":**

The delegation workflow should support **iterative development**:
1. Phase 1: Feature parity
2. Phase 2: Migration
3. Phase 3: Adoption

Each phase can be delegated to different agents or sessions!

**Application to Startersan:**
```bash
startersan delegate "Phase 1: Add Supabase storage" \
  --depends-on "existing CLI" \
  --blocked-by "need credentials"
```

This is how the mycelium grows - by clear delegation! 🍄
