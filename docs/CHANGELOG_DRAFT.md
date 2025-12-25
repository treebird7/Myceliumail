# Changelog Draft - Agent Wake System & Action Dispatcher

**Date:** 2025-12-25  
**Status:** Uncommitted Changes  
**Feature:** Agent Wake System with Action Dispatcher

---

## 🎯 Overview

This update introduces a comprehensive **Agent Wake System** that allows agents to automatically respond to incoming messages with specific actions. When a message arrives, agents can now:

1. **Detect** the message via realtime watch or webhook
2. **Wake up** and log the event to collaborative files
3. **Parse** the message for action commands
4. **Execute** specific actions automatically
5. **Log results** for team visibility

---

## 📝 Modified Files

### 1. `src/commands/watch.ts` (+22 lines)
**Changes:**
- Added `--wake` flag to enable wake sequence on new messages
- Integrated with `webhook-handler.ts` for action execution
- Logs wake sequence triggers with 🌅 emoji

**Example:**
```bash
mycmail watch --wake
```

### 2. `src/dashboard/routes.ts` (+30 lines)
**Changes:**
- Added webhook endpoint: `POST /api/webhook/agent-message`
- Handles Supabase webhook events for new messages
- Routes to webhook handler for processing

**Endpoint:**
```
POST /api/webhook/agent-message
```

### 3. `vscode-extension/src/extension.ts` (cleanup)
**Changes:**
- Removed unused `triggerChatAgent` import

### 4. `vscode-extension/src/handlers.ts` (+141 lines, -24 lines)
**Changes:**
- **Action Parser**: Extracts `[action: command]` from message subjects
- **Auto-execution**: Automatically executes actions when messages arrive
- **Built-in Actions**:
  - `log` - Write to output channel
  - `open-file` - Open specific files
  - `show-message` - Display info messages
  - `open-terminal` - Create new terminal
  - `status` / `echo` - Show message status
- **Non-blocking Notifications**: Changed to auto-dismiss (no user interaction required)

---

## 🆕 New Files

### 1. `src/lib/action-dispatcher.ts` (224 lines)
**Purpose:** Core action dispatch system

**Features:**
- **Action Parser**: Extracts `[action: name] args` from message subjects
- **Built-in Handlers**:
  - `log` - Logs to collaborative file
  - `inbox` - Check inbox (placeholder)
  - `broadcast` - Broadcast messages (placeholder)
  - `collab` - Start/join collaborations (placeholder)
  - `status` - Status check
  - `echo` - Echo test
- **Extensible**: Easy to add custom action handlers

**Key Functions:**
```typescript
parseActionFromSubject(subject?: string)
executeAction(action: string, args: string, message: WebhookMessage)
dispatchAction(message: WebhookMessage)
listAvailableActions()
```

### 2. `src/lib/webhook-handler.ts` (138 lines)
**Purpose:** Webhook processing and wake sequence orchestration

**Features:**
- **Wake Sequence**: Triggers when messages arrive
- **Collab Comments**: Adds timestamped HTML comments to collaborative files
- **Action Dispatch**: Routes messages to action handlers
- **Safe File Operations**: Uses append mode to prevent race conditions

**Key Functions:**
```typescript
addCollabComment(agentId: string, message: WebhookMessage, action: string)
formatMessageSummary(message: WebhookMessage)
triggerWakeSequence(agentId: string, message: WebhookMessage)
handleWebhook(agentId: string, payload: {...})
```

### 3. `docs/ACTION_DISPATCHER.md` (278 lines)
**Purpose:** Comprehensive action dispatcher guide

**Contents:**
- How the action dispatcher works
- Built-in actions reference table
- Adding custom actions with examples
- Usage examples from command line
- Advanced conditional actions
- Debugging tips
- Security considerations

### 4. `docs/AGENT_WAKE_FLOW.md` (234 lines)
**Purpose:** Complete flow documentation

**Contents:**
- Visual flow diagrams
- Message format specifications
- Execution paths (realtime watch vs webhook)
- Available actions reference
- Real-world examples (deployment, team coordination, health checks)
- Viewing results
- Troubleshooting guide

### 5. `docs/WEBHOOK_SETUP.md` (191 lines)
**Purpose:** Production webhook setup guide

**Contents:**
- How webhooks work
- Step-by-step Supabase webhook configuration
- Public URL setup options (ngrok, Cloudflare Tunnel, deployment)
- Testing procedures
- Webhook payload format
- Troubleshooting common issues
- Advanced custom actions

### 6. `supabase/migrations/002_fix_security_advisor.sql` (51 lines)
**Purpose:** Database security fixes

**Changes:**
- Converts views to `SECURITY INVOKER` (safer than `SECURITY DEFINER`)
- Views updated: `unread_agent_messages`, `active_branches`, `stale_branches`
- Enables RLS on `agent_aliases` table
- Addresses Supabase Security Advisor warnings

### 7. `vscode-extension/LICENSE`
**Purpose:** License file for VS Code extension

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ Agent Receives Message via Supabase                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ Watch --wake Detects   │
        │ or Webhook Called      │
        └────────────┬───────────┘
                     │
                     ↓
        ┌──────────────────────────┐
        │ 🌅 Wake Sequence         │
        │ - Log message receipt    │
        │ - Add collab comment     │
        │ - Parse message          │
        └────────┬─────────────────┘
                 │
                 ↓
        ┌───────────────────────────┐
        │ 🎯 Action Dispatcher      │
        │ Looks for [action: ...]   │
        └────────┬──────────────────┘
                 │
         ┌───────┴──────────┬──────────────┐
         │                  │              │
         ↓                  ↓              ↓
    ┌────────┐  ┌────────────────┐ ┌──────────┐
    │ log    │  │ inbox/status   │ │broadcast │
    │Execute │  │  Execute       │ │ Execute  │
    └───┬────┘  └────────┬───────┘ └────┬─────┘
        │                │              │
        └────────────────┼──────────────┘
                         │
                         ↓
        ┌─────────────────────────────┐
        │ Log Result to Collab File   │
        │ ✅ or ❌ Status             │
        └─────────────────────────────┘
