---
aliases: ["Myceliumail Supabase Functions"]
tags: [type/readme]
---

# Myceliumail Edge Functions

Supabase Edge Functions for mycmail integrations.

## Available Functions

### mycmail-webhook

**Purpose:** Send webhook notifications when new messages are received

**Trigger:** Database INSERT on `agent_messages` table

**Configuration:**
```bash
# Required: Comma-separated webhook URLs
WEBHOOK_URLS=https://hooks.zapier.com/xxx,https://myapi.com/webhook

# Optional: Webhook authentication secret
WEBHOOK_SECRET=your-secret-key
```

**Features:**
- ✅ Retry logic (3 attempts with exponential backoff)
- ✅ Multiple webhook targets
- ✅ 10-second timeout per request
- ✅ Parallel delivery to all targets
- ✅ Detailed logging

**Deployment:**
```bash
supabase functions deploy mycmail-webhook --project-ref YOUR_PROJECT_REF
supabase secrets set WEBHOOK_URLS="..." --project-ref YOUR_PROJECT_REF
```

**Documentation:** See [docs/WEBHOOKS.md](../../docs/WEBHOOKS.md)

---

## Local Development

### Prerequisites
- Supabase CLI: `npm install -g supabase`
- Deno runtime (installed automatically by Supabase CLI)

### Testing Locally

```bash
# Serve function locally
supabase functions serve mycmail-webhook

# Test with curl
curl -X POST http://localhost:54321/functions/v1/mycmail-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "table": "agent_messages",
    "type": "INSERT",
    "record": {
      "id": "test-123",
      "from_agent": "mycm",
      "to_agent": "wsan",
      "subject": "Test",
      "message": "Hello!",
      "encrypted": false,
      "created_at": "2025-12-26T10:00:00Z"
    }
  }'
```

### Environment Variables

Create `.env` in the function directory:

```bash
WEBHOOK_URLS=http://localhost:3838/webhook
WEBHOOK_SECRET=test-secret
```

---

## Monitoring

### View Logs

```bash
# Real-time logs
supabase functions logs mycmail-webhook --follow

# Or in Supabase Dashboard
# Edge Functions → mycmail-webhook → Logs
```

### Metrics

Monitor in Supabase Dashboard:
- Invocations per hour
- Error rate
- Average execution time

---

## Troubleshooting

**Function not receiving triggers:**
1. Verify database trigger exists (see docs/WEBHOOK_QUICKSTART.md)
2. Check RLS policies allow INSERT
3. Verify function is deployed: `supabase functions list`

**Webhooks not delivering:**
1. Check WEBHOOK_URLS secret: `supabase secrets list`
2. Verify endpoint is accessible
3. Check function logs for errors

**Timeout errors:**
1. Increase timeout in index.ts (default: 10s)
2. Check webhook endpoint response time
3. Verify network connectivity

---

For full documentation, see [docs/WEBHOOKS.md](../../docs/WEBHOOKS.md)
