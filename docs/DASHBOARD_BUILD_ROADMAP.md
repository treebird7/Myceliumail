# Dashboard Build Roadmap

> Quick reference for agent building the web dashboard

## Phase 1: Setup (15 min)
- [ ] Install: `npm install fastify @fastify/static @fastify/cors`
- [ ] Create: `src/dashboard/` directory
- [ ] Create: `src/dashboard/public/` directory

## Phase 2: Backend (2 hours)
- [ ] Create `src/dashboard/server.ts` (Fastify server)
- [ ] Create `src/dashboard/routes.ts` (5 API endpoints)
- [ ] Test: `GET /api/inbox` returns messages
- [ ] Test: `GET /api/message/:id` decrypts encrypted messages
- [ ] Test: `POST /api/message/:id/read` marks as read

## Phase 3: Frontend (2-3 hours)
- [ ] Create `src/dashboard/public/index.html` (layout + Tailwind)
- [ ] Create `src/dashboard/public/app.js` (fetch API, render messages)
- [ ] Create `src/dashboard/public/styles.css` (custom styles)
- [ ] Test: Messages load in browser
- [ ] Test: Click message → shows detail
- [ ] Test: Archive button works

## Phase 4: CLI Integration (30 min)
- [ ] Create `src/commands/dashboard.ts`
- [ ] Register in `src/bin/myceliumail.ts`
- [ ] Build: `npm run build`
- [ ] Test: `mycmail dashboard` starts server

## Phase 5: Polish (1 hour)
- [ ] Add auto-refresh (10 sec interval)
- [ ] Add unread indicators (bold + ●)
- [ ] Add stats header (total, unread)
- [ ] Add keyboard shortcuts (optional)
- [ ] Dark mode polish

## Acceptance Tests
- [ ] Can view all local messages
- [ ] Can view Supabase messages (if configured)
- [ ] Encrypted messages decrypt automatically
- [ ] Mark as read updates UI
- [ ] Archive removes from inbox
- [ ] UI is responsive and clean

## Time Budget
- Setup: 15 min
- Backend: 2 hours
- Frontend: 2-3 hours
- CLI: 30 min
- Polish: 1 hour
**Total: 4-6 hours**

## Key Files to Reference
- Storage API: `src/storage/supabase.ts`
- Crypto: `src/lib/crypto.ts`
- Config: `src/lib/config.ts`
- Types: `src/types/index.ts`

## Success = 
User runs `mycmail dashboard`, opens browser, sees beautiful inbox with all messages (encrypted ones decrypted), can archive/read, feels 🍄 magical!
