# Testing the Agent Wake System & Action Dispatcher

This guide provides step-by-step instructions to test all the new wake system features.

---

## 🎯 Prerequisites

Before testing, ensure:

1. **Build the project:**
   ```bash
   cd /Users/freedbird/Dev/myceliumail
   npm run build
   ```

2. **⚠️ IMPORTANT: Use Local Development Version**
   
   The `--wake` flag and other new features are NOT yet published to npm. You MUST use the local version:
   
   ```bash
   # ❌ DON'T use this (points to old published version):
   mycmail watch --wake
   
   # ✅ DO use this (local development version):
   node dist/bin/myceliumail.js watch --wake
   ```
   
   For convenience, you can create an alias:
   ```bash
   alias mycmail-dev='node dist/bin/myceliumail.js'
   ```

3. **Verify configuration:**
   ```bash
   mycmail config
   ```
   Should show your agent ID and Supabase connection.

4. **Ensure collaborative file exists:**
   ```bash
   mkdir -p ~/Dev/treebird-internal/Treebird
   touch ~/Dev/treebird-internal/Treebird/README.md.md
   ```

---

## 🧪 Test Suite

### Test 1: Basic Watch with Wake Flag

**Purpose:** Verify `--wake` flag triggers wake sequence

**Steps:**
```bash
# Terminal 1: Start watching with wake enabled
mycmail watch --wake

# Terminal 2: Send a test message
mycmail send mycm "Test message" -m "This is a basic wake test"
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: Test message
   Preview: This is a basic wake test
```

**Expected in Collab File:**
```bash
tail ~/Dev/treebird-internal/Treebird/README.md.md
```
Should show:
```html
<!-- [mycm] 2025-12-25T... -->
<!-- 🔔 Webhook Event: message_received -->
<!-- From: [sender] | Subject: Test message -->
<!-- Message ID: [...] -->
```

**✅ Pass Criteria:**
- Wake sequence message appears in terminal
- Comment added to collaborative file
- No errors in console

---

### Test 2: Action - Log

**Purpose:** Test the `log` action handler

**Steps:**
```bash
# Terminal 1: Keep watch running
mycmail watch --wake

# Terminal 2: Send message with log action
mycmail send mycm "[action: log] deployment v2.5.0" -m "Deployed to production successfully"
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: [action: log] deployment v2.5.0
🎯 Action detected: log | Args: deployment v2.5.0
✅ Action succeeded: Logged to collaborative file
```

**Expected in Collab File:**
```html
<!-- [mycm] ACTION: log | 2025-12-25T... -->
<!-- Args: deployment v2.5.0 -->
<!-- From: [sender] | Subject: [action: log] deployment v2.5.0 -->
```

**✅ Pass Criteria:**
- Action detected and executed
- Success message appears
- ACTION comment added to collab file with args

---

### Test 3: Action - Echo

**Purpose:** Test the `echo` action handler

**Steps:**
```bash
# Terminal 1: Keep watch running
mycmail watch --wake

# Terminal 2: Send echo action
mycmail send mycm "[action: echo] ping test" -m "Testing echo functionality"
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: [action: echo] ping test
🎯 Action detected: echo | Args: ping test
✅ Action succeeded: Echo: ping test
```

**✅ Pass Criteria:**
- Echo action executes
- Returns "Echo: ping test"
- No errors

---

### Test 4: Action - Status

**Purpose:** Test the `status` action handler

**Steps:**
```bash
# Terminal 1: Keep watch running
mycmail watch --wake

# Terminal 2: Send status action
mycmail send mycm "[action: status]" -m "Checking agent status"
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: [action: status]
🎯 Action detected: status | Args: (none)
✅ Action succeeded: Status check at 2025-12-25T...
```

**✅ Pass Criteria:**
- Status action executes
- Returns timestamp
- No errors

---

### Test 5: Action - Inbox (Placeholder)

**Purpose:** Test placeholder action