```

---

## 💡 Message Format

Send messages with action commands in the subject:

```
[action: command-name] optional arguments
```

**Examples:**
```bash
# Log a deployment
mycmail send mycm "[action: log] deployment v2.5.0" -m "Deployed successfully"

# Check inbox with limit
mycmail send mycm "[action: inbox] limit=20" -m "Status check"

# Start collaboration
mycmail send mycm "[action: collab] team-planning-2025" -m "Collaboration info"

# Echo test
mycmail send mycm "[action: echo] ping" -m "Testing action system"
```

---

## 🎬 Usage Examples

### Development: Using Watch Command

```bash
# Terminal 1: Start watching with wake enabled
mycmail watch --wake

# Terminal 2: Send message with action
mycmail send mycm "[action: log] something happened" -m "Details..."

# Result: Message received → wake triggered → action executed → logged to collab file
```

### Production: Using Webhooks

1. Set up Supabase webhook (see `docs/WEBHOOK_SETUP.md`)
2. Send message from anywhere:
   ```bash
   mycmail send mycm "[action: log] event occurred" -m "..."
   ```
3. Webhook automatically triggers → action executes → result logged

---

## 📊 Built-in Actions

| Action | Args | Example | Effect |
|--------|------|---------|--------|
| `log` | message | `[action: log] deployed` | Adds comment to collab file |
| `inbox` | limit=N | `[action: inbox] limit=5` | Checks inbox (placeholder) |
| `broadcast` | message | `[action: broadcast] alert` | Broadcasts message (placeholder) |
| `collab` | name | `[action: collab] team-x` | Starts collaboration (placeholder) |
| `status` | - | `[action: status]` | Checks status |
| `echo` | text | `[action: echo] test` | Returns echo |

---

## 🔧 Extending with Custom Actions

Edit `src/lib/action-dispatcher.ts` and add to the `actionHandlers` object:

```typescript
const actionHandlers = {
    // ... existing actions ...
    
    'my-custom-action': async (args, message) => {
        // Your logic here
        return {
            success: true,
            action: 'my-custom-action',
            result: `Did something with: ${args}`,
            timestamp: new Date().toISOString()
        };
    }
};
```

Then rebuild and use:
```bash
npm run build
mycmail send mycm "[action: my-custom-action] arg1 arg2" -m "..."
```

---

## 📁 Collaborative File Logging

Actions log to: `~/Dev/treebird-internal/Treebird/README.md.md`

**Example log entry:**
```html
<!-- [mycm] 2025-12-25T22:54:00.000Z -->
<!-- 🔔 Webhook Event: message_received -->
<!-- From: wsan | Subject: [action: log] deployment complete -->
<!-- Message ID: 550e8400-e29b-41d4-a716-446655440000 -->
```

**View logs:**
```bash
tail -50 ~/Dev/treebird-internal/Treebird/README.md.md
```

---

## 🔐 Security Considerations

⚠️ **Important:** Current implementation allows any message sender to trigger actions.

**Recommended additions:**
- Sender whitelist (only allow actions from specific agents)
- Rate limiting (prevent action spam)
- Signature verification (ensure message authenticity)
- Action ACLs (certain actions only from certain agents)

**Example with sender verification:**
```typescript
const TRUSTED_SENDERS = ['admin', 'automated-system'];

'secure-action': async (args, message) => {
    if (!TRUSTED_SENDERS.includes(message.sender)) {
        return {
            success: false,
            action: 'secure-action',
            error: `Not authorized: ${message.sender}`,
            timestamp: new Date().toISOString()
        };
    }
    
    // Your action logic here
}
```

---

## ✅ Key Benefits

- **Automated Agent Responses** - Agents react to messages without manual intervention
- **Collaborative Logging** - All actions logged to shared markdown files for team visibility
- **Extensible** - Easy to add custom actions for specific workflows
- **Production Ready** - Webhook support for always-on agents
- **VS Code Integration** - Actions work in the VS Code extension too
- **Safe Concurrency** - Uses append mode to prevent race conditions

---

## 🐛 Known Issues / TODO

- [ ] `inbox`, `broadcast`, `collab` actions are placeholders (need implementation)
- [ ] No sender authentication (security risk)
- [ ] No rate limiting
- [ ] Collaborative file path is hardcoded
- [ ] No action execution history/audit log
- [ ] VS Code extension actions could be more sophisticated

---

## 📚 Related Documentation

- [Action Dispatcher Guide](./ACTION_DISPATCHER.md)
- [Agent Wake Flow](./AGENT_WAKE_FLOW.md)
- [Webhook Setup](./WEBHOOK_SETUP.md)
- [Main README](../README.md)

---

## 🚀 Next Steps

1. **Test the system** - See `docs/TESTING_WAKE_SYSTEM.md`
2. **Commit changes** - Review and commit all new files
3. **Update version** - Bump to next version in `package.json`
4. **Publish** - `npm run build && npm publish`
5. **Broadcast** - Notify all agents via Myceliumail
6. **Deploy webhooks** - Set up production webhooks in Supabase

---

**End of Changelog Draft**
