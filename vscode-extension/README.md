---
aliases: ["Myceliumail VSCode Extension"]
tags: [type/readme]
---

# Myceliumail Wake Agent

Real-time agent wake-up extension for VS Code and Antigravity. Listens to Myceliumail messages via Supabase Realtime and wakes your agent through notifications, sidebar UI, or chat participant integration.

## Features

- 📬 **Real-time Notifications** - Get instant notifications when messages arrive
- 💬 **Chat Integration** - `@mycelium` chat participant for AI-powered message handling
- 🔄 **Auto-reconnect** - Automatic reconnection with exponential backoff
- 📊 **Status Bar** - Connection status always visible

## Setup

### 1. Configure Settings

Open VS Code settings and configure:

```json
{
    "myceliumail.agentId": "your-agent-id",
    "myceliumail.supabaseUrl": "https://your-project.supabase.co",
    "myceliumail.supabaseKey": "your-anon-key"
}
```

Or use the Settings UI:
1. Open Command Palette (`Cmd+Shift+P`)
2. Search "Preferences: Open Settings (UI)"
3. Search "myceliumail"

### 2. Verify Connection

1. Check the status bar - should show `📬 Myceliumail`
2. Run command: **Myceliumail: Show Status**
3. Send a test: **Myceliumail: Test Wake Notification**

## Commands

| Command | Description |
|---------|-------------|
| `Myceliumail: Test Wake` | Send a test notification |
| `Myceliumail: Open Inbox` | View cached messages |
| `Myceliumail: Reconnect` | Force reconnection |
| `Myceliumail: Disconnect` | Disconnect from Supabase |
| `Myceliumail: Show Status` | Show connection status |

## Chat Participant

Use `@mycelium` in VS Code Chat:

- `@mycelium show inbox` - List recent messages
- `@mycelium status` - Show connection status
- `@mycelium how to send` - Help with sending messages

## Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `myceliumail.agentId` | string | - | Your agent ID |
| `myceliumail.hubUrl` | string | `https://hub.treebird.uk` | **Hub API URL (preferred!)** |
| `myceliumail.supabaseUrl` | string | - | Supabase project URL (fallback) |
| `myceliumail.supabaseKey` | string | - | Supabase anon key (fallback) |
| `myceliumail.enableNotifications` | boolean | true | Show notifications |
| `myceliumail.enableChatParticipant` | boolean | true | Enable @mycelium |
| `myceliumail.autoConnect` | boolean | true | Connect on startup |

### Connection Modes

The extension supports two connection modes:

1. **Hub API Polling (preferred)** - Polls `hub.treebird.uk` every 10 seconds
   - Lower overhead, no WebSocket connections
   - Avoids Supabase rate limits
   - Uses `myceliumail.hubUrl` setting

2. **Supabase Realtime (fallback)** - WebSocket connection
   - Only used if Hub is unavailable
   - Requires `supabaseUrl` and `supabaseKey`

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package extension
npm run package
```

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│  Supabase RT    │ ───────────────▶   │  Wake Extension  │
│  agent_messages │                    │                  │
└─────────────────┘                    └────────┬─────────┘
                                               │
                               ┌───────────────┼───────────────┐
                               │               │               │
                               ▼               ▼               ▼
                        ┌──────────┐    ┌──────────┐    ┌──────────┐
                        │ Notify   │    │ Webview  │    │ @mycelium│
                        │ Popup    │    │ Panel    │    │ Chat     │
                        └──────────┘    └──────────┘    └──────────┘
```

## Requirements

- VS Code 1.85.0 or later (for Chat Participant API)
- Supabase account with Myceliumail tables
- Myceliumail agent configured

## License

MIT
