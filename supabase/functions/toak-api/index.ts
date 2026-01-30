// Supabase Edge Function: toak-api
// Public Myceliumail API for Toaklink with API key + Ed25519 verification.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import nacl from "npm:tweetnacl@1.0.3";
import {
  base64ToBytes,
  buildSigningString,
  hmacSha256Hex,
  isTimestampFresh,
  sha256Hex,
  timingSafeEqual
} from "../_shared/toak_auth.ts";

const textEncoder = new TextEncoder();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const API_KEY_PEPPER = Deno.env.get('API_KEY_PEPPER') || '';

const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type Json = Record<string, unknown>;

function jsonResponse(body: Json, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}


function getPathWithQuery(url: URL, prefix: string): string {
  const rawPath = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  const path = rawPath.length ? rawPath : '/';
  return `${path}${url.search}`;
}

function parseBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1].trim();
}

function minuteWindowStart(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

function hourWindowStart(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

function dayWindowStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function uuidV5(name: string, namespace: string): Promise<string> {
  const nsBytes = uuidToBytes(namespace);
  const nameBytes = textEncoder.encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes, 0);
  data.set(nameBytes, nsBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hash = new Uint8Array(hashBuffer);

  // Set version (5) and variant bits.
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  return bytesToUuid(hash.slice(0, 16));
}

const UUID_NAMESPACE_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function channelIdForAgents(a: string, b: string): string {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()].sort();
  return `dm:${x}:${y}`;
}

async function threadIdForChannel(channelId: string): Promise<string> {
  return await uuidV5(channelId, UUID_NAMESPACE_DNS);
}

async function verifyRequest(req: Request, bodyBytes: Uint8Array) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !API_KEY_PEPPER) {
    return { ok: false, status: 500, error: 'Server misconfigured' };
  }

  const authHeader = req.headers.get('authorization');
  const apiKey = parseBearer(authHeader);
  if (!apiKey) {
    return { ok: false, status: 401, error: 'Missing API key' };
  }

  const agentId = req.headers.get('x-agent-id')?.toLowerCase();
  if (!agentId) {
    return { ok: false, status: 401, error: 'Missing X-Agent-Id' };
  }

  const signature = req.headers.get('x-agent-signature') || '';
  const sigAlg = req.headers.get('x-signature-alg') || '';
  const sigTimestamp = req.headers.get('x-signature-timestamp') || '';
  const sigNonce = req.headers.get('x-signature-nonce') || '';
  const sigBodyHash = req.headers.get('x-signature-body-hash') || '';

  if (!signature || !sigTimestamp || !sigNonce || !sigBodyHash || sigAlg !== 'ed25519') {
    return { ok: false, status: 422, error: 'Missing or invalid signature headers' };
  }

  const keyId = await hmacSha256Hex(API_KEY_PEPPER, apiKey);
  const { data: keyRow, error: keyError } = await supabase
    .from('api_keys')
    .select('id, tenant_id, revoked_at')
    .eq('key_id', keyId)
    .single();

  if (keyError || !keyRow) {
    return { ok: false, status: 401, error: 'Invalid API key' };
  }
  if (keyRow.revoked_at) {
    return { ok: false, status: 401, error: 'API key revoked' };
  }

  const tenantId = keyRow.tenant_id as string;

  const { data: agentKey, error: agentKeyError } = await supabase
    .from('tenant_agent_keys')
    .select('public_key, revoked_at')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .is('revoked_at', null)
    .single();

  if (agentKeyError || !agentKey) {
    return { ok: false, status: 403, error: 'Agent not registered for tenant' };
  }

  const now = new Date();
  if (!isTimestampFresh(sigTimestamp, SIGNATURE_WINDOW_MS, now)) {
    return { ok: false, status: 422, error: 'Signature timestamp expired' };
  }

  const bodyHash = await sha256Hex(bodyBytes);
  if (!timingSafeEqual(bodyHash, sigBodyHash)) {
    return { ok: false, status: 422, error: 'Body hash mismatch' };
  }

  // Clean up expired nonces opportunistically
  await supabase.from('api_nonces').delete().lt('expires_at', now.toISOString());

  const expiresAt = new Date(now.getTime() + SIGNATURE_WINDOW_MS).toISOString();
  const nonceInsert = await supabase.from('api_nonces').insert({
    tenant_id: tenantId,
    agent_id: agentId,
    nonce: sigNonce,
    expires_at: expiresAt
  });

  if (nonceInsert.error && nonceInsert.error.code === '23505') {
    return { ok: false, status: 409, error: 'Nonce replay detected' };
  }

  const url = new URL(req.url);
  const path = getPathWithQuery(url, '/toak-api');
  const signingString = buildSigningString({
    method: req.method,
    path,
    timestamp: sigTimestamp,
    nonce: sigNonce,
    bodyHash: sigBodyHash,
    agentId
  });

  try {
    // The public key is stored as base64-encoded DER format (SPKI)
    // Ed25519 public key is the last 32 bytes of the DER encoding
    const publicKeyDer = base64ToBytes(agentKey.public_key as string);
    const publicKeyBytes = publicKeyDer.slice(-32); // Extract raw 32-byte key

    const signatureBytes = base64ToBytes(signature);
    const valid = nacl.sign.detached.verify(
      textEncoder.encode(signingString),
      signatureBytes,
      publicKeyBytes
    );

    if (!valid) {
      return { ok: false, status: 422, error: 'Invalid signature' };
    }
  } catch (e) {
    console.error('[Toak] Signature verification error:', e);
    return { ok: false, status: 422, error: 'Signature verification failed' };
  }

  // Update last_used_at asynchronously
  supabase.from('api_keys').update({ last_used_at: now.toISOString() }).eq('id', keyRow.id);

  return {
    ok: true,
    tenantId,
    agentId,
    apiKeyId: keyRow.id
  };
}

