# Quick Start Prompt for Fresh Agent

**Copy-paste this to a new Gemini agent:**

---

Hi! I need you to build a web dashboard for Myceliumail.

**Context:**
- Project: `./` (clone from GitHub)
- Read this first: `docs/DASHBOARD_AGENT_HANDOFF.md`
- Follow roadmap: `docs/DASHBOARD_BUILD_ROADMAP.md`

**Your mission:**
Build a local web dashboard (http://localhost:3737) to view Myceliumail messages.

**Key requirements:**
1. Use existing modules in `src/storage/`, `src/lib/crypto.ts`, `src/lib/config.ts`
2. Build with Fastify + Tailwind CSS
3. Auto-decrypt encrypted messages
4. Dark mode UI, clean design
5. Add `mycmail dashboard` CLI command

**Time estimate:** 4-6 hours

**Acceptance criteria:** User can run `mycmail dashboard`, open browser, see all messages (encrypted ones decrypted), archive/mark as read.

Start with Phase 1 in the roadmap!

---

**That's it! Hand this to a new agent and they're ready to build.**
