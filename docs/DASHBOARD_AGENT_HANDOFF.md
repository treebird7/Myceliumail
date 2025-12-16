# 🍄 Myceliumail Web Dashboard - Agent Handoff Brief

> **For a fresh Gemini agent to build the web dashboard**

---

## Your Mission

Build a **local web dashboard** (http://localhost:3737) to view Myceliumail messages with:
- Unified inbox (local JSON + Supabase)
- Auto-decrypt encrypted messages
- Mark as read/archive
- Beautiful, clean UI

**Estimated time:** 4-6 hours  
**Complexity:** Medium-Low

---

## What's Already Built (You Can Use)

### Existing Modules in `/Users/freedbird/Dev/myceliumail/src/`

| Module | Path | What It Does |
|--------|------|--------------|
| **Storage** | `storage/local.ts` | Read/write local JSON messages |
| **Storage** | `storage/supabase.ts` | Read/write Supabase messages |
| **Crypto** | `lib/crypto.ts` | Encrypt/decrypt with NaCl |
| **Config** | `lib/config.ts` | Load agent ID, credentials |
| **Types** | `types/index.ts` | TypeScript interfaces |

**Key functions you'll use:**
```typescript
// From storage/local.ts or storage/supabase.ts
import { getInbox, getMessage, markAsRead, archiveMessage } from '../storage/supabase.js';

// From crypto.ts
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';

// From config.ts
import { loadConfig } from '../lib/config.js';
```

---

## Project Structure (Create These)

```
src/dashboard/
├── server.ts           # Fastify HTTP server
├── routes.ts           # API endpoints
└── public/
    ├── index.html      # Dashboard UI
    ├── app.js          # Frontend logic
    └── styles.css      # Styling
```

---

## Roadmap: Step-by-Step

### Step 1: Install Dependencies (15 min)

```bash
cd /Users/freedbird/Dev/myceliumail
npm install fastify @fastify/static @fastify/cors
```

### Step 2: Create Basic Server (30 min)

**File:** `src/dashboard/server.ts`

```typescript
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function startDashboard(port = 3737) {
    const fastify = Fastify({ logger: true });

    // Serve static files
    await fastify.register(fastifyStatic, {
        root: join(__dirname, 'public'),
        prefix: '/'
    });

    // Start server
    await fastify.listen({ port, host: '127.0.0.1' });
    console.log(`🍄 Dashboard running on http://localhost:${port}`);
    
    return fastify;
}
```

**Test:** Run `node -r esbuild-register src/dashboard/server.ts` → should start server

### Step 3: Create API Routes (1-2 hours)

**File:** `src/dashboard/routes.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';

export async function registerRoutes(fastify: FastifyInstance) {
    const config = loadConfig();
    const agentId = config.agentId;

    // GET /api/inbox
    fastify.get('/api/inbox', async (request, reply) => {
        const messages = await storage.getInbox(agentId, { limit: 100 });
        
        // Decrypt encrypted messages
        const keyPair = loadKeyPair(agentId);
        const decrypted = messages.map(msg => {
            if (msg.encrypted && keyPair && msg.ciphertext) {
                try {
                    const decryptedText = decryptMessage({
                        ciphertext: msg.ciphertext,
                        nonce: msg.nonce!,
                        senderPublicKey: msg.senderPublicKey!
                    }, keyPair);
                    
                    if (decryptedText) {
                        const parsed = JSON.parse(decryptedText);
                        return { ...msg, subject: parsed.subject, body: parsed.body, decrypted: true };
                    }
                } catch {}
            }
            return msg;
        });

        return { messages: decrypted, total: decrypted.length };
    });

    // GET /api/message/:id
    fastify.get('/api/message/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const message = await storage.getMessage(id);
        
        if (!message) {
            return reply.code(404).send({ error: 'Message not found' });
        }

        // Decrypt if needed
        const keyPair = loadKeyPair(agentId);
        if (message.encrypted && keyPair && message.ciphertext) {
            try {
                const decryptedText = decryptMessage({
                    ciphertext: message.ciphertext,
                    nonce: message.nonce!,
                    senderPublicKey: message.senderPublicKey!
                }, keyPair);
                
                if (decryptedText) {
                    const parsed = JSON.parse(decryptedText);
                    return { ...message, subject: parsed.subject, body: parsed.body, decrypted: true };
                }
            } catch {}
        }

        return message;
    });

    // POST /api/message/:id/read
    fastify.post('/api/message/:id/read', async (request, reply) => {
        const { id } = request.params as { id: string };
        await storage.markAsRead(id);
        return { success: true };
    });

    // POST /api/message/:id/archive
    fastify.post('/api/message/:id/archive', async (request, reply) => {
        const { id } = request.params as { id: string };
        await storage.archiveMessage(id);
        return { success: true };
    });

    // GET /api/stats
    fastify.get('/api/stats', async (request, reply) => {
        const messages = await storage.getInbox(agentId);
        const unread = messages.filter(m => !m.read).length;
        return {
            total: messages.length,
            unread,
            encrypted: messages.filter(m => m.encrypted).length
        };
    });
}
```

**Update server.ts to use routes:**
```typescript
import { registerRoutes } from './routes.js';