async function checkRateLimit(tenantId: string, apiKeyId: string) {
  const now = new Date();
  const { data: config } = await supabase
    .from('rate_limits')
    .select('burst_limit, hour_limit, day_limit')
    .eq('tenant_id', tenantId)
    .single();

  const burstLimit = config?.burst_limit ?? 20;
  const hourLimit = config?.hour_limit ?? 100;
  const dayLimit = config?.day_limit ?? 1000;

  const checks = [
    { scope: 'tenant', scopeId: tenantId, type: 'minute', start: minuteWindowStart(now), limit: burstLimit },
    { scope: 'tenant', scopeId: tenantId, type: 'hour', start: hourWindowStart(now), limit: hourLimit },
    { scope: 'tenant', scopeId: tenantId, type: 'day', start: dayWindowStart(now), limit: dayLimit },
    { scope: 'api_key', scopeId: apiKeyId, type: 'minute', start: minuteWindowStart(now), limit: burstLimit },
    { scope: 'api_key', scopeId: apiKeyId, type: 'hour', start: hourWindowStart(now), limit: hourLimit },
    { scope: 'api_key', scopeId: apiKeyId, type: 'day', start: dayWindowStart(now), limit: dayLimit }
  ];

  let successHeaders: Record<string, string> = {};
  for (const check of checks) {
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_scope: check.scope,
      p_scope_id: check.scopeId,
      p_window_type: check.type,
      p_window_start: check.start.toISOString(),
      p_limit: check.limit
    });

    if (error) {
      return { ok: false, status: 429, error: 'Rate limit error' };
    }

    const allowed = data?.[0]?.allowed;
    const count = data?.[0]?.count ?? 0;
    if (!allowed) {
      const resetAt = new Date(check.start.getTime() + (check.type === 'minute' ? 60000 : check.type === 'hour' ? 3600000 : 86400000));
      const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
      return {
        ok: false,
        status: 429,
        error: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': String(check.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(resetAt.getTime() / 1000)),
          'Retry-After': String(retryAfter)
        }
      };
    }

    if (check.scope === 'tenant' && check.type === 'hour') {
      const remaining = Math.max(0, check.limit - count);
      const resetAt = new Date(check.start.getTime() + 3600000);
      successHeaders = {
        'X-RateLimit-Limit': String(check.limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.floor(resetAt.getTime() / 1000))
      };
    }
  }

  return { ok: true, headers: successHeaders };
}

