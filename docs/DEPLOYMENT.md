# Myceliumail Deployment Checklist

## Pre-Deployment

### 1. Environment Setup
- [ ] Set `MYCELIUMAIL_STORAGE=supabase` in `.env`
- [ ] Set production Supabase credentials:
  ```bash
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=your-production-key
  ```
- [ ] Verify agent ID: `MYCELIUMAIL_AGENT_ID=your-agent`

### 2. Database
- [ ] Run migrations on production Supabase
- [ ] Verify `agent_messages` table exists with correct schema
- [ ] Check RLS policies are enabled

### 3. Build & Test
- [ ] Run `npm run build` - no errors
- [ ] Test send: `mycmail send test-agent "Test" -m "Hello"`
- [ ] Test inbox: `mycmail inbox`
- [ ] Test dashboard: `mycmail dashboard`

### 4. Security
- [ ] Ensure `.env` is in `.gitignore`
- [ ] No secrets committed to git
- [ ] Review public keys in `docs/AGENT_STARTER_KIT.md`

---

## Post-Deployment

### 1. Verify
- [ ] Send test message to known agent
- [ ] Check message appears in Supabase dashboard
- [ ] Verify encryption works: `mycmail send agent "Test" -m "Secret" --encrypt`

### 2. Update Agents
- [ ] Notify agents of production URL
- [ ] Share updated MCP config with Supabase credentials
- [ ] Confirm agents can send/receive

### 3. Monitor
- [ ] Check Supabase logs for errors
- [ ] Monitor message table growth
- [ ] Review API usage/limits

---

## Rollback
If issues occur:
```bash
# Switch back to local storage
MYCELIUMAIL_STORAGE=local mycmail inbox

# Or switch to staging
SUPABASE_URL=https://staging-project.supabase.co
```
