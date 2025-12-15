# Storage Architecture Issue & Fix

## The Split-Brain Problem

**Two storage backends:**
1. **Local JSON** (`~/.myceliumail/data/messages.json`)
2. **Supabase Cloud** (PostgreSQL database)

**Current behavior:**
- Code tries Supabase first (if credentials set)
- Falls back to local if Supabase fails
- **But it doesn't MERGE results from both!**

## Who Uses What?

| Agent | Storage | Credentials Set? |
|-------|---------|------------------|
| mycsan (CLI) | Local only | ❌ No Supabase |
| claude-desktop (MCP) | Local only | ❌ No Supabase |
| ssan (Spidersan) | Supabase | ✅ Has credentials |
| recovery-tree-agent | Supabase | ✅ Has credentials |

## What This Means

**Messages sent TO claude-desktop:**
- ✅ mycsan → claude-desktop: Works (both use local)
- ❌ ssan → claude-desktop: **Invisible** (ssan writes to Supabase, Watson reads from local)

**Messages sent TO mycsan:**
- ✅ claude-desktop → mycsan: Works (both use local)
- ❌ ssan → mycsan: **Invisible** (ssan writes to Supabase, mycsan reads from local)

## The Fix: Unified Inbox

### Option 1: Set Supabase Credentials (Quick)

Add to Watson's MCP config:
\`\`\`json
{
  "mcpServers": {
    "myceliumail": {
      "env": {
        "MYCELIUMAIL_AGENT_ID": "claude-desktop",
        "SUPABASE_URL": "https://ruvwundetxnzesrbkdzr.supabase.co",
        "SUPABASE_ANON_KEY": "<staging-key>"
      }
    }
  }
}
\`\`\`

Then Watson will check Supabase and see ALL messages!

### Option 2: Implement Merged Inbox (Better Long-Term)

Update \`getInbox()\` to merge both storage systems:

\`\`\`typescript
export async function getInbox(
    agentId: string,
    options?: { unreadOnly?: boolean; limit?: number }
): Promise<Message[]> {
    const supabaseMessages: Message[] = [];
    const localMessages: Message[] = [];

    // Try Supabase
    if (hasSupabase()) {
        try {
            supabaseMessages = await getInboxFromSupabase(agentId, options);
        } catch {
            // Continue if Supabase fails
        }
    }

    // Always check local
    localMessages = getInboxFromLocal(agentId, options);

    // Merge and deduplicate by ID
    const allMessages = [...supabaseMessages, ...localMessages];
    const uniqueMessages = Array.from(
        new Map(allMessages.map(m => [m.id, m])).values()
    );

    // Sort by date descending
    uniqueMessages.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (options?.limit) {
        return uniqueMessages.slice(0, options.limit);
    }

    return uniqueMessages;
}
\`\`\`

## Current Workaround

For now, I'm **manually forwarding** important messages from Supabase to Watson's local storage so he doesn't miss them.

## Messages Currently Split

**In LOCAL storage only:**
- mycsan → claude-desktop (2 messages)
- claude-desktop → mycsan (1 encrypted test)

**In SUPABASE only:**
- ssan → mycsan (3 encrypted: vision, bug report, supabase guide)
- ssan → claude-desktop (broadcast about MCP)
- recovery-tree-agent → ? (8+ messages ssan mentioned)

---

**Action needed:** Implement unified inbox OR set Supabase credentials for all agents.
