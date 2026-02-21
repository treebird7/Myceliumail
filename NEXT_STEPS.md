# Myceliumail Next Steps

## 🔥 URGENT: Split-Brain Storage Fix

**Problem:** Messages are being lost because:
- Spidersan sends to Supabase → `spidersan-agent`
- Myceliumail sends to local JSON → `ssan`  
- `mycmail inbox` only checks local storage
- **8+ messages from recovery-tree-agent are invisible!**

**Solution (from ssan's message):**
```bash
# Set these environment variables
export SUPABASE_URL=https://ruvwundetxnzesrbkdzr.supabase.co
export SUPABASE_ANON_KEY=<ask user for staging key>

# Then mycmail will check Supabase first, fall back to local
```

**Code already handles this** - just need to set the env vars!

---

## 📋 Action Items

### 1. Enable Supabase Storage (HIGH PRIORITY)
- [ ] Get staging Supabase key from user
- [ ] Set env vars in shell/config
- [ ] Test: `mycmail inbox` should show Supabase messages
- [ ] Verify unified inbox works

### 2. Implement Agent ID Aliasing
```sql
CREATE TABLE agent_aliases (
    agent_id text PRIMARY KEY,
    aliases text[] NOT NULL
);

INSERT INTO agent_aliases VALUES
    ('ssan', ARRAY['spidersan', 'spidersan-agent', 'mycsan']);
```

### 3. Implement Broadcasting & Channels
- [ ] `mycmail broadcast "<message>"` - send to all agents
- [ ] `mycmail channel create <name>`
- [ ] `mycmail channel join <name>`
- [ ] `mycmail channel post <name> "<message>"`

### 4. npm Publish
- [ ] `cd mcp-server && npm publish`
- [ ] Announce on the network
- [ ] Update docs with install instructions

---

## 📬 Messages Sent Today

| To | Subject | Status |
|---|---|---|
| ssan | Re: TREEBIRD_VISION | ✅ Sent |
| ssan | Re: Split Brain Storage | ✅ Sent |
| watson | Re: Encrypted Test | ✅ Sent |
| watson | MCP Server Ready | ✅ Sent |
| ssan | MCP Server Ready | ✅ Sent |

---

## 🌐 The Treebird Ecosystem (from ssan's message)

**Four Tools:**
1. **Startersan** - Project scaffolding   
2. **Mappersan** - Documentation mapping
3. **Spidersan** - Branch coordination
4. **Myceliumail** - Agent messaging (nervous system!)

**Vision:** AI agents coordinating like trees in a forest, connected by mycelium.

**Your role (mycsan):** The nervous system connecting all agents.

---

## 🔑 Key Insights from Messages

**From ssan:**
- TREEBIRD_VISION manifesto created (515 lines in Spidersan repo)
- Priority: Fix Supabase integration
- Agent naming: mycm/mycsan/mc

**From Watson:**
- Encryption ✅ working perfectly
- Wants broadcast/multi-agent context  
- Use case: Share context between Watson (Claude Desktop) and Sancho (Claude Code)

---

*The mycelium is growing! 🍄🌳*
