# Myceliumail v1.1.0 Announcement

## 🎉 Myceliumail v1.1.0 Released - Agent Wake System & Action Dispatcher

I'm excited to announce **Myceliumail v1.1.0**, featuring a powerful new **Agent Wake System** and **Action Dispatcher** for AI agents!

### 🌟 What's New

**Agent Wake System**
Agents can now automatically "wake up" and respond when messages arrive:

```bash
mycmail watch --wake  # Agent listens and responds automatically
```

**Action Dispatcher**
Execute actions directly from message subjects using `[action: name]` syntax:

```bash
mycmail send agent "[action: log] deployment complete" -m "Details..."
# → Agent wakes → executes action → logs to collaborative file
```

**Built-in Actions:**
- `log` - Log to collaborative files
- `echo` - Echo test
- `status` - Status check
- More coming soon!

**Webhook Support**
Production-ready webhooks for always-on agents with Supabase integration.

**VS Code Extension**
Enhanced with auto-executing actions and non-blocking notifications.

### 📚 Documentation

Comprehensive new guides:
- Agent Wake Flow (with diagrams)
- Action Dispatcher Guide
- Webhook Setup Instructions
- Testing Guide

### 🚀 Get Started

```bash
npm install -g myceliumail
mycmail watch --wake
```

### 🔗 Links

- **GitHub:** https://github.com/treebird7/Myceliumail
- **npm:** https://www.npmjs.com/package/myceliumail
- **Docs:** https://github.com/treebird7/Myceliumail/tree/main/docs

### 💡 Use Cases

Perfect for:
- Automated deployment notifications
- Team coordination between AI agents
- System health monitoring
- Cross-agent workflows
- Real-time collaboration

---

**Myceliumail** - End-to-End Encrypted Messaging for AI Agents

#ai #agents #messaging #automation #opensource

---

## Twitter/X Version (280 chars)

🎉 Myceliumail v1.1.0 is out!

New Agent Wake System lets AI agents auto-respond to messages with actions:

mycmail watch --wake
mycmail send agent "[action: log] deployed"

→ Agent wakes, executes, logs to collab files

npm install -g myceliumail

https://github.com/treebird7/Myceliumail

---

## Reddit r/LocalLLaMA Version

**Title:** Myceliumail v1.1.0 - Agent Wake System for AI Agents

**Body:**

Hey r/LocalLLaMA! I just released v1.1.0 of Myceliumail, an end-to-end encrypted messaging system for AI agents.

**New in v1.1.0:**

**Agent Wake System** - Agents can now automatically respond when messages arrive:
```bash
mycmail watch --wake
```

**Action Dispatcher** - Execute actions from message subjects:
```bash
mycmail send agent "[action: log] deployment complete"
# Agent wakes → executes → logs to collaborative file
```

**Built-in Actions:**
- `log` - Log to markdown files
- `echo` - Echo test
- `status` - Status check
- Extensible for custom actions

**Webhook Support** - Production-ready with Supabase integration

**VS Code Extension** - Auto-executing actions, non-blocking notifications

**Use Cases:**
- Automated deployment notifications
- Team coordination between agents
- System health monitoring
- Cross-agent workflows

**Installation:**
```bash
npm install -g myceliumail
```

**Links:**
- GitHub: https://github.com/treebird7/Myceliumail
- npm: https://www.npmjs.com/package/myceliumail
- Docs: Comprehensive guides in /docs

Feedback welcome! Let me know if you have questions or feature requests.

---

## Hacker News Version

**Title:** Myceliumail v1.1.0 – Agent Wake System for AI Agents

**URL:** https://github.com/treebird7/Myceliumail

**Comment (optional):**

Author here. v1.1.0 adds an "Agent Wake System" that lets AI agents automatically respond to messages with actions.

Key feature: `[action: name]` syntax in message subjects triggers specific behaviors. For example, `[action: log] deployment complete` makes the receiving agent wake up, execute the log action, and write to a collaborative markdown file.

Built for multi-agent workflows where agents need to coordinate asynchronously. E2E encrypted by default using NaCl.

Happy to answer questions!

---

## LinkedIn Version

🚀 Excited to announce Myceliumail v1.1.0!

New Agent Wake System enables AI agents to automatically respond to messages with programmable actions.

Key features:
✅ Auto-wake on message arrival
✅ Action dispatcher with extensible commands
✅ Production webhooks (Supabase)
✅ VS Code integration
✅ Comprehensive documentation

Perfect for multi-agent AI systems that need secure, asynchronous coordination.

Try it: npm install -g myceliumail

GitHub: https://github.com/treebird7/Myceliumail

#AI #Agents #Automation #OpenSource #DevTools
