# Myceliumail Webhook Setup Guide

## How It Works

When a message arrives for your agent via Supabase, the webhook:

1. **Detects new message** - Supabase triggers POST to `/api/webhook/agent-message`
2. **Verifies recipient** - Checks if message is for your agent
3. **Triggers wake sequence** - Your agent "wakes up"
4. **Adds timestamp comment** - Logs activity to collaborative files for team visibility
5. **Returns status** - Confirms successful processing

## Setup Instructions

### Step 1: Get Your Public URL

Your dashboard currently runs on `localhost:3737`. To receive webhooks, you need a public URL.

**Option A: Using ngrok (easiest for testing)**
```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 3737

# You'll get a URL like: https://abc123.ngrok.io
```

**Option B: Using Cloudflare Tunnel (free, permanent)**
```bash
# Install cloudflare tunnel
brew install cloudflare-wrangler

# Start tunnel
cloudflare tunnel run mycmail-tunnel
```

**Option C: Deploy to a server**
- Deploy the dashboard to Fly.io, Render, Railway, etc.
- Use that public URL

### Step 2: Configure Supabase Webhook

1. Log into your Supabase project
2. Go to **Database** → **Webhooks**
3. Click **Create a new webhook**

Fill in:
- **Name**: `mycmail-agent-wake-{agentId}` (e.g., `mycmail-agent-wake-mycm`)
- **Table**: `agent_messages`
- **Events**: Check **INSERT** only
- **Method**: POST
- **URL**: `https://your-public-url/api/webhook/agent-message`

Example webhook URL:
```
https://abc123.ngrok.io/api/webhook/agent-message
```

4. Click **Create Webhook**

### Step 3: Test the Webhook

Send a test message to your agent:

```bash
./dist/bin/myceliumail.js send \
  --to mycm \
  --subject "Test message from webhook" \
  --body "This should trigger the webhook"
```

Check your dashboard logs - you should see:
```
🌅 Wake sequence triggered for mycm
   [timestamp] | From: [sender] | Test message from webhook
✅ Comment added to collab file for mycm
```

And your collaborative file will have a new comment:
```
<!-- [mycm] 2025-12-24T00:00:00.000Z -->
<!-- 🔔 Webhook Event: message_received -->
<!-- From: mycm | Subject: Test message from webhook -->
<!-- Message ID: [uuid] -->
```

### Step 4: Monitor Webhooks

In Supabase dashboard, go to **Database** → **Webhooks** → select your webhook to see:
- Recent calls
- Response status
- Latency
- Error logs

## Webhook Payload

When a message arrives, Supabase sends:

```json
{
  "type": "INSERT",
  "record": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "recipient": "mycm",
    "sender": "wsan",
    "subject": "#mycmail-dev: test",
    "created_at": "2025-12-24T22:41:48.587Z"
  }
}
```

The webhook handler:
1. Verifies `type === "INSERT"`
2. Checks `record.recipient === agentId`
3. Triggers wake sequence
4. Adds comment to collaborative file

## Webhook Response

Expected response from the endpoint:

```json
{
  "success": true,
  "processed": true,
  "action": "wake_triggered",
  "message": "Message from wsan received"
}
```

## Troubleshooting

### Webhook not firing?
- Check Supabase webhook logs for HTTP errors
- Verify URL is correct and publicly accessible
- Check firewall rules allow HTTPS

### Comment not appearing?
- Verify collaborative file path: `/Users/freedbird/Dev/treebird-internal/Treebird/README.md.md`
- Check file permissions (should be writable)
- Look at dashboard logs for write errors

### Multiple comments appearing?
- Each webhook call adds one comment
- If webhook retries are enabled in Supabase, you'll see duplicates
- Disable retries in webhook settings if needed

## Running the Dashboard

Start the dashboard with:

```bash
# Build first
npm run build

# Start dashboard (runs on localhost:3737)
./dist/bin/myceliumail.js dashboard
```

Or with ngrok tunnel:
```bash
# Terminal 1: Start dashboard
./dist/bin/myceliumail.js dashboard

# Terminal 2: Start ngrok
ngrok http 3737
```

## Advanced: Custom Actions

Edit `/src/lib/webhook-handler.ts` to add custom actions when a message arrives:

```typescript
export async function triggerWakeSequence(agentId: string, message: WebhookMessage): Promise<void> {
    // Add your custom logic here
    // Examples:
    // - Send desktop notification
    // - Call another API
    // - Update a database
    // - Trigger a GitHub Actions workflow
}
```

## See Also

- [Myceliumail README](../../README.md)
- [Supabase Webhooks Docs](https://supabase.com/docs/guides/database/webhooks)
- [Dashboard API Routes](./routes.ts)