serve(async (req) => {
  const url = new URL(req.url);
  const internalPath = getPathWithQuery(url, '/toak-api').split('?')[0];
  const routePath = internalPath.startsWith('/api/')
    ? internalPath.replace('/api/', '/v1/')
    : internalPath;

  const bodyBuffer = new Uint8Array(await req.arrayBuffer());
  const bodyText = new TextDecoder().decode(bodyBuffer);
  let body: Json = {};
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
  }

  const verified = await verifyRequest(req, bodyBuffer);
  if (!verified.ok) {
    return jsonResponse({ error: verified.error }, verified.status);
  }

  const rate = await checkRateLimit(verified.tenantId, verified.apiKeyId);
  if (!rate.ok) {
    return jsonResponse({ error: rate.error }, rate.status, rate.headers);
  }

  const responseHeaders = rate.headers ?? {};
  const agentId = verified.agentId;
  const tenantId = verified.tenantId;

  // Routing
  if (req.method === 'POST' && routePath === '/v1/toaklink/send') {
    const to = (body.to as string | undefined)?.toLowerCase();
    const message = (body.message as string | undefined) ?? '';
    if (!to || !message) {
      return jsonResponse({ error: 'Missing to or message' }, 400);
    }

    const { data: recipientKey } = await supabase
      .from('tenant_agent_keys')
      .select('agent_id')
      .eq('tenant_id', tenantId)
      .eq('agent_id', to)
      .is('revoked_at', null)
      .single();

    if (!recipientKey) {
      return jsonResponse({ error: 'Recipient not registered for tenant' }, 403);
    }

    const channelId = channelIdForAgents(agentId, to);
    const threadId = await threadIdForChannel(channelId);

    const insert = await supabase.from('agent_messages').insert({
      tenant_id: tenantId,
      sender: agentId,
      recipient: to,
      subject: '',
      body: message,
      message_type: 'direct',
      thread_id: threadId
    }).select('id, created_at').single();

    if (insert.error || !insert.data) {
      return jsonResponse({ error: 'Failed to send message' }, 500);
    }

    return jsonResponse({
      success: true,
      channel_id: threadId,
      message_id: insert.data.id,
      timestamp: insert.data.created_at
    }, 200, responseHeaders);
  }

  if (req.method === 'POST' && routePath === '/v1/toaklink/link') {
    const to = (body.to as string | undefined)?.toLowerCase();
    if (!to) {
      return jsonResponse({ error: 'Missing target agent' }, 400);
    }
    const { data: recipientKey } = await supabase
      .from('tenant_agent_keys')
      .select('agent_id')
      .eq('tenant_id', tenantId)
      .eq('agent_id', to)
      .is('revoked_at', null)
      .single();

    if (!recipientKey) {
      return jsonResponse({ error: 'Recipient not registered for tenant' }, 403);
    }
    const channelId = channelIdForAgents(agentId, to);
    const threadId = await threadIdForChannel(channelId);
    return jsonResponse({
      id: threadId,
      participants: [agentId, to],
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    }, 200, responseHeaders);
  }

  if (req.method === 'GET' && routePath.startsWith('/v1/toaklink/inbox/')) {
    const pathAgent = routePath.split('/').pop()?.toLowerCase();
    if (!pathAgent || pathAgent !== agentId) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: messages } = await supabase
      .from('agent_messages')
      .select('id, sender, recipient, body, read, created_at, thread_id')
      .eq('tenant_id', tenantId)
      .or(`sender.eq.${agentId},recipient.eq.${agentId}`)
      .order('created_at', { ascending: false })
      .limit(200);

    const channelMap = new Map<string, {
      id: string;
      participants: Set<string>;
      last_message?: string;
      last_activity?: string;
      unread_count: number;
    }>();

    const threadCache = new Map<string, string>();
    for (const msg of messages || []) {
      let thread = msg.thread_id as string | null;
      if (!thread) {
        const channelKey = channelIdForAgents(msg.sender, msg.recipient);
        thread = threadCache.get(channelKey) || await threadIdForChannel(channelKey);
        threadCache.set(channelKey, thread);
      }
      const entry = channelMap.get(thread) || {
        id: thread,
        participants: new Set<string>(),
        unread_count: 0
      };
      entry.participants.add(msg.sender);
      entry.participants.add(msg.recipient);
      if (!entry.last_message) {
        entry.last_message = msg.body || '';
        entry.last_activity = msg.created_at;
      }
      if (msg.recipient === agentId && !msg.read) {
        entry.unread_count += 1;
      }
      channelMap.set(thread, entry);
    }

    const channels = Array.from(channelMap.values()).map(ch => ({
      id: ch.id,
      participants: Array.from(ch.participants),
      unread_count: ch.unread_count,
      last_message: ch.last_message,
      last_activity: ch.last_activity
    }));

    const totalUnread = channels.reduce((sum, ch) => sum + ch.unread_count, 0);
    return jsonResponse({ channels, total_unread: totalUnread }, 200, responseHeaders);
  }

  if (req.method === 'GET' && routePath.startsWith('/v1/toaklink/channel/')) {
    const channelId = routePath.split('/').pop() || '';
    if (!channelId) {
      return jsonResponse({ error: 'Missing channel id' }, 400);
    }

    const { data: messages } = await supabase
      .from('agent_messages')
      .select('id, sender, recipient, body, read, created_at, thread_id')
      .eq('tenant_id', tenantId)
      .eq('thread_id', channelId)
      .order('created_at', { ascending: true });

    if (!messages) {
      return jsonResponse({ error: 'Channel not found' }, 404);
    }

    const participants = new Set<string>();
    const formatted = (messages || []).map(msg => {
      participants.add(msg.sender);
      participants.add(msg.recipient);
      return {
        id: msg.id,
        channel_id: channelId,
        from: msg.sender,
        content: msg.body || '',
        timestamp: msg.created_at,
        read_by: msg.read ? [msg.recipient] : []
      };
    });

    if (!participants.has(agentId)) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    return jsonResponse({
      channel_id: channelId,
      messages: formatted,
      participants: Array.from(participants)
    }, 200, responseHeaders);
  }

  if (req.method === 'POST' && routePath.startsWith('/v1/toaklink/channel/') && routePath.endsWith('/read')) {
    const parts = routePath.split('/');
    const channelId = parts[parts.length - 2];
    if (!channelId) {
      return jsonResponse({ error: 'Missing channel id' }, 400);
    }

    await supabase
      .from('agent_messages')
      .update({ read: true })
      .eq('tenant_id', tenantId)
      .eq('thread_id', channelId)
      .eq('recipient', agentId)
      .eq('read', false);

    return jsonResponse({ success: true }, 200, responseHeaders);
  }

  if (req.method === 'GET' && routePath.startsWith('/v1/toaklink/recent/')) {
    const pathAgent = routePath.split('/').pop()?.toLowerCase();
    if (!pathAgent || pathAgent !== agentId) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
    const { data: messages } = await supabase
      .from('agent_messages')
      .select('id, sender, recipient, body, created_at, thread_id')
      .eq('tenant_id', tenantId)
      .or(`sender.eq.${agentId},recipient.eq.${agentId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    const formatted = (messages || []).map(msg => ({
      id: msg.id,
      channel_id: msg.thread_id,
      from: msg.sender,
      content: msg.body || '',
      timestamp: msg.created_at
    }));

    return jsonResponse({ messages: formatted }, 200, responseHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404);
});
