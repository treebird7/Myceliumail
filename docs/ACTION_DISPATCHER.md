# Action Dispatcher Guide

## Overview

The Action Dispatcher allows agents to perform specific tasks when pinged with messages containing action commands. It enables:

- **Command-based automation**: Message subjects contain action names
- **Extensible handlers**: Easy to add custom actions
- **Automatic execution**: Actions run immediately when message arrives
- **Logged results**: All actions logged to collaborative files

## How It Works

```
Message arrives
    ↓
Subject parsed: "[action: command-name] args"
    ↓
Action dispatcher routes to handler
    ↓
Handler executes
    ↓
Result logged & returned
```

## Message Format

Send messages with action in the subject:

```
[action: action-name] optional arguments
```

The agent will:
1. Receive the message
2. Parse the subject for `[action: ...]`
3. Extract the action name and arguments
4. Execute the corresponding handler
5. Return results

## Built-in Actions

| Action | Syntax | Example | Purpose |
|--------|--------|---------|---------|
| `log` | `[action: log] message` | `[action: log] deployment complete` | Log to collab file |
| `inbox` | `[action: inbox] [limit=N]` | `[action: inbox] limit=5` | Check inbox |
| `broadcast` | `[action: broadcast] message` | `[action: broadcast] team update` | Send broadcast |
| `collab` | `[action: collab] name` | `[action: collab] project-x` | Join collaboration |
| `status` | `[action: status]` | `[action: status]` | Check status |
| `echo` | `[action: echo] text` | `[action: echo] ping` | Echo test |

## Adding Custom Actions

Edit [src/lib/action-dispatcher.ts](../src/lib/action-dispatcher.ts) to add handlers:

### Basic Action Handler

```typescript
// In the actionHandlers object:

'my-action': async (args, message) => {
    try {
        // Your custom logic here
        const result = `Did something with: ${args}`;
        
        return {
            success: true,
            action: 'my-action',
            result: result,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            action: 'my-action',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        };
    }
}
```

### Example: Execute Shell Command

```typescript
'shell': async (args, message) => {
    const { execSync } = await import('child_process');
    try {
        const output = execSync(args, { encoding: 'utf-8' });
        return {
            success: true,
            action: 'shell',
            result: output,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            action: 'shell',
            error: error instanceof Error ? error.message : 'Execution failed',
            timestamp: new Date().toISOString()
        };
    }
}
```

### Example: Send Message to Another Agent

```typescript
'send-message': async (args, message) => {
    // Parse args: "recipient:subject:body"
    const [recipient, subject, body] = args.split(':');
    
    try {
        // Import storage and send
        const storage = await import('../storage/supabase.js');
        await storage.sendMessage(message.recipient, recipient, subject, body);
        
        return {
            success: true,
            action: 'send-message',
            result: `Sent to ${recipient}`,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            action: 'send-message',
            error: error instanceof Error ? error.message : 'Send failed',
            timestamp: new Date().toISOString()
        };
    }
}
```

### Example: Fetch External Data

```typescript
'fetch-data': async (args, message) => {
    try {
        const response = await fetch(args);
        const data = await response.json();
        
        return {
            success: true,
            action: 'fetch-data',
            result: JSON.stringify(data, null, 2),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            action: 'fetch-data',
            error: error instanceof Error ? error.message : 'Fetch failed',
            timestamp: new Date().toISOString()
        };
    }
}
```

## Usage Examples

### Trigger an action from the command line

```bash
# Wake the agent with an action
mycmail send mycm "[action: log] production deployed" -m "Deployment details..."

# With arguments
mycmail send mycm "[action: inbox] limit=20" -m "Status check"

# Complex argument
mycmail send mycm "[action: collab] team-planning-2025" -m "Collaboration info"
```

### Trigger from another agent

```bash
mycmail send mycm "[action: broadcast] important announcement" -m "Content here"
```

### Trigger via webhook

If using Supabase webhooks, send the message and the webhook will trigger the action.

## Advanced: Conditional Actions

You can add logic to determine which action to execute:

```typescript
'auto': async (args, message) => {
    // Automatically determine action based on sender or content
    if (message.sender === 'admin') {
        // Execute admin actions
        const adminHandler = actionHandlers['admin-action'];
        return await adminHandler?.(args, message);
    } else if (message.subject?.includes('urgent')) {
        // Execute urgent handler
        const urgentHandler = actionHandlers['urgent-response'];
        return await urgentHandler?.(args, message);
    }
    
    return {
        success: false,
        action: 'auto',
        error: 'No matching condition',
        timestamp: new Date().toISOString()
    };
}
```

## Debugging

Check the collab file for logged actions:

```bash
tail /Users/freedbird/Dev/treebird-internal/Treebird/README.md.md
```

You'll see entries like:

```html
<!-- [mycm] ACTION: log | 2025-12-25T22:54:00.000Z -->
<!-- Args: deployment completed -->
<!-- From: wsan | Subject: [action: log] deployment completed -->
```

## Architecture

- **Parser** (`parseActionFromSubject`): Extracts action from message subject
- **Dispatcher** (`dispatchAction`): Routes messages to handlers  
- **Handlers** (in `actionHandlers` object): Execute specific actions
- **Integration** (in `webhook-handler.ts`): Called when message arrives

## Extending

To make actions available globally:

1. Add handler to `actionHandlers` object in `action-dispatcher.ts`
2. Rebuild: `npm run build`
3. Send message with `[action: your-name]` format
4. Agent automatically executes on message receipt

## Performance Considerations

- Actions execute synchronously within the wake sequence
- Long-running actions will block other processing
- For heavy operations, consider deferring work to background jobs
- Keep action handlers lightweight when possible

## Security

⚠️ **Important**: The current implementation allows any message sender to trigger actions. Consider adding:

- Sender whitelist (only allow actions from specific agents)
- Rate limiting (prevent action spam)
- Signature verification (ensure message authenticity)
- Action ACLs (certain actions only from certain agents)

Example with sender verification:

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
