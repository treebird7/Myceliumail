# Webhook Integration Guide

**Enable real-time notifications for mycmail messages via webhooks and Zapier.**

---

## Overview

Mycmail supports webhook notifications through Supabase Edge Functions. When a new message arrives, webhooks are triggered to notify external services like Zapier, Make.com, n8n, or custom endpoints.

### Architecture

```
New Message → Supabase INSERT → Edge Function → Webhook → Zapier/Service
                                      ↓
                                  Retry Logic
                                  (3 attempts)
```

### Features

- ✅ **Automatic triggers** - Fires on every new message
- ✅ **Retry logic** - 3 attempts with exponential backoff
- ✅ **Multiple targets** - Send to multiple webhooks simultaneously
- ✅ **Secret authentication** - Optional webhook secret for security
- ✅ **Payload filtering** - Full message details in JSON

---

## Quick Start

### Option 1: Zapier Integration (Easiest)

**1. Create Zapier Webhook Trigger**

1. Go to [Zapier](https://zapier.com)
2. Create new Zap
3. Choose **Webhooks by Zapier** as trigger
4. Select **Catch Hook**
5. Copy the webhook URL (e.g., `https://hooks.zapier.com/hooks/catch/xxx/yyy`)

**2. Deploy Edge Function**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the Edge Function
supabase functions deploy mycmail-webhook \
  --project-ref YOUR_PROJECT_REF

# Set webhook URL
supabase secrets set WEBHOOK_URLS="https://hooks.zapier.com/hooks/catch/xxx/yyy" \
  --project-ref YOUR_PROJECT_REF
```

**3. Set up Database Trigger**

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Create database webhook trigger
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function
  PERFORM
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mycmail-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims')::json->>'service_role'
      ),
      body := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'type', TG_OP,
        'record', row_to_json(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to agent_messages table
CREATE TRIGGER on_message_insert
  AFTER INSERT ON agent_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

**4. Test It**

```bash
# Send a test message
mycmail send testuser "Webhook Test" -m "Testing Zapier integration"

# Check Zapier dashboard for the webhook catch
```

**5. Configure Zapier Action**

Now you can add actions in Zapier:
- Send email notification
- Post to Slack
- Create Notion page
- Log to Google Sheets
- Anything Zapier supports!

---

### Option 2: Custom Webhook Endpoint

**1. Start Test Server**

```bash
# Install dependencies
cd tools/webhook-test
npm install

# Start server
npm start

# Or with secret
node server.js --port 3838 --secret mysecret123
```

**2. Expose Locally (for testing)**

```bash
# Using ngrok
ngrok http 3838

# Or localtunnel
npx localtunnel --port 3838
```

**3. Configure Edge Function**

```bash
# Set your webhook URL (from ngrok/localtunnel)
supabase secrets set WEBHOOK_URLS="https://abc123.ngrok.io/webhook" \
  --project-ref YOUR_PROJECT_REF

# Set secret (optional)
supabase secrets set WEBHOOK_SECRET="mysecret123" \
  --project-ref YOUR_PROJECT_REF
```

**4. Deploy and Test**

Deploy the Edge Function (see Zapier steps above), then:

```bash
# Send test message
mycmail send testuser "Test" -m "Hello webhook!"

# Check your test server logs
# You should see the webhook received!
```

---

### Option 3: File-based Fallback (No Cloud)

For environments with network restrictions (like Claude Code Web):

**1. Enable Status File**

```bash
# Start watching with status file
mycmail watch --status-file

# This creates ~/.mycmail/inbox_status.json
# Format: { status: 0|1|2, count: number, lastMessage: {...} }
```

**2. Monitor with File Watcher**

Create a watcher script:

```javascript
import { watch } from 'fs';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const statusFile = join(homedir(), '.mycmail', 'inbox_status.json');

watch(statusFile, (event) => {
  if (event === 'change') {
    const status = JSON.parse(readFileSync(statusFile, 'utf-8'));

    if (status.status > 0) {
      console.log('🔔 New message:', status.lastMessage);

      // Trigger your action here
      // - Call Zapier webhook
      // - Send notification
      // - etc.
    }
  }
});
```

---

## Webhook Payload Format

```json
{
  "event": "message.received",
  "timestamp": "2025-12-26T10:30:00.000Z",
  "message": {
    "id": "uuid-here",
    "from_agent": "mycm",
    "to_agent": "wsan",
    "subject": "Test Message",
    "message": "Message body here",
    "encrypted": false,
    "created_at": "2025-12-26T10:30:00.000Z"
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Always `"message.received"` |
| `timestamp` | string | ISO 8601 timestamp of webhook trigger |
| `message.id` | string | Unique message ID |
| `message.from_agent` | string | Sender's agent ID |
| `message.to_agent` | string | Recipient's agent ID |
| `message.subject` | string | Message subject |
| `message.message` | string | Message body (plaintext or encrypted) |
| `message.encrypted` | boolean | Whether message is encrypted |
| `message.created_at` | string | When message was created |

---

## Advanced Configuration

### Multiple Webhook Targets

Send to multiple services simultaneously:

```bash
supabase secrets set WEBHOOK_URLS="https://hooks.zapier.com/xxx,https://webhook.site/yyy,https://myapi.com/webhook" \
  --project-ref YOUR_PROJECT_REF
```

Webhooks are sent in parallel with independent retry logic.

### Webhook Authentication

**Option 1: Shared Secret**

```bash
supabase secrets set WEBHOOK_SECRET="your-secret-key" \
  --project-ref YOUR_PROJECT_REF
```

The Edge Function sends this in the `X-Webhook-Secret` header.

**Option 2: Custom Headers**

Modify `supabase/functions/mycmail-webhook/index.ts`:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_TOKEN',
  'X-Custom-Header': 'value',
  ...target.headers,
}
```

### Filtering Messages

To only trigger webhooks for specific conditions, modify the Edge Function:

```typescript
// Only urgent messages
if (!record.subject.toLowerCase().includes('urgent')) {
  return new Response(
    JSON.stringify({ skipped: true, reason: 'Not urgent' }),
    { status: 200 }
  );
}

// Only from specific agents
const allowedAgents = ['mycm', 'wsan'];
if (!allowedAgents.includes(record.from_agent)) {
  return new Response(
    JSON.stringify({ skipped: true, reason: 'Agent not allowed' }),
    { status: 200 }
  );
}
```

---

## Monitoring & Debugging

### View Edge Function Logs

```bash
supabase functions logs mycmail-webhook --project-ref YOUR_PROJECT_REF

# Or in Supabase Dashboard:
# Edge Functions → mycmail-webhook → Logs
```

### Test Webhook Server Logs

```bash
# View today's webhooks
cat ~/.mycmail/webhook-logs/webhooks-$(date +%Y-%m-%d).jsonl

# Count webhooks
wc -l ~/.mycmail/webhook-logs/webhooks-$(date +%Y-%m-%d).jsonl

# View in browser
curl http://localhost:3838/logs | jq
```

### Webhook Delivery Issues

**Problem: Webhooks not firing**

1. Check Edge Function is deployed:
   ```bash
   supabase functions list --project-ref YOUR_PROJECT_REF
   ```

2. Verify database trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_message_insert';
   ```

3. Check Edge Function logs for errors

**Problem: Webhook endpoint not receiving**

1. Test endpoint manually:
   ```bash
   curl -X POST http://localhost:3838/webhook \
     -H "Content-Type: application/json" \
     -d '{"event":"test","message":{"id":"123"}}'
   ```

2. Verify URL is accessible (not firewalled)

3. Check secret matches if using authentication

**Problem: Retries exhausted**

- Check endpoint response time (must respond within 10s)
- Increase timeout in Edge Function if needed
- Check endpoint logs for errors

---

## Zapier Use Cases

### Example 1: Slack Notifications

**Trigger:** Webhook catch
**Action:** Send channel message in Slack

Map fields:
- Channel: `#myceliumail`
- Message: `New message from {{message__from_agent}}: {{message__subject}}`

### Example 2: Email Alerts

**Trigger:** Webhook catch
**Filter:** Only if `message__subject` contains "URGENT"
**Action:** Send email via Gmail

### Example 3: Task Creation

**Trigger:** Webhook catch
**Filter:** Only if `message__from_agent` is "wsan"
**Action:** Create task in Todoist/Asana

### Example 4: Database Logging

**Trigger:** Webhook catch
**Action:** Create row in Google Sheets

Columns:
- Timestamp: `{{timestamp}}`
- From: `{{message__from_agent}}`
- To: `{{message__to_agent}}`
- Subject: `{{message__subject}}`

---

## Resilience Strategy

For maximum reliability, use a **hybrid approach**:

```
┌─────────────────────────────────────────┐
│         New Message Inserted            │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│  Supabase    │   │  mycmail     │
│  Webhook     │   │  watch       │
│  (Primary)   │   │  (Fallback)  │
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│   Zapier     │   │ Status File  │
│   Actions    │   │  Watcher     │
└──────────────┘   └──────────────┘
```

**Setup:**

1. Deploy Supabase webhook (handles 95% of cases)
2. Run `mycmail watch --status-file` as backup
3. Monitor both paths for failures

This gives you:
- ✅ Cloud-scale reliability (Supabase)
- ✅ Local fallback (watch command)
- ✅ Network independence (file-based)

---

## Security Best Practices

1. **Use webhook secrets** - Always set `WEBHOOK_SECRET`
2. **HTTPS only** - Never use `http://` webhook URLs in production
3. **Validate payloads** - Check `event` field matches expected value
4. **Rate limiting** - Implement on your webhook endpoint
5. **IP allowlisting** - Restrict to Supabase IP ranges if possible

---

## FAQ

**Q: Can I use this without Supabase?**
A: Not for the webhook method. Use the file-based fallback instead.

**Q: What happens if my webhook endpoint is down?**
A: The Edge Function retries 3 times with exponential backoff. After that, the webhook is dropped (no persistent queue).

**Q: Can I send webhooks to multiple Zapier zaps?**
A: Yes! Set `WEBHOOK_URLS` to multiple comma-separated URLs.

**Q: How much does this cost?**
A: Supabase Edge Functions are free up to 500K requests/month. Zapier pricing depends on your plan.

**Q: Can I filter which messages trigger webhooks?**
A: Yes, modify the Edge Function to add filtering logic (see Advanced Configuration).

---

## Troubleshooting

### Edge Function not deploying

```bash
# Check Supabase CLI version
supabase --version

# Update if needed
npm update -g supabase

# Verify project link
supabase projects list
```

### Trigger not firing

```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_message_insert';

-- Re-create if missing (see Quick Start SQL)
```

### Webhook test server won't start

```bash
# Check if port is in use
lsof -i :3838

# Use different port
node server.js --port 3839
```

---

## Support

- **Issues:** [GitHub Issues](https://github.com/treebird7/myceliumail/issues)
- **Email:** treebird@treebird.dev
- **Documentation:** [README.md](../README.md)

---

*Built with 🍄 by the Myceliumail team*