**Steps:**
```bash
# Terminal 1: Keep watch running
mycmail watch --wake

# Terminal 2: Send inbox action with limit
mycmail send mycm "[action: inbox] limit=20" -m "Check inbox"
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: [action: inbox] limit=20
🎯 Action detected: inbox | Args: limit=20
✅ Action succeeded: Would check inbox (limit: 20)
```

**✅ Pass Criteria:**
- Inbox action recognized
- Limit parameter parsed correctly
- Returns placeholder message

---

### Test 6: Unknown Action

**Purpose:** Test error handling for unknown actions

**Steps:**
```bash
# Terminal 1: Keep watch running
mycmail watch --wake

# Terminal 2: Send unknown action
mycmail send mycm "[action: unknown-action] test" -m "Testing error handling"
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: [action: unknown-action] test
🎯 Action detected: unknown-action | Args: test
❌ Action failed: Unknown action: unknown-action. Available: log, inbox, broadcast, collab, status, echo
```

**✅ Pass Criteria:**
- Error message appears
- Lists available actions
- No crash or exception

---

### Test 7: Message Without Action

**Purpose:** Verify normal messages still work

**Steps:**
```bash
# Terminal 1: Keep watch running
mycmail watch --wake

# Terminal 2: Send normal message (no action)
mycmail send mycm "Regular message" -m "No action here"
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: Regular message
   Preview: No action here
```

**Expected in Collab File:**
```html
<!-- [mycm] 2025-12-25T... -->
<!-- 🔔 Webhook Event: message_received -->
<!-- From: [sender] | Subject: Regular message -->
```

**✅ Pass Criteria:**
- Wake sequence triggers
- No action detected (normal behavior)
- Comment added to collab file
- No errors

---

### Test 8: Dashboard Webhook Endpoint

**Purpose:** Test the webhook endpoint directly

**Steps:**
```bash
# Terminal 1: Start dashboard
mycmail dashboard

# Terminal 2: Send test webhook
curl -X POST http://localhost:3737/api/webhook/agent-message \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "record": {
      "id": "test-id-123",
      "recipient": "mycm",
      "sender": "test-sender",
      "subject": "[action: echo] webhook test",
      "created_at": "2025-12-25T00:00:00.000Z"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "processed": true,
  "action": "wake_triggered",
  "message": "Message from test-sender received"
}
```

**Expected in Dashboard Logs:**
```
🌅 Wake sequence triggered for mycm
   00:00:00 | From: test-sender | [action: echo] webhook test
🎯 Action detected: echo | Args: webhook test
✅ Action succeeded: Echo: webhook test
✅ Comment added to collab file for mycm
```

**✅ Pass Criteria:**
- Webhook returns success
- Wake sequence triggers
- Action executes
- Comment added to collab file

---

### Test 9: VS Code Extension Actions (Optional)

**Purpose:** Test action dispatcher in VS Code extension

**Prerequisites:**
- VS Code Wake Agent extension installed
- Extension configured with agent ID

**Steps:**
1. Open VS Code with the extension enabled
2. Send message with action:
   ```bash
   mycmail send mycm "[action: open-terminal]" -m "Open terminal test"
   ```

**Expected in VS Code:**
- Notification appears
- Terminal opens automatically

**✅ Pass Criteria:**
- Action executes in VS Code
- Terminal created
- No errors in extension logs

---

### Test 10: Concurrent Messages

**Purpose:** Test race condition handling with multiple simultaneous messages

**Steps:**
```bash
# Terminal 1: Keep watch running
mycmail watch --wake

# Terminal 2: Send multiple messages quickly
for i in {1..5}; do
  mycmail send mycm "[action: log] test-$i" -m "Concurrent test $i" &
done
wait
```

**Expected Output (Terminal 1):**
```
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: [action: log] test-1
🎯 Action detected: log | Args: test-1
✅ Action succeeded: Logged to collaborative file
📬 [HH:MM:SS] New message from [sender]
   🌅 Wake sequence triggered
   Subject: [action: log] test-2
🎯 Action detected: log | Args: test-2
✅ Action succeeded: Logged to collaborative file
...
```

