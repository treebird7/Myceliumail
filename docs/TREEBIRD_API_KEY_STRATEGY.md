# Treebird MCP API Key & Tiering Strategy

> **Status:** DRAFT - Awaiting founder decisions  
> **Created:** 2026-01-07 by Sherlocksan  
> **Session:** Security audit → Strategic planning

---

## 🎯 Executive Summary

Drive traffic to Treebird website through API key registration while building a sustainable ecosystem. The killer feature is **multi-agent collaboration** — that's what should be Pro.

**Tagline:**
> **Free:** One bird can tweet.  
> **Pro:** A flock can fly in formation.

---

## 📊 MCP Ecosystem: Free vs Pro Matrix

| MCP | Free Tier | Pro Tier |
|-----|-----------|----------|
| **myceliumail** | Send/receive, 10 msg/day, 3 peer keys | Unlimited messages, unlimited keys, Hub access, real-time notifications |
| **envault** | Local encrypt/decrypt, single key | Team key sharing, audit logs, cloud backup |
| **spidersan** | Branch registration, basic conflict check | Multi-repo support, recommended merge order, CI integration |
| **watsan** | Basic task/project CRUD, 100 queries/day | Semantic search, vector knowledge base, unlimited storage |
| **mappersan** | File structure mapping | Deep semantic analysis, large codebase support, dependency graphs |
| **yosef** | 5 research queries/day | Unlimited research, citation management, source caching |
| **sherlocksan** | Basic security checks | Deep audits, continuous monitoring, CVE tracking, SBOM generation |
| **birdsan** | Orchestration view (read-only) | Multi-agent dispatch, task coordination, fleet management |

---

## 🌟 Pro-Only Features (Across All MCPs)

1. **Multi-Agent Collaboration** — Agents discover, message, coordinate
2. **Real-Time Features** — Hub WebSocket, live notifications, @mentions
3. **Cloud Sync** — Cross-machine state, encrypted backup, shared knowledge
4. **Analytics Dashboard** — Usage metrics, activity tracking

---

## 🔑 API Key Architecture

### User Flow
```
treebird.uk → Sign up → Choose plan → Generate API key → Add to MCP config
```

### API Key Format
```
tb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx   (production)
tb_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx   (development)
```

### MCP Config Example
```json
{
  "mcpServers": {
    "myceliumail": {
      "command": "mycmail",
      "args": ["mcp"],
      "env": {
        "TREEBIRD_API_KEY": "tb_live_xxxxxxxx"
      }
    }
  }
}
```

### Validation Strategy
- Cache validation locally for 1 hour
- Graceful degradation: work offline with cached tier
- On failure: fall back to free tier (not hard fail)

---

## 💰 Suggested Pricing

| Tier | Price | Target |
|------|-------|--------|
| **Free** | $0 | Solo devs, evaluation |
| **Pro** | $12/month | Power users |
| **Team** | $29/month (5 seats) | Small teams |
| **Enterprise** | Contact | Custom SLA |

**Launch special:** $99 lifetime Pro for early adopters.

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Create Treebird website with landing page
- Implement Supabase auth (email + GitHub OAuth)
- Build API key generation endpoint
- Create `/api/v1/validate-key` endpoint

### Phase 2: MCP Integration (Week 3-4)
- Add `@treebird/mcp-auth` shared package
- Integrate into myceliumail-mcp first (pilot)
- Graceful degradation: work offline with cached validation

### Phase 3: Rollout (Week 5-6)
- Add to envault-mcp, watsan-mcp, spidersan-mcp
- Build analytics dashboard
- Launch website publicly

### Phase 4: Pro Features (Ongoing)
- Build mappersan-mcp, yosef-mcp, sherlocksan-mcp, birdsan-mcp
- Implement multi-agent collab features

---

## ⚠️ Open Decisions (For Founder)

1. **Website domain?** treebird.uk? other?
2. **Free tier limits?** Are 10 msg/day, 5 queries/day appropriate?
3. **Pricing?** $12/month Pro reasonable?
4. **Offline behavior?** Graceful degradation or strict validation?
5. **Pilot MCP?** myceliumail-mcp recommended

---

## 📝 Session Context

This strategy emerged from a security audit session on 2026-01-07:

1. Audited Envault and Mycmail for security issues
2. Fixed HIGH severity MCP SDK vulnerability in Envault
3. Added path traversal protection to Envault MCP
4. Created GitHub repo: [treebird7/Envault](https://github.com/treebird7/Envault)
5. Pivoted to strategic planning for API key system

The founder expressed interest in driving traffic to Treebird website via API key registration, similar to Context7 and Snyk patterns.

---

## 🔗 Related Docs

- [MULTI_AGENT_COLLABORATION_PATTERNS.md](./MULTI_AGENT_COLLABORATION_PATTERNS.md)
- [CROSS_TOOL_INTEGRATION_PLAN.md](./CROSS_TOOL_INTEGRATION_PLAN.md)
- [MCP_STARTER_KIT.md](./MCP_STARTER_KIT.md)

---

*Preserved for future sessions by Sherlocksan 🔍*
