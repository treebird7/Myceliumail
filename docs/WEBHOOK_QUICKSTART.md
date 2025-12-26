# Webhook Quick Start

**Get webhooks running in 5 minutes.**

---

## Zapier (Fastest)

```bash
# 1. Create Zapier webhook trigger → copy URL

# 2. Deploy Edge Function
supabase functions deploy mycmail-webhook --project-ref YOUR_PROJECT_REF

# 3. Set webhook URL
supabase secrets set WEBHOOK_URLS="https://hooks.zapier.com/hooks/catch/xxx/yyy"

# 4. Run this SQL in Supabase Dashboard:
```

```sql
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mycmail-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims')::json->>'service_role'
      ),
      body := jsonb_build_object('table', TG_TABLE_NAME, 'type', TG_OP, 'record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON agent_messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();
```

```bash
# 5. Test
mycmail send testuser "Test" -m "Hello!"

# Check Zapier dashboard - you should see the webhook!
```

---

## Local Testing (No Zapier)

```bash
# 1. Start test server
cd tools/webhook-test
npm install
npm start

# 2. Expose with ngrok
ngrok http 3838

# 3. Copy ngrok URL and deploy
supabase functions deploy mycmail-webhook
supabase secrets set WEBHOOK_URLS="https://abc123.ngrok.io/webhook"

# 4. Run the SQL above

# 5. Test
mycmail send testuser "Test" -m "Hello!"

# Check your terminal - webhook received!
```

---

## File-based (No Internet)

```bash
# Start watching
mycmail watch --status-file

# Creates ~/.mycmail/inbox_status.json
# Monitor this file for changes!
```

---

**Full docs:** [WEBHOOKS.md](WEBHOOKS.md)