**Expected in Collab File:**
```bash
tail -20 ~/Dev/treebird-internal/Treebird/README.md.md
```
Should show 5 separate ACTION comments (no data loss)

**✅ Pass Criteria:**
- All 5 messages processed
- All 5 comments appear in collab file
- No race condition errors
- No data corruption

---

## 🔍 Debugging Tips

### Check Watch Logs
```bash
# Run watch with verbose output
mycmail watch --wake
```

### Check Dashboard Logs
```bash
# Run dashboard and watch console
mycmail dashboard
```

### Inspect Collab File
```bash
# View last 50 lines
tail -50 ~/Dev/treebird-internal/Treebird/README.md.md

# Watch file in real-time
tail -f ~/Dev/treebird-internal/Treebird/README.md.md
```

### Check Message Database
```bash
# List recent messages
mycmail inbox -l 10
```

### Verify Build
```bash
# Ensure latest code is built
npm run build

# Check for TypeScript errors
npm run build 2>&1 | grep error
```

---

## 🐛 Common Issues

### Issue: "Collab file not found"
**Solution:**
```bash
mkdir -p ~/Dev/treebird-internal/Treebird
touch ~/Dev/treebird-internal/Treebird/README.md.md
```

### Issue: "Wake sequence not triggering"
**Checklist:**
- [ ] `--wake` flag is used
- [ ] Watch command is running
- [ ] Message recipient matches agent ID
- [ ] No errors in console

### Issue: "Action not executing"
**Checklist:**
- [ ] Subject contains `[action: name]` format
- [ ] Action name is spelled correctly (case-insensitive)
- [ ] Action name is in the available list: log, inbox, broadcast, collab, status, echo

### Issue: "Comments not appearing in collab file"
**Checklist:**
- [ ] File exists and is writable
- [ ] Path is correct: `~/Dev/treebird-internal/Treebird/README.md.md`
- [ ] No file permission errors in console
- [ ] Check with: `ls -la ~/Dev/treebird-internal/Treebird/README.md.md`

### Issue: "Webhook endpoint not responding"
**Checklist:**
- [ ] Dashboard is running
- [ ] Port 3737 is not blocked
- [ ] Request format matches expected payload
- [ ] Check dashboard console for errors

---

## 📊 Test Results Template

Copy and fill out after testing:

```
# Test Results - Agent Wake System

Date: ___________
Tester: ___________

## Test Results

- [ ] Test 1: Basic Watch with Wake Flag
- [ ] Test 2: Action - Log
- [ ] Test 3: Action - Echo
- [ ] Test 4: Action - Status
- [ ] Test 5: Action - Inbox (Placeholder)
- [ ] Test 6: Unknown Action
- [ ] Test 7: Message Without Action
- [ ] Test 8: Dashboard Webhook Endpoint
- [ ] Test 9: VS Code Extension Actions (Optional)
- [ ] Test 10: Concurrent Messages

## Issues Found

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

## Notes

___________________________________________
___________________________________________
___________________________________________

## Overall Status

[ ] All tests passed
[ ] Some tests failed (see issues)
[ ] Ready for production
[ ] Needs more work
```

---

## 🚀 Next Steps After Testing

1. **Fix any issues found**
2. **Commit the changes:**
   ```bash
   git add .
   git commit -m "feat: add agent wake system and action dispatcher"
   ```

3. **Update version and publish:**
   ```bash
   npm version minor
   npm run build
   npm publish
   ```

4. **Set up production webhooks** (see `WEBHOOK_SETUP.md`)

5. **Notify other agents:**
   ```bash
   mycmail send wsan "[action: log] Wake system deployed" \
     -m "New action dispatcher system is live. See docs/AGENT_WAKE_FLOW.md"
   ```

---

**Happy Testing! 🎉**
