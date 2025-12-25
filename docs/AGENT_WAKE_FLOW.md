# Agent Wake Flow - Complete Guide

## Overview

When a message arrives for your agent, three systems work together:

1. **Real-time Detection** (Supabase Realtime)
2. **Wake Sequence** (triggers agent to wake)
3. **Action Dispatch** (executes specific tasks based on message)

## Complete Flow

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
         ┌───────┴──────────┬──────────────┬──────────────┐
         │                  │              │              │
         ↓                  ↓              ↓              ↓
    ┌────────┐  ┌────────────────┐ ┌──────────┐ ┌──────────┐
    │ log    │  │ inbox/status   │ │broadcast │ │  collab  │
    │        │  │ /broadcast     │ │          │ │          │
    │Execute │  │  Execute       │ │ Execute  │ │ Execute  │
    │action  │  │  action        │ │ action   │ │ action   │
    └───┬────┘  └────────┬───────┘ └────┬─────┘ └────┬─────┘
        │                │              │           │
        └────────────────┼──────────────┴───────────┘
                         │
                         ↓
        ┌─────────────────────────────┐
        │ Log Result to Collab File   │
        │ ✅ or ❌ Status             │
        └─────────────────────────────┘
```

## Message Format

Send a message with action in subject:

```
[action: command-name] optional arguments
```

**Full example:**

```bash
mycmail send mycm "[action: log] deployment v2.5.0" \
  -m "Deployed to production. All tests passing."
```

## Execution Paths

### Path 1: Via Realtime Watch (Recommended for Development)

```bash
# Terminal 1: Start watching
mycmail watch --wake

# Terminal 2: Send message with action
mycmail send mycm "[action: log] something happened" -m "Details..."

# Result: Message received → action executed → comment added
```

### Path 2: Via Webhook (Recommended for Production)

```
1. Set up Supabase webhook:
   - Table: agent_messages
   - Event: INSERT
   - URL: https://your-public-url/api/webhook/agent-message

2. Send message with action anywhere:
   mycmail send mycm "[action: log] event occurred" -m "..."

3. Webhook automatically triggers → action executes
```

## Available Actions

| Command | Args | Example | Effect |
|---------|------|---------|--------|
| `log` | message | `[action: log] deployed` | Adds comment to collab file |
| `inbox` | limit=N | `[action: inbox] limit=5` | Would check inbox |
| `broadcast` | message | `[action: broadcast] alert` | Would broadcast |
| `collab` | name | `[action: collab] team-x` | Would start collab |
| `status` | - | `[action: status]` | Would check status |
| `echo` | text | `[action: echo] test` | Returns echo |

## Real-World Examples

### Example 1: Deployment Notification

```bash
# Trigger from CI/CD system
mycmail send mycm "[action: log] v2.5.0 deployed to prod" \
  -m "✅ All tests passed. Build successful. Deployed at $(date)"
```

Result: Agent wakes → adds timestamped comment to collab file → team sees deployment logged

### Example 2: Team Coordination

```bash
# Wake agent for collaborative work
mycmail send mycm "[action: collab] sprint-planning-q1" \
  -m "Sprint planning document ready. Joining collaboration."
```

Result: Agent wakes → starts/joins collaboration → logs to collab file

### Example 3: System Health Check

```bash
# Automated monitoring
mycmail send mycm "[action: status]" \
  -m "Checking system health at $(date)"
```

Result: Agent checks status → returns results → logs to collab file

## Viewing Results

Check the collaborative file to see all logged actions:

```bash
tail -50 /Users/freedbird/Dev/treebird-internal/Treebird/README.md.md
```

You'll see entries like:

```html
<!-- [mycm] 2025-12-25T22:54:00.000Z -->
<!-- 🔔 Webhook Event: message_received -->
<!-- From: wsan | Subject: [action: log] deployment complete -->
<!-- Message ID: [uuid] -->
```

## Adding Custom Actions

Edit [src/lib/action-dispatcher.ts](../src/lib/action-dispatcher.ts):

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

Then use:

```bash
mycmail send mycm "[action: my-custom-action] arg1 arg2" -m "..."
```

## Troubleshooting

### Action not executing?

1. Check message format: `[action: name]` must be in subject
2. Verify action name matches exactly (case-insensitive)
3. Check watch/webhook is running
4. Look at console output for errors

### Comments not appearing?

1. Verify collab file exists: `/Users/freedbird/Dev/treebird-internal/Treebird/README.md.md`
2. Check file permissions (should be writable)
3. Look at error messages in watch/webhook logs

### Performance issues?

1. Don't run heavy operations in action handlers
2. Consider deferring long-running tasks
3. Monitor system resources during action execution

## Related Documentation

- [Webhook Setup Guide](./WEBHOOK_SETUP.md) - Configure production webhooks
- [Action Dispatcher Details](./ACTION_DISPATCHER.md) - Advanced usage
- [Watch Command Guide](../README.md#watch) - Real-time monitoring

## Quick Reference

**Start watching with automatic wake:**
```bash
mycmail watch --wake
```

**Send action message:**
```bash
mycmail send mycm "[action: log] message" -m "details"
```

**View results:**
```bash
tail /Users/freedbird/Dev/treebird-internal/Treebird/README.md.md
```

**Add custom action:**
```
Edit src/lib/action-dispatcher.ts → add handler → npm run build
```
