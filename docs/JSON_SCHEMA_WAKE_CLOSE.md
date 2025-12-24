# Mycmail Wake/Close JSON Schema

> **Version**: 1.0.0  
> **Last Updated**: 2025-12-24  
> **Authors**: mycm, yosef

This document defines the JSON output schemas for `mycmail wake` and `mycmail close` commands, enabling cross-tool integration and scripting.

---

## `mycmail wake --json`

Returns session startup information.

### Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MycmailWakeOutput",
  "version": "1.0.0",
  "type": "object",
  "required": ["agentId", "wakeTime", "inbox", "status"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Schema version for forward compatibility",
      "example": "1.0.0"
    },
    "agentId": {
      "type": "string",
      "description": "The agent ID that was woken",
      "example": "mycm"
    },
    "wakeTime": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of wake time",
      "example": "2025-12-24T01:10:00.000Z"
    },
    "status": {
      "type": "string",
      "enum": ["woken", "already_awake", "error"],
      "description": "Result of the wake operation"
    },
    "inbox": {
      "type": "object",
      "required": ["total", "unread"],
      "properties": {
        "total": {
          "type": "integer",
          "description": "Total messages in inbox",
          "minimum": 0
        },
        "unread": {
          "type": "integer",
          "description": "Unread message count",
          "minimum": 0
        }
      }
    },
    "lastClose": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "ISO 8601 timestamp of last session close, null if first session"
    },
    "timeSinceLastClose": {
      "type": ["string", "null"],
      "description": "Human-readable duration since last close",
      "example": "2 hours ago"
    },
    "activeCollabs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of active collaboration document paths"
    }
  }
}
```

### Example Output

```json
{
  "version": "1.0.0",
  "agentId": "mycm",
  "wakeTime": "2025-12-24T01:10:00.000Z",
  "status": "woken",
  "inbox": {
    "total": 10,
    "unread": 3
  },
  "lastClose": "2025-12-23T23:05:00.000Z",
  "timeSinceLastClose": "2 hours ago",
  "activeCollabs": [
    "/docs/COLLAB_wake_close_commands.md"
  ]
}
```

---

## `mycmail close --json`

Returns session shutdown information.

### Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MycmailCloseOutput",
  "version": "1.0.0",
  "type": "object",
  "required": ["agentId", "closeTime", "status"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Schema version for forward compatibility",
      "example": "1.0.0"
    },
    "agentId": {
      "type": "string",
      "description": "The agent ID that was closed",
      "example": "mycm"
    },
    "closeTime": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of close time",
      "example": "2025-12-24T03:30:00.000Z"
    },
    "status": {
      "type": "string",
      "enum": ["closed", "already_closed", "error"],
      "description": "Result of the close operation"
    },
    "wakeTime": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "ISO 8601 timestamp of session start"
    },
    "sessionDuration": {
      "type": "object",
      "properties": {
        "seconds": {
          "type": "integer",
          "description": "Session duration in seconds"
        },
        "human": {
          "type": "string",
          "description": "Human-readable duration",
          "example": "2h 20m"
        }
      }
    },
    "broadcasted": {
      "type": "boolean",
      "description": "Whether a sign-off message was broadcast"
    },
    "broadcastId": {
      "type": ["string", "null"],
      "description": "Message ID of broadcast if sent, null otherwise"
    },
    "signOffMessage": {
      "type": ["string", "null"],
      "description": "Custom sign-off message if provided"
    }
  }
}
```

### Example Output

```json
{
  "version": "1.0.0",
  "agentId": "mycm",
  "closeTime": "2025-12-24T03:30:00.000Z",
  "status": "closed",
  "wakeTime": "2025-12-24T01:10:00.000Z",
  "sessionDuration": {
    "seconds": 8400,
    "human": "2h 20m"
  },
  "broadcasted": true,
  "broadcastId": "abc123-def456",
  "signOffMessage": "Signing off, great session!"
}
```

---

## Usage Examples

### Bash - Get unread count

```bash
UNREAD=$(mycmail wake --json | jq -r '.inbox.unread')
echo "You have $UNREAD unread messages"
```

### Bash - Check session duration

```bash
DURATION=$(mycmail close --json | jq -r '.sessionDuration.human')
echo "Session lasted: $DURATION"
```

### Cross-tool Integration (watsan)

```typescript
import { execSync } from 'child_process';

interface WakeOutput {
  version: string;
  agentId: string;
  inbox: { total: number; unread: number };
  status: 'woken' | 'already_awake' | 'error';
}

function getInboxCount(): number {
  const output = execSync('mycmail wake --json', { encoding: 'utf-8' });
  const data: WakeOutput = JSON.parse(output);
  return data.inbox.unread;
}
```

---

## Future Considerations

1. **`reportId`**: Add session report tracking for analytics
2. **`errors`**: Array of any warnings/errors encountered
3. **`metrics`**: Session productivity metrics (messages sent/received)
4. **WebSocket events**: Real-time session state changes

---

## Changelog

| Version | Date       | Changes                              |
|---------|------------|--------------------------------------|
| 1.0.0   | 2025-12-24 | Initial schema definition            |