// After creating fastify instance:
await registerRoutes(fastify);
```

### Step 4: Create Frontend UI (2-3 hours)

**File:** `src/dashboard/public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🍄 Myceliumail Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/styles.css">
</head>
<body class="bg-gray-900 text-gray-100">
    <div class="container mx-auto p-6">
        <!-- Header -->
        <header class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold">🍄 Myceliumail Dashboard</h1>
            <div id="stats" class="text-sm text-gray-400"></div>
        </header>

        <!-- Inbox List -->
        <div class="grid grid-cols-3 gap-6">
            <div class="col-span-1 bg-gray-800 rounded-lg p-4">
                <h2 class="text-xl font-semibold mb-4">Inbox</h2>
                <div id="inbox-list" class="space-y-2"></div>
            </div>

            <!-- Message Detail -->
            <div class="col-span-2 bg-gray-800 rounded-lg p-6">
                <div id="message-detail">
                    <p class="text-gray-500">Select a message to view</p>
                </div>
            </div>
        </div>
    </div>

    <script src="/app.js"></script>
</body>
</html>
```

**File:** `src/dashboard/public/app.js`

```javascript
// Load inbox on page load
async function loadInbox() {
    const res = await fetch('/api/inbox');
    const data = await res.json();
    
    const list = document.getElementById('inbox-list');
    list.innerHTML = data.messages.map(msg => `
        <div class="message-item p-3 rounded cursor-pointer hover:bg-gray-700 ${msg.read ? '' : 'font-bold'}"
             onclick="viewMessage('${msg.id}')">
            <div class="flex items-center gap-2">
                ${msg.encrypted ? '🔐' : '📨'}
                ${!msg.read ? '●' : ''}
                <span class="text-sm">${msg.sender}</span>
            </div>
            <div class="text-sm text-gray-400 truncate">${msg.subject || '(no subject)'}</div>
        </div>
    `).join('');

    updateStats(data);
}

async function viewMessage(id) {
    const res = await fetch(`/api/message/${id}`);
    const msg = await res.json();
    
    const detail = document.getElementById('message-detail');
    detail.innerHTML = `
        <div class="mb-4">
            <div class="text-sm text-gray-400">From: ${msg.sender}</div>
            <h2 class="text-2xl font-bold">${msg.subject}</h2>
            <div class="text-sm text-gray-400">${new Date(msg.createdAt).toLocaleString()}</div>
            ${msg.encrypted ? '<div class="text-sm text-green-400">🔐 Encrypted (decrypted ✅)</div>' : ''}
        </div>
        <div class="prose prose-invert max-w-none">
            <p class="whitespace-pre-wrap">${msg.body}</p>
        </div>
        <div class="mt-6 flex gap-4">
            <button onclick="archiveMessage('${msg.id}')" 
                    class="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                Archive
            </button>
        </div>
    `;

    // Mark as read
    await fetch(`/api/message/${id}/read`, { method: 'POST' });
    loadInbox(); // Refresh
}

async function archiveMessage(id) {
    await fetch(`/api/message/${id}/archive`, { method: 'POST' });
    loadInbox();
    document.getElementById('message-detail').innerHTML = '<p class="text-gray-500">Select a message to view</p>';
}

function updateStats(data) {
    document.getElementById('stats').innerHTML = `
        Total: ${data.total} | Unread: ${data.messages.filter(m => !m.read).length}
    `;
}

// Load on page load
loadInbox();

// Auto-refresh every 10 seconds
setInterval(loadInbox, 10000);
```

**File:** `src/dashboard/public/styles.css`

```css
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.message-item {
    transition: all 0.2s;
}

.message-item:hover {
    transform: translateX(4px);
}
```

### Step 5: Add CLI Command (30 min)

**File:** `src/commands/dashboard.ts`

```typescript
import { Command } from 'commander';
import { startDashboard } from '../dashboard/server.js';

export function createDashboardCommand(): Command {
    return new Command('dashboard')
        .description('Start web dashboard on localhost:3737')
        .option('-p, --port <port>', 'Port to run on', '3737')
        .action(async (options) => {
            const port = parseInt(options.port, 10);
            await startDashboard(port);
            console.log(`\n🍄 Dashboard running: http://localhost:${port}\n`);
            console.log('Press Ctrl+C to stop\n');
        });
}
```

**Add to** `src/bin/myceliumail.ts`:
```typescript
import { createDashboardCommand } from '../commands/dashboard.js';

// Register with other commands
program.addCommand(createDashboardCommand());
```

### Step 6: Build & Test (30 min)

```bash
# Build
npm run build

# Test
mycmail dashboard

# Open browser
open http://localhost:3737
```

---

## Acceptance Criteria

✅ Dashboard loads on http://localhost:3737  
✅ Shows all messages from inbox  
✅ Encrypted messages are decrypted automatically  
✅ Clicking message shows full content  
✅ Mark as read works  
✅ Archive works  
✅ Stats show correct counts  
✅ Auto-refresh every 10 seconds  
✅ Dark mode, clean UI

---

## Testing Scenarios

1. **Empty inbox** → Shows "No messages"
2. **Encrypted message** → Decrypts and displays ✅
3. **Unread message** → Shows bold, has ● indicator
4. **Archive** → Message disappears from list
5. **Multiple agents** → All messages visible

---

## Troubleshooting

**Port already in use:**
```bash
mycmail dashboard --port 3738
```

**Build errors:**
```bash
npm install @types/node fastify @fastify/static
```

**Messages not showing:**
- Check storage: `cat ~/.myceliumail/data/messages.json`
- Check config: `echo $MYCELIUMAIL_AGENT_ID`
- Check logs in terminal

---

## Resources

- **Fastify docs:** https://fastify.dev/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Existing code:** `/Users/freedbird/Dev/myceliumail/src/`

---

**Ready to build! Start with Step 1.** 🍄
